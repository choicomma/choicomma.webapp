import { NextResponse } from "next/server";
import { trackCjShipment } from "@/lib/cj/cj-api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("invcNo") || searchParams.get("trackingNumber");

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "운송장 번호(invcNo) 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await trackCjShipment(trackingNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[CJ Track API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "CJ 상품추적 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trackingNumber = body.invcNo || body.trackingNumber;

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "운송장 번호(invcNo)가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await trackCjShipment(trackingNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[CJ Track API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "CJ 상품추적 조회 실패" },
      { status: 500 }
    );
  }
}
