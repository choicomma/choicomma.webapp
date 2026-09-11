import { NextResponse } from "next/server";
import { getCjApiBaseUrl } from "@/lib/cj/token-cache";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { token, invoiceNo, order } = payload;

    if (!token || !invoiceNo || !order) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const custId = process.env.CJ_CUST_ID;
    if (!custId) {
      return NextResponse.json({ success: false, error: "Missing CUST_ID" }, { status: 500 });
    }

    // Prepare JSON payload for RegBook
    // According to DX API Guide, RegBook takes a JSON payload inside a form parameter or raw JSON,
    // usually DX API RegBook expects `JSONData` form field or raw application/json.
    // Based on typical DX API V3.9.5: Content-Type: application/json
    
    const requestBody = {
      CUST_ID: custId,
      TOKEN_NUM: token,
      INVC_NO: invoiceNo,
      // Sender Info
      SENDR_NM: process.env.CJ_SENDER_NAME || "주식회사 초이콤마",
      SENDR_TEL_NO1: (process.env.CJ_SENDER_TEL || "02-579-1171").replace(/-/g, ""),
      SENDR_ZIP_NO: process.env.CJ_SENDER_ZIP || "06307",
      SENDR_ADDR: process.env.CJ_SENDER_ADDR1 || "서울특별시 강남구 개포동 개포로22길",
      SENDR_DETAIL_ADDR: process.env.CJ_SENDER_ADDR2 || "12, 6층",
      // Receiver Info
      RCVR_NM: order.recipient,
      RCVR_TEL_NO1: (order.phone || "").replace(/-/g, ""),
      RCVR_TEL_NO2: (order.altPhone || "").replace(/-/g, ""),
      RCVR_ZIP_NO: (order.zipCode || "").replace(/-/g, ""),
      RCVR_ADDR: order.address || "",
      RCVR_DETAIL_ADDR: order.detailAddress || "",
      // Product Info
      PRDT_NM: order.items || "의류",
      PRDT_QTY: order.quantity?.toString() || "1",
      PRDT_AMT: "0",
      // Other
      DLV_MSG: order.shippingMemo || "",
      BOX_TYPE: "01", // 극소(01), 소(02), 중(03)...
    };

    const res = await fetch(`${getCjApiBaseUrl()}/RegBook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (data && data.RSLT_CD === "00") {
      return NextResponse.json({ 
        success: true, 
        raw: data 
      });
    } else {
      return NextResponse.json({ success: false, error: data?.RSLT_MSG || "Booking registration failed", raw: data }, { status: 400 });
    }
  } catch (error: any) {
    console.error("CJ RegBook Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
