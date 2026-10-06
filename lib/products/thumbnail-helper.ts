import excelParsedProducts from "@/lib/sfcc/mock/parsed-products.json";

// Default fallback image if nothing else matches
export const DEFAULT_PRODUCT_THUMBNAIL = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";

/**
 * Returns a high-quality product thumbnail URL based on:
 * 1. Explicit image passed in
 * 2. Product title match from localStorage admin_products
 * 3. Product title match from excelParsedProducts
 * 4. Keyword/token similarity match
 * 5. Default fallback
 */
export function getProductThumbnail(itemsText?: string, explicitImage?: string): string {
  if (
    explicitImage &&
    typeof explicitImage === "string" &&
    explicitImage.trim() !== "" &&
    !explicitImage.includes("placeholder")
  ) {
    return explicitImage.trim();
  }

  if (!itemsText || typeof itemsText !== "string" || itemsText.trim() === "") {
    return DEFAULT_PRODUCT_THUMBNAIL;
  }

  const cleanText = itemsText
    .replace(/\(.*?\)/g, "") // remove (FREE), (1개), etc.
    .replace(/\[.*?\]/g, "") // remove [BLACK LABEL], etc.
    .replace(/\d+개/g, "")
    .replace(/,\s*/g, " ")
    .toLowerCase()
    .trim();

  // 1. Check localStorage admin_products if on client side
  let localProducts: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("admin_products");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localProducts = parsed;
      }
    } catch {}
  }

  const allProducts = [...localProducts, ...(excelParsedProducts as any[])];

  // 2. Exact or substring match on product title
  for (const p of allProducts) {
    if (!p?.title) continue;
    const pTitle = String(p.title).toLowerCase().trim();
    const pClean = pTitle.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();
    const pImg = p.featuredImage?.url || p.images?.[0]?.url || p.heroCustomImage || p.image;
    if (!pImg || typeof pImg !== "string" || pImg.includes("main_slider")) continue;

    if (cleanText.includes(pClean) || pClean.includes(cleanText)) {
      return pImg;
    }
  }

  // 3. Keyword token match
  const keywords = cleanText.split(/[\s/]+/).filter((k) => k.length >= 2);
  let bestProduct: any = null;
  let maxScore = 0;

  for (const p of allProducts) {
    if (!p?.title) continue;
    const pTitle = String(p.title).toLowerCase();
    const pImg = p.featuredImage?.url || p.images?.[0]?.url || p.heroCustomImage || p.image;
    if (!pImg || typeof pImg !== "string" || pImg.includes("main_slider")) continue;

    let score = 0;
    for (const kw of keywords) {
      if (pTitle.includes(kw)) score += 2;
    }
    if (score > maxScore) {
      maxScore = score;
      bestProduct = p;
    }
  }

  if (bestProduct && maxScore > 0) {
    return (
      bestProduct.featuredImage?.url ||
      bestProduct.images?.[0]?.url ||
      bestProduct.heroCustomImage ||
      bestProduct.image ||
      DEFAULT_PRODUCT_THUMBNAIL
    );
  }

  // 4. Default fallback
  return DEFAULT_PRODUCT_THUMBNAIL;
}
