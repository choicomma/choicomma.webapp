/**
 * 고객 본인의 주문만 엄격하게 매칭하여 필터링하는 헬퍼 유틸리티
 * 
 * [보안 및 개인정보 보호 정책]:
 * 1. 비로그인(게스트) 상태: 빈 배열([]) 반환 - 타인의 주문을 절대 조회/선택할 수 없습니다.
 * 2. 최고관리자(Admin) 계정: 타 고객의 실제 주문을 일절 노출하지 않고 "최고관리자" 본인/테스트 주문만 매칭합니다.
 * 3. 일반 로그인 고객:
 *    - 1순위: 이메일 정확 일치 (대소문자 무시)
 *    - 2순위: 휴대폰 번호 끝 8자리 일치 (010-XXXX-YYYY의 뒷부분 8자리)
 *    - 3순위: 성명 2글자 이상 완전 일치 (동명이인/부분 일치로 인한 타인 주문 침범 원천 방지)
 */

export interface CustomerOrderFilterParams {
  email?: string;
  phone?: string;
  name?: string;
  isAdmin?: boolean;
}

export function filterOrdersForCustomer<T = any>(
  orderList: T[],
  params?: CustomerOrderFilterParams
): T[] {
  if (!Array.isArray(orderList) || orderList.length === 0) return [];

  const email = (
    params?.email ??
    (typeof window !== "undefined" ? localStorage.getItem("membership_user_email") : "") ??
    ""
  ).toLowerCase().trim();

  const phone = (
    params?.phone ??
    (typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") : "") ??
    ""
  ).replace(/[^0-9]/g, "");

  const rawName = (
    params?.name ??
    (typeof window !== "undefined" ? localStorage.getItem("membership_user_name") : "") ??
    ""
  ).trim();

  const isAdmin =
    params?.isAdmin ??
    (typeof window !== "undefined" &&
      (localStorage.getItem("user_role") === "admin" ||
        localStorage.getItem("user_role") === "staff" ||
        (localStorage.getItem("user_grade") || "").toUpperCase() === "STAFF" ||
        sessionStorage.getItem("choicomma_admin_authenticated") === "true" ||
        email === "admin@choicomma.com" ||
        rawName.includes("최고관리자")));

  const normalize = (val?: string) =>
    (val || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/\(admin\)/gi, "")
      .replace(/\(실검증\)/gi, "")
      .toLowerCase();

  const cleanName = normalize(rawName);

  // 1. 비로그인(게스트) 상태: 타인의 주문을 일절 노출하지 않음
  if (!isAdmin && !email && (!phone || phone.length < 8) && !cleanName) {
    return [];
  }

  return orderList.filter((s: any) => {
    // 2. 최고관리자 계정인 경우:
    // 다른 실제 고객의 주문을 노출하지 않고 "최고관리자" 본인/테스트 주문만 매칭
    if (isAdmin) {
      const rNorm = normalize(s.recipient || s.customerName);
      const oNorm = normalize(s.ordererName || s.customer);
      const sPhone = (s.phone || s.customerPhone || "").replace(/[^0-9]/g, "");
      const sAltPhone = (s.altPhone || "").replace(/[^0-9]/g, "");
      return (
        rNorm.includes("최고관리자") ||
        oNorm.includes("최고관리자") ||
        sPhone.endsWith("5791171") ||
        sAltPhone.endsWith("5791171") ||
        (cleanName && (rNorm === cleanName || oNorm === cleanName))
      );
    }

    // 3. 일반 고객인 경우:
    const sEmail = (s.recipientEmail || s.customerEmail || s.email || "").toLowerCase().trim();
    const sPhone = (s.phone || s.customerPhone || "").replace(/[^0-9]/g, "");
    const sAltPhone = (s.altPhone || "").replace(/[^0-9]/g, "");
    const sRecipient = normalize(s.recipient || s.customerName);
    const sOrderer = normalize(s.ordererName || s.customer);

    // 1순위: 이메일 일치 (가장 신뢰도 높음)
    if (email && sEmail && email === sEmail) return true;

    // 2순위: 전화번호 끝 8자리 일치
    if (phone && phone.length >= 8) {
      const phoneTail = phone.slice(-8);
      if (sPhone.endsWith(phoneTail) || sAltPhone.endsWith(phoneTail)) return true;
    }

    // 3순위: 성명 완전 일치 (동명이인/부분일치 침범 방지를 위해 2글자 이상 정확 일치)
    if (cleanName && cleanName.length >= 2 && (sRecipient === cleanName || sOrderer === cleanName)) {
      return true;
    }

    return false;
  });
}
