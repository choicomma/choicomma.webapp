import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wblNo = searchParams.get("wblNo");

  if (!wblNo) {
    return NextResponse.json({ success: false, message: "운송장 번호(wblNo)가 필요합니다." }, { status: 400 });
  }

  // CJ대한통운 공식 배송조회 URL
  const trackingUrl = `https://trace.cjlogistics.com/next/tracking.html?wblNo=${wblNo}`;

  return NextResponse.json({
    success: true,
    carrier: "CJ대한통운",
    trackingNumber: wblNo,
    trackingUrl,
  });
}
