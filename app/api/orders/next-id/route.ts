import { NextResponse } from "next/server";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getTodayKSTDateString, formatOrderId, parseOrderId } from "@/lib/shipping/order-id";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // 1. Supabase 조회 (shipments 및 orders 테이블)
    if (isSupabaseConfigured) {
      try {
        const { data: shipments } = await supabaseServer
          .from("shipments")
          .select("orderId, id")
          .ilike("orderId", `%${today}%`);

        if (Array.isArray(shipments)) {
          shipments.forEach((s) => checkOrderId(s.orderId || s.id));
        }

        const { data: orders } = await supabaseServer
          .from("orders")
          .select("orderNumber, id")
          .ilike("orderNumber", `%${today}%`);

        if (Array.isArray(orders)) {
          orders.forEach((o) => checkOrderId(o.orderNumber || o.id));
        }
      } catch (err) {
        console.warn("[next-id API] Supabase query notice:", err);
      }
    }

    // 2. Mock shipments 원장도 검사
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
    const today = getTodayKSTDateString();
    const fallbackId = formatOrderId(today, 1);
    return NextResponse.json({
      success: true,
      nextOrderId: fallbackId,
      sequence: 1,
      today,
      fallback: true,
    });
  }
}
