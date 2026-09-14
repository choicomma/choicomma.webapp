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

    const todayYYYYMMDD = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const splitPhone = (phoneStr: string) => {
      const digits = (phoneStr || "").replace(/[^0-9]/g, "");
      if (digits.startsWith("02")) {
        return [digits.slice(0, 2), digits.slice(2, digits.length - 4), digits.slice(digits.length - 4)];
      }
      if (digits.length >= 10) {
        return [digits.slice(0, 3), digits.slice(3, digits.length - 4), digits.slice(digits.length - 4)];
      }
      return [digits.slice(0, 3) || "010", digits.slice(3, 7) || "0000", digits.slice(7) || "0000"];
    };

    const sendTelParts = splitPhone(process.env.CJ_SENDER_TEL || "02-579-1171");
    const rcvrTelParts = splitPhone(order.phone || "010-0000-0000");

    const senderName = process.env.CJ_SENDER_NAME || "주식회사 초이콤마";
    const senderZip = (process.env.CJ_SENDER_ZIP || "06307").replace(/[^0-9]/g, "");
    const senderAddr = process.env.CJ_SENDER_ADDR1 || "서울특별시 강남구 개포동 개포로22길";
    const senderDetailAddr = process.env.CJ_SENDER_ADDR2 || "12, 6층";

    const cleanInvoiceNo = (invoiceNo || "").replace(/[^0-9]/g, "");

    // CJ대한통운 가이드라인 규격: 주소 3번째 공백 기준 기본주소/상세주소 강제 분리
    const fullAddress = `${order.address || ""} ${order.detailAddress || ""}`.replace(/\s+/g, " ").trim();
    const addressParts = fullAddress.split(" ");
    let finalRcvrAddr = fullAddress;
    let finalRcvrDetailAddr = "";

    if (addressParts.length > 3) {
      finalRcvrAddr = addressParts.slice(0, 3).join(" ");
      finalRcvrDetailAddr = addressParts.slice(3).join(" ");
    }

    // CJ DX API V3.9.5: Raw JSON with DATA wrapper
    const requestPayload = {
      DATA: {
        TOKEN_NUM: token,
        CUST_ID: custId,
        RCPT_YMD: todayYYYYMMDD,
        CUST_USE_NO: order.orderId || `ORD-${Date.now()}`,
        RCPT_DV: "01",        // 01: 일반
        WORK_DV_CD: "01",     // 01: 일반
        REQ_DV_CD: "01",      // 01: 요청
        MPCK_KEY: `${todayYYYYMMDD}_${custId}_${order.orderId || Date.now()}`,
        CAL_DV_CD: "01",      // 01: 계약운임
        FRT_DV_CD: "03",      // 03: 신용
        CNTR_ITEM_CD: "01",   // 01: 일반품목
        BOX_TYPE_CD: "01",    // 01: 극소
        BOX_QTY: "1",
        FRT: "",
        CUST_MGMT_DLCM_CD: custId,
        // 보내는분
        SENDR_NM: senderName,
        SENDR_TEL_NO1: sendTelParts[0] || "02",
        SENDR_TEL_NO2: sendTelParts[1] || "579",
        SENDR_TEL_NO3: sendTelParts[2] || "1171",
        SENDR_CELL_NO1: sendTelParts[0] || "02",
        SENDR_CELL_NO2: sendTelParts[1] || "579",
        SENDR_CELL_NO3: sendTelParts[2] || "1171",
        SENDR_ZIP_NO: senderZip,
        SENDR_ADDR: senderAddr,
        SENDR_DETAIL_ADDR: senderDetailAddr,
        // 받는분
        RCVR_NM: order.recipient || "고객",
        RCVR_TEL_NO1: rcvrTelParts[0] || "010",
        RCVR_TEL_NO2: rcvrTelParts[1] || "0000",
        RCVR_TEL_NO3: rcvrTelParts[2] || "0000",
        RCVR_CELL_NO1: rcvrTelParts[0] || "010",
        RCVR_CELL_NO2: rcvrTelParts[1] || "0000",
        RCVR_CELL_NO3: rcvrTelParts[2] || "0000",
        RCVR_ZIP_NO: (order.zipCode || "").replace(/[^0-9]/g, ""),
        RCVR_ADDR: finalRcvrAddr,
        RCVR_DETAIL_ADDR: finalRcvrDetailAddr,
        // 주문자
        ORDRR_NM: order.recipient || "고객",
        ORDRR_TEL_NO1: rcvrTelParts[0] || "010",
        ORDRR_TEL_NO2: rcvrTelParts[1] || "0000",
        ORDRR_TEL_NO3: rcvrTelParts[2] || "0000",
        ORDRR_CELL_NO1: rcvrTelParts[0] || "010",
        ORDRR_CELL_NO2: rcvrTelParts[1] || "0000",
        ORDRR_CELL_NO3: rcvrTelParts[2] || "0000",
        ORDRR_ZIP_NO: (order.zipCode || "").replace(/[^0-9]/g, ""),
        ORDRR_ADDR: finalRcvrAddr,
        ORDRR_DETAIL_ADDR: finalRcvrDetailAddr,
        // 송장정보
        INVC_NO: cleanInvoiceNo,
        PRT_ST: "02",         // 02: 선출력 (자가출력)
        ARTICLE_AMT: "10000",
        REMARK_1: order.shippingMemo || "",
        DLV_DV: "01",         // 01: 택배
        ARRAY: [
          {
            MPCK_SEQ: "1",
            GDS_CD: "01",
            GDS_NM: order.items || "의류",
            GDS_QTY: order.quantity?.toString() || "1",
            UNIT_CD: "EA",
            UNIT_NM: "개",
            GDS_AMT: "10000",
          },
        ],
      },
    };

    const res = await fetch(`${getCjApiBaseUrl()}/RegBook`, {
      method: "POST",
      headers: {
        "CJ-Gateway-APIKey": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await res.json();
    const isSuccess = data?.RESULT_CD === "S" || data?.RSLT_CD === "00";

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        raw: data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data?.RESULT_DETAIL || data?.RSLT_MSG || "예약 접수에 실패했습니다.",
          raw: data,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("CJ RegBook Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
