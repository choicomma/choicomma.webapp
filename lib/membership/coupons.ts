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

export const DEFAULT_AVAILABLE_COUPONS: AvailableCoupon[] = [];

// 삭제 대상 레거시 기본 3대 쿠폰 식별자 및 코드
export const LEGACY_COUPON_IDS = [
  "coupon-special-10k",
  "coupon-welcome-5k",
  "coupon-freeship",
];
export const LEGACY_COUPON_CODES = ["CHOI10", "WELCOME", "FREESHIP"];

export function isLegacyCoupon(c: any): boolean {
  if (!c) return false;
  const id = String(c.id || "").toLowerCase();
  const code = String(c.code || "").toUpperCase();
  const title = String(c.title || "");
  if (LEGACY_COUPON_IDS.includes(id)) return true;
  if (LEGACY_COUPON_CODES.includes(code)) return true;
  if (
    title.includes("스페셜 감사") ||
    title.includes("웰컴 첫 구매") ||
    title.includes("무료 배송 지원")
  ) {
    return true;
  }
  return false;
}

/**
 * 모든 쿠폰 목록(사용 완료 여부 포함)을 반환합니다. 마이페이지 쿠폰함 및 관리자용.
 */
export function getAllUserCoupons(): AvailableCoupon[] {
  if (typeof window === "undefined") return [];

  const usedCouponsRaw = localStorage.getItem("used_coupon_codes") || "[]";
  let usedCoupons: string[] = [];
  try {
    usedCoupons = JSON.parse(usedCouponsRaw);
  } catch (e) {}

  const customCouponsRaw = localStorage.getItem("admin_coupons");
  const legacyCouponsRaw = localStorage.getItem("membership_user_coupons");

  let allCoupons: AvailableCoupon[] = [];

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

  // 삭제된 레거시 기본 쿠폰(CHOI10, WELCOME, FREESHIP 등) 영구 완전 삭제
  const filteredCoupons = allCoupons.filter((c) => !isLegacyCoupon(c));

  if (filteredCoupons.length !== allCoupons.length || legacyCouponsRaw !== null) {
    allCoupons = filteredCoupons;
    try {
      localStorage.setItem("admin_coupons", JSON.stringify(allCoupons));
      localStorage.removeItem("membership_user_coupons");
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
    const cleanCoupons = coupons.filter((c) => !isLegacyCoupon(c));
    localStorage.setItem("admin_coupons", JSON.stringify(cleanCoupons));
    localStorage.removeItem("membership_user_coupons");
    window.dispatchEvent(new CustomEvent("storage", { detail: { key: "admin_coupons" } }));
    window.dispatchEvent(new CustomEvent("coupons_updated"));

    Promise.resolve(
      supabase
        .from("site_settings")
        .upsert({
          key: "admin_coupons_config",
          value: JSON.stringify(cleanCoupons),
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
 * 관리자가 등록한 쿠폰 설정을 초기화합니다 (빈 목록).
 */
export function resetAdminCoupons(): AvailableCoupon[] {
  if (typeof window === "undefined") return [];

  saveAdminCoupons([]);
  return [];
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
