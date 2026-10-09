import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function getCouponsFilePath() {
  return path.join(process.cwd(), "data", "coupons.json");
}

function getSettingsFilePath() {
  return path.join(process.cwd(), "data", "site-settings.json");
}

function readCouponsFile(): any[] {
  try {
    const filePath = getCouponsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("[Coupons File Read Warning]:", err);
  }

  // Fallback to site-settings.json if coupons.json is empty
  try {
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(raw);
      if (Array.isArray(settings?.admin_coupons_config)) {
        return settings.admin_coupons_config;
      }
    }
  } catch (err) {
    console.warn("[Coupons Fallback Read Warning]:", err);
  }

  return [];
}

function writeCouponsFile(data: any[]) {
  try {
    const targetPath = getCouponsFilePath();
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
    console.error("[Coupons File Write Error]:", err);
  }

  // Mirror to site-settings.json admin_coupons_config for double safety
  try {
    const settingsPath = getSettingsFilePath();
    let settings: Record<string, any> = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      } catch {}
    }
    settings.admin_coupons_config = data;
    const tempSettings = `${settingsPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const setJsonStr = JSON.stringify(settings, null, 2);
    try {
      fs.writeFileSync(tempSettings, setJsonStr, "utf-8");
      fs.renameSync(tempSettings, settingsPath);
    } catch {
      try {
        if (fs.existsSync(tempSettings)) fs.unlinkSync(tempSettings);
      } catch {}
      fs.writeFileSync(settingsPath, setJsonStr, "utf-8");
    }
  } catch (err) {
    console.warn("[Site Settings Mirror Write Notice]:", err);
  }
}

// GET: 쿠폰 목록 조회 (Git data/coupons.json 및 site-settings 기준)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const code = url.searchParams.get("code")?.toUpperCase();

    const list = readCouponsFile();

    if (id) {
      const found = list.find((c) => c.id === id);
      return NextResponse.json({ success: true, coupon: found || null }, { headers: NO_CACHE_HEADERS });
    }

    if (code) {
      const found = list.find((c) => (c.code || "").toUpperCase() === code);
      return NextResponse.json({ success: true, coupon: found || null }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      { success: true, count: list.length, coupons: list },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: 쿠폰 일괄 저장 또는 단일 쿠폰 등록/수정 (원자적 영속화)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      writeCouponsFile(body);
      return NextResponse.json(
        { success: true, count: body.length, coupons: body },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (body.coupons && Array.isArray(body.coupons)) {
      writeCouponsFile(body.coupons);
      return NextResponse.json(
        { success: true, count: body.coupons.length, coupons: body.coupons },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 단일 쿠폰 추가/수정
    if (!body || !body.id) {
      return NextResponse.json(
        { success: false, error: "쿠폰 식별자(id)는 필수입니다." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const current = readCouponsFile();
    const targetId = String(body.id).trim();
    const idx = current.findIndex((c) => String(c.id).trim() === targetId);

    if (idx !== -1) {
      current[idx] = { ...current[idx], ...body, updatedAt: new Date().toISOString() };
    } else {
      current.unshift({
        ...body,
        createdAt: body.createdAt || new Date().toISOString().split("T")[0],
      });
    }

    writeCouponsFile(current);
    return NextResponse.json(
      { success: true, coupon: body, coupons: current },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("API /api/admin/coupons error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// DELETE: 쿠폰 삭제
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "쿠폰 식별자(id) 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const current = readCouponsFile();
    const filtered = current.filter((c) => String(c.id) !== id);

    writeCouponsFile(filtered);
    return NextResponse.json(
      { success: true, count: filtered.length, coupons: filtered },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
