import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTimesaleFilePath() {
  return path.join(process.cwd(), "data", "timesales.json");
}

function readTimesaleFile(): any[] {
  try {
    const filePath = getTimesaleFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Timesale File Read Warning]:", err);
  }
  return [];
}

function writeTimesaleFile(data: any[]) {
  try {
    const targetPath = getTimesaleFilePath();
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
    console.error("[Timesale File Write Error]:", err);
  }
}

export async function GET() {
  const list = readTimesaleFile();
  return NextResponse.json({ success: true, data: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let current = readTimesaleFile();

    if (Array.isArray(body)) {
      current = body.filter((t: any) => t?.id !== "SECRET-TS-001");
    } else if (body && body.id) {
      if (body.id === "SECRET-TS-001") {
        return NextResponse.json({ success: true, data: current });
      }
      const idx = current.findIndex((item) => String(item.id) === String(body.id));
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...body, updated_at: new Date().toISOString() };
      } else {
        current.unshift({ ...body, created_at: new Date().toISOString() });
      }
    }

    writeTimesaleFile(current);
    return NextResponse.json({ success: true, count: current.length, data: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID 누락" }, { status: 400 });
    }

    const current = readTimesaleFile();
    const filtered = current.filter((item) => String(item.id) !== String(id));
    writeTimesaleFile(filtered);

    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
