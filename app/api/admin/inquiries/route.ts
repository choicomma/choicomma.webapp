import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function writeInquiriesFile(data: any[]) {
  try {
    const targetPath = getInquiriesFilePath();
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
    console.error("[Inquiries File Write Error]:", err);
  }
}

// GET: 1:1 고객 문의 목록 조회
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // all | pending | completed
  let list = readInquiriesFile();

  if (filter && filter !== "all") {
    list = list.filter((item) => item.status === filter);
  }

  return NextResponse.json({ success: true, count: list.length, data: list });
}

// POST: 문의 등록 또는 답변 저장 (단일 등록, 단일 수정, 전체 동기화 지원)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let current = readInquiriesFile();

    if (Array.isArray(body)) {
      // 전체 배열 동기화
      current = body;
    } else if (body && body.id) {
      const idx = current.findIndex((item) => String(item.id) === String(body.id));
      if (idx !== -1) {
        // 기존 문의 답변/수정
        current[idx] = {
          ...current[idx],
          ...body,
          updated_at: new Date().toISOString(),
        };
      } else {
        // 신규 문의 추가
        current.unshift({
          ...body,
          status: body.status || "pending",
          created_at: body.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    writeInquiriesFile(current);
    return NextResponse.json({ success: true, count: current.length, data: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: 문의 삭제
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID 누락" }, { status: 400 });
    }

    const current = readInquiriesFile();
    const filtered = current.filter((item) => String(item.id) !== String(id));
    writeInquiriesFile(filtered);

    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
