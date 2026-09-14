import { NextResponse } from "next/server";
import { getCjApiBaseUrl, getCachedCjToken, setCachedCjToken } from "@/lib/cj/token-cache";

export async function POST(req: Request) {
  try {
    // 0. 수동으로 토큰키(API Key)를 전달받아 .env.local에 설정한 경우 즉시 채택
    const staticToken = process.env.CJ_API_KEY?.trim() || process.env.CJ_TOKEN?.trim();
    if (staticToken) {
      return NextResponse.json({ success: true, token: staticToken, static: true });
    }

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

    // CJ DX API V3.9.5: Raw JSON (Body) with DATA wrapper
    const requestPayload = {
      DATA: {
        CUST_ID: custId,
        BIZ_REG_NUM: bizRegNum,
      },
    };

    const res = await fetch(`${getCjApiBaseUrl()}/ReqOneDayToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await res.json();

    // V3.9.5 Response: { RESULT_CD: "S", RESULT_DETAIL: "Success.", TOKEN_NUM: "..." }
    const isSuccess = data?.RESULT_CD === "S" || data?.RSLT_CD === "00" || Boolean(data?.TOKEN_NUM);
    const token = data?.TOKEN_NUM || data?.DATA?.TOKEN_NUM || data?.token;

    if (isSuccess && token) {
      // 24 hours caching
      setCachedCjToken(token, 24 * 60 * 60 * 1000);
      return NextResponse.json({ success: true, token, raw: data });
    } else {
      const errorMsg =
        data?.RESULT_DETAIL ||
        data?.RSLT_MSG ||
        "CJ대한통운 1Day 토큰 발급에 실패했습니다.";
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
