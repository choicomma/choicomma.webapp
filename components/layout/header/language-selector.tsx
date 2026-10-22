"use client";

import React, { useState, useEffect, useRef } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_LANGUAGES,
  LanguageOption,
  getCurrentLanguage,
  setLanguage,
} from "@/lib/i18n/translation";

export { SUPPORTED_LANGUAGES as LANGUAGES };
export type { LanguageOption };

interface LanguageSelectorProps {
  isScrolled?: boolean;
  className?: string;
  align?: "left" | "right";
}

export function LanguageSelector({
  isScrolled = false,
  className,
  align = "right",
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateActiveLang = () => {
      const activeCode = getCurrentLanguage();
      const found = SUPPORTED_LANGUAGES.find(
        (l) => l.code === activeCode || l.code.toLowerCase() === activeCode?.toLowerCase()
      );
      if (found) {
        setCurrentLang(found);
      }
    };

    updateActiveLang();
    window.addEventListener("language_changed", updateActiveLang);
    return () => window.removeEventListener("language_changed", updateActiveLang);
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

    // Modern DeepL state & currency synchronization
    setLanguage(lang.code);

    // Refresh page cleanly to render new language and prices across all components
    window.location.reload();
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left notranslate", className)} translate="no">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 py-1 px-1.5 sm:px-2 rounded-full text-sm font-bold transition-all cursor-pointer hover:opacity-80 notranslate"
        translate="no"
      >
        <Globe className="w-3.5 h-3.5 opacity-80" />
        <span className="font-sans font-bold flex items-center gap-1 notranslate" translate="no">
          <span className="text-sm notranslate" translate="no">
            {currentLang.nativeName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 opacity-60 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-52 rounded-2xl shadow-2xl backdrop-blur-xl border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 transition-colors notranslate",
            align === "left" ? "left-0" : "right-0",
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
            <span className="notranslate" translate="no">
              Language / 언어 선택
            </span>
            <Globe className="w-3 h-3 text-sky-500" />
          </div>
          <div
            className="max-h-72 overflow-y-auto py-1 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden notranslate"
            translate="no"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
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
                    <span className="font-medium notranslate" translate="no">
                      {lang.nativeName}
                    </span>
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
