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

    const formData = new URLSearchParams();
    formData.append("CUST_ID", custId);
    formData.append("TOKEN_NUM", token);
    formData.append("ADDR", address); // 고객 주소

    const res = await fetch(`${getCjApiBaseUrl()}/ReqAddrRfnSm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await res.json();

    if (data && data.RSLT_CD === "00") {
      return NextResponse.json({ 
        success: true, 
        clsfCd: data.CLSFCD,                   // 분류코드 (4W44)
        subClsfCd: data.SUBCLSFCD,             // 서브분류코드 (-4g)
        clldlvempNickNm: data.CLLDLVEMPNICKNM, // 기사사번/구역명 (A01-1구역)
        clsfAddr: data.CLSFADDR,               // 주소약칭 (동/호수/건물명)
        clldlvBranNm: data.CLLDLVBRANNM,       // 배달점소명 (대한통운)
        p2pCd: data.P2PCD,                     // 권내배송코드 (P1 등)
        raw: data 
      });
    } else {
      return NextResponse.json({ success: false, error: data?.RSLT_MSG || "Address refinement failed", raw: data }, { status: 400 });
    }
  } catch (error: any) {
    console.error("CJ ReqAddrRfnSm Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
