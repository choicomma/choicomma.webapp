/**
 * 홈/목록 화면에서는 쓰지 않는 무거운 필드(상세 HTML, 색상 hex 맵)를 제거해
 * 서버 렌더 페이로드와 /api/products 응답 크기를 줄인다. (상세/관리자 화면은 전체 데이터를 그대로 사용)
 */
const HEAVY_LIST_FIELDS = ["descriptionHtml", "detailDescription", "colorHexMap"] as const;

export function slimProductForList<T extends Record<string, any>>(product: T): T {
  if (!product || typeof product !== "object") return product;
  const copy: Record<string, any> = { ...product };
  for (const key of HEAVY_LIST_FIELDS) delete copy[key];
  return copy as T;
}

export function slimProductsForList<T extends Record<string, any>>(products: T[]): T[] {
  return Array.isArray(products) ? products.map(slimProductForList) : products;
}
