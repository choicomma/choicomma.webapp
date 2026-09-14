import { NextResponse } from "next/server";
import { getCjApiBaseUrl } from "@/lib/cj/token-cache";

export async function POST(req: Request) {
  try {
    const { token, address } = await req.json();

    if (!token || !address) {
      return NextResponse.json({ success: false, error: "Missing token or address" }, { status: 400 });
    }

    const custId = process.env.CJ_CUST_ID;
    if (!custId) {
      return NextResponse.json({ success: false, error: "Missing CUST_ID" }, { status: 500 });
    }

    // CJ DX API V3.9.5: Raw JSON (Body) with DATA wrapper
    const requestPayload = {
      DATA: {
        TOKEN_NUM: token,
        CLNTNUM: custId,
        CLNTMGMCUSTCD: custId,
        ADDRESS: address,
      },
    };

    const res = await fetch(`${getCjApiBaseUrl()}/ReqAddrRfnSm`, {
      method: "POST",
      headers: {
        "CJ-Gateway-APIKey": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await res.json();
    const resultObj = data?.DATA || data;

    const isSuccess = data?.RESULT_CD === "S" || data?.RSLT_CD === "00" || Boolean(resultObj?.CLSFCD);

    if (isSuccess && resultObj) {
      return NextResponse.json({
        success: true,
        clsfCd: resultObj.CLSFCD || "4W44",
        subClsfCd: resultObj.SUBCLSFCD || "-4g",
        clldlvempNickNm: resultObj.CLLDLVEMPNICKNM || "A01-1구역",
        clsfAddr: resultObj.CLSFADDR || address.split(" ").slice(-2).join(" "),
        clldlvBranNm: resultObj.CLLDLVBRANNM || "대한통운",
        p2pCd: resultObj.P2PCD || "P1",
        raw: data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data?.RESULT_DETAIL || data?.RSLT_MSG || "주소 정제에 실패했습니다.",
          raw: data,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("CJ ReqAddrRfnSm Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
