import { NextRequest, NextResponse } from "next/server";
import {
  getRealVisitorAnalytics,
  blockIp,
  unblockIp,
  registerAdminIp,
  removeAdminIp,
  clearIpRecords,
} from "@/lib/analytics/visitor-store";

export const dynamic = "force-dynamic";
export const revalidate = 0; // 항상 실시간 실제 데이터 반환

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 실제 수집된 방문자 트래픽 통계 및 로그 조회 (관리자 IP 원천 제외)
export async function GET(req: NextRequest) {
  try {
    const realAnalytics = await getRealVisitorAnalytics(req.headers);

    return NextResponse.json(
      {
        success: true,
        cached: false,
        isRealData: true,
        overview: realAnalytics.overview,
        channels: realAnalytics.channels,
        trend7Days: realAnalytics.trend7Days,
        trend30Days: realAnalytics.trend30Days,
        logs: realAnalytics.logs,
        blockedIps: realAnalytics.blockedIps,
        suspiciousActivities: realAnalytics.suspiciousActivities,
        adminIps: realAnalytics.adminIps,
        currentClientIp: realAnalytics.currentClientIp,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("Error fetching real visitor analytics:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: 실제 IP 차단/해제 및 관리자 IP 제외 등록/해제
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, ip, reason } = body;

    if (!ip || typeof ip !== "string") {
      return NextResponse.json(
        { success: false, error: "유효한 IP 주소를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (action === "block") {
      const updatedBlockedIps = await blockIp(ip, reason || "관리자 수동 차단");
      return NextResponse.json({
        success: true,
        message: `IP [${ip}]가 성공적으로 차단되었습니다.`,
        blockedIps: updatedBlockedIps,
      });
    }

    if (action === "unblock") {
      const updatedBlockedIps = await unblockIp(ip);
      return NextResponse.json({
        success: true,
        message: `IP [${ip}]의 차단이 해제되었습니다.`,
        blockedIps: updatedBlockedIps,
      });
    }

    if (action === "add_admin_ip") {
      const updatedAdminIps = await registerAdminIp(ip);
      return NextResponse.json({
        success: true,
        message: `관리자 IP [${ip}]가 통계 제외 목록에 등록되었습니다.`,
        adminIps: updatedAdminIps,
      });
    }

    if (action === "remove_admin_ip") {
      const updatedAdminIps = await removeAdminIp(ip);
      return NextResponse.json({
        success: true,
        message: `관리자 IP [${ip}]가 통계 제외 목록에서 삭제되었습니다.`,
        adminIps: updatedAdminIps,
      });
    }

    if (action === "clear_ip") {
      const result = await clearIpRecords(ip);
      return NextResponse.json({
        success: true,
        message: `IP [${ip}]의 모든 차단 및 이상 행동 기록이 완전히 삭제되었습니다.`,
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, error: "알 수 없는 액션입니다." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error modifying IP in visitor analytics:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
