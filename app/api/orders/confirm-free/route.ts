import { NextRequest, NextResponse } from "next/server";
import { createConfirmedOrderOnServer } from "@/lib/orders/server-order-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, pendingOrder } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "주문번호(orderId)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const orderResult = await createConfirmedOrderOnServer({
      orderId,
      paymentKey: "FREE",
      amount: 0,
      method:
        pendingOrder?.appliedPoints && Number(pendingOrder.appliedPoints) > 0
          ? "전액 적립금 결제"
          : "전액 할인 쿠폰 결제",
      pendingOrder: pendingOrder || null,
    });

    return NextResponse.json({
      success: true,
      order: orderResult.order,
      shipment: orderResult.shipment,
      alreadyExisted: orderResult.alreadyExisted,
    });
  } catch (error: any) {
    console.error("[Confirm Free Order Error]:", error);
    return NextResponse.json(
      { message: error.message || "0원 주문 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
