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

  const history = getCouponUsageHistory();

  return all
    .map((c) => {
      const hasUsedInHistory = Boolean(
        currentEmail &&
        history.some(
          (h) =>
            (h.couponId === c.id || (c.code && h.couponId === c.code)) &&
            (h.customerEmail || "").toLowerCase().trim() === currentEmail
        )
      );
      return hasUsedInHistory ? { ...c, isUsed: true } : c;
    })
    .filter((c) => {
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
 * Supabase 원격 DB(site_settings)로부터 최신 관리자 쿠폰 설정을 비동기 동기화합니다.
 */
export async function syncAdminCouponsFromSupabase(): Promise<AvailableCoupon[]> {
  if (typeof window === "undefined") return [];

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "admin_coupons_config")
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter((c: any) => !isLegacyCoupon(c));
        localStorage.setItem("admin_coupons", JSON.stringify(sanitized));
        localStorage.removeItem("membership_user_coupons");
        window.dispatchEvent(new CustomEvent("coupons_updated"));
        return sanitized;
      }
    }
  } catch (e) {
    console.warn("Failed to sync coupons from Supabase:", e);
  }

  return getAllUserCoupons();
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

export interface CouponUsageRecord {
  id: string;
  orderId: string;
  couponId: string;
  couponTitle: string;
  couponType: "FIXED" | "SHIPPING";
  discountAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderTotalAmount: number;
  orderItemsSummary?: string;
  usedAt: string;
}

/**
 * 저장된 쿠폰 사용 내역 목록을 조회합니다.
 */
export function getCouponUsageHistory(): CouponUsageRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("admin_coupon_usage_history");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * 쿠폰 사용 내역을 로컬 및 Supabase site_settings에 저장합니다.
 */
export function saveCouponUsageHistory(history: CouponUsageRecord[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("admin_coupon_usage_history", JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("storage", { detail: { key: "admin_coupon_usage_history" } }));
    window.dispatchEvent(new CustomEvent("coupon_usage_updated"));

    Promise.resolve(
      supabase
        .from("site_settings")
        .upsert({
          key: "admin_coupon_usage_history",
          value: JSON.stringify(history),
          updated_at: new Date().toISOString(),
        })
    )
      .then(({ error }: any) => {
        if (error) console.warn("Supabase coupon usage history sync notice:", error?.message);
      })
      .catch(() => {});
  } catch (e) {
    console.error("Failed to save coupon usage history:", e);
  }
}

/**
 * 회원이 상품 구매 시 적용한 쿠폰 사용 내역을 실시간으로 등록합니다.
 */
export function recordCouponUsage(
  usage: Omit<CouponUsageRecord, "id" | "usedAt"> & Partial<Pick<CouponUsageRecord, "id" | "usedAt">>
): CouponUsageRecord {
  const current = getCouponUsageHistory();

  // 동일 주문번호 및 쿠폰ID 중복 등록 방지 (Idempotency)
  const existing = current.find(
    (item) => item.orderId === usage.orderId && item.couponId === usage.couponId
  );
  if (existing) {
    return existing;
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const newRecord: CouponUsageRecord = {
    id: usage.id || `USAGE-${usage.orderId || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderId: usage.orderId || "-",
    couponId: usage.couponId,
    couponTitle: usage.couponTitle || "할인 쿠폰",
    couponType: usage.couponType || "FIXED",
    discountAmount: Number(usage.discountAmount || 0),
    customerName: usage.customerName || "고객",
    customerEmail: (usage.customerEmail || "-").toLowerCase().trim(),
    customerPhone: usage.customerPhone || "-",
    orderTotalAmount: Number(usage.orderTotalAmount || 0),
    orderItemsSummary: usage.orderItemsSummary || "-",
    usedAt: usage.usedAt || formattedDate,
  };

  const updated = [newRecord, ...current];
  saveCouponUsageHistory(updated);

  // 고객 보유 쿠폰 재사용 방지 목록에 자동 등록
  if (typeof window !== "undefined") {
    try {
      const usedRaw = localStorage.getItem("used_coupon_codes") || "[]";
      let usedCodes: string[] = [];
      try {
        usedCodes = JSON.parse(usedRaw);
      } catch (e) {}
      if (!usedCodes.includes(newRecord.couponId)) {
        usedCodes.push(newRecord.couponId);
        localStorage.setItem("used_coupon_codes", JSON.stringify(usedCodes));
        window.dispatchEvent(new CustomEvent("coupons_updated"));
      }
    } catch (e) {}
  }

  return newRecord;
}

/**
 * 관리자가 특정 쿠폰 사용 내역을 취소하고 회원의 쿠폰을 다시 사용할 수 있도록 재활성화(회수)합니다.
 */
export function cancelCouponUsage(usageId: string, restoreCoupon: boolean = true): void {
  const current = getCouponUsageHistory();
  const target = current.find((r) => r.id === usageId);
  const updated = current.filter((r) => r.id !== usageId);
  saveCouponUsageHistory(updated);

  if (restoreCoupon && target && typeof window !== "undefined") {
    try {
      const usedRaw = localStorage.getItem("used_coupon_codes") || "[]";
      let usedCodes: string[] = [];
      try {
        usedCodes = JSON.parse(usedRaw);
      } catch (e) {}
      usedCodes = usedCodes.filter((c) => c !== target.couponId);
      localStorage.setItem("used_coupon_codes", JSON.stringify(usedCodes));
      window.dispatchEvent(new CustomEvent("coupons_updated"));
    } catch (e) {}
  }
}

/**
 * 모든 쿠폰 사용 내역을 초기화합니다.
 */
export function resetCouponUsageHistory(): void {
  saveCouponUsageHistory([]);
}

