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
    minSpend: 1000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: false,
    minFreeShippingSpend: 100000,
    specialBenefit: "우수 회원 혜택, 1% 적립금, 10만원 이상 무료배송",
  },
  {
    key: "GOLD",
    name: "GOLD (골드)",
    minSpend: 3000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: false,
    minFreeShippingSpend: 50000,
    specialBenefit: "우수 회원 혜택, 1% 적립금, 5만원 이상 무료배송",
  },
  {
    key: "PLATINUM",
    name: "PLATINUM (플래티넘)",
    minSpend: 10000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: true,
    minFreeShippingSpend: 0,
    specialBenefit: "플래티넘 회원 혜택, 1% 적립금, 상시 무료배송",
  },
  {
    key: "VVIP",
    name: "VVIP (최상위)",
    minSpend: 20000000,
    discountRate: 0,
    pointRate: 1,
    freeShipping: true,
    minFreeShippingSpend: 0,
    specialBenefit: "최상위 VVIP 혜택, 1% 적립금, 상시 무료배송 및 전용 빠른 출고",
  },
];

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
