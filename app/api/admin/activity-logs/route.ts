import { NextRequest, NextResponse } from "next/server";
import {
  getActivityLogs,
  recordCustomerJourney,
  recordAdminAudit,
  JourneyEventType,
  AuditDomainType,
  AuditActionType,
} from "@/lib/logging/activity-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/activity-logs
 * 활동 로그 센터 통합 조회 API (고객 구매 여정 + 관리자 작업 감사 로그)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") || "all") as "journey" | "audit" | "all";
    const domain = searchParams.get("domain") || "ALL";
    const eventType = searchParams.get("eventType") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "150", 10);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const { journeyLogs, auditLogs } = await getActivityLogs({
      tab,
      domain,
      eventType,
      limit,
    });

    let filteredJourney = journeyLogs;
    let filteredAudit = auditLogs;

    if (search) {
      filteredJourney = filteredJourney.filter(
        (l) =>
          l.sessionId.toLowerCase().includes(search) ||
          l.visitorId.toLowerCase().includes(search) ||
          (l.userName && l.userName.toLowerCase().includes(search)) ||
          l.path.toLowerCase().includes(search) ||
          l.referrer.toLowerCase().includes(search)
      );

      filteredAudit = filteredAudit.filter(
        (a) =>
          a.targetName.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search) ||
          a.adminName.toLowerCase().includes(search) ||
          a.targetId.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      journeyLogs: filteredJourney,
      auditLogs: filteredAudit,
      metrics: {
        totalJourney: filteredJourney.length,
        totalAudit: filteredAudit.length,
        purchases: filteredJourney.filter((l) => l.eventType === "PURCHASE_SUCCESS").length,
      },
    });
  } catch (err: any) {
    console.error("❌ GET /api/admin/activity-logs error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch activity logs",
        journeyLogs: [],
        auditLogs: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/activity-logs
 * 활동 로그 수동 기록 또는 외부 트리거 기록 API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    // 1. 고객 구매 여정 로그 기록
    if (body.type === "journey" || body.eventType) {
      const record = await recordCustomerJourney({
        sessionId: body.sessionId || `sess_${Date.now()}`,
        visitorId: body.visitorId || `v_${Date.now()}`,
        userId: body.userId,
        userName: body.userName,
        eventType: (body.eventType || "PAGE_VIEW") as JourneyEventType,
        eventLabel: body.eventLabel || "페이지 탐색",
        path: body.path || "/",
        referrer: body.referrer || "",
        device: body.device || "Mobile",
        metadata: body.metadata || {},
        ip: clientIp,
      });

      return NextResponse.json({
        success: true,
        type: "journey",
        data: record,
      });
    }

    // 2. 관리자 작업 감사 로그 기록
    if (body.type === "audit" || body.actionType) {
      const record = await recordAdminAudit({
        adminId: body.adminId || "admin_master",
        adminName: body.adminName || "총괄 관리자",
        actionType: (body.actionType || "UPDATE") as AuditActionType,
        domain: (body.domain || "PRODUCT") as AuditDomainType,
        targetId: String(body.targetId || ""),
        targetName: body.targetName || "",
        description: body.description || "관리자 작업 수행",
        beforeData: body.beforeData,
        afterData: body.afterData,
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        type: "audit",
        data: record,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid log type. Must be 'journey' or 'audit'" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("❌ POST /api/admin/activity-logs error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to record log" },
      { status: 500 }
    );
  }
}
