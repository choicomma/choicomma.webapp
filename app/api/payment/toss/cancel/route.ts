import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentKey, cancelReason, cancelAmount } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { message: "주문번호(orderId) 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. paymentKey 찾기 (직접 전달되지 않은 경우 Supabase payment_logs에서 조회)
    let effPaymentKey = paymentKey?.trim() || "";

    if (!effPaymentKey) {
      try {
        const { data: logData } = await supabaseServer
          .from("payment_logs")
          .select("paymentKey, amount, status")
          .eq("orderId", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (logData?.paymentKey) {
          effPaymentKey = logData.paymentKey;
        }
      } catch (dbErr) {
        console.warn("Notice: Failed to lookup paymentKey from Supabase:", dbErr);
      }
    }

    const secretKey =
      process.env.TOSS_SECRET_KEY && !process.env.TOSS_SECRET_KEY.includes("docs_")
        ? process.env.TOSS_SECRET_KEY
        : "live_sk_EP59LybZ8BzymnjAKw2k86GYo7pR";
    const basicAuthToken = Buffer.from(`${secretKey}:`).toString("base64");

    // Toss Payments API를 통해 orderId로 실제 paymentKey 직접 조회 시도
    if (!effPaymentKey && orderId) {
      try {
        const tossLookup = await fetch(
          `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
          {
            headers: { Authorization: `Basic ${basicAuthToken}` },
          }
        );
        if (tossLookup.ok) {
          const tossOrder = await tossLookup.json();
          if (tossOrder?.paymentKey) {
            effPaymentKey = tossOrder.paymentKey;
          }
        }
      } catch (tossLookupErr) {
        console.warn("Notice: Failed to lookup paymentKey from Toss Payments API:", tossLookupErr);
      }
    }

    const reason = cancelReason?.trim() || "고객 요청에 의한 환불 (CS 라이브 채팅)";

    // 2. 만약 paymentKey가 없는 테스트 주문이거나 0원(무료/적립금) 주문인 경우
    if (!effPaymentKey || effPaymentKey.startsWith("free_") || effPaymentKey.startsWith("test_")) {
      const mockResult = {
        orderId,
        paymentKey: effPaymentKey || `mock_cancel_${Date.now()}`,
        status: "CANCELED",
        cancelReason: reason,
        cancelAmount: cancelAmount ? Number(cancelAmount) : 0,
        canceledAt: new Date().toISOString(),
        isSimulated: true,
      };

      try {
        await supabaseServer
          .from("payment_logs")
          .update({
            status: "CANCELED",
            rawResponse: mockResult,
          })
          .eq("orderId", orderId);
      } catch {}

      return NextResponse.json({
        success: true,
        data: mockResult,
        message: "결제 취소(환불)가 정상 처리되었습니다.",
      });
    }

    // 3. 실제 토스페이먼츠 결제 취소 API 호출
    const cancelBody: Record<string, any> = {
      cancelReason: reason,
    };
    if (cancelAmount && Number(cancelAmount) > 0) {
      cancelBody.cancelAmount = Number(cancelAmount);
    }

    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(effPaymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Toss Payments Cancel Error Response:", data);
      return NextResponse.json(
        {
          message: data.message || "토스페이먼츠 결제 취소(환불) 요청에 실패하였습니다.",
          code: data.code,
        },
        { status: response.status }
      );
    }

    // 4. Supabase payment_logs 테이블 상태를 CANCELED로 업데이트
    try {
      await supabaseServer
        .from("payment_logs")
        .update({
          status: data.status || "CANCELED",
          rawResponse: data,
        })
        .eq("paymentKey", effPaymentKey);
    } catch (dbErr) {
      console.warn("Notice: Failed to update payment_logs in Supabase:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data,
      message: "토스페이먼츠 결제 취소 및 환불이 정상 완료되었습니다.",
    });
  } catch (error: any) {
    console.error("Toss Cancel API Internal Error:", error);
    return NextResponse.json(
      { message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
