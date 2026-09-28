import { supabase } from "@/lib/supabase/client";

export interface AvailableCoupon {
  id: string;
  code?: string;
  title: string;
  discount: string;
  discountAmount: number;
  condition: string;
  validUntil: string;
  type: "FIXED" | "SHIPPING";
  badge?: string;
  isUsed?: boolean;
  isActive?: boolean;
  targetType?: "ALL" | "GRADE" | "CUSTOMER"; // 지정 대상: 전체, 등급별, 특정 회원
  targetGrades?: string[]; // e.g. ["GENERAL", "SILVER", "GOLD", "PLATINUM", "VVIP"]
  targetCustomerEmails?: string[]; // e.g. ["customer@choicomma.com"]
  targetCustomerNames?: string[]; // e.g. ["홍길동"]
  minOrderAmount?: number;
  createdAt?: string;
}

export const DEFAULT_AVAILABLE_COUPONS: AvailableCoupon[] = [
  {
    id: "coupon-special-10k",
    code: "CHOI10",
    title: "10,000원 스페셜 감사 쿠폰",
    discount: "10,000원 할인",
    discountAmount: 10000,
    condition: "전 상품 10,000원 즉시 할인",
    validUntil: "2026.12.31",
    type: "FIXED",
    badge: "최대할인",
    isActive: true,
    targetType: "ALL",
    targetGrades: ["ALL"],
    targetCustomerEmails: [],
    targetCustomerNames: [],
    minOrderAmount: 0,
    createdAt: "2026-01-01",
  },
  {
    id: "coupon-welcome-5k",
    code: "WELCOME",
    title: "5,000원 웰컴 첫 구매 쿠폰",
    discount: "5,000원 할인",
    discountAmount: 5000,
    condition: "첫 구매 회원 즉시 5,000원 할인",
    validUntil: "2026.12.31",
    type: "FIXED",
    badge: "웰컴혜택",
    isActive: true,
    targetType: "ALL",
    targetGrades: ["ALL"],
    targetCustomerEmails: [],
    targetCustomerNames: [],
    minOrderAmount: 0,
    createdAt: "2026-01-01",
  },
  {
    id: "coupon-freeship",
    code: "FREESHIP",
    title: "무료 배송 지원 쿠폰",
    discount: "배송비 4,000원 지원",
    discountAmount: 4000,
    condition: "배송비 전액 지원",
    validUntil: "2026.12.31",
    type: "SHIPPING",
    badge: "배송비지원",
    isActive: true,
    targetType: "ALL",
    targetGrades: ["ALL"],
    targetCustomerEmails: [],
    targetCustomerNames: [],
    minOrderAmount: 0,
    createdAt: "2026-01-01",
  },
];

/**
 * 모든 쿠폰 목록(사용 완료 여부 포함)을 반환합니다. 마이페이지 쿠폰함 및 관리자용.
 */
export function getAllUserCoupons(): AvailableCoupon[] {
  if (typeof window === "undefined") return DEFAULT_AVAILABLE_COUPONS;

  const usedCouponsRaw = localStorage.getItem("used_coupon_codes") || "[]";
  let usedCoupons: string[] = [];
  try {
    usedCoupons = JSON.parse(usedCouponsRaw);
  } catch (e) {}

  const customCouponsRaw = localStorage.getItem("admin_coupons");
  const legacyCouponsRaw = localStorage.getItem("membership_user_coupons");

  let allCoupons: AvailableCoupon[] = [...DEFAULT_AVAILABLE_COUPONS];

  // admin_coupons가 로컬 스토리지에 존재하는 경우 (빈 배열 [] 포함) 관리자가 설정한 값을 최우선 반영
  if (customCouponsRaw !== null) {
    try {
      const parsed = JSON.parse(customCouponsRaw);
      if (Array.isArray(parsed)) {
        allCoupons = parsed;
      }
    } catch (e) {}
  } else if (legacyCouponsRaw !== null) {
    try {
      const parsed = JSON.parse(legacyCouponsRaw);
      if (Array.isArray(parsed)) {
        allCoupons = parsed;
      }
    } catch (e) {}
  }

  return allCoupons.map((c) => {
    const isUsed =
      usedCoupons.includes(c.id) ||
      (c.code ? usedCoupons.includes(c.code.toUpperCase()) : false);

    return {
      ...c,
      targetType: c.targetType || "ALL",
      targetGrades: c.targetGrades || ["ALL"],
      targetCustomerEmails: c.targetCustomerEmails || [],
      targetCustomerNames: c.targetCustomerNames || [],
      isActive: c.isActive !== false,
      isUsed,
    };
  });
}

/**
 * 특정 사용자(이메일, 등급)의 발급 대상에 부합하는 모든 쿠폰 목록(사용 완료 포함)을 반환합니다.
 */
export function getUserCoupons(userEmail?: string, userGrade?: string): AvailableCoupon[] {
  const all = getAllUserCoupons();
  if (typeof window === "undefined") {
    return all;
  }

  const currentEmail = (
    userEmail ||
    localStorage.getItem("membership_user_email") ||
    ""
  ).toLowerCase().trim();

  const rawGrade = (
    userGrade ||
    localStorage.getItem("user_grade") ||
    localStorage.getItem("user_role") ||
    "GENERAL"
  ).toUpperCase();

  const currentGrade =
    rawGrade.includes("VVIP") || rawGrade.includes("BLACK")
      ? "VVIP"
      : rawGrade.includes("PLATINUM")
      ? "PLATINUM"
      : rawGrade.includes("GOLD")
      ? "GOLD"
      : rawGrade.includes("SILVER")
      ? "SILVER"
      : "GENERAL";

  return all.filter((c) => {
    const tType = c.targetType || "ALL";

    // 1. 전체 회원 대상
    if (tType === "ALL") return true;

    // 2. 등급별 지정 대상
    if (tType === "GRADE") {
      const grades = c.targetGrades || ["ALL"];
      return grades.includes("ALL") || grades.includes(currentGrade);
    }

    // 3. 특정 회원 직접 지정 대상
    if (tType === "CUSTOMER") {
      const emails = (c.targetCustomerEmails || []).map((e) => e.toLowerCase().trim());
      return Boolean(currentEmail && emails.includes(currentEmail));
    }

    return true;
  });
}

/**
 * 특정 사용자(이메일, 등급)의 조건에 부합하는 사용 가능한 쿠폰 목록을 반환합니다.
 */
export function getAvailableCoupons(userEmail?: string, userGrade?: string): AvailableCoupon[] {
  return getUserCoupons(userEmail, userGrade).filter((c) => !c.isUsed && c.isActive !== false);
}

/**
 * 관리자가 쿠폰 목록을 저장합니다.
 */
export function saveAdminCoupons(coupons: AvailableCoupon[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("admin_coupons", JSON.stringify(coupons));
    window.dispatchEvent(new CustomEvent("storage", { detail: { key: "admin_coupons" } }));
    window.dispatchEvent(new CustomEvent("coupons_updated"));

    Promise.resolve(
      supabase
        .from("site_settings")
        .upsert({
          key: "admin_coupons_config",
          value: JSON.stringify(coupons),
          updated_at: new Date().toISOString(),
        })
    )
      .then(({ error }: any) => {
        if (error) console.warn("Supabase coupons config sync notice:", error?.message);
      })
      .catch(() => {});
  } catch (e) {
    console.error("Failed to save admin coupons:", e);
  }
}

/**
 * 관리자가 등록한 쿠폰 설정을 초기 기본 3대 쿠폰으로 복원합니다.
 */
export function resetAdminCoupons(): AvailableCoupon[] {
  if (typeof window === "undefined") return DEFAULT_AVAILABLE_COUPONS;

  saveAdminCoupons(DEFAULT_AVAILABLE_COUPONS);
  return DEFAULT_AVAILABLE_COUPONS;
}

/**
 * 고객의 쿠폰 사용 완료 이력(used_coupon_codes)을 초기화합니다.
 */
export function resetUsedCoupons(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("used_coupon_codes");
  window.dispatchEvent(new CustomEvent("storage", { detail: { key: "used_coupon_codes" } }));
  window.dispatchEvent(new CustomEvent("coupons_updated"));
}
