import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { message: "결제 요청 필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY || "test_gsk_docs_Oabc1234567890";
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

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Toss Payments Confirmation Error:", error);
    return NextResponse.json(
      { message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
