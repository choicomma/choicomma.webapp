import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let inboundMutex = Promise.resolve();

async function runWithInboundLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = inboundMutex;
  let release: () => void = () => {};
  inboundMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getInboundFilePath() {
  return path.join(process.cwd(), "data", "inbound-schedules.json");
}

function readInboundFile(): any[] {
  try {
    const filePath = getInboundFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Inbound File Read Warning]:", err);
  }
  return [];
}

function writeInboundFile(data: any[]): boolean {
  try {
    const targetPath = getInboundFilePath();
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
    return true;
  } catch (err) {
    console.error("[Inbound File Write Error]:", err);
    return false;
  }
}

function normalizeInboundForSupabase(item: any) {
  return {
    id: String(item.id || `INB-${Date.now()}`),
    title: String(item.title || "입고 일정"),
    date: item.date || new Date().toISOString().split("T")[0],
    quantity: Number(item.quantity || 0),
    supplier: String(item.supplier || ""),
    warehouse: String(item.warehouse || "기본 물류창고"),
    notes: String(item.notes || ""),
    status: String(item.status || "Scheduled"),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 입고 스케줄 목록 조회 (Git data/inbound-schedules.json 기준 + Supabase 자가 치유 폴백)
export async function GET() {
  try {
    let list = readInboundFile();

    // 자가 치유 폴백: 로컬 파일이 비어있는 경우 Supabase에서 복구 시도
    if (list.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("inbound_schedules").select("*").order("date", { ascending: true }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
          writeInboundFile(list);
        }
      } catch (fallbackErr) {
        console.warn("[Inbound Remote Fallback Warning]:", fallbackErr);
      }
    }

    return NextResponse.json({ success: true, count: list.length, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: 입고 스케줄 등록 또는 수정 (동시성 락 및 Supabase 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithInboundLock(async () => {
    try {
      const body = await req.json();
      let current = readInboundFile();

      let itemsToUpsertToSupabase: any[] = [];

      if (Array.isArray(body)) {
        current = body.map((item: any) => ({
          ...item,
          updated_at: new Date().toISOString(),
        }));
        itemsToUpsertToSupabase = current.map(normalizeInboundForSupabase);
      } else if (body && body.id) {
        const idx = current.findIndex((item) => String(item.id) === String(body.id));
        let updatedRecord: any;
        if (idx !== -1) {
          updatedRecord = { ...current[idx], ...body, updated_at: new Date().toISOString() };
          current[idx] = updatedRecord;
        } else {
          updatedRecord = {
            ...body,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          current.unshift(updatedRecord);
        }
        itemsToUpsertToSupabase = [normalizeInboundForSupabase(updatedRecord)];
      }

      // 1. 로컬 저장 (0ms 보장, 무손실 원자적 쓰기)
      writeInboundFile(current);

      // 2. Supabase 비동기 듀얼 라이트
      if (itemsToUpsertToSupabase.length > 0) {
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("inbound_schedules").upsert(itemsToUpsertToSupabase, { onConflict: "id" }),
          2500
        )
          .then((res) => {
            if (res.error) {
              console.warn("[Inbound Supabase Dual-Write Notice]:", res.error.message || res.error);
            } else {
              console.log(`[Inbound Supabase Dual-Write Success] Count: ${itemsToUpsertToSupabase.length}`);
            }
          })
          .catch((err) => {
            console.warn("[Inbound Supabase Dual-Write Warning]:", err);
          });
      }

      return NextResponse.json({ success: true, count: current.length, data: current }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      console.error("API /api/admin/inbound error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 입고 스케줄 삭제 (동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithInboundLock(async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return NextResponse.json({ success: false, message: "ID 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const current = readInboundFile();
      const filtered = current.filter((item) => String(item.id) !== String(id));
      
      // 1. 로컬 파일 저장
      writeInboundFile(filtered);

      // 2. Supabase 비동기 듀얼 삭제
      runSafeSupabaseQuery(
        async (supabase) => supabase.from("inbound_schedules").delete().eq("id", id),
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Inbound Supabase Dual-Delete Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Inbound Supabase Dual-Delete Success] ID: ${id}`);
          }
        })
        .catch((err) => {
          console.warn("[Inbound Supabase Dual-Delete Warning]:", err);
        });

      return NextResponse.json({ success: true, count: filtered.length, data: filtered }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
