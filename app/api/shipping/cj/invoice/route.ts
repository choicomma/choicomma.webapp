import { NextResponse } from "next/server";
import { getCjApiBaseUrl } from "@/lib/cj/token-cache";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    const custId = process.env.CJ_CUST_ID;
    if (!custId) {
      return NextResponse.json({ success: false, error: "Missing CUST_ID" }, { status: 500 });
    }

    // CJ DX API V3.9.5: Raw JSON (Body) with DATA wrapper
    const requestPayload = {
      DATA: {
        CLNTNUM: custId,
        TOKEN_NUM: token,
      },
    };

    const res = await fetch(`${getCjApiBaseUrl()}/ReqInvcNo`, {
      method: "POST",
      headers: {
        "CJ-Gateway-APIKey": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await res.json();
    const resultData = data?.DATA || data;
    const invcNo = resultData?.INVC_NO || data?.INVC_NO;

    const isSuccess = (data?.RESULT_CD === "S" || data?.RSLT_CD === "00") && Boolean(invcNo);

    if (isSuccess && invcNo) {
      return NextResponse.json({
        success: true,
        trackingNumber: invcNo,
        raw: data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data?.RESULT_DETAIL || data?.RSLT_MSG || "송장번호 채번에 실패했습니다.",
          raw: data,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("CJ ReqInvcNo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
