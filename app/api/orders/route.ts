import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getOrdersFilePath() {
  return path.join(process.cwd(), "data", "orders.json");
}

function readOrdersFile(): any[] {
  try {
    const filePath = getOrdersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Orders File Read Warning]:", err);
  }
  return [];
}

function writeOrdersFile(data: any[]) {
  try {
    const targetPath = getOrdersFilePath();
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
    console.error("[Orders File Write Error]:", err);
  }
}

// GET: 주문 목록 조회 (전체 또는 특정 orderNumber/customerId 검색)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("orderNumber");
  const customerId = url.searchParams.get("customerId");
  const status = url.searchParams.get("status");

  let list = readOrdersFile();

  if (orderNumber) {
    list = list.filter((o) => o.orderNumber === orderNumber || o.id === orderNumber);
  }
  if (customerId) {
    list = list.filter((o) => o.customerId === customerId);
  }
  if (status && status !== "all") {
    list = list.filter((o) => o.paymentStatus === status || o.status === status);
  }

  return NextResponse.json({ success: true, count: list.length, data: list });
}

// POST: 주문 등록 또는 업데이트 (단일 등록/수정 및 배치 지원)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let current = readOrdersFile();

    if (Array.isArray(body)) {
      // 다중 주문 배열 저장/업데이트
      for (const item of body) {
        if (!item) continue;
        const targetId = item.id || item.orderNumber;
        const idx = current.findIndex((o) => o.id === targetId || o.orderNumber === targetId);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...item, updated_at: new Date().toISOString() };
        } else {
          current.unshift({
            ...item,
            id: item.id || item.orderNumber || `ORD-${Date.now()}`,
            orderNumber: item.orderNumber || item.id,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else if (body) {
      const targetId = body.id || body.orderNumber;
      const idx = current.findIndex((o) => (targetId && (o.id === targetId || o.orderNumber === targetId)));
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...body, updated_at: new Date().toISOString() };
      } else {
        current.unshift({
          ...body,
          id: body.id || body.orderNumber || `ORD-${Date.now()}`,
          orderNumber: body.orderNumber || body.id,
          created_at: body.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    writeOrdersFile(current);
    return NextResponse.json({ success: true, count: current.length, data: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: 주문 삭제
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const orderNumber = url.searchParams.get("orderNumber");
    const targetKey = id || orderNumber;

    if (!targetKey) {
      return NextResponse.json({ success: false, message: "주문 식별자 누락" }, { status: 400 });
    }

    const current = readOrdersFile();
    const filtered = current.filter((o) => o.id !== targetKey && o.orderNumber !== targetKey);
    writeOrdersFile(filtered);

    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
