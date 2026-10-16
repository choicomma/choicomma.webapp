import { JourneyEventType } from "./activity-store";

export interface TrackJourneyParams {
  eventType: JourneyEventType;
  eventLabel: string;
  path?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}

// 1. 세션 ID (브라우저 탭 닫힐 때까지 보존)
export function getClientSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem("cc_session_id") || "";
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem("cc_session_id", sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}`;
  }
}

// 2. 방문자 ID (기기별 영구 보존)
export function getClientVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let vid = localStorage.getItem("cc_visitor_id") || "";
    if (!vid) {
      vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("cc_visitor_id", vid);
    }
    return vid;
  } catch {
    return `v_${Date.now()}`;
  }
}

// 3. 로그인 회원 정보 추출
export function getLoggedInUserInfo(): { userId?: string; userName?: string } {
  if (typeof window === "undefined") return {};
  try {
    const userId = localStorage.getItem("membership_user_id") || localStorage.getItem("membership_user_email") || undefined;
    const userName = localStorage.getItem("membership_user_name") || undefined;
    return {
      userId: userId ? String(userId).trim() : undefined,
      userName: userName ? String(userName).trim() : undefined,
    };
  } catch {
    return {};
  }
}

// 4. 기기 환경 판별
export function getClientDeviceType(): "PC" | "Mobile" {
  if (typeof window === "undefined") return "PC";
  return window.innerWidth < 768 ? "Mobile" : "PC";
}

/**
 * 고객 구매 여정 (User Journey) 이벤트 비동기 트래킹 함수
 * 쇼핑몰의 사용자 경험이나 결제 프로세스에 영향을 주지 않도록
 * 0% 지연(Non-blocking)과 keepalive: true 를 통해 안전하게 전송합니다.
 */
export function trackCustomerJourney(params: TrackJourneyParams): void {
  if (typeof window === "undefined") return;

  try {
    const currentPath = params.path || (window.location.pathname + window.location.search);
    // 관리자 페이지 내부 이동은 고객 구매 여정에서 제외
    if (currentPath.startsWith("/admin")) return;

    const sessionId = getClientSessionId();
    const visitorId = getClientVisitorId();
    const { userId, userName } = getLoggedInUserInfo();
    const device = getClientDeviceType();
    const referrer = params.referrer || document.referrer || "직접 유입";

    const payload = {
      type: "journey",
      sessionId,
      visitorId,
      userId,
      userName,
      eventType: params.eventType,
      eventLabel: params.eventLabel,
      path: currentPath,
      referrer,
      device,
      metadata: params.metadata || {},
    };

    fetch("/api/admin/activity-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // 네트워크 일시 오류 시 조용히 무시 (쇼핑몰 UI 영향 0%)
    });
  } catch (err) {
    // 예외 발생 시 쇼핑몰 렌더링에 영향 없도록 무시
  }
}
