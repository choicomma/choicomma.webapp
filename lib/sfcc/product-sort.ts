/**
 * lib/sfcc/product-sort.ts
 * 초이콤마 상품 고유 번호 추출 및 최신 등록순 정렬 유틸리티
 */

export function getProductNoNum(product: any): number {
  if (!product) return 0;
  if (product.productNo !== undefined && !isNaN(Number(product.productNo))) {
    return Number(product.productNo);
  }
  const code = product.productCode || product.id || "";
  const match = String(code).match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return 0;
}

export function isBannerProduct(product: any): boolean {
  if (!product) return false;
  return (
    product.categoryId === "main_banner" ||
    String(product.id || "").startsWith("hero-slide-") ||
    Boolean(product.isHeroSlide)
  );
}

/**
 * 최신 상품 우선(productNo 내림차순, e.g. 452 -> 451 -> ... -> 1)으로 상품 배열을 결정론적으로 재정렬합니다.
 * 메인 슬라이드 배너는 앞단에 온전하게 보존됩니다.
 */
export function sortProductsByLatest(products: any[]): any[] {
  if (!Array.isArray(products)) return [];

  const banners: any[] = [];
  const realProducts: any[] = [];

  for (const p of products) {
    if (isBannerProduct(p)) {
      banners.push(p);
    } else {
      realProducts.push(p);
    }
  }

  // 최신 상품 번호 내림차순 정렬 (높은 번호가 최신)
  realProducts.sort((a, b) => {
    const numA = getProductNoNum(a);
    const numB = getProductNoNum(b);
    if (numB !== numA) return numB - numA;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  // displayOrder 부여 (고정 순서 보장)
  const sorted = [...banners, ...realProducts].map((p, idx) => ({
    ...p,
    displayOrder: idx + 1,
  }));

  return sorted;
}
