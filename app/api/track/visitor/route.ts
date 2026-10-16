import { NextRequest, NextResponse } from "next/server";
import { recordVisit, registerAdminIp, resolveClientIp } from "@/lib/analytics/visitor-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, path = "/", title, referrer, visitorId, sessionId, isAdmin } = body;

    // 클라이언트에서 관리자 IP 등록을 명시적으로 요청한 경우
    if (action === "register_admin_ip") {
      const clientIp = resolveClientIp(req.headers).ip;
      const updatedAdminIps = await registerAdminIp(clientIp);
      return NextResponse.json({ success: true, adminIps: updatedAdminIps });
    }

    // 만약 관리자 플래그가 전송되었거나 /admin 경로인 경우 관리자 IP로 자동 등록
    const isCleanAdmin = Boolean(isAdmin) || String(path).startsWith("/admin");
    if (isCleanAdmin) {
      const clientIp = resolveClientIp(req.headers).ip;
      await registerAdminIp(clientIp);
    }

    const result = await recordVisit({
      headers: req.headers,
      path: String(path),
      title: title ? String(title) : undefined,
      referrer: referrer ? String(referrer) : undefined,
      visitorId: visitorId ? String(visitorId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
      isAdmin: isCleanAdmin,
    });

    return NextResponse.json({
      success: true,
      isBlocked: result.isBlocked,
      isAdmin: result.isAdmin,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
