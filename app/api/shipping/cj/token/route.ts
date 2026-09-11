import { NextResponse } from "next/server";
import { getCjApiBaseUrl, getCachedCjToken, setCachedCjToken } from "@/lib/cj/token-cache";

export async function POST(req: Request) {
  try {
    const cachedToken = getCachedCjToken();
    if (cachedToken) {
      return NextResponse.json({ success: true, token: cachedToken, cached: true });
    }

    const custId = process.env.CJ_CUST_ID;
    const bizRegNum = process.env.CJ_BIZ_REG_NUM;

    if (!custId || !bizRegNum) {
      return NextResponse.json(
        { success: false, error: "Missing CJ API Credentials (CUST_ID or BIZ_REG_NUM)" },
        { status: 500 }
      );
    }

    // DX API ReqOneDayToken requires CUST_ID and BIZ_REG_NUM
    const formData = new URLSearchParams();
    formData.append("CUST_ID", custId);
    formData.append("BIZ_REG_NUM", bizRegNum);

    const res = await fetch(`${getCjApiBaseUrl()}/ReqOneDayToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await res.json();

    // DX API Response: { RSLT_CD: "00", RSLT_MSG: "정상", TOKEN_NUM: "..." }
    if (data && (data.RSLT_CD === "00" || data.TOKEN_NUM)) {
      const token = data.TOKEN_NUM || data.token;
      // 24 hours caching
      setCachedCjToken(token, 24 * 60 * 60 * 1000);
      return NextResponse.json({ success: true, token, raw: data });
    } else {
      const errorMsg = data?.RSLT_MSG || data?.RESULT_DETAIL || "Failed to generate token";
      return NextResponse.json(
        { success: false, error: errorMsg, raw: data },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("CJ ReqOneDayToken Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
