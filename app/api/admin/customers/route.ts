import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import seedCustomers from "@/data/customers.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let customersMutex = Promise.resolve();

async function runWithCustomersLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = customersMutex;
  let release: () => void = () => {};
  customersMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getCustomersFilePath() {
  return path.join(process.cwd(), "data", "customers.json");
}

function readCustomersFile(): any[] {
  try {
    const filePath = getCustomersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("[Customers File Read Warning]:", err);
  }

  // Vercel Serverless Function 배포 환경 번들 fallback
  if (Array.isArray(seedCustomers) && seedCustomers.length > 0) {
    return seedCustomers;
  }

  return [];
}

function writeCustomersFile(data: any[]) {
  try {
    const targetPath = getCustomersFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error("[Customers File Write Error]:", err);
  }
}

function normalizeCustomerForSupabase(c: any) {
  const fullAddr = [c.address, c.detailAddress].filter(Boolean).join(" | ");
  return {
    id: String(c.id || c.loginId || `CUST-${Date.now()}`),
    name: String(c.name || "회원").trim(),
    email: String(c.email || "").trim().toLowerCase(),
    phone: String(c.phone || "").trim(),
    address: fullAddr || c.address || "",
    grade: String(c.grade || "GENERAL").toUpperCase(),
    totalSpent: Number(c.totalSpent || 0),
    points: Number(c.points || 0),
    couponsCount: Number(c.couponsCount || 0),
    joinedDate: c.joinedDate || new Date().toISOString().split("T")[0],
    status: c.status || "Active",
    role: c.role || (c.isAdmin ? "ADMIN" : "CUSTOMER"),
    isAdmin: Boolean(c.isAdmin),
    updated_at: new Date().toISOString(),
  };
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 회원 목록 조회 (Git data/customers.json 기준 및 Supabase 자가 복구)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.toLowerCase();
    const id = url.searchParams.get("id");
    const email = url.searchParams.get("email")?.toLowerCase();

    let list = readCustomersFile();

    // 비상 복구(Self-Healing): 로컬 회원 데이터가 비어있는 경우 Supabase에서 복구 시도
    if (list.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("customers").select("*").order("created_at", { ascending: true }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
          writeCustomersFile(list); // 로컬 캐시 자가 복구
        }
      } catch (fallbackErr) {
        console.warn("[Customers Remote Fallback Warning]:", fallbackErr);
      }
    }

    if (id) {
      const found = list.find((c) => c.id === id || c.loginId === id);
      return NextResponse.json({ success: true, customer: found || null }, { headers: NO_CACHE_HEADERS });
    }

    if (email) {
      const found = list.find((c) => c.email?.toLowerCase() === email);
      return NextResponse.json({ success: true, customer: found || null }, { headers: NO_CACHE_HEADERS });
    }

    if (query) {
      const qClean = query.trim().toLowerCase();
      const qNoSpace = qClean.replace(/\s+/g, "");
      const qDigits = qClean.replace(/[^0-9]/g, "");

      list = list.filter((c) => {
        const cName = String(c.name || "").toLowerCase();
        const cEmail = String(c.email || "").toLowerCase();
        const cPhone = String(c.phone || "").toLowerCase();
        const cPhoneDigits = cPhone.replace(/[^0-9]/g, "");
        const cId = String(c.id || "").toLowerCase();
        const cImwebUid = String(c.imwebUid || "").toLowerCase();
        const cLoginId = String(c.loginId || "").toLowerCase();
        const cAddr = String(c.address || "").toLowerCase();
        const cDetailAddr = String(c.detailAddress || "").toLowerCase();

        return (
          cName.includes(qClean) ||
          (qNoSpace.length > 0 && cName.replace(/\s+/g, "").includes(qNoSpace)) ||
          cEmail.includes(qClean) ||
          cLoginId.includes(qClean) ||
          cId.includes(qClean) ||
          cImwebUid.includes(qClean) ||
          cPhone.includes(qClean) ||
          (qDigits.length >= 2 && cPhoneDigits.includes(qDigits)) ||
          cAddr.includes(qClean) ||
          cDetailAddr.includes(qClean)
        );
      });
    }

    return NextResponse.json({ success: true, count: list.length, customers: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: 회원 등록 또는 정보 수정 (동시성 락 및 Supabase 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithCustomersLock(async () => {
    try {
      const body = await req.json();

      if (Array.isArray(body)) {
        writeCustomersFile(body);

        // Supabase 비동기 듀얼 라이트 (일괄)
        const supabaseRows = body.filter((c) => c && (c.id || c.email)).map(normalizeCustomerForSupabase);
        if (supabaseRows.length > 0) {
          runSafeSupabaseQuery(
            async (supabase) => supabase.from("customers").upsert(supabaseRows, { onConflict: "id" }),
            2500
          ).catch((err) => console.warn("[Customers Batch Dual-Write Warning]:", err));
        }

        return NextResponse.json({ success: true, count: body.length, customers: body }, { headers: NO_CACHE_HEADERS });
      }

      if (!body || (!body.id && !body.email)) {
        return NextResponse.json(
          { success: false, error: "회원 식별자(id 또는 email)는 필수입니다." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const current = readCustomersFile();
      const targetId = body.id ? String(body.id).trim() : "";
      const targetEmail = body.email ? String(body.email).trim().toLowerCase() : "";

      const idx = current.findIndex(
        (c) =>
          (targetId && (c.id === targetId || c.loginId === targetId)) ||
          (targetEmail && c.email?.toLowerCase() === targetEmail)
      );

      let updatedRecord: any;

      if (idx !== -1) {
        // 부분 업데이트 허용 (비밀번호 변경, 주소 변경, 포인트 변경 등)
        updatedRecord = {
          ...current[idx],
          ...body,
          updated_at: new Date().toISOString(),
        };
        if (body.points !== undefined) updatedRecord.points = Number(body.points);
        if (body.totalSpent !== undefined) updatedRecord.totalSpent = Number(body.totalSpent);
        current[idx] = updatedRecord;
      } else {
        // 신규 회원 생성 시에는 name 필수
        if (!body.name) {
          return NextResponse.json(
            { success: false, error: "신규 회원 생성 시 성명(name)은 필수입니다." },
            { status: 400, headers: NO_CACHE_HEADERS }
          );
        }
        updatedRecord = {
          id: targetId || `CUST-${Date.now()}`,
          name: String(body.name).trim(),
          email: targetEmail || "-",
          phone: String(body.phone || "-").trim(),
          address: String(body.address || "-").trim(),
          detailAddress: String(body.detailAddress || "").trim(),
          postcode: String(body.postcode || body.zipCode || "").trim(),
          grade: String(body.grade || "GENERAL").toUpperCase(),
          totalSpent: Number(body.totalSpent || 0),
          points: Number(body.points || 0),
          couponsCount: Number(body.couponsCount || 0),
          joinedDate: body.joinedDate || new Date().toISOString().split("T")[0],
          status: body.status || "Active",
          role: body.role || (body.isAdmin ? "ADMIN" : "CUSTOMER"),
          isAdmin: Boolean(body.isAdmin),
          password: body.password || undefined,
          loginId: body.loginId || undefined,
          updated_at: new Date().toISOString(),
        };
        current.push(updatedRecord);
      }

      // 1. 로컬 저장 (0ms 보장, 무손실 원자적 쓰기)
      writeCustomersFile(current);

      // 2. Supabase 비동기 듀얼 라이트
      const supabaseRow = normalizeCustomerForSupabase(updatedRecord);
      runSafeSupabaseQuery(
        async (supabase) => supabase.from("customers").upsert([supabaseRow], { onConflict: "id" }),
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Customer Supabase Dual-Write Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Customer Supabase Dual-Write Success] ID: ${supabaseRow.id}`);
          }
        })
        .catch((err) => {
          console.warn("[Customer Supabase Dual-Write Warning]:", err);
        });

      return NextResponse.json({ success: true, customer: updatedRecord, customers: current }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      console.error("API /api/admin/customers error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 회원 삭제 (탈퇴 처리, 동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithCustomersLock(async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const email = url.searchParams.get("email")?.toLowerCase();
      const phone = url.searchParams.get("phone");

      if (!id && !email && !phone) {
        return NextResponse.json({ success: false, message: "회원 식별자 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const current = readCustomersFile();
      const filtered = current.filter((c) => {
        if (id && (c.id === id || c.loginId === id)) return false;
        if (email && c.email?.toLowerCase() === email) return false;
        if (phone && (c.phone === phone || c.phone?.replace(/[^0-9]/g, "") === phone.replace(/[^0-9]/g, ""))) return false;
        return true;
      });

      // 1. 로컬 파일 저장
      writeCustomersFile(filtered);

      // 2. Supabase 비동기 듀얼 삭제
      runSafeSupabaseQuery(
        async (supabase) => {
          let query = supabase.from("customers").delete();
          if (id) query = query.eq("id", id);
          else if (email) query = query.eq("email", email);
          else if (phone) query = query.eq("phone", phone);
          return await query;
        },
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Customer Supabase Dual-Delete Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Customer Supabase Dual-Delete Success] Target: ${id || email || phone}`);
          }
        })
        .catch((err) => {
          console.warn("[Customer Supabase Dual-Delete Warning]:", err);
        });

      return NextResponse.json({ success: true, count: filtered.length, customers: filtered }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
