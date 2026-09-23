export interface AvailableCoupon {
  id: string;
  code: string;
  title: string;
  discount: string;
  discountAmount: number;
  condition: string;
  validUntil: string;
  type: "FIXED" | "SHIPPING";
  badge?: string;
  isUsed?: boolean;
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
  },
];

/**
 * 모든 쿠폰 목록(사용 완료 여부 포함)을 반환합니다. 마이페이지 쿠폰함용.
 */
export function getAllUserCoupons(): AvailableCoupon[] {
  if (typeof window === "undefined") return DEFAULT_AVAILABLE_COUPONS;

  const usedCouponsRaw = localStorage.getItem("used_coupon_codes") || "[]";
  let usedCoupons: string[] = [];
  try {
    usedCoupons = JSON.parse(usedCouponsRaw);
  } catch (e) {}

  const customCouponsRaw = localStorage.getItem("admin_coupons") || localStorage.getItem("membership_user_coupons");
  let allCoupons: AvailableCoupon[] = [...DEFAULT_AVAILABLE_COUPONS];
  if (customCouponsRaw) {
    try {
      const parsed = JSON.parse(customCouponsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allCoupons = parsed;
      }
    } catch (e) {}
  }

  return allCoupons.map((c) => ({
    ...c,
    isUsed: usedCoupons.includes(c.code.toUpperCase()),
  }));
}

/**
 * 사용자의 사용 가능한 쿠폰 목록을 반환합니다 (이미 사용된 쿠폰 제외).
 */
export function getAvailableCoupons(): AvailableCoupon[] {
  return getAllUserCoupons().filter((c) => !c.isUsed);
}

