"use client";

import React, { useState, useEffect, useRef } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, getCurrentLanguage, setLanguage } from "@/lib/i18n/translation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  isScrolled?: boolean;
  className?: string;
}

export function LanguageSelector({ isScrolled = false, className }: LanguageSelectorProps) {
  const [currentLang, setCurrentLangState] = useState("ko");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLangState(getCurrentLanguage());

    const handleLangChange = (e: any) => {
      const newLang = e.detail?.lang || getCurrentLanguage();
      setCurrentLangState(newLang);
    };

    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeOption = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs border backdrop-blur-md",
          isScrolled
            ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
            : "bg-black/5 text-neutral-900 border-black/10 hover:bg-black/10"
        )}
        aria-label="Select Language"
      >
        <Globe className="w-3.5 h-3.5" />
        <img
          src={activeOption.flagUrl}
          alt={activeOption.name}
          className="w-4 h-3 rounded-xs object-cover border border-black/10 shadow-2xs shrink-0"
        />
        <span className="font-extrabold uppercase">{activeOption.code}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white text-neutral-950 shadow-2xl border border-neutral-200/90 py-2.5 px-1 z-[999] overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-neutral-100 mb-1.5">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                Language / 언어 선택
              </p>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 px-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-neutral-950 text-white font-extrabold shadow-2xs"
                        : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={lang.flagUrl}
                        alt={lang.name}
                        className="w-4 h-3 rounded-xs object-cover border border-black/10 shadow-2xs shrink-0"
                      />
                      <span className="font-bold">{lang.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
