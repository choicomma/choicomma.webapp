import { NextResponse } from "next/server";

// CJ대한통운 (CJ Logistics) API Mock / Integration Endpoint
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, shipments, config } = body;

    // 1. CJ대한통운 운송장 일괄 자동 채번 (Issue Tracking Numbers)
    if (action === "issue_tracking") {
      const updatedShipments = (shipments || []).map((s: any) => {
        if (s.status === "Pending" || !s.trackingNumber || s.trackingNumber.startsWith("TRK")) {
          const random10 = Math.floor(1000000000 + Math.random() * 9000000000);
          const cjTrackingNumber = `68${random10}`;
          return {
            ...s,
            carrier: "CJ대한통운",
            trackingNumber: cjTrackingNumber,
            status: "In Transit",
            shippedDate: new Date().toISOString().split("T")[0],
            estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
            trackingUrl: `https://trace.cjlogistics.com/next/tracking.html?wblNo=${cjTrackingNumber}`,
          };
        }
        return s;
      });

      return NextResponse.json({
        success: true,
        message: `CJ대한통운 운송장 번호가 성공적으로 발급 및 연동되었습니다.`,
        shipments: updatedShipments,
      });
    }

    // 2. CJ대한통운 API 연동 테스트
    if (action === "test_connection") {
      const { clientCode, contractNo, apiKey } = config || {};
      if (!clientCode || !contractNo) {
        return NextResponse.json(
          { success: false, message: "고객사 코드와 계약고객번호를 입력해 주세요." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "CJ대한통운 Open API 서버 통신 연결이 완료되었습니다. (상태: 정상 작동)",
        details: {
          clientCode,
          contractNo,
          carrier: "CJ대한통운 (CJ Logistics)",
          connectedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wblNo = searchParams.get("wblNo");

  if (!wblNo) {
    return NextResponse.json({ success: false, message: "운송장 번호(wblNo)가 필요합니다." }, { status: 400 });
  }

  // CJ대한통운 실시간 배송조회 공식 추적 URL
  const trackingUrl = `https://trace.cjlogistics.com/next/tracking.html?wblNo=${wblNo}`;

  return NextResponse.json({
    success: true,
    carrier: "CJ대한통운",
    trackingNumber: wblNo,
    status: "In Transit",
    trackingUrl,
  });
}
