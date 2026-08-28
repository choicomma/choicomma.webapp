export interface GlobalSalesSettings {
  tariffRatePercent: number; // Default: 30 (%)
  lastSyncTime?: string; // e.g. "2026. 08. 28. 오후 11:00:13"
  exchangeRates: {
    USD: number; // Default: 1350
    JPY: number; // Default: 9.0
    CNY: number; // Default: 185
    EUR: number; // Default: 1470
    VND: number; // Default: 0.055
    THB: number; // Default: 38
    IDR: number; // Default: 0.085
  };
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rateVsKrw: number;
  tariffMarkup: number;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSalesSettings = {
  tariffRatePercent: 30,
  exchangeRates: {
    USD: 1350,
    JPY: 9.0,
    CNY: 185,
    EUR: 1470,
    VND: 0.055,
    THB: 38,
    IDR: 0.085,
  },
};

export function getGlobalSalesSettings(): GlobalSalesSettings {
  if (typeof window === "undefined") return DEFAULT_GLOBAL_SETTINGS;
  try {
    const saved = localStorage.getItem("global_sales_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        tariffRatePercent: typeof parsed.tariffRatePercent === "number" ? parsed.tariffRatePercent : 30,
        lastSyncTime: parsed.lastSyncTime || "",
        exchangeRates: {
          ...DEFAULT_GLOBAL_SETTINGS.exchangeRates,
          ...parsed.exchangeRates,
        },
      };
    }
  } catch (e) {
    console.error("Error reading global_sales_settings", e);
  }
  return DEFAULT_GLOBAL_SETTINGS;
}

export function saveGlobalSalesSettings(settings: GlobalSalesSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("global_sales_settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("global_sales_settings_updated"));
  } catch (e) {
    console.error("Error saving global_sales_settings", e);
  }
}

/**
 * Fetch real-time live exchange rates from Open Exchange Rates API (vs KRW)
 */
export async function fetchLatestLiveExchangeRates(): Promise<GlobalSalesSettings["exchangeRates"] | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/KRW");
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.rates) {
      const r = data.rates;
      const usdInKrw = r.USD ? Math.round((1 / r.USD) * 10) / 10 : 1350;
      const jpyInKrw = r.JPY ? Math.round((1 / r.JPY) * 100) / 10 : 9.0;
      const cnyInKrw = r.CNY ? Math.round((1 / r.CNY) * 10) / 10 : 185;
      const eurInKrw = r.EUR ? Math.round((1 / r.EUR) * 10) / 10 : 1470;
      const vndInKrw = r.VND ? Math.round((1 / r.VND) * 1000) / 1000 : 0.055;
      const thbInKrw = r.THB ? Math.round((1 / r.THB) * 10) / 10 : 38;
      const idrInKrw = r.IDR ? Math.round((1 / r.IDR) * 1000) / 1000 : 0.085;

      return {
        USD: usdInKrw,
        JPY: jpyInKrw,
        CNY: cnyInKrw,
        EUR: eurInKrw,
        VND: vndInKrw,
        THB: thbInKrw,
        IDR: idrInKrw,
      };
    }
  } catch (e) {
    console.error("Failed to fetch live exchange rates", e);
  }
  return null;
}

export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  ko: { code: "KRW", symbol: "₩", rateVsKrw: 1, tariffMarkup: 1.0 },
  en: { code: "USD", symbol: "$", rateVsKrw: 1350, tariffMarkup: 1.3 },
  ja: { code: "JPY", symbol: "¥", rateVsKrw: 9.0, tariffMarkup: 1.3 },
  "zh-CN": { code: "CNY", symbol: "¥", rateVsKrw: 185, tariffMarkup: 1.3 },
  es: { code: "EUR", symbol: "€", rateVsKrw: 1470, tariffMarkup: 1.3 },
  fr: { code: "EUR", symbol: "€", rateVsKrw: 1470, tariffMarkup: 1.3 },
  de: { code: "EUR", symbol: "€", rateVsKrw: 1470, tariffMarkup: 1.3 },
  vi: { code: "VND", symbol: "₫", rateVsKrw: 0.055, tariffMarkup: 1.3 },
  th: { code: "THB", symbol: "฿", rateVsKrw: 38, tariffMarkup: 1.3 },
  id: { code: "IDR", symbol: "Rp", rateVsKrw: 0.085, tariffMarkup: 1.3 },
};

/**
 * Get current active language code from cookie or window
 */
export function getCurrentLangCode(): string {
  if (typeof document === "undefined") return "ko";
  const match = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
  if (match) {
    const code = match[1].split("/").pop();
    if (code) {
      const lower = code.toLowerCase();
      if (lower === "zh-cn" || lower === "zh") return "zh-CN";
      if (CURRENCY_MAP[lower]) return lower;
      if (CURRENCY_MAP[code]) return code;
    }
  }
  return "ko";
}

/**
 * Converts KRW price to target currency price with dynamic customs tariff markup
 */
export function formatCurrencyWithTariff(
  priceInKrw: number | string,
  langCode?: string,
  customSettings?: GlobalSalesSettings
): string {
  const krw = typeof priceInKrw === "number" ? priceInKrw : parseFloat(priceInKrw);
  if (isNaN(krw) || krw <= 0) return "0 KRW";

  const targetLang = langCode || getCurrentLangCode();
  const info = CURRENCY_MAP[targetLang] || CURRENCY_MAP["ko"];

  if (info.code === "KRW") {
    const formatted = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(krw);
    return `${formatted} KRW`;
  }

  const settings = customSettings || getGlobalSalesSettings();
  const tariffMultiplier = 1 + (settings.tariffRatePercent || 0) / 100;
  const rateVsKrw = settings.exchangeRates[info.code as keyof typeof settings.exchangeRates] || info.rateVsKrw;

  // Apply Tariff / Customs Markup & Round Up Decimals (Math.ceil)
  const tariffPriceKrw = krw * tariffMultiplier;
  const rawForeign = rateVsKrw > 0 ? tariffPriceKrw / rateVsKrw : 0;
  const foreignValue = Math.ceil(rawForeign);

  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(foreignValue);

  return `${info.symbol}${formattedValue} ${info.code}`;
}

/**
 * Get numeric amount in current currency (with tariff applied if foreign)
 */
export function getCalculatedNumericPrice(
  priceInKrw: number,
  langCode?: string,
  customSettings?: GlobalSalesSettings
): { amount: number; currency: string; tariffApplied: boolean } {
  const targetLang = langCode || getCurrentLangCode();
  const info = CURRENCY_MAP[targetLang] || CURRENCY_MAP["ko"];

  if (info.code === "KRW") {
    return { amount: priceInKrw, currency: "KRW", tariffApplied: false };
  }

  const settings = customSettings || getGlobalSalesSettings();
  const tariffMultiplier = 1 + (settings.tariffRatePercent || 0) / 100;
  const rateVsKrw = settings.exchangeRates[info.code as keyof typeof settings.exchangeRates] || info.rateVsKrw;

  const tariffPriceKrw = priceInKrw * tariffMultiplier;
  const foreignValue = rateVsKrw > 0 ? Math.ceil(tariffPriceKrw / rateVsKrw) : 0;
  return { amount: foreignValue, currency: info.code, tariffApplied: true };
}
