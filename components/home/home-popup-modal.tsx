"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ExternalLink,
  Globe,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
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
  const [dontShowToday, setDontShowToday] = useState(false);

  const checkAndShowPopup = useCallback((cfg: PopupConfig) => {
    // 1. 활성화 여부 및 홈화면 노출 여부 확인
    if (!cfg.isActive || !cfg.showOnHome) {
      setIsOpen(false);
      return;
    }

    // 내용이 전혀 없는 빈 팝업인 경우 노출 안 함
    const hasAnyContent = Boolean(cfg.title?.trim() || cfg.noticeMessage?.trim() || cfg.description?.trim() || cfg.imageUrl?.trim());
    if (!hasAnyContent) {
      setIsOpen(false);
      return;
    }

    // 2. '오늘 하루 보지 않기' 만료 시간 확인 (팝업 ID별 독립 검사 및 레거시 키 검사)
    if (typeof window !== "undefined") {
      const popupId = cfg.id || "default";
      const specificKey = `choicomma_hide_home_popup_${popupId}_until`;
      const hideUntil = localStorage.getItem(specificKey) || localStorage.getItem(POPUP_HIDE_UNTIL_KEY);
      if (hideUntil) {
        const timestamp = parseInt(hideUntil, 10);
        if (!isNaN(timestamp) && Date.now() < timestamp) {
          // 관리자가 최근에 설정을 새로 배포한 경우(updatedAt 기준) 이전의 숨김 설정을 무효화하고 노출
          const hideSetTime = localStorage.getItem("choicomma_popup_hide_set_at");
          const lastUpdated = cfg.updatedAt ? new Date(cfg.updatedAt).getTime() : 0;
          if (hideSetTime && lastUpdated && lastUpdated > parseInt(hideSetTime, 10)) {
            // 새로 배포된 공지이므로 표시
          } else {
            setIsOpen(false);
            return;
          }
        }
      }
    }

    // 3. 이미지 팝업 모드인데 이미지가 비어있는 경우 노출 안 함
    const isNotice = cfg.popupType === "NOTICE" || (!cfg.imageUrl && Boolean(cfg.noticeMessage || cfg.title));
    if (!isNotice && !cfg.imageUrl) {
      setIsOpen(false);
      return;
    }

    // 4. 조건 만족 시 즉시 팝업 오픈
    setIsOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);

    // 로컬 설정 우선 즉각 적용 (0초 즉시 노출)
    const local = getLocalPopupConfig();
    setConfig(local);
    checkAndShowPopup(local);

    // 서버 원장 API에서 최신 팝업 정보 동기화 (캐시 무효화)
    fetch("/api/admin/popup", { cache: "no-store" })
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

    // Escape 키로 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(POPUP_UPDATED_EVENT, handleUpdated);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [checkAndShowPopup]);

  const handleClose = () => {
    if (dontShowToday && typeof window !== "undefined") {
      const now = new Date();
      // 오늘 밤 23:59:59.999 자정 기준 만료 시간 (최소 12시간)
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const expireTime = Math.max(endOfDay, Date.now() + 12 * 60 * 60 * 1000);
      const popupId = config?.id || "default";
      localStorage.setItem(`choicomma_hide_home_popup_${popupId}_until`, String(expireTime));
      localStorage.setItem(POPUP_HIDE_UNTIL_KEY, String(expireTime));
      localStorage.setItem("choicomma_popup_hide_set_at", String(Date.now()));
    }
    setIsOpen(false);
  };

  const handleImageClick = () => {
    const target = config?.linkUrl?.trim();
    if (!target) return;
    handleClose();
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("//")) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else if (target.startsWith("www.")) {
      window.open(`https://${target}`, "_blank", "noopener,noreferrer");
    } else {
      router.push(target.startsWith("/") ? target : `/${target}`);
    }
  };

  if (!mounted || !isOpen || !config || !config.isActive) return null;

  const isNoticeMode = config.popupType === "NOTICE" || (!config.imageUrl && Boolean(config.noticeMessage || config.title));

  if (!isNoticeMode && !config.imageUrl) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.title || "초이콤마 공지사항"}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-250 select-none"
      onClick={handleClose}
    >
      {/* Centered Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/90 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-neutral-950 via-amber-600 to-neutral-900" />

        {/* Top Floating Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="팝업 닫기"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black flex items-center justify-center transition-all cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {isNoticeMode ? (
          /* ── Rich Announcement Notice Modal (정돈된 공지 팝업 - 전 요소 중앙 정렬) ── */
          <div className="p-7 sm:p-8 space-y-5 sm:space-y-6 text-center">
            {/* 1. Official Header Badge & Brand Label (CHOICOMMA OFFICIAL 위로 배치) */}
            <div className="flex flex-col items-center justify-center gap-2 py-0.5 text-center">
              <span className="text-[11px] sm:text-xs font-extrabold text-neutral-400 tracking-widest uppercase">
                CHOICOMMA OFFICIAL
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                공지 및 안내
              </span>
            </div>

            {/* Optional Header Image for Notice Mode */}
            {config.imageUrl && (
              <div className="relative w-full rounded-2xl overflow-hidden border border-neutral-200/80 aspect-16/7 bg-neutral-100 my-1">
                <img
                  src={config.imageUrl}
                  alt={config.title || "공지 이미지"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 2. Main Large Headline (제목 크기 확대 및 하단 여백 추가) */}
            <div className="space-y-2 pt-1 pb-2.5 sm:pb-3.5 mb-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight leading-snug break-keep text-center whitespace-pre-wrap">
                {config.title || "초이콤마 공지사항"}
              </h2>
              {config.subtitle && (
                <p className="text-xs sm:text-sm font-bold text-neutral-400 tracking-wider uppercase text-center whitespace-pre-wrap">
                  {config.subtitle}
                </p>
              )}
            </div>

            {/* 3. Core Highlight Box (아이콘 및 문구 중앙 정렬) */}
            {(config.noticeMessage || config.noticePeriod) && (
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 space-y-3.5 text-center flex flex-col items-center justify-center">
                {config.noticeMessage && (
                  <div className="flex flex-col items-center justify-center gap-2.5 py-0.5 text-center w-full">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <p className="text-sm sm:text-base font-black text-neutral-950 leading-relaxed break-keep text-center whitespace-pre-wrap">
                      {config.noticeMessage}
                    </p>
                  </div>
                )}

                {/* Target Date Box */}
                {config.noticePeriod && (
                  <div className="flex items-center justify-center flex-wrap gap-2 pt-3 border-t border-amber-300/60 text-xs sm:text-sm font-bold text-neutral-800 text-center w-full">
                    <div className="flex items-center gap-1.5 text-amber-950">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>안내 기한:</span>
                    </div>
                    <span className="px-3.5 py-1 rounded-xl bg-white border border-amber-300 font-black text-rose-600 text-xs sm:text-sm shadow-2xs whitespace-pre-wrap">
                      {config.noticePeriod}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 4. Customer Notice Body (본문 텍스트 중앙 정렬) */}
            {config.description && (
              <div className="py-2 text-sm sm:text-base text-neutral-700 leading-relaxed break-keep text-center">
                <div className="whitespace-pre-wrap text-neutral-800 font-medium leading-relaxed text-center">
                  {config.description}
                </div>
              </div>
            )}

            {/* Optional Link Button */}
            {config.linkUrl && (
              <div className="pt-1.5 flex justify-center">
                <button
                  type="button"
                  onClick={handleImageClick}
                  className="w-full py-3.5 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                >
                  <span>관련 안내 페이지로 이동</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 6. Footer Controls: Don't show today & Close button (중앙 정렬) */}
            <div className="pt-5 pb-1 border-t border-neutral-100 flex flex-col items-center justify-center gap-3.5 w-full">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer text-center"
              >
                확인 및 닫기
              </button>
              <label className="flex items-center justify-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm font-bold text-neutral-500 hover:text-neutral-950 transition-colors py-0.5">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                />
                <span>오늘 하루 동안 열지 않기</span>
              </label>
            </div>
          </div>
        ) : (
          /* ── Legacy Image Popup Content ── */
          <div>
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

            {/* Bottom Bar for Image Popup */}
            <div className="p-4 bg-white border-t border-neutral-100 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-neutral-600 hover:text-neutral-950 transition-colors">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                />
                <span>오늘 하루 열지 않기</span>
              </label>

              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

