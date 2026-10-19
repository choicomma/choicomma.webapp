import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let inquiriesMutex = Promise.resolve();

async function runWithInquiriesLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = inquiriesMutex;
  let release: () => void = () => {};
  inquiriesMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getInquiriesFilePath() {
  return path.join(process.cwd(), "data", "inquiries.json");
}

function readInquiriesFile(): any[] {
  try {
    const filePath = getInquiriesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Inquiries File Read Warning]:", err);
  }
  return [];
}

function safeAtomicWriteJson(filePath: string, data: any): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const jsonStr = JSON.stringify(data, null, 2);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
      try {
        fs.writeFileSync(tempPath, jsonStr, "utf-8");
        try {
          fs.renameSync(tempPath, filePath);
        } catch {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch {}
          fs.writeFileSync(filePath, jsonStr, "utf-8");
        }
        return true;
      } catch {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }
    }

    fs.writeFileSync(filePath, jsonStr, "utf-8");
    return true;
  } catch (err) {
    console.error(`[Atomic Write Error: ${filePath}]:`, err);
    return false;
  }
}

function normalizeInquiryForSupabase(item: any) {
  return {
    id: String(item.id || `inq_${Date.now()}`),
    customerName: item.customerName || item.name || "고객",
    customerEmail: item.customerEmail || item.email || "",
    customerPhone: item.customerPhone || item.phone || "",
    category: item.category || "일반",
    title: item.title || "문의 내용",
    content: item.content || item.message || "",
    status: item.status || "pending",
    imageUrl: item.imageUrl || item.image || null,
    reply: item.reply || null,
    repliedAt: item.repliedAt || null,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 1:1 고객 문의 목록 조회
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // all | pending | completed
  let list = readInquiriesFile();

  // 비상 복구(Self-Healing): 로컬 문의 데이터가 비어있는 경우 Supabase에서 복구 시도
  if (list.length === 0) {
    try {
      const { data, error } = await runSafeSupabaseQuery<any[]>(
        async (supabase) =>
          supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        1500
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
        safeAtomicWriteJson(getInquiriesFilePath(), list); // 로컬 캐시 자가 복구
      }
    } catch (fallbackErr) {
      console.warn("[Inquiries Remote Fallback Warning]:", fallbackErr);
    }
  }

  if (filter && filter !== "all") {
    list = list.filter((item) => item.status === filter);
  }

  return NextResponse.json({ success: true, count: list.length, data: list }, { headers: NO_CACHE_HEADERS });
}

// POST: 문의 등록 또는 답변 저장 (동시성 락, 안티-롤백 스마트 병합 및 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithInquiriesLock(async () => {
    try {
      const body = await req.json();
      let current = readInquiriesFile();
      let modifiedItems: any[] = [];

      if (Array.isArray(body)) {
        // 스마트 병합: 디스크에만 있는 문의 보존 (Anti-Rollback Smart Merge)
        const incomingMap = new Map<string, any>();
        body.forEach((item: any) => {
          if (item && item.id) incomingMap.set(String(item.id), item);
        });

        const merged: any[] = [];
        body.forEach((item: any) => merged.push(item));

        // 디스크에 저장되어 있던 다른 문의가 누락되지 않도록 보존
        current.forEach((diskItem: any) => {
          if (diskItem && diskItem.id && !incomingMap.has(String(diskItem.id))) {
            merged.push(diskItem);
          }
        });
        current = merged;
        modifiedItems = body;
      } else if (body && body.id) {
        const idx = current.findIndex((item) => String(item.id) === String(body.id));
        if (idx !== -1) {
          // 기존 문의 답변/수정 (기존 데이터 보존하며 병합)
          current[idx] = {
            ...current[idx],
            ...body,
            updated_at: new Date().toISOString(),
          };
          modifiedItems = [current[idx]];
        } else {
          // 신규 문의 추가
          const newItem = {
            ...body,
            status: body.status || "pending",
            created_at: body.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          current.unshift(newItem);
          modifiedItems = [newItem];
        }
      }

      // 1. 로컬 JSON 저장 (0ms 보장, 무손실 원자적 쓰기)
      safeAtomicWriteJson(getInquiriesFilePath(), current);

      // 2. Supabase 비동기 듀얼 라이트 (Safe Dual-Write)
      // 네트워크 지연이나 DB 일시정지 상태여도 응답이 지연되거나 에러가 전파되지 않도록 비동기 안전 실행
      if (modifiedItems.length > 0) {
        const rowsToUpsert = modifiedItems
          .filter((item) => item && item.id)
          .map(normalizeInquiryForSupabase);

        if (rowsToUpsert.length > 0) {
          runSafeSupabaseQuery(
            async (supabase) => supabase.from("inquiries").upsert(rowsToUpsert, { onConflict: "id" }),
            2500
          )
            .then((res) => {
              if (res.error) {
                console.warn("[Inquiries Supabase Dual-Write Notice]:", res.error.message || res.error);
              } else {
                console.log(`[Inquiries Supabase Dual-Write Success] ${rowsToUpsert.length}건 동기화 완료`);
              }
            })
            .catch((err) => {
              console.warn("[Inquiries Supabase Dual-Write Warning]:", err);
            });
        }
      }

      return NextResponse.json({ success: true, count: current.length, data: current }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 문의 삭제 (동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithInquiriesLock(async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return NextResponse.json({ success: false, message: "ID 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const current = readInquiriesFile();
      const filtered = current.filter((item) => String(item.id) !== String(id));
      
      // 1. 로컬 JSON 삭제 (원자적 쓰기)
      safeAtomicWriteJson(getInquiriesFilePath(), filtered);

      // 2. Supabase 비동기 듀얼 삭제
      runSafeSupabaseQuery(
        async (supabase) => supabase.from("inquiries").delete().eq("id", String(id)),
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Inquiries Supabase Dual-Delete Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Inquiries Supabase Dual-Delete Success] ID: ${id} 삭제 완료`);
          }
        })
        .catch((err) => {
          console.warn("[Inquiries Supabase Dual-Delete Warning]:", err);
        });

      return NextResponse.json({ success: true, count: filtered.length, data: filtered }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
