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

    const formData = new URLSearchParams();
    formData.append("CUST_ID", custId);
    formData.append("TOKEN_NUM", token);
    formData.append("REQ_COUNT", "1"); // 단건 채번

    const res = await fetch(`${getCjApiBaseUrl()}/ReqInvcNo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await res.json();

    if (data && data.RSLT_CD === "00" && data.INVC_NO) {
      return NextResponse.json({ 
        success: true, 
        trackingNumber: data.INVC_NO, 
        raw: data 
      });
    } else {
      return NextResponse.json({ success: false, error: data?.RSLT_MSG || "Invoice generation failed", raw: data }, { status: 400 });
    }
  } catch (error: any) {
    console.error("CJ ReqInvcNo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
