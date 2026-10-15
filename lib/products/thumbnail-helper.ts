import productsCache from "@/data/products-cache.json";

// Default fallback image if nothing else matches
export const DEFAULT_PRODUCT_THUMBNAIL = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";

// Specific thumbnail mappings for products with color/type variants
export const YORK_KNIT_COLOR_THUMBNAILS: Record<string, string> = {
  black: "https://cdn.imweb.me/thumbnail/20260923/b20de2087d1948a7.jpg",
  mocha: "https://cdn.imweb.me/thumbnail/20260916/740f2473a44f45a6.jpg",
  charcoal: "https://cdn.imweb.me/thumbnail/20260916/d5e6ec93ef8b49e5.jpg",
  ivory: "https://cdn.imweb.me/thumbnail/20260916/4b3fbd439c004492.jpg",
  coolgrey: "https://cdn.imweb.me/thumbnail/20260916/fce9879c3f8f4393.jpg",
};

/**
 * Validates whether a given string is an actual image URL or path.
 * Excludes plain text (such as product options) and demo placeholders.
 */
export function isValidImageUrl(url?: any): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("/") &&
    !trimmed.startsWith("data:image/")
  ) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("placeholder") ||
    lower.includes("product_1.webp") ||
    lower.includes("product_2.webp") ||
    lower.includes("product_3.webp") ||
    lower.includes("product_4.webp") ||
    lower.startsWith("/1.jpg") ||
    lower.startsWith("/model_") ||
    lower.includes("main_slider")
  ) {
    return false;
  }
  return true;
}

export function resolveColorSpecificThumbnail(text?: string): string | null {
  if (!text || typeof text !== "string") return null;

  // Remove brand tag [BLACK LABEL] so "black" does not cause false positives
  const textWithoutBrand = text.replace(/\[\s*BLACK\s*LABEL\s*\]/gi, "").replace(/\s+/g, "").toLowerCase();

  // 1. [BLACK LABEL]하이엔드 F/W 메리노울100 요크 디테일 브이넥 니트 컬러 매핑
  if (textWithoutBrand.includes("요크") || (textWithoutBrand.includes("메리노울") && textWithoutBrand.includes("브이넥"))) {
    if (textWithoutBrand.includes("아이보리") || textWithoutBrand.includes("ivory") || textWithoutBrand.includes("화이트")) {
      return YORK_KNIT_COLOR_THUMBNAILS.ivory;
    }
    if (textWithoutBrand.includes("모카") || textWithoutBrand.includes("mocha")) {
      return YORK_KNIT_COLOR_THUMBNAILS.mocha;
    }
    if (textWithoutBrand.includes("차콜") || textWithoutBrand.includes("charcoal")) {
      return YORK_KNIT_COLOR_THUMBNAILS.charcoal;
    }
    if (textWithoutBrand.includes("블랙") || textWithoutBrand.includes("black")) {
      return YORK_KNIT_COLOR_THUMBNAILS.black;
    }
    if (textWithoutBrand.includes("쿨그레이") || textWithoutBrand.includes("그레이") || textWithoutBrand.includes("gray") || textWithoutBrand.includes("grey")) {
      return YORK_KNIT_COLOR_THUMBNAILS.coolgrey;
    }
    return YORK_KNIT_COLOR_THUMBNAILS.coolgrey;
  }

  // 2. [BLACK LABEL] 실크100 헤리티지 아트워크 롱 가디건
  if (textWithoutBrand.includes("헤리티지") && textWithoutBrand.includes("가디건")) {
    if (textWithoutBrand.includes("a타입") || textWithoutBrand.includes("atype")) {
      return "https://cdn.imweb.me/thumbnail/20260528/d016743167bb49cb.jpg";
    }
    if (textWithoutBrand.includes("b타입") || textWithoutBrand.includes("btype")) {
      return "https://cdn.imweb.me/thumbnail/20260528/f69c920118824927.jpg";
    }
  }

  // 3. [BLACK LABEL] 실크100 헤리티지 아트워크 롱슬리브 니트 A타입 / B타입
  if (textWithoutBrand.includes("헤리티지") && (textWithoutBrand.includes("실크100") || textWithoutBrand.includes("니트"))) {
    if (textWithoutBrand.includes("a타입") || textWithoutBrand.includes("atype")) {
      return "https://cdn.imweb.me/thumbnail/20261008/fed1806f5d8c4687.jpg";
    }
    if (textWithoutBrand.includes("b타입") || textWithoutBrand.includes("btype")) {
      return "https://cdn.imweb.me/thumbnail/20261008/246254dc38f04062.jpg";
    }
  }

  return null;
}

function cleanKeywords(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\b\d+차\b/gi, " ")
    .replace(/\d+차/g, " ")
    .replace(/\b(PREMIUM|SPECIAL|LIMITED|EXCLUSIVE|HOT|BEST|NEW|SALE|FW|SS|F\/W|S\/S)\b/gi, " ")
    .replace(/프리미엄/g, " ")
    .replace(/하이엔드/g, " ")
    .replace(/셋업/g, "세트")
    .replace(/\b\d+ea\b/gi, " ")
    .replace(/\b\d+개\b/gi, " ")
    .replace(/x\s*\d+/gi, " ")
    .replace(/[\/,\-_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSimple(str?: string): string {
  return cleanKeywords(str).replace(/\s+/g, "");
}

export interface MatchedProductResult {
  product: any;
  imageUrl: string;
  score: number;
}

// Memory cache to prevent redundant catalog scans during renders
const lookupCache = new Map<string, MatchedProductResult | null>();

/**
 * Finds the exact or best matching product from the catalog for a given order item name & options.
 */
export function findProductFromCatalog(
  itemsText?: string,
  optionText?: string,
  customCatalog?: any[]
): MatchedProductResult | null {
  const catalog = (customCatalog && customCatalog.length > 0) ? customCatalog : (productsCache as any[]);
  const fullText = `${itemsText || ""} ${optionText || ""}`.trim();
  if (!fullText) return null;

  const cacheKey = `${itemsText || ""}:::${optionText || ""}:::${catalog.length}`;
  if (lookupCache.has(cacheKey)) {
    return lookupCache.get(cacheKey) || null;
  }

  const normFull = normalizeSimple(fullText);
  const normName = normalizeSimple(itemsText);

  let bestMatch: MatchedProductResult | null = null;
  let bestScore = -1;

  for (const p of catalog) {
    if (!p || !p.title) continue;
    const pTitle = String(p.title);
    const pNorm = normalizeSimple(pTitle);
    if (!pNorm) continue;

    const pImg = p.featuredImage?.url || p.images?.[0]?.url || p.heroCustomImage || p.image;
    if (!pImg || typeof pImg !== "string" || pImg.includes("main_slider") || pImg.includes("placeholder")) continue;

    let score = 0;

    // Check specific variant tags: e.g. A타입 vs B타입
    const itemHasAType = /a타입|atype/i.test(fullText);
    const itemHasBType = /b타입|btype/i.test(fullText);
    const pHasAType = /a타입|atype/i.test(pTitle);
    const pHasBType = /b타입|btype/i.test(pTitle);

    if (itemHasAType && pHasBType) continue; // conflict
    if (itemHasBType && pHasAType) continue; // conflict

    if (itemHasAType && pHasAType) score += 60;
    if (itemHasBType && pHasBType) score += 60;

    // Check color matching
    const colors = ["아이보리", "블랙", "모카", "차콜", "쿨그레이", "카키", "베이지", "네이비", "멜란지", "메로나", "크림", "화이트", "그레이"];
    for (const c of colors) {
      if (fullText.includes(c) && pTitle.includes(c)) {
        score += 40;
      }
    }

    if (normFull === pNorm) {
      score += 120;
    } else if (normName === pNorm) {
      score += 100;
    } else if (normFull.includes(pNorm) && pNorm.length >= 4) {
      score += 60 + (pNorm.length / normFull.length) * 30;
    } else if (pNorm.includes(normFull) && normFull.length >= 4) {
      score += 60 + (normFull.length / pNorm.length) * 30;
    } else if (normName.length >= 4 && pNorm.includes(normName)) {
      score += 50 + (normName.length / pNorm.length) * 30;
    } else if (pNorm.length >= 4 && normName.includes(pNorm)) {
      score += 50 + (pNorm.length / normName.length) * 30;
    }

    if (score > bestScore && score >= 40) {
      bestScore = score;
      bestMatch = { product: p, imageUrl: pImg, score };
    }
  }

  lookupCache.set(cacheKey, bestMatch);
  return bestMatch;
}

/**
 * Returns a high-quality product thumbnail URL if the item exists in the product catalog.
 * Returns empty string if the item is not registered in the catalog (so that the UI displays the front character badge).
 */
export function getProductThumbnail(
  itemsText?: string,
  explicitImage?: string,
  optionText?: string,
  customCatalog?: any[]
): string {
  // If explicitImage is a valid URL, return it
  if (isValidImageUrl(explicitImage)) {
    return explicitImage!.trim();
  }

  // If explicitImage is not a URL, it might have been passed as optionText
  let effectiveOption = optionText;
  let effectiveCatalog = customCatalog;

  if (explicitImage && typeof explicitImage === "string" && !optionText) {
    effectiveOption = explicitImage;
  }
  if (Array.isArray(optionText) && !customCatalog) {
    effectiveCatalog = optionText;
    effectiveOption = undefined;
  }

  const combined = `${itemsText || ""} ${effectiveOption || ""}`.trim();
  if (!combined) return "";

  // 1. Color/type specific overrides (verified 200 OK CDN URLs)
  const colorMatch = resolveColorSpecificThumbnail(combined);
  if (colorMatch) return colorMatch;

  // 2. Dynamic matching from catalog
  const match = findProductFromCatalog(itemsText, effectiveOption, effectiveCatalog);
  if (match?.imageUrl) {
    return match.imageUrl;
  }

  return "";
}

/**
 * Returns the front character(s) (앞글씨) of a product name for products not in the catalog.
 * Strips bracket tags ([BLACK LABEL], [3차], etc.), size/order info, and returns the first 2 characters.
 */
export function getProductInitial(rawName?: string): string {
  if (!rawName || typeof rawName !== "string") return "상품";
  let clean = rawName
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\d+개/g, "")
    .replace(/x\s*\d+/gi, "")
    .trim();

  // Remove common marketing/batch prefixes if at the beginning
  clean = clean.replace(/^(PREMIUM|SPECIAL|LIMITED|EXCLUSIVE|HOT|BEST|NEW|SALE|FW|SS|F\/W|S\/S)\s+/i, "");
  clean = clean.replace(/^[^a-zA-Z0-9가-힣]+/, "").trim();

  if (!clean) return "상품";

  // Korean: 2 characters (e.g. '코튼', '막스', '데님', '썸머', '폴드')
  if (/^[가-힣]/.test(clean)) {
    return clean.slice(0, 2);
  }

  // English/Alphanumeric: 2 characters uppercase (e.g. 'SU', 'RO', 'CA')
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Generates a deterministic, subtle, premium color badge class for initial avatars.
 */
export function getProductBadgeColor(rawName?: string): string {
  const palettes = [
    "bg-slate-100 text-slate-800 border-slate-200",
    "bg-stone-100 text-stone-800 border-stone-200",
    "bg-zinc-100 text-zinc-800 border-zinc-200",
    "bg-amber-50 text-amber-900 border-amber-200",
    "bg-blue-50 text-blue-800 border-blue-200",
    "bg-indigo-50 text-indigo-800 border-indigo-200",
    "bg-purple-50 text-purple-800 border-purple-200",
    "bg-rose-50 text-rose-800 border-rose-200",
    "bg-emerald-50 text-emerald-900 border-emerald-200",
  ];
  if (!rawName) return palettes[0];
  let hash = 0;
  for (let i = 0; i < rawName.length; i++) {
    hash = (hash << 5) - hash + rawName.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}
