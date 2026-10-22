"use client";

import { useState, useEffect } from "react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", name: "Chinese", nativeName: "中文 (简体)", flag: "🇨🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
];

// In-memory client cache
const memoryCache = new Map<string, string>();
const LOCAL_STORAGE_KEY = "choicomma_trans_cache_v1";

// Load localStorage cache into memory on client init
function initCacheFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === "string") memoryCache.set(k, v);
        });
      }
    }
  } catch (e) {
    // ignore
  }
}

// Persist memory cache to localStorage (debounced)
let persistTimer: NodeJS.Timeout | null = null;
function persistCacheToStorage() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const obj: Record<string, string> = {};
      // Cap at 2000 entries to prevent localStorage quota issues
      let count = 0;
      for (const [k, v] of memoryCache.entries()) {
        obj[k] = v;
        count++;
        if (count >= 2000) break;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, 1000);
}

// Run cache init once
initCacheFromStorage();

// Instant UI Dictionary for e-commerce phrases
const UI_DICTIONARY: Record<string, Record<string, string>> = {
  "오픈 예정": {
    en: "Coming Soon",
    ja: "オープン予定",
    "zh-cn": "即将发售",
    es: "Próximamente",
    fr: "Prochainement",
    de: "Demnächst",
    vi: "Sắp mở bán",
    th: "เร็วๆ นี้",
    id: "Segera Hadir",
  },
  "품절": {
    en: "Sold Out",
    ja: "売り切れ",
    "zh-cn": "已售罄",
    es: "Agotado",
    fr: "Épuisé",
    de: "Ausverkauft",
    vi: "Hết hàng",
    th: "สินค้าหมด",
    id: "Habis",
  },
  "SOLD OUT": {
    en: "Sold Out",
    ja: "売り切れ",
    "zh-cn": "已售罄",
    es: "Agotado",
    fr: "Épuisé",
    de: "Ausverkauft",
    vi: "Hết hàng",
    th: "สินค้าหมด",
    id: "Habis",
  },
  "COMING SOON": {
    en: "Coming Soon",
    ja: "オープン予定",
    "zh-cn": "即将发售",
    es: "Próximamente",
    fr: "Prochainement",
    de: "Demnächst",
    vi: "Sắp mở bán",
    th: "เร็วๆ นี้",
    id: "Segera Hadir",
  },
  "장바구니": {
    en: "Cart",
    ja: "カート",
    "zh-cn": "购物车",
    es: "Carrito",
    fr: "Panier",
    de: "Warenkorb",
    vi: "Giỏ hàng",
    th: "รถเข็น",
    id: "Keranjang",
  },
  "구매하기": {
    en: "Buy Now",
    ja: "購入する",
    "zh-cn": "立即购买",
    es: "Comprar ahora",
    fr: "Acheter",
    de: "Jetzt kaufen",
    vi: "Mua ngay",
    th: "ซื้อเลย",
    id: "Beli Sekarang",
  },
  "바로구매": {
    en: "Buy Now",
    ja: "今すぐ購入",
    "zh-cn": "立即购买",
    es: "Comprar ahora",
    fr: "Acheter",
    de: "Sofort kaufen",
    vi: "Mua ngay",
    th: "ซื้อเลย",
    id: "Beli Sekarang",
  },
  "장바구니 담기": {
    en: "Add to Cart",
    ja: "カートに追加",
    "zh-cn": "加入购物车",
    es: "Añadir al carrito",
    fr: "Ajouter au panier",
    de: "In den Warenkorb",
    vi: "Thêm vào giỏ",
    th: "เพิ่มลงรถเข็น",
    id: "Tambah ke Keranjang",
  },
  "로그인": {
    en: "Sign In",
    ja: "ログイン",
    "zh-cn": "登录",
    es: "Iniciar sesión",
    fr: "Connexion",
    de: "Anmelden",
    vi: "Đăng nhập",
    th: "เข้าสู่ระบบ",
    id: "Masuk",
  },
  "로그아웃": {
    en: "Sign Out",
    ja: "ログアウト",
    "zh-cn": "退出登录",
    es: "Cerrar sesión",
    fr: "Déconnexion",
    de: "Abmelden",
    vi: "Đăng xuất",
    th: "ออกจากระบบ",
    id: "Keluar",
  },
  "전체보기": {
    en: "View All",
    ja: "すべて見る",
    "zh-cn": "查看全部",
    es: "Ver todo",
    fr: "Voir tout",
    de: "Alle anzeigen",
    vi: "Xem tất cả",
    th: "ดูทั้งหมด",
    id: "Lihat Semua",
  },
  "타임세일": {
    en: "Time Sale",
    ja: "タイムセール",
    "zh-cn": "限时特惠",
    es: "Oferta flash",
    fr: "Vente flash",
    de: "Flash-Sale",
    vi: "Giảm giá có hạn",
    th: "ลดราคาจำกัดเวลา",
    id: "Promo Terbatas",
  },
  "앞으로 가기": {
    en: "Move Forward",
    ja: "前へ",
    "zh-cn": "前进",
    es: "Avanzar",
    fr: "Avancer",
    de: "Vorwärts",
    vi: "Tiến lên",
    th: "ไปข้างหน้า",
    id: "Maju",
  },
  "뒤로 가기": {
    en: "Move Back",
    ja: "後ろへ",
    "zh-cn": "后退",
    es: "Retroceder",
    fr: "Reculer",
    de: "Zurück",
    vi: "Lùi lại",
    th: "ย้อนกลับ",
    id: "Mundur",
  },
};

/**
 * Get current active language code from cookie or localStorage
 */
export function getCurrentLanguage(): string {
  if (typeof document === "undefined") return "ko";

  // 1. Check standard choicomma_lang cookie
  const match = document.cookie.match(/(?:^|; )choicomma_lang=([^;]*)/);
  if (match && match[1]) {
    const code = match[1].trim();
    if (code) return code;
  }

  // 2. Check localStorage
  try {
    const saved = localStorage.getItem("choicomma_lang");
    if (saved) return saved;
  } catch (e) {}

  // 3. Fallback to legacy googtrans cookie
  const gMatch = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
  if (gMatch && gMatch[1]) {
    const code = gMatch[1].split("/").pop();
    if (code) {
      const lower = code.toLowerCase();
      if (lower === "zh-cn" || lower === "zh") return "zh-CN";
      return code;
    }
  }

  return "ko";
}

/**
 * Set current active language code and broadcast change event
 */
export function setLanguage(lang: string): void {
  if (typeof window === "undefined") return;

  const code = lang || "ko";

  // 1. Set modern standard cookie (1 year, SameSite=Lax)
  document.cookie = `choicomma_lang=${code}; path=/; max-age=31536000; SameSite=Lax;`;

  // 2. Set legacy googtrans cookie for smooth transition across older components
  document.cookie = `googtrans=/ko/${code}; path=/; max-age=31536000; SameSite=Lax;`;

  // 3. Persist in localStorage
  try {
    localStorage.setItem("choicomma_lang", code);
  } catch (e) {}

  // 4. Dispatch custom event so all listening components update instantly
  window.dispatchEvent(new Event("language_changed"));
}

/**
 * Fast synchronous dictionary lookup for UI words
 */
export function translateUiText(key: string, targetLang?: string): string {
  if (!key) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return key;

  const trimmed = key.trim();
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    return UI_DICTIONARY[trimmed][lang];
  }

  const cacheKey = `ko:${lang}:${trimmed}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  return key;
}

/**
 * Synchronous product title getter (returns cached translation or original)
 */
export function translateProductTitle(title: string, targetLang?: string): string {
  if (!title) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return title;

  const trimmed = title.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check dictionary
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    return UI_DICTIONARY[trimmed][lang];
  }

  // Trigger background fetch if not yet in cache
  fetchAsyncTranslation(trimmed, lang).catch(() => {});

  return title;
}

export function translateProductDescription(desc: string, targetLang?: string): string {
  if (!desc) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return desc;

  const trimmed = desc.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Trigger background fetch if not yet in cache
  fetchAsyncTranslation(trimmed, lang).catch(() => {});

  return desc;
}

/**
 * Asynchronous DeepL translation function with client-side caching
 */
export async function fetchAsyncTranslation(
  text: string,
  targetLang?: string,
  mode: "title" | "ui" = "title"
): Promise<string> {
  if (!text) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return text;

  const trimmed = text.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  // 1. Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check UI dictionary
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    const dictVal = UI_DICTIONARY[trimmed][lang];
    memoryCache.set(cacheKey, dictVal);
    persistCacheToStorage();
    return dictVal;
  }

  // 3. Call server DeepL translation API
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: [trimmed],
        targetLang: lang,
        sourceLang: "ko",
      }),
    });

    if (!res.ok) return text;

    const data = await res.json();
    const result = data.translations?.[0]?.translated;

    if (result && typeof result === "string") {
      memoryCache.set(cacheKey, result);
      persistCacheToStorage();
      return result;
    }
  } catch (e) {
    console.error("[fetchAsyncTranslation error]", e);
  }

  return text;
}

/**
 * Batch translation function for multiple texts in one round-trip
 */
export async function fetchBatchTranslation(
  texts: string[],
  targetLang?: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!texts || texts.length === 0) return result;

  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") {
    texts.forEach((t) => (result[t] = t));
    return result;
  }

  const missing: string[] = [];

  texts.forEach((t) => {
    const trimmed = t.trim();
    const cacheKey = `ko:${lang}:${trimmed}`;
    if (memoryCache.has(cacheKey)) {
      result[t] = memoryCache.get(cacheKey)!;
    } else if (UI_DICTIONARY[trimmed]?.[lang]) {
      result[t] = UI_DICTIONARY[trimmed][lang];
      memoryCache.set(cacheKey, result[t]);
    } else {
      missing.push(trimmed);
    }
  });

  if (missing.length === 0) return result;

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: missing,
        targetLang: lang,
        sourceLang: "ko",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const translations = data.translations || [];
      translations.forEach((item: { original: string; translated: string }) => {
        if (item.original && item.translated) {
          const cacheKey = `ko:${lang}:${item.original}`;
          memoryCache.set(cacheKey, item.translated);
          result[item.original] = item.translated;
        }
      });
      persistCacheToStorage();
    }
  } catch (e) {
    console.error("[fetchBatchTranslation error]", e);
  }

  // Fill in any remaining with original text
  texts.forEach((t) => {
    if (!result[t]) result[t] = t;
  });

  return result;
}

/**
 * React Hook for listening to language change and getting translations
 */
export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<string>("ko");

  useEffect(() => {
    const update = () => setCurrentLang(getCurrentLanguage());
    update();
    window.addEventListener("language_changed", update);
    return () => window.removeEventListener("language_changed", update);
  }, []);

  return {
    currentLang,
    setLanguage,
    t: (key: string) => translateUiText(key, currentLang),
    translateAsync: (text: string) => fetchAsyncTranslation(text, currentLang),
  };
}

/**
 * React Hook for a single product title with auto-translation and re-render
 */
export function useProductTranslation(originalTitle: string, targetLang?: string) {
  const [translated, setTranslated] = useState(() => translateProductTitle(originalTitle, targetLang));

  useEffect(() => {
    const lang = targetLang || getCurrentLanguage();
    if (lang === "ko") {
      setTranslated(originalTitle);
      return;
    }

    setTranslated(translateProductTitle(originalTitle, lang));

    let isMounted = true;
    fetchAsyncTranslation(originalTitle, lang).then((res) => {
      if (isMounted && res) {
        setTranslated(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalTitle, targetLang]);

  return translated;
}
