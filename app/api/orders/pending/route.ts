import { NextRequest, NextResponse } from "next/server";
import {
  savePendingOrderOnServer,
  getPendingOrderOnServer,
  removePendingOrderOnServer,
  PendingOrderData,
} from "@/lib/orders/server-order-service";

export const dynamic = "force-dynamic";

// POST: 보류 주문 임시 저장 (Layer 3 서버 백업)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.orderId || body.pendingOrder?.orderId;
    const pendingOrder: PendingOrderData = body.pendingOrder || body;

    if (!orderId || !pendingOrder) {
      return NextResponse.json(
        { success: false, message: "orderId 또는 pendingOrder 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const saved = savePendingOrderOnServer(orderId, pendingOrder);
    return NextResponse.json({ success: saved, orderId });
  } catch (error: any) {
    console.error("[POST /api/orders/pending Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "보류 주문 저장 실패" },
      { status: 500 }
    );
  }
}

// GET: 보류 주문 조회 (orderId 기준)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId가 필요합니다." },
        { status: 400 }
      );
    }

    const data = getPendingOrderOnServer(orderId);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "보류 주문을 찾을 수 없습니다.", data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[GET /api/orders/pending Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "보류 주문 조회 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 보류 주문 삭제 (orderId 기준)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId가 필요합니다." },
        { status: 400 }
      );
    }

    removePendingOrderOnServer(orderId);
    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("[DELETE /api/orders/pending Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "보류 주문 삭제 실패" },
      { status: 500 }
    );
  }
}
