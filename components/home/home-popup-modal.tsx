"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink } from "lucide-react";
import {
  PopupConfig,
  getLocalPopupConfig,
  POPUP_HIDE_UNTIL_KEY,
  POPUP_UPDATED_EVENT,
} from "@/lib/popup/types";

export function HomePopupModal() {
  const router = useRouter();
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkAndShowPopup = (cfg: PopupConfig) => {
      // 1. 활성화 여부, 이미지 등록 여부, 홈화면 노출 여부 확인
      if (!cfg.isActive || !cfg.imageUrl || !cfg.showOnHome) {
        setIsOpen(false);
        return;
      }

      // 2. '오늘 하루 보지 않기' 만료 시간 확인
      if (typeof window !== "undefined") {
        const hideUntil = localStorage.getItem(POPUP_HIDE_UNTIL_KEY);
        if (hideUntil) {
          const timestamp = parseInt(hideUntil, 10);
          if (!isNaN(timestamp) && Date.now() < timestamp) {
            setIsOpen(false);
            return;
          }
        }
      }

      // 3. 조건 만족 시 즉시 팝업 오픈
      setIsOpen(true);
    };

    // 로컬 스토리지에서 먼저 읽기 (0초 즉시 노출)
    const local = getLocalPopupConfig();
    setConfig(local);
    checkAndShowPopup(local);

    // 원격 Supabase API에서 최신 팝업 정보 동기화
    fetch("/api/admin/popup")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setConfig(data.config);
          checkAndShowPopup(data.config);
        }
      })
      .catch(() => {});

    // 실시간 변경 이벤트 리스너
    const handleUpdated = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
        checkAndShowPopup(e.detail);
      }
    };

    window.addEventListener(POPUP_UPDATED_EVENT, handleUpdated);
    window.addEventListener("storage", () => {
      const updated = getLocalPopupConfig();
      setConfig(updated);
      checkAndShowPopup(updated);
    });

    return () => {
      window.removeEventListener(POPUP_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleHideForToday = () => {
    if (typeof window !== "undefined") {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(POPUP_HIDE_UNTIL_KEY, String(tomorrow));
    }
    setIsOpen(false);
  };

  const handleImageClick = () => {
    if (config?.linkUrl) {
      handleClose();
      if (config.linkUrl.startsWith("http")) {
        window.open(config.linkUrl, "_blank", "noopener,noreferrer");
      } else {
        router.push(config.linkUrl);
      }
    }
  };

  if (!mounted || !isOpen || !config || !config.imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.title || "이벤트 팝업"}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300"
      onClick={handleClose}
    >
      {/* Centered Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/90 animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]"
      >
        {/* Top Floating Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="팝업 닫기"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Popup Image Content */}
        <div
          onClick={handleImageClick}
          className={`relative w-full bg-neutral-100 overflow-hidden select-none ${
            config.linkUrl ? "cursor-pointer group" : ""
          }`}
        >
          <img
            src={config.imageUrl}
            alt={config.title || "홈 팝업"}
            className="w-full h-auto max-h-[70vh] object-contain block mx-auto group-hover:scale-101 transition-transform duration-300"
          />

          {config.linkUrl && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
              <span>자세히 보기</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Footer Controls: 오늘 하루 보지 않기 & 닫기 */}
        <div className="p-3 sm:p-3.5 bg-white border-t border-neutral-100 flex items-center justify-between text-xs shrink-0">
          {config.hideForTodayEnabled ? (
            <button
              type="button"
              onClick={handleHideForToday}
              className="text-neutral-500 hover:text-neutral-950 font-bold text-xs py-1 px-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              오늘 하루 보지 않기
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
