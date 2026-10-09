import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_POPUP_CONFIG, PopupConfig } from "@/lib/popup/types";
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

  // Retry up to 3 times for Windows/OneDrive locks
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

  // Final direct fallback
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
          config: { ...DEFAULT_POPUP_CONFIG, ...settings.popup_config },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, config: DEFAULT_POPUP_CONFIG },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: 팝업 설정 저장/동기화하기 (Git 파일 data/site-settings.json에 저장)
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
      ...DEFAULT_POPUP_CONFIG,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const settings = readSiteSettings();
    settings.popup_config = updatedConfig;
    writeSiteSettings(settings);

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
