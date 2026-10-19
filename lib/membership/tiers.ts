export interface TierPolicy {
  key: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP";
  name: string;
  minSpend: number;
  discountRate?: number;
  pointRate: number;
  freeShipping: boolean;
  minFreeShippingSpend: number;
  specialBenefit: string;
}

export const TIER_THRESHOLDS = {
  VVIP: 20000000,
  PLATINUM: 10000000,
  GOLD: 5000000,
  SILVER: 2000000,
} as const;

export const DEFAULT_TIER_POLICIES: TierPolicy[] = [
  {
    key: "GENERAL",
    name: "GENERAL (일반)",
    minSpend: 0,
    discountRate: 0,
    pointRate: 1,
    freeShipping: false,
    minFreeShippingSpend: 100000,
    specialBenefit: "신규 가입 혜택, 기본 1% 적립금",
  },
  {
    key: "SILVER",
    name: "SILVER (실버)",
    minSpend: 2000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: false,
    minFreeShippingSpend: 100000,
    specialBenefit: "실버 등급 시크릿 타임 세일 품목 추가, 5% 할인 쿠폰 1장 증정",
  },
  {
    key: "GOLD",
    name: "GOLD (골드)",
    minSpend: 5000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: false,
    minFreeShippingSpend: 50000,
    specialBenefit: "골드 등급 시크릿 타임 세일 품목 추가, 월 5% 할인 쿠폰 1장 증정",
  },
  {
    key: "PLATINUM",
    name: "PLATINUM (플래티넘)",
    minSpend: 10000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: true,
    minFreeShippingSpend: 0,
    specialBenefit: "플래티넘 등급 시크릿 타임 세일 품목 추가, 월 5% 할인 쿠폰 3장 증정",
  },
  {
    key: "VVIP",
    name: "VVIP (최상위)",
    minSpend: 20000000,
    discountRate: 5,
    pointRate: 1,
    freeShipping: true,
    minFreeShippingSpend: 0,
    specialBenefit: "VVIP 등급 시크릿 타임 세일 품목 추가, 모든 품목 상시 5% 추가 할인 (일부 시크릿 타임 세일 항목 제외)",
  },
];

export function calculateTierBySpend(spent: number): "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP" {
  const numSpent = Number(spent) || 0;
  if (numSpent >= TIER_THRESHOLDS.VVIP) return "VVIP";
  if (numSpent >= TIER_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (numSpent >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (numSpent >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "GENERAL";
}

export function normalizeUserGrade(rawGrade: any): "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP" {
  if (!rawGrade) return "GENERAL";
  const up = String(rawGrade).toUpperCase().trim();
  if (up.includes("VVIP") || up.includes("BLACK") || up.includes("블랙")) return "VVIP";
  if (up.includes("PLATINUM") || up.includes("플래티넘")) return "PLATINUM";
  if (up.includes("GOLD") || up.includes("골드")) return "GOLD";
  if (up.includes("SILVER") || up.includes("실버")) return "SILVER";
  return "GENERAL";
}

export function getTierPointRate(grade: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP"): number {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("membership_tiers_policy");
    if (saved) {
      try {
        const policies = JSON.parse(saved);
        if (Array.isArray(policies)) {
          const matched = policies.find((p: any) => p.key === grade);
          if (matched && typeof matched.pointRate === "number") {
            return matched.pointRate;
          }
        }
      } catch (e) {}
    }
  }

  const defaultPolicy = DEFAULT_TIER_POLICIES.find((p) => p.key === grade);
  if (defaultPolicy) return defaultPolicy.pointRate;

  return 1;
}

export function calculateEarnedPoints(
  amount: number,
  grade: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP"
): { earnedPoints: number; pointRate: number } {
  const pointRate = getTierPointRate(grade);
  const earnedPoints = Math.floor(amount * (pointRate / 100));
  return { earnedPoints, pointRate };
}
