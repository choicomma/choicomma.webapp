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

    // 2. '오늘 하루 보지 않기' 만료 시간 확인 (팝업 ID별 독립 검사)
    if (typeof window !== "undefined") {
      const specificKey = `choicomma_hide_home_popup_${cfg.id || "default"}_until`;
      const hideUntilSpecific = localStorage.getItem(specificKey);
      if (hideUntilSpecific) {
        const timestamp = parseInt(hideUntilSpecific, 10);
        if (!isNaN(timestamp) && Date.now() < timestamp) {
          setIsOpen(false);
          return;
        }
      }
    }

    // 3. 조건 만족 시 즉시 팝업 오픈
    setIsOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);

    // 로컬 설정 우선 즉각 적용 (0초 즉시 노출)
    const local = getLocalPopupConfig();
    setConfig(local);
    checkAndShowPopup(local);

    // 서버 원장 API에서 최신 팝업 정보 동기화
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
    if (dontShowToday && config?.id && typeof window !== "undefined") {
      // 오늘 자정 또는 24시간 뒤까지 숨김 처리
      const expireTime = Date.now() + 24 * 60 * 60 * 1000;
      const specificKey = `choicomma_hide_home_popup_${config.id}_until`;
      localStorage.setItem(specificKey, String(expireTime));
      localStorage.setItem(POPUP_HIDE_UNTIL_KEY, String(expireTime));
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

  if (!mounted || !isOpen || !config || !config.isActive) return null;

  const isNoticeMode = config.popupType === "NOTICE" || (!config.imageUrl && Boolean(config.noticeMessage || config.title));

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
          /* ── Rich Announcement Notice Modal (정돈된 공지 팝업) ── */
          <div className="p-6 sm:p-7 space-y-4.5">
            {/* 1. Official Header Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                서비스 일시 중단 안내
              </span>
              <span className="text-[11px] font-extrabold text-neutral-400 tracking-widest uppercase">
                CHOICOMMA OFFICIAL
              </span>
            </div>

            {/* 2. Main Large Headline */}
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-neutral-950 tracking-tight leading-snug break-keep">
                초이콤마 글로벌 몰 오픈 준비에 따른<br />
                서비스 일시 이용 불가 안내
              </h2>
              <p className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">
                Global Store Launch &amp; Temporary Service Pause
              </p>
            </div>

            {/* 3. Core Highlight Box (핵심 요약 강조 박스) */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm sm:text-base font-black text-neutral-950 leading-relaxed break-keep">
                  "{config.noticeMessage || "초이콤마 글로벌 몰 공식 런칭 준비로 현재 서비스 이용을 하실 수 없습니다. 신속히 정상화할 수 있도록 하겠습니다."}"
                </p>
              </div>

              {/* Target Date Box */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-amber-300/60 text-xs sm:text-sm font-bold text-neutral-800">
                <div className="flex items-center gap-1.5 text-amber-950">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>정상화 완료 목표 기한:</span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white border border-amber-300 font-black text-rose-600 text-xs sm:text-sm shadow-2xs">
                  {config.noticePeriod || "2026.10.12(월)까지"}
                </span>
              </div>
            </div>

            {/* 4. Polite Customer Care Copywriting (가독성 최적화된 본문 안내글) */}
            <div className="space-y-2.5 text-sm sm:text-base text-neutral-700 leading-relaxed break-keep">
              <p className="font-bold text-neutral-900">
                초이콤마를 찾아주신 고객 여러분께 진심으로 감사드립니다.
              </p>
              <p>
                현재 해외 글로벌 고객님들과 함께하기 위한 <strong className="text-neutral-950 font-black">초이콤마 글로벌 몰 공식 런칭 및 인프라 연동 작업</strong>이 집중 진행되고 있습니다.
              </p>
              <p className="font-semibold text-neutral-900">
                이로 인해 작업 기간 동안 일시적으로 <strong className="text-rose-600 font-black underline underline-offset-4 decoration-rose-300">쇼핑몰 서비스 이용 및 사이트 접속을 하실 수 없습니다.</strong> 고객님들의 쾌적하고 안전한 쇼핑을 위해 <strong className="text-neutral-950 font-black">2026년 10월 12일까지</strong> 모든 작업을 완료하여 신속히 정상화하겠습니다.
              </p>
              <p className="text-neutral-500 font-medium text-xs sm:text-sm">
                이용에 큰 불편을 드려 고개 숙여 사과드리며, 더욱 품격 있고 새로워진 글로벌 서비스로 찾아뵙겠습니다.
              </p>
            </div>

            {/* 5. Safe Order Assurance Banner (안심 배송 안내) */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>작업 기간 중 신규 주문·결제는 불가하며, 기존 주문건의 배송 업무는 정상 진행됩니다.</span>
            </div>

            {/* 6. Footer Controls: Don't show today & Close button */}
            <div className="pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-neutral-600 hover:text-neutral-950 transition-colors w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                />
                <span>오늘 하루 동안 열지 않기</span>
              </label>

              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto min-w-[130px] px-5 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer text-center"
              >
                확인 및 닫기
              </button>
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

