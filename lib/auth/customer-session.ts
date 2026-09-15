/**
 * 일반 고객 전용 세션 유효시간 관리 유틸리티
 * - 정책: 로그인 후 24시간 유지, 브라우저 완전 종료 시 세션 만료 (재로그인 요구)
 * - 관리자(Admin) 계정은 작업 편의를 위해 본 세션 제한에서 완전히 제외됩니다.
 */

export const CUSTOMER_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

export const STORAGE_KEYS = {
  IS_LOGGED_IN: "is_logged_in",
  USER_ROLE: "user_role",
  ADMIN_AUTH: "choicomma_admin_authenticated",
  SESSION_ACTIVE: "customer_session_active", // sessionStorage: 브라우저 종료 감지용
  SESSION_EXPIRES_AT: "customer_session_expires_at", // localStorage: 24시간 만료 타임스탬프
  USER_ID: "membership_user_id",
  USER_NAME: "membership_user_name",
  USER_EMAIL: "membership_user_email",
  USER_PHONE: "membership_user_phone",
  USER_POSTCODE: "membership_user_postcode",
  USER_ADDRESS: "membership_user_address",
  USER_ADDRESS_DETAIL: "membership_user_address_detail",
  USER_POINTS: "membership_user_points",
  USER_GRADE: "user_grade",
} as const;

/**
 * 관리자 계정 여부 판별 (관리자는 세션 만료 대상에서 제외)
 */
export function isCurrentUserAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const role = (localStorage.getItem(STORAGE_KEYS.USER_ROLE) || "").toLowerCase().trim();
    const email = (localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "").toLowerCase().trim();
    const name = (localStorage.getItem(STORAGE_KEYS.USER_NAME) || "").trim();
    const isAdminSession = sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === "true";

    return (
      role === "admin" ||
      isAdminSession ||
      email === "admin@choicomma.com" ||
      email === "admin" ||
      name === "관리자" ||
      name.includes("최고관리자")
    );
  } catch {
    return false;
  }
}

/**
 * 일반 고객 로그인 성공 시 세션 시작 (24시간 타임스탬프 + 브라우저 세션 플래그 기록)
 */
export function initCustomerSession(): void {
  if (typeof window === "undefined") return;
  try {
    // 관리자 계정은 고객 세션 타임아웃을 적용하지 않음
    if (isCurrentUserAdmin()) return;

    const expiresAt = Date.now() + CUSTOMER_SESSION_DURATION_MS;

    // 1) 브라우저 종료 감지용 세션스토리지 플래그 (브라우저를 닫으면 자동 소멸)
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, "true");

    // 2) 24시간 만료 타임스탬프 로컬스토리지에 저장
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES_AT, String(expiresAt));
  } catch (err) {
    console.error("Failed to initialize customer session:", err);
  }
}

/**
 * 일반 고객 세션 정리 (자동/수동 로그아웃)
 */
export function clearCustomerSession(triggerEvents = true): void {
  if (typeof window === "undefined") return;
  try {
    // 관리자 세션은 보존
    if (isCurrentUserAdmin()) return;

    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_NAME);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.USER_PHONE);
    localStorage.removeItem(STORAGE_KEYS.USER_POSTCODE);
    localStorage.removeItem(STORAGE_KEYS.USER_ADDRESS);
    localStorage.removeItem(STORAGE_KEYS.USER_ADDRESS_DETAIL);
    localStorage.removeItem(STORAGE_KEYS.USER_POINTS);
    localStorage.removeItem(STORAGE_KEYS.USER_GRADE);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);

    if (triggerEvents) {
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("auth_changed", { detail: { reason: "session_expired" } }));
    }
  } catch (err) {
    console.error("Failed to clear customer session:", err);
  }
}

/**
 * 일반 고객 세션 유효성 검사
 * - 반환값: 유효하면 true, 만료/브라우저종료 시 false (자동 로그아웃 처리)
 */
export function validateCustomerSession(): boolean {
  if (typeof window === "undefined") return true;

  try {
    // 1. 관리자 계정은 항상 유효 (세션 타임아웃 제외)
    if (isCurrentUserAdmin()) {
      return true;
    }

    // 2. 비로그인 상태는 그대로 통과
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === "true";
    if (!isLoggedIn) {
      return false;
    }

    // 3. 조건 A: 브라우저 종료 후 재접속 여부 검사 (sessionStorage에 플래그가 없으면 브라우저를 껐다 킨 것)
    const isBrowserSessionActive = sessionStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE) === "true";
    if (!isBrowserSessionActive) {
      clearCustomerSession(true);
      return false;
    }

    // 4. 조건 B: 24시간 만료 시간 검사
    const expiresAtRaw = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRES_AT);
    if (!expiresAtRaw) {
      // 만료시간 정보가 누락된 고객 세션인 경우 안전하게 만료 처리
      clearCustomerSession(true);
      return false;
    }

    const expiresAt = parseInt(expiresAtRaw, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      // 24시간 초과 만료
      clearCustomerSession(true);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error validating customer session:", err);
    return true;
  }
}
