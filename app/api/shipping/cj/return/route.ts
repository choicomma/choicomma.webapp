import { NextResponse } from "next/server";
import { getCjToken, registerCjReturnBooking, CjReturnOrderData } from "@/lib/cj/cj-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orderId = body.orderId || `EXC-${Date.now()}`;
    const originalInvoiceNo = (body.originalInvoiceNo || body.trackingNumber || "").replace(/[^0-9]/g, "");

    const returnOrderData: CjReturnOrderData = {
      orderId: orderId,
      originalInvoiceNo: originalInvoiceNo,
      originalOrderId: body.originalOrderId || body.orderId || orderId,
      customerName: body.customerName || body.recipient || "고객",
      customerPhone: body.customerPhone || body.phone || "010-0000-0000",
      customerZipCode: body.customerZipCode || body.zipCode || "04524",
      customerAddress: body.customerAddress || body.address || "서울특별시 중구 세종대로 110",
      customerDetailAddress: body.customerDetailAddress || body.detailAddress || "",
      returnReason: body.returnReason || body.reason || "교환 수거 접수",
      items: body.items || "교환 상품",
      quantity: body.quantity || 1,
    };

    // 1단계: CJ 인증 토큰 발급
    const token = await getCjToken();

    // 2단계: 실제 CJ대한통운 전산에 회수(반품) 예약 접수 (RegBook)
    const bookResult = await registerCjReturnBooking(token, returnOrderData);

    const bookingId = bookResult.responseRaw?.BOOKING_ID || bookResult.responseRaw?.DATA?.BOOKING_ID;
    if (!bookingId) {
      throw new Error(`CJ 전산에서 회수 예약번호(BOOKING_ID)를 반환하지 않았습니다. (응답: ${JSON.stringify(bookResult.responseRaw)})`);
    }

    return NextResponse.json({
      success: true,
      orderId: returnOrderData.orderId,
      originalInvoiceNo: returnOrderData.originalInvoiceNo,
      bookingNumber: bookingId,
      requestPayload: bookResult.requestPayload,
      responseRaw: bookResult.responseRaw,
      message: "CJ대한통운 교환(회수) 접수가 성공적으로 완료되었습니다.",
    });
  } catch (error: any) {
    console.error("[CJ Return API Error]", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "CJ대한통운 교환 수거 접수에 실패했습니다.",
        detail: error.stack || String(error)
      },
      { status: 500 }
    );
  }
}
