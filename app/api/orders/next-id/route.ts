import { NextResponse } from "next/server";
import { reserveNextOrderId } from "@/lib/orders/order-counter-service";
import { getTodayKSTDateString, formatOrderId } from "@/lib/shipping/order-id";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await reserveNextOrderId();
    return NextResponse.json({
      success: true,
      nextOrderId: result.orderId,
      sequence: result.seq,
      today: result.date,
    });
  } catch (error: any) {
    console.error("[next-id GET API Error]:", error);
    const today = getTodayKSTDateString();
    return NextResponse.json({
      success: true,
      nextOrderId: formatOrderId(today, 1),
      sequence: 1,
      today,
    });
  }
}

export async function POST() {
  try {
    const result = await reserveNextOrderId();
    return NextResponse.json({
      success: true,
      nextOrderId: result.orderId,
      sequence: result.seq,
      today: result.date,
    });
  } catch (error: any) {
    console.error("[next-id POST API Error]:", error);
    const today = getTodayKSTDateString();
    return NextResponse.json({
      success: true,
      nextOrderId: formatOrderId(today, 1),
      sequence: 1,
      today,
    });
  }
}
