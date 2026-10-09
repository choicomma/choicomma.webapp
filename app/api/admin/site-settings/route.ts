import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const settings = readSiteSettings();

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

    writeSiteSettings(settings);
    return NextResponse.json({ success: true, settings }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
