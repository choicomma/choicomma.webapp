import { NextResponse } from "next/server";
import { getCjToken, registerCjReturnBooking, CjReturnOrderData } from "@/lib/cj/cj-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.originalInvoiceNo) {
      return NextResponse.json(
        { success: false, error: "원 출고 운송장번호(originalInvoiceNo)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const token = await getCjToken();

    const returnOrderData: CjReturnOrderData = {
      orderId: body.orderId || `RET-${Date.now()}`,
      originalInvoiceNo: body.originalInvoiceNo,
      originalOrderId: body.originalOrderId || body.orderId,
      customerName: body.customerName || body.recipient || "고객",
      customerPhone: body.customerPhone || body.phone || "010-0000-0000",
      customerZipCode: body.customerZipCode || body.zipCode || "04524",
      customerAddress: body.customerAddress || body.address || "",
      customerDetailAddress: body.customerDetailAddress || body.detailAddress || "",
      returnReason: body.returnReason || body.reason || "고객 반품 요청",
      items: body.items || "반품 상품",
      quantity: body.quantity || 1,
    };

    const bookResult = await registerCjReturnBooking(token, returnOrderData);

    return NextResponse.json({
      success: true,
      orderId: returnOrderData.orderId,
      originalInvoiceNo: returnOrderData.originalInvoiceNo,
      requestPayload: bookResult.requestPayload,
      responseRaw: bookResult.responseRaw,
    });
  } catch (error: any) {
    console.error("[CJ Return API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "CJ 반품 예약 접수 실패" },
      { status: 500 }
    );
  }
}
