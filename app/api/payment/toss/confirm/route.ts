import { NextRequest, NextResponse } from "next/server";
import { createConfirmedOrderOnServer } from "@/lib/orders/server-order-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentKey, orderId, amount, pendingOrder } = body;

    if (!paymentKey || !orderId || amount === undefined || amount === null) {
      return NextResponse.json(
        { message: "결제 요청 필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const secretKey =
      process.env.TOSS_SECRET_KEY && !process.env.TOSS_SECRET_KEY.includes("docs_")
        ? process.env.TOSS_SECRET_KEY
        : "live_sk_EP59LybZ8BzymnjAKw2k86GYo7pR";
    const basicAuthToken = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 이미 승인 완료된 결제인 경우(새로고침 또는 네트워크 재시도) 서버 주문 정보 복원 후 정상 처리
      if (
        data?.code === "ALREADY_PROCESSED_PAYMENT" ||
        data?.message?.includes("이미 처리된 결제")
      ) {
        try {
          const existingResult = await createConfirmedOrderOnServer({
            orderId,
            paymentKey,
            amount: Number(amount),
            method: data?.method || "신용·체크카드 (토스)",
            pendingOrder: pendingOrder || null,
            rawPaymentData: data,
          });
          return NextResponse.json({
            success: true,
            data,
            order: existingResult?.order || null,
            shipment: existingResult?.shipment || null,
            alreadyExisted: true,
          });
        } catch (e) {}
      }

      return NextResponse.json(
        { message: data.message || "토스페이먼츠 결제 승인에 실패하였습니다." },
        { status: response.status }
      );
    }

    // 결제 승인 성공 즉시 서버 원자적 주문서 + 배송서 + 결제로그 + 재고차감 동시 생성
    let orderResult: any = null;
    try {
      orderResult = await createConfirmedOrderOnServer({
        orderId,
        paymentKey,
        amount: Number(amount),
        method: data.method,
        pendingOrder: pendingOrder || null,
        rawPaymentData: data,
      });
    } catch (orderErr) {
      console.error("[Toss Confirm: Atomic Order Creation Error]:", orderErr);
    }

    return NextResponse.json({
      success: true,
      data,
      order: orderResult?.order || null,
      shipment: orderResult?.shipment || null,
      alreadyExisted: orderResult?.alreadyExisted || false,
    });
  } catch (error: any) {
    console.error("Toss Payments Confirmation Error:", error);
    return NextResponse.json(
      { message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
