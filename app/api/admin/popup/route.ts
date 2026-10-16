import { NextRequest, NextResponse } from "next/server";
import { EMPTY_POPUP_CONFIG, PopupConfig } from "@/lib/popup/types";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import { logAdminActivity } from "@/lib/logging/audit-logger";
import fs from "fs";
import path from "path";

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

// GET: 팝업 설정 불러오기
export async function GET() {
  try {
    const settings = readSiteSettings();
    if (settings && settings.popup_config) {
      return NextResponse.json(
        {
          success: true,
          config: { ...EMPTY_POPUP_CONFIG, ...settings.popup_config },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, config: EMPTY_POPUP_CONFIG },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: 팝업 설정 저장/동기화하기 (Git 파일 data/site-settings.json & Supabase 동시 저장)
export async function POST(req: NextRequest) {
  try {
    const body: PopupConfig = await req.json();
    if (!body) {
      return NextResponse.json(
        { success: false, error: "설정 데이터가 누락되었습니다." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const updatedConfig: PopupConfig = {
      ...EMPTY_POPUP_CONFIG,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const settings = readSiteSettings();
    const prevConfig = settings.popup_config;
    settings.popup_config = updatedConfig;
    writeSiteSettings(settings);

    // 관리자 팝업 설정 변경 감사 로그 기록
    logAdminActivity({
      adminId: "admin_master",
      adminName: "스토어 관리자",
      actionType: "UPDATE",
      domain: "POPUP",
      targetId: "popup_config",
      targetName: updatedConfig.title || "홈페이지 팝업 공지",
      description: `팝업 설정 저장 (활성화: ${updatedConfig.isActive ? "ON" : "OFF"}, 제목: ${updatedConfig.title || "-"})`,
      beforeData: prevConfig ? { isActive: prevConfig.isActive, title: prevConfig.title } : undefined,
      afterData: { isActive: updatedConfig.isActive, title: updatedConfig.title },
    }).catch(() => {});

    // Supabase site_settings 듀얼 라이트
    runSafeSupabaseQuery(
      async (supabase) => supabase.from("site_settings").upsert([
        { key: "popup_config", value: updatedConfig, description: "관리자 설정 (popup_config)", updated_at: new Date().toISOString() }
      ], { onConflict: "key" }),
      2500
    ).catch((e) => console.warn("[Supabase popup_config save warning]:", e));

    return NextResponse.json(
      { success: true, config: updatedConfig },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("API /api/admin/popup error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE: 팝업 설정 완전 삭제 및 비활성화
export async function DELETE() {
  try {
    const emptyConfig: PopupConfig = {
      ...EMPTY_POPUP_CONFIG,
      updatedAt: new Date().toISOString(),
    };

    const settings = readSiteSettings();
    const prevConfig = settings.popup_config;
    settings.popup_config = emptyConfig;
    writeSiteSettings(settings);

    // 관리자 팝업 삭제 감사 로그 기록
    logAdminActivity({
      adminId: "admin_master",
      adminName: "스토어 관리자",
      actionType: "DELETE",
      domain: "POPUP",
      targetId: "popup_config",
      targetName: "홈페이지 팝업 공지",
      description: "홈페이지 팝업 공지 완전 삭제 및 비활성화",
      beforeData: prevConfig ? { isActive: prevConfig.isActive, title: prevConfig.title } : undefined,
    }).catch(() => {});

    // Supabase site_settings 듀얼 삭제/초기화
    runSafeSupabaseQuery(
      async (supabase) => supabase.from("site_settings").upsert([
        { key: "popup_config", value: emptyConfig, description: "관리자 설정 (popup_config)", updated_at: new Date().toISOString() }
      ], { onConflict: "key" }),
      2500
    ).catch((e) => console.warn("[Supabase popup_config delete warning]:", e));

    return NextResponse.json(
      {
        success: true,
        message: "팝업이 완전히 삭제되었습니다.",
        config: emptyConfig,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("API /api/admin/popup DELETE error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
