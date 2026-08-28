"use client";

import React, { useState, useEffect, useRef } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
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

interface LanguageSelectorProps {
  isScrolled?: boolean;
  className?: string;
}

// Global DOM Node Patch for Google Translate React Virtual DOM compatibility
if (typeof window !== "undefined" && typeof Node !== "undefined" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(node: T, child: Node | null): T {
    if (child && child.parentNode !== this) {
      return node;
    }
    return originalInsertBefore.call(this, node, child) as T;
  };
}

export function LanguageSelector({ isScrolled = false, className }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageOption>(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Suppress Google Translate DOM mutation errors on React Virtual DOM
    const handleGlobalError = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes("removeChild") ||
          event.message.includes("insertBefore") ||
          event.message.includes("Node") ||
          event.message.includes("translate") ||
          event.message.includes("google"))
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("error", handleGlobalError, true);
    }

    // Load Google Translate Script dynamically
    if (typeof window !== "undefined" && !document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: "ko",
              includedLanguages: "ko,en,ja,zh-CN,es,fr,de,vi,th,id",
              autoDisplay: false,
              layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            "google_translate_element"
          );
        }
      };
    }

    // Read initial cookie if set
    const match = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
    if (match) {
      const code = match[1].split("/").pop();
      const found = LANGUAGES.find((l) => l.code === code || l.code.toLowerCase() === code?.toLowerCase());
      if (found) setCurrentLang(found);
    }

    // Interval to strip Google Translate top banner frame if injected
    const interval = setInterval(() => {
      if (typeof document !== "undefined") {
        const frames = document.querySelectorAll(
          "iframe.goog-te-banner-frame, iframe.VIpgJd-Z69jMc-ahb-wL2fd1, iframe[class*='VIpgJd'], iframe[src*='translate.google.com'], iframe[src*='translate.googleapis.com']"
        );
        frames.forEach((frame) => {
          const el = frame as HTMLElement;
          el.style.display = "none";
          el.style.visibility = "hidden";
          el.style.opacity = "0";
          el.style.position = "absolute";
          el.style.top = "-9999px";
          el.style.left = "-9999px";
        });
        if (document.body.style.top !== "0px") {
          document.body.style.top = "0px";
        }
        if (document.documentElement.style.top !== "0px") {
          document.documentElement.style.top = "0px";
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (lang: LanguageOption) => {
    setCurrentLang(lang);
    setIsOpen(false);

    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".");

    if (lang.code === "ko") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      if (!isLocal) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      }
      window.location.reload();
      return;
    }

    // Set Google Translate Cookie
    const cookieVal = `/ko/${lang.code}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (!isLocal) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
    }

    // Dispatch custom event for currency updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("language_changed"));
    }

    // Reload page to refresh all currency prices & translation
    window.location.reload();
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left notranslate", className)} translate="no">
      {/* Hidden Google Translate Mount Container */}
      <div id="google_translate_element" className="hidden border-none p-0 opacity-0 pointer-events-none" />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-transparent hover:scale-[1.02] notranslate",
          isScrolled
            ? "bg-white/10 text-white hover:bg-white/20 border-white/10"
            : "bg-black/5 text-neutral-900 hover:bg-black/10 border-black/5"
        )}
        translate="no"
      >
        <Globe className="w-3.5 h-3.5 opacity-80" />
        <span className="font-sans font-bold flex items-center gap-1 notranslate" translate="no">
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline notranslate" translate="no">{currentLang.nativeName}</span>
        </span>
        <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl backdrop-blur-xl border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 transition-colors notranslate",
            isScrolled
              ? "bg-neutral-950/95 text-white border-neutral-800"
              : "bg-white/95 text-neutral-900 border-neutral-200/90 shadow-xl"
          )}
          translate="no"
        >
          <div
            className={cn(
              "px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider flex items-center justify-between notranslate",
              isScrolled ? "border-neutral-800 text-neutral-400" : "border-neutral-200/80 text-neutral-500"
            )}
            translate="no"
          >
            <span className="notranslate" translate="no">Language / 언어 선택</span>
            <Globe className="w-3 h-3 text-sky-500" />
          </div>
          <div className="max-h-72 overflow-y-auto py-1 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden notranslate" translate="no">
            {LANGUAGES.map((lang) => {
              const isSelected = currentLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer notranslate",
                    isSelected
                      ? isScrolled
                        ? "bg-white/15 text-white font-bold"
                        : "bg-neutral-900 text-white font-bold"
                      : isScrolled
                      ? "text-neutral-300 hover:bg-white/10 hover:text-white"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  )}
                  translate="no"
                >
                  <span className="flex items-center gap-2 notranslate" translate="no">
                    <span className="text-sm">{lang.flag}</span>
                    <span className="font-medium notranslate" translate="no">{lang.nativeName}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
