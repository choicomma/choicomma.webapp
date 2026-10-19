export const DEFAULT_COLOR_HEX_MAP: Record<string, string> = {
  BLACK: "#000000",
  CREAM: "#FDFBF7",
  CHARCOAL: "#36454F",
  NAVY: "#000080",
  BEIGE: "#F5F5DC",
  WHITE: "#FFFFFF",
  BROWN: "#8B4513",
  RED: "#DC2626",
  BLUE: "#2563EB",
  GREEN: "#16A34A",
  KHAKI: "#708090",
  PINK: "#EC4899",
};

export interface SizeMeasurementRow {
  name: string;
  values: Record<string, string>;
}

export const MEASUREMENT_KO_MAP: Record<string, string> = {
  "SHOULDER": "어깨단면",
  "어깨너비": "어깨단면",
  "CHEST": "가슴단면",
  "SLEEVE": "팔길이",
  "소매길이": "팔길이",
  "LENGTH": "총장",
  "WAIST": "허리단면",
  "HIP": "힙단면",
  "THIGH": "허벅지단면",
  "HEM": "밑단단면",
};

export const DEFAULT_SIZE_MEASUREMENTS: SizeMeasurementRow[] = [
  { name: "어깨단면", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
  { name: "가슴단면", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
  { name: "팔길이", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
  { name: "총장", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
];

export const CATEGORIES_LIST = [
  { id: "timesale", name: "TIMESALE", count: 8, description: "신상품 & 타임세일 컬렉션" },
  { id: "outer", name: "OUTER", count: 12, description: "아우터 & 재킷" },
  { id: "top", name: "TOP", count: 24, description: "상의 & 니트웨어" },
  { id: "bottom", name: "BOTTOM", count: 16, description: "팬츠 & 스커트" },
  { id: "bag", name: "BAG", count: 6, description: "가방 & 래더 굿즈" },
  { id: "shoes", name: "SHOES", count: 9, description: "슈즈 & 슈케어" },
  { id: "accessory", name: "ACCESSORY", count: 15, description: "액세서리 & 잡화" },
];
