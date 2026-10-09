import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTodayKSTDateString, formatOrderId, parseOrderId } from "@/lib/shipping/order-id";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readJsonFileSafe(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn(`[Read Warning: ${filePath}]:`, err);
  }
  return [];
}

export async function GET() {
  try {
    const today = getTodayKSTDateString();
    let maxSeq = 0;

    const checkOrderId = (ordId: string | undefined | null) => {
      if (!ordId || typeof ordId !== "string") return;
      const parsed = parseOrderId(ordId);
      if (parsed && parsed.date === today && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    };

    // 1. data/shipments.json 검사
    const shipmentsPath = path.join(process.cwd(), "data", "shipments.json");
    const shipments = readJsonFileSafe(shipmentsPath);
    shipments.forEach((s) => checkOrderId(s.orderId || s.id));

    // 2. data/orders.json 검사
    const ordersPath = path.join(process.cwd(), "data", "orders.json");
    const orders = readJsonFileSafe(ordersPath);
    orders.forEach((o) => checkOrderId(o.orderNumber || o.id));

    // 3. Fallback mock shipments 검사
    if (Array.isArray(initialShipments)) {
      initialShipments.forEach((s: any) => checkOrderId(s.orderId || s.id));
    }

    const nextSeq = maxSeq + 1;
    const nextOrderId = formatOrderId(today, nextSeq);

    return NextResponse.json({
      success: true,
      nextOrderId,
      sequence: nextSeq,
      today,
    });
  } catch (error: any) {
    console.error("[next-id API Error]:", error);
    const today = getTodayKSTDateString();
    return NextResponse.json({
      success: true,
      nextOrderId: formatOrderId(today, 1),
      sequence: 1,
      today,
    });
  }
}
