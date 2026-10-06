/**
 * 사용자 맞춤 사이즈 프로필 및 자동 사이즈 추천 엔진
 * - 고객 신체 데이터 (키, 몸무게, 가슴둘레, 허리둘레, 선호 핏) 관리
 * - 상품 상세 실측치 및 체형 분석 기반 최적 사이즈 추천
 */

export type PreferredFit = "tight" | "regular" | "loose";

export interface UserSizeProfile {
  height: number; // cm
  weight: number; // kg
  chest_circumference: number; // 가슴둘레 cm
  waist_circumference: number; // 허리둘레 cm
  preferred_fit: PreferredFit; // "tight" (딱 맞게) | "regular" (정사이즈) | "loose" (여유있게)
  updated_at?: string;
}

export interface SizeRecommendationResult {
  hasProfile: boolean;
  recommendedSize: string;
  easeMargin: number; // 가슴 둘레 여유 (cm)
  fitLabel: string; // "딱 맞게" | "정사이즈" | "여유있게"
  recommendationMessage: string; // 예: "가슴 둘레 약 6cm 여유"
  fitComment: string; // 상세 설명 문구
  customerName: string;
}

const STORAGE_KEY = "user_size_profile";

/**
 * 로컬스토리지에서 현재 회원의 사이즈 프로필을 조회합니다.
 */
export function getUserSizeProfile(): UserSizeProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.height === "number" &&
      typeof parsed.weight === "number" &&
      typeof parsed.chest_circumference === "number" &&
      typeof parsed.waist_circumference === "number"
    ) {
      return {
        height: Number(parsed.height),
        weight: Number(parsed.weight),
        chest_circumference: Number(parsed.chest_circumference),
        waist_circumference: Number(parsed.waist_circumference),
        preferred_fit: (parsed.preferred_fit as PreferredFit) || "regular",
        updated_at: parsed.updated_at || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error("Failed to load user size profile:", e);
  }

  return null;
}

/**
 * 사용자의 사이즈 프로필을 로컬스토리지에 저장하고 전역 이벤트를 발행합니다.
 */
export function saveUserSizeProfile(profile: UserSizeProfile): void {
  if (typeof window === "undefined") return;

  try {
    const dataToSave: UserSizeProfile = {
      height: Math.round(Number(profile.height) * 10) / 10,
      weight: Math.round(Number(profile.weight) * 10) / 10,
      chest_circumference: Math.round(Number(profile.chest_circumference) * 10) / 10,
      waist_circumference: Math.round(Number(profile.waist_circumference) * 10) / 10,
      preferred_fit: profile.preferred_fit || "regular",
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    // 회원별 키로도 동시 백업
    const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
    if (userEmail) {
      localStorage.setItem(`${STORAGE_KEY}_${userEmail}`, JSON.stringify(dataToSave));
    }

    // 전역 이벤트 발행
    window.dispatchEvent(
      new CustomEvent("user_size_profile_updated", {
        detail: dataToSave,
      })
    );
  } catch (e) {
    console.error("Failed to save user size profile:", e);
  }
}

/**
 * 프로필 삭제
 */
export function clearUserSizeProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
    if (userEmail) {
      localStorage.removeItem(`${STORAGE_KEY}_${userEmail}`);
    }
    window.dispatchEvent(new CustomEvent("user_size_profile_updated", { detail: null }));
  } catch (e) {}
}

/**
 * 선호 핏 한글 라벨 반환
 */
export function getPreferredFitLabel(fit: PreferredFit): string {
  switch (fit) {
    case "tight":
      return "딱 맞게";
    case "loose":
      return "여유있게";
    case "regular":
    default:
      return "정사이즈";
  }
}

/**
 * 상품 정보와 고객 신체 프로필을 기반으로 최적의 사이즈 및 가슴 여유 치수를 계산합니다.
 */
export function calculateRecommendedSize(
  product: any,
  profile: UserSizeProfile | null,
  userName?: string
): SizeRecommendationResult {
  const customerName =
    userName?.trim() ||
    (typeof window !== "undefined"
      ? localStorage.getItem("membership_user_name") || localStorage.getItem("user_name") || ""
      : "") ||
    "고객";

  if (!profile) {
    return {
      hasProfile: false,
      recommendedSize: "",
      easeMargin: 0,
      fitLabel: "정사이즈",
      recommendationMessage: "",
      fitComment: "",
      customerName,
    };
  }

  const preferredFit = profile.preferred_fit || "regular";
  const fitLabel = getPreferredFitLabel(preferredFit);

  // 1. 선호 핏별 목표 여유(Target Chest Ease Margin cm)
  // 딱 맞게: 약 3cm / 정사이즈: 약 7cm / 여유있게: 약 13cm
  let targetEase = 7;
  if (preferredFit === "tight") targetEase = 3;
  if (preferredFit === "loose") targetEase = 13;

  // 2. 사용 가능한 상품 사이즈 목록 추출
  let rawSizes: string[] = [];
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    rawSizes = product.sizes.map(String);
  } else if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const sizeOptionValues = product.variants
      .map((v: any) => v.selectedOptions?.find((o: any) => o.name?.toLowerCase().includes("size") || o.name?.includes("사이즈"))?.value)
      .filter(Boolean);
    if (sizeOptionValues.length > 0) {
      rawSizes = Array.from(new Set(sizeOptionValues));
    }
  }

  // 기본 사이즈 대체
  if (rawSizes.length === 0) {
    rawSizes = ["FREE"];
  }

  // 3. 상품에 등록된 실측 데이터(sizeMeasurements) 확인
  const measurements: any[] = product?.sizeMeasurements || product?.bulkDiscount?.sizeMeasurements || [];
  const chestRow = Array.isArray(measurements)
    ? measurements.find(
        (m: any) =>
          typeof m.name === "string" &&
          (m.name.includes("가슴") || m.name.includes("바스트") || m.name.includes("상동"))
      )
    : null;

  // 실측 데이터에서 사이즈별 가슴둘레 매핑 (단면이면 x2)
  const sizeChestMap: Record<string, number> = {};
  if (chestRow && typeof chestRow.values === "object" && chestRow.values !== null) {
    Object.entries(chestRow.values).forEach(([sz, val]) => {
      const numVal = parseFloat(String(val).replace(/[^0-9.]/g, ""));
      if (!isNaN(numVal) && numVal > 0) {
        // 단면(보통 35~75)이면 2를 곱해 둘레로 변환, 이미 둘레(75이상)면 그대로
        const isHalf = numVal < 75;
        sizeChestMap[sz.trim().toUpperCase()] = isHalf ? numVal * 2 : numVal;
      }
    });
  }

  // 4-A. 실측 데이터가 있는 경우: 각 사이즈와 목표 가슴둘레(고객가슴둘레 + targetEase)의 차이를 계산하여 최적 사이즈 선택
  const targetCircumference = profile.chest_circumference + targetEase;

  if (Object.keys(sizeChestMap).length > 0) {
    let bestSize = rawSizes[0];
    let minDiff = Infinity;
    let actualEase = 6;

    rawSizes.forEach((sz) => {
      const normalizedSz = sz.trim().toUpperCase();
      const productCircumference = sizeChestMap[normalizedSz] || sizeChestMap[sz] || null;

      if (productCircumference !== null) {
        // 둘레 차이
        const diff = Math.abs(productCircumference - targetCircumference);
        // 음수 여유(옷이 몸보다 작음) 방지 가중치
        const penalty = productCircumference < profile.chest_circumference ? 50 : 0;
        const totalScore = diff + penalty;

        if (totalScore < minDiff) {
          minDiff = totalScore;
          bestSize = sz;
          actualEase = Math.round(productCircumference - profile.chest_circumference);
        }
      }
    });

    if (actualEase <= 0) actualEase = 2; // 최소 여유 보정

    return {
      hasProfile: true,
      recommendedSize: bestSize,
      easeMargin: actualEase,
      fitLabel,
      recommendationMessage: `가슴 둘레 약 ${actualEase}cm 여유`,
      fitComment:
        preferredFit === "tight"
          ? "바디 라인을 슬림하게 감싸주는 피팅감입니다."
          : preferredFit === "loose"
          ? "편안하고 여유 있는 릴렉스 실루엣입니다."
          : "단정하고 활동하기 편안한 스탠다드 핏입니다.",
      customerName,
    };
  }

  // 4-B. 실측 데이터가 없는 경우 (표준 체형 & 카테고리 기반 스마트 추론)
  // 단일 FREE 사이즈인 경우
  const isSingleFree =
    rawSizes.length === 1 &&
    (rawSizes[0].toUpperCase() === "FREE" ||
      rawSizes[0].toUpperCase() === "ONE SIZE" ||
      rawSizes[0].toUpperCase() === "ONESIZE");

  if (isSingleFree) {
    // 한국 여성복 FREE 기준 표준 가슴둘레: 기본 98cm (아우터 약 104cm, 상의 약 96cm)
    const categoryId = String(product?.categoryId || "").toLowerCase();
    const baseGarmentChest = categoryId.includes("outer") ? 104 : 96;
    let calcEase = Math.round(baseGarmentChest - profile.chest_circumference);
    if (calcEase < 2) calcEase = 4;

    return {
      hasProfile: true,
      recommendedSize: rawSizes[0],
      easeMargin: calcEase,
      fitLabel,
      recommendationMessage: `가슴 둘레 약 ${calcEase}cm 여유`,
      fitComment:
        profile.chest_circumference > 92
          ? "자연스럽게 감싸주는 편안한 핏으로 착용 가능합니다."
          : "여유로운 실루엣의 멋스러운 루즈핏으로 연출됩니다.",
      customerName,
    };
  }

  // 복수 사이즈 (S, M, L / 1, 2, 3 / 55, 66, 77 등) 추론
  // 신체 지수(가슴둘레, 몸무게, 키) 기반 사이즈 산정
  // S (44~55): 가슴둘레 ~84cm, 몸무게 ~50kg
  // M (55~66): 가슴둘레 85~90cm, 몸무게 51~57kg
  // L (66~77): 가슴둘레 91~97cm, 몸무게 58~65kg
  // XL (77~): 가슴둘레 98cm~
  let sizeIndex = 0; // 0: S, 1: M, 2: L, 3: XL
  const chest = profile.chest_circumference;
  const weight = profile.weight;

  if (chest >= 98 || weight >= 65) {
    sizeIndex = 3;
  } else if (chest >= 91 || weight >= 58) {
    sizeIndex = 2;
  } else if (chest >= 84 || weight >= 51) {
    sizeIndex = 1;
  } else {
    sizeIndex = 0;
  }

  // 선호 핏 보정
  if (preferredFit === "loose" && sizeIndex < rawSizes.length - 1) {
    sizeIndex += 1;
  } else if (preferredFit === "tight" && sizeIndex > 0) {
    sizeIndex -= 1;
  }

  // 범위 클램프
  sizeIndex = Math.min(Math.max(sizeIndex, 0), rawSizes.length - 1);
  const pickedSize = rawSizes[sizeIndex];

  // 표준 치수 대비 가슴 여유 계산
  const estimatedGarmentChests = [88, 94, 100, 106];
  const chosenChest = estimatedGarmentChests[Math.min(sizeIndex, estimatedGarmentChests.length - 1)] || 94;
  let ease = Math.round(chosenChest - profile.chest_circumference);
  if (ease < 2) ease = preferredFit === "tight" ? 3 : 6;

  return {
    hasProfile: true,
    recommendedSize: pickedSize,
    easeMargin: ease,
    fitLabel,
    recommendationMessage: `가슴 둘레 약 ${ease}cm 여유`,
    fitComment:
      preferredFit === "tight"
        ? "바디 라인을 예쁘게 잡아주는 슬림 핏입니다."
        : preferredFit === "loose"
        ? "자연스럽게 떨어지는 편안한 릴렉스 핏입니다."
        : "과하지 않고 단정하게 어울리는 정사이즈 핏입니다.",
    customerName,
  };
}
