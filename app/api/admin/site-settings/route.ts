import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import { logAdminActivity } from "@/lib/logging/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSettingsFilePath() {
  return path.join(process.cwd(), "data", "site-settings.json");
}

function readSiteSettings(): Record<string, any> {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[Site Settings File Read Warning]:", err);
  }
  return {};
}

function writeSiteSettings(settings: Record<string, any>) {
  const targetPath = getSettingsFilePath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonStr = JSON.stringify(settings, null, 2);
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      try {
        fs.renameSync(tempPath, targetPath);
      } catch (renameErr) {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
        fs.writeFileSync(targetPath, jsonStr, "utf-8");
      }
      return;
    } catch (err: any) {
      lastError = err;
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
  }

  try {
    fs.writeFileSync(targetPath, jsonStr, "utf-8");
  } catch (finalErr) {
    console.error("[Site Settings File Write Error]:", lastError || finalErr);
  }
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  let settings = readSiteSettings();

  // 비상 복구(Self-Healing): 로컬 설정 파일이 비어있는 경우 Supabase에서 복구 시도
  if (Object.keys(settings).length === 0) {
    try {
      const { data, error } = await runSafeSupabaseQuery<Array<{ key: string; value: any }>>(
        async (supabase) => supabase.from("site_settings").select("key, value"),
        1500
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        const recovered: Record<string, any> = {};
        data.forEach((row) => {
          recovered[row.key] = row.value;
        });
        settings = recovered;
        writeSiteSettings(settings); // 로컬 캐시 자가 복구
      }
    } catch (fallbackErr) {
      console.warn("[Site Settings Remote Fallback Warning]:", fallbackErr);
    }
  }

  if (key) {
    return NextResponse.json(
      { success: true, key, value: settings[key] || null },
      { headers: NO_CACHE_HEADERS }
    );
  }

  return NextResponse.json({ success: true, settings }, { headers: NO_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = readSiteSettings();

    if (body.key && body.value !== undefined) {
      settings[body.key] = body.value;
    } else if (typeof body === "object") {
      Object.assign(settings, body);
    }

    // 1. 로컬 JSON 저장 (0ms 보장, 무손실 원자적 쓰기)
    writeSiteSettings(settings);

    // 관리자 스토어 설정 변경 감사 로그 기록
    logAdminActivity({
      adminId: "admin_master",
      adminName: "총괄 관리자",
      actionType: "UPDATE",
      domain: "SETTINGS",
      targetId: body.key || "store_settings",
      targetName: body.key ? `스토어 설정 (${body.key})` : "스토어 운영 및 배송 정책",
      description: body.key ? `스토어 설정 항목 [${body.key}] 값 수정 저장` : "스토어 운영 정책 및 기본 설정 변경 저장",
      afterData: body,
    }).catch(() => {});

    // 2. Supabase 비동기 듀얼 라이트 (Safe Dual-Write)
    // 네트워크 지연이나 DB 일시정지 상태여도 응답이 지연되거나 에러가 전파되지 않도록 비동기 안전 실행
    try {
      const supabaseUpsertRows =
        body.key && body.value !== undefined
          ? [
              {
                key: body.key,
                value: body.value,
                description: `관리자 설정 (${body.key})`,
                updated_at: new Date().toISOString(),
              },
            ]
          : Object.keys(body).map((k) => ({
              key: k,
              value: body[k],
              description: `관리자 설정 (${k})`,
              updated_at: new Date().toISOString(),
            }));

      if (supabaseUpsertRows.length > 0) {
        // 비동기 실행 (클라이언트 응답 지연 0ms)
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("site_settings").upsert(supabaseUpsertRows, { onConflict: "key" }),
          2500
        ).then((res) => {
          if (res.error) {
            console.warn("[Site Settings Supabase Dual-Write Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Site Settings Supabase Dual-Write Success] ${supabaseUpsertRows.length}개 키 동기화 완료`);
          }
        }).catch((err) => {
          console.warn("[Site Settings Supabase Dual-Write Warning]:", err);
        });
      }
    } catch (dualWriteErr) {
      console.warn("[Site Settings Dual-Write Prep Warning]:", dualWriteErr);
    }

    return NextResponse.json({ success: true, settings }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
