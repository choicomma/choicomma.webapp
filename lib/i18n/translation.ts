"use client";

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
];

export function getCurrentLanguage(): string {
  return "ko";
}

export function setLanguage(lang: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("choicomma_lang", "ko");
  }
}

export function translateProductTitle(title: string, targetLang?: string): string {
  return title || "";
}

export function translateProductDescription(desc: string, targetLang?: string): string {
  return desc || "";
}

export function translateUiText(key: string, targetLang?: string): string {
  return key || "";
}

export async function fetchAsyncTranslation(text: string, targetLang?: string, mode: "title" | "ui" = "title"): Promise<string> {
  return text || "";
}
