import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function writeInboundFile(data: any[]) {
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
  } catch (err) {
    console.error("[Inbound File Write Error]:", err);
  }
}

export async function GET() {
  const list = readInboundFile();
  return NextResponse.json({ success: true, data: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let current = readInboundFile();

    if (Array.isArray(body)) {
      current = body;
    } else if (body && body.id) {
      const idx = current.findIndex((item) => String(item.id) === String(body.id));
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...body, updated_at: new Date().toISOString() };
      } else {
        current.unshift({ ...body, created_at: new Date().toISOString() });
      }
    }

    writeInboundFile(current);
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

    const current = readInboundFile();
    const filtered = current.filter((item) => String(item.id) !== String(id));
    writeInboundFile(filtered);

    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
