import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import { logAdminActivity } from "@/lib/logging/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let timesaleMutex = Promise.resolve();

async function runWithTimesaleLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = timesaleMutex;
  let release: () => void = () => {};
  timesaleMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getTimesaleFilePath() {
  return path.join(process.cwd(), "data", "timesales.json");
}

function readTimesaleFile(): any[] {
  try {
    const filePath = getTimesaleFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data.filter((t: any) => t && t.id);
      }
    }
  } catch (err) {
    console.warn("[Timesale File Read Warning]:", err);
  }
  return [];
}

function writeTimesaleFile(data: any[]): boolean {
  try {
    const targetPath = getTimesaleFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const jsonStr = JSON.stringify(data, null, 2);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
      try {
        fs.writeFileSync(tempPath, jsonStr, "utf-8");
        try {
          fs.renameSync(tempPath, targetPath);
        } catch {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch {}
          fs.writeFileSync(targetPath, jsonStr, "utf-8");
        }
        return true;
      } catch {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }
    }

    fs.writeFileSync(targetPath, jsonStr, "utf-8");
    return true;
  } catch (err) {
    console.error("[Timesale File Write Error]:", err);
    return false;
  }
}

function normalizeTimesaleForSupabase(item: any) {
  return {
    id: String(item.id || `SECRET-TS-${Date.now()}`),
    title: String(item.title || "타임세일").trim(),
    discountRate: Number(item.discountRate) || 30,
    productIds: Array.isArray(item.productIds) ? item.productIds.map(String) : [],
    targetCustomerEmails: Array.isArray(item.targetCustomerEmails) ? item.targetCustomerEmails.map(String) : [],
    targetGrades: Array.isArray(item.targetGrades) ? item.targetGrades.map(String) : [],
    durationHours: Number(item.durationHours) || 24,
    durationMinutes: Number(item.durationMinutes) || 0,
    status: item.status || "active",
    startTime: item.startTime || item.created_at || item.createdAt || new Date().toISOString(),
    endTime: item.endTime || null,
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 타임세일 목록 조회 (Git data/timesales.json 기준 + Supabase 자가 치유 폴백)
export async function GET() {
  try {
    const filePath = getTimesaleFilePath();
    const fileExists = fs.existsSync(filePath);
    let list = readTimesaleFile();

    // 자가 치유 폴백(Self-Healing Fallback): 로컬 파일에 항목이 없거나 디스크에 존재하지 않는 경우 Supabase에서 복구 시도
    if (list.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("timesales").select("*").order("created_at", { ascending: false }),
          3000
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          const valid = data.filter((t: any) => t && t.id).map((t: any) => ({
            ...t,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
          }));
          list = valid;
          writeTimesaleFile(list); // 로컬 캐시 자가 복구
        }
      } catch (fallbackErr) {
        console.warn("[Timesale Remote Fallback Warning]:", fallbackErr);
      }
    }

    return NextResponse.json({ success: true, count: list.length, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: 타임세일 프로모션 등록 또는 갱신 (동시성 락 및 Supabase 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithTimesaleLock(async () => {
    try {
      const body = await req.json();
      let current = readTimesaleFile();

      let itemsToUpsertToSupabase: any[] = [];

      if (Array.isArray(body)) {
        // 비정상적인 빈 배열([]) POST로 인한 기존 등록 프로모션 무단 초기화 방지
        // (개별 프로모션 삭제는 명시적인 DELETE 엔드포인트를 통해서만 수행)
        if (body.length === 0 && current.length > 0) {
          console.warn("[Timesale Protection]: 빈 배열 전송 감지됨. 기존 등록 프로모션 보존.");
          return NextResponse.json({ success: true, count: current.length, data: current }, { headers: NO_CACHE_HEADERS });
        }

        current = body
          .filter((t: any) => t && t.id)
          .map((t: any) => ({
            ...t,
            createdAt: t.createdAt || t.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        itemsToUpsertToSupabase = current.map(normalizeTimesaleForSupabase);
      } else if (body && body.id) {
        const idx = current.findIndex((item) => String(item.id) === String(body.id));
        const prevItem = idx !== -1 ? current[idx] : undefined;
        const updatedItem = {
          ...body,
          createdAt: body.createdAt || body.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updatedItem };
        } else {
          current.unshift({ ...updatedItem, created_at: updatedItem.createdAt });
        }
        itemsToUpsertToSupabase = [normalizeTimesaleForSupabase(updatedItem)];

        // 타임세일 관리자 작업 감사 로그 기록
        logAdminActivity({
          adminId: "admin_master",
          adminName: "프로모션 관리자",
          actionType: idx !== -1 ? "UPDATE" : "CREATE",
          domain: "TIMESALE",
          targetId: updatedItem.id,
          targetName: updatedItem.title || "타임세일 프로모션",
          description: `타임세일 프로모션 [${updatedItem.title || updatedItem.id}] ${idx !== -1 ? "정보 수정" : "신규 등록"} (할인율: ${updatedItem.discountRate || 0}%, 상태: ${updatedItem.status || "active"})`,
          beforeData: prevItem ? { title: prevItem.title, discountRate: prevItem.discountRate, status: prevItem.status } : undefined,
          afterData: { title: updatedItem.title, discountRate: updatedItem.discountRate, status: updatedItem.status },
        }).catch(() => {});
      }

      // 1. 로컬 저장 (0ms 보장, 무손실 원자적 쓰기)
      writeTimesaleFile(current);

      // 2. Supabase 비동기 듀얼 라이트 (백그라운드 동기화)
      if (itemsToUpsertToSupabase.length > 0) {
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("timesales").upsert(itemsToUpsertToSupabase, { onConflict: "id" }),
          2500
        )
          .then((res) => {
            if (res.error) {
              console.warn("[Timesale Supabase Dual-Write Notice]:", res.error.message || res.error);
            } else {
              console.log(`[Timesale Supabase Dual-Write Success] Items count: ${itemsToUpsertToSupabase.length}`);
            }
          })
          .catch((err) => {
            console.warn("[Timesale Supabase Dual-Write Warning]:", err);
          });
      }

      return NextResponse.json({ success: true, count: current.length, data: current }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      console.error("API /api/admin/timesale error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 타임세일 프로모션 삭제 (동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithTimesaleLock(async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return NextResponse.json({ success: false, message: "ID 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const current = readTimesaleFile();
      const filtered = current.filter((item) => String(item.id) !== String(id));
      
      // 1. 로컬 파일 저장
      writeTimesaleFile(filtered);

      // 2. Supabase 듀얼 삭제 (await로 안전하게 완료 보장)
      try {
        await runSafeSupabaseQuery(
          async (supabase) => supabase.from("timesales").delete().eq("id", id),
          3000
        );
        console.log(`[Timesale Supabase Dual-Delete Success] Target ID: ${id}`);
      } catch (err) {
        console.warn("[Timesale Supabase Dual-Delete Warning]:", err);
      }

      return NextResponse.json({ success: true, count: filtered.length, data: filtered }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
