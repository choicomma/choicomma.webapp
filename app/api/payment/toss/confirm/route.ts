import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
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
      return NextResponse.json(
        { message: data.message || "토스페이먼츠 결제 승인에 실패하였습니다." },
        { status: response.status }
      );
    }

    // Supabase payment_logs 테이블에 결제 승인 로그 영속 저장
    try {
      await supabaseServer.from("payment_logs").upsert(
        [
          {
            id: `PAY-${orderId}-${Date.now().toString().slice(-4)}`,
            orderId: orderId,
            paymentKey: paymentKey,
            amount: Number(amount),
            status: data.status || "DONE",
            method: data.method || "간편결제",
            approvedAt: data.approvedAt || new Date().toISOString(),
            rawResponse: data,
          },
        ],
        { onConflict: "paymentKey" }
      );
    } catch (dbErr) {
      console.warn("Notice: Failed to insert payment_log into Supabase:", dbErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Toss Payments Confirmation Error:", error);
    return NextResponse.json(
      { message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
