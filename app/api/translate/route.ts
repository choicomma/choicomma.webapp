import { NextRequest, NextResponse } from "next/server";

// In-memory server cache to minimize API calls and keep costs near zero
const translationCache = new Map<string, string>();

// DeepL target language code mapping
const DEEPL_LANG_MAP: Record<string, string> = {
  ko: "KO",
  en: "EN-US",
  ja: "JA",
  "zh-cn": "ZH",
  zh: "ZH",
  es: "ES",
  fr: "FR",
  de: "DE",
  vi: "VI",
  th: "TH",
  id: "ID",
};

// Built-in instantaneous UI dictionary for common e-commerce terms
const UI_DICTIONARY: Record<string, Record<string, string>> = {
  "오픈 예정": {
    en: "Coming Soon",
    ja: "オープン予定",
    "zh-CN": "即将发售",
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
    "zh-CN": "已售罄",
    es: "Agotado",
    fr: "Épuisé",
    de: "Ausverkauft",
    vi: "Hết hàng",
    th: "สินค้าหมด",
    id: "Habis",
  },
  "장바구니": {
    en: "Cart",
    ja: "カート",
    "zh-CN": "购物车",
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
    "zh-CN": "立即购买",
    es: "Comprar ahora",
    fr: "Acheter",
    de: "Jetzt kaufen",
    vi: "Mua ngay",
    th: "ซื้อเลย",
    id: "Beli Sekarang",
  },
  "로그인": {
    en: "Sign In",
    ja: "ログイン",
    "zh-CN": "登录",
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
    "zh-CN": "退出登录",
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
    "zh-CN": "查看全部",
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
    "zh-CN": "限时特惠",
    es: "Oferta flash",
    fr: "Vente flash",
    de: "Flash-Sale",
    vi: "Giảm giá có hạn",
    th: "ลดราคาจำกัดเวลา",
    id: "Promo Terbatas",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texts, text, targetLang, sourceLang = "ko" } = body;

    const rawList: string[] = Array.isArray(texts)
      ? texts
      : typeof text === "string"
      ? [text]
      : [];

    if (rawList.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    const normalizedTarget = (targetLang || "en").toLowerCase();

    // If target is source language (Korean), return originals immediately
    if (normalizedTarget === "ko" || normalizedTarget === sourceLang.toLowerCase()) {
      return NextResponse.json({
        translations: rawList.map((t) => ({ original: t, translated: t })),
      });
    }

    const results: { original: string; translated: string }[] = new Array(rawList.length);
    const missingIndices: number[] = [];
    const missingTexts: string[] = [];

    // 1. Check UI Dictionary & In-memory Cache first
    rawList.forEach((str, index) => {
      const trimmed = str.trim();
      const cacheKey = `${sourceLang}:${normalizedTarget}:${trimmed}`;

      // Check dictionary
      if (UI_DICTIONARY[trimmed]?.[normalizedTarget] || UI_DICTIONARY[trimmed]?.[targetLang]) {
        results[index] = {
          original: str,
          translated: UI_DICTIONARY[trimmed][normalizedTarget] || UI_DICTIONARY[trimmed][targetLang],
        };
        return;
      }

      // Check cache
      if (translationCache.has(cacheKey)) {
        results[index] = {
          original: str,
          translated: translationCache.get(cacheKey)!,
        };
        return;
      }

      missingIndices.push(index);
      missingTexts.push(trimmed);
    });

    // If everything was found in cache/dictionary, return immediately
    if (missingTexts.length === 0) {
      return NextResponse.json({ translations: results });
    }

    // 2. Query DeepL API for remaining texts
    const apiKey = process.env.DEEPL_API_KEY;

    if (!apiKey) {
      // Fallback: If no DeepL key configured yet, return original text safely
      missingIndices.forEach((origIdx, i) => {
        results[origIdx] = { original: rawList[origIdx], translated: missingTexts[i] };
      });
      return NextResponse.json({
        translations: results,
        notice: "DEEPL_API_KEY is not configured yet. Set DEEPL_API_KEY in .env.local to activate DeepL AI translations.",
      });
    }

    const isFreeKey = apiKey.endsWith(":fx");
    const apiUrl = isFreeKey
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate";

    const deeplTarget = DEEPL_LANG_MAP[normalizedTarget] || "EN-US";
    const deeplSource = DEEPL_LANG_MAP[sourceLang.toLowerCase()] || "KO";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: missingTexts,
        target_lang: deeplTarget,
        source_lang: deeplSource,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[DeepL API Error]", response.status, errText);

      // Fallback to original text on API error
      missingIndices.forEach((origIdx, i) => {
        results[origIdx] = { original: rawList[origIdx], translated: missingTexts[i] };
      });
      return NextResponse.json({ translations: results, error: `DeepL API returned ${response.status}` });
    }

    const data = await response.json();
    const translations = data.translations || [];

    missingIndices.forEach((origIdx, i) => {
      const translatedText = translations[i]?.text || missingTexts[i];
      const cacheKey = `${sourceLang}:${normalizedTarget}:${missingTexts[i]}`;
      translationCache.set(cacheKey, translatedText);

      results[origIdx] = {
        original: rawList[origIdx],
        translated: translatedText,
      };
    });

    return NextResponse.json({ translations: results });
  } catch (error: any) {
    console.error("[Translation Route Error]", error);
    return NextResponse.json(
      { error: error?.message || "Translation failed", translations: [] },
      { status: 500 }
    );
  }
}
