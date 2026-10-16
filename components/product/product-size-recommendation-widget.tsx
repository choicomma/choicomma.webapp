"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Ruler,
  ChevronRight,
  Edit3,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import {
  UserSizeProfile,
  getUserSizeProfile,
  calculateRecommendedSize,
  SizeRecommendationResult,
} from "@/lib/size-profile";
import { SizeProfileModal } from "@/components/size-profile/size-profile-modal";

interface ProductSizeRecommendationWidgetProps {
  product: any;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  className?: string;
}

export function ProductSizeRecommendationWidget({
  product,
  selectedSize,
  onSelectSize,
  className = "",
}: ProductSizeRecommendationWidgetProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserSizeProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGuestAlertModal, setShowGuestAlertModal] = useState(false);
  const [recommendation, setRecommendation] = useState<SizeRecommendationResult | null>(null);

  // 회원 로그인 상태 판별 (비회원은 로그인되지 않음)
  const isUserLoggedIn = () => {
    if (typeof window === "undefined") return false;
    try {
      const isAdmin =
        localStorage.getItem("user_role") === "admin" ||
        sessionStorage.getItem("choicomma_admin_authenticated") === "true";
      if (isAdmin) return true;
      const isLoggedIn = localStorage.getItem("is_logged_in") === "true";
      const email = (localStorage.getItem("membership_user_email") || "").trim();
      return isLoggedIn && Boolean(email);
    } catch {
      return false;
    }
  };

  // 로컬스토리지에서 프로필 로드 및 추천값 계산 (비회원은 프로필 미적용)
  const updateProfileAndRecommendation = useCallback(() => {
    if (!isUserLoggedIn()) {
      setProfile(null);
      setRecommendation(null);
      return;
    }
    const loadedProfile = getUserSizeProfile();
    setProfile(loadedProfile);
    if (loadedProfile && product) {
      const res = calculateRecommendedSize(product, loadedProfile);
      setRecommendation(res);
    } else {
      setRecommendation(null);
    }
  }, [product]);

  useEffect(() => {
    updateProfileAndRecommendation();

    // 외부(모달, 마이페이지 등)에서 프로필 변경 시 동기화
    const handleProfileUpdate = () => {
      updateProfileAndRecommendation();
    };

    window.addEventListener("user_size_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    window.addEventListener("auth_changed", handleProfileUpdate);

    return () => {
      window.removeEventListener("user_size_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
      window.removeEventListener("auth_changed", handleProfileUpdate);
    };
  }, [updateProfileAndRecommendation]);

  // 맞춤 사이즈 입력/수정 버튼 클릭 시: 비회원이면 회원가입 안내 알림창 띄움
  const handleOpenSizeModal = () => {
    if (!isUserLoggedIn()) {
      setShowGuestAlertModal(true);
      return;
    }
    setIsModalOpen(true);
  };

  // 추천 사이즈 클릭 시 해당 사이즈 옵션 자동 선택
  const handleApplyRecommendedSize = () => {
    if (recommendation?.recommendedSize && onSelectSize) {
      onSelectSize(recommendation.recommendedSize);
    }
  };

  return (
    <div className={`w-full my-3 ${className}`}>
      {/* CASE 1: 고객 신체 데이터가 없는 경우 */}
      {!profile ? (
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-r from-neutral-50 via-white to-amber-50/40 p-4 transition-all duration-300 hover:border-neutral-950/60 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Ruler className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black tracking-wider uppercase text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    AI FIT ADVISOR
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    맞춤 사이즈 추천
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  체형과 선호 핏을 입력하시면 가장 잘 어울리는 사이즈를 알려드려요.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenSizeModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-extrabold tracking-tight transition-all shadow-xs cursor-pointer group shrink-0"
            >
              <span>내 사이즈 입력하고 딱 맞는 사이즈 찾기</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: 고객 신체 데이터가 있는 경우 (추천 결과 카드) */
        recommendation && (
          <div className="relative overflow-hidden rounded-2xl border border-neutral-900/15 bg-gradient-to-br from-white via-neutral-50/50 to-amber-50/30 p-4 sm:p-4.5 shadow-2xs transition-all">
            {/* 상단: 고객 맞춤 타이틀 + 신체 정보 수정 소형 링크 버튼 */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-950 text-amber-300">
                  <Sparkles className="w-3 h-3 fill-amber-300/30" />
                </span>
                <span className="text-xs font-black text-neutral-950 tracking-tight">
                  초이콤마 맞춤 추천 결과
                </span>
                <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/80 px-1.5 py-0.5 rounded">
                  {recommendation.fitLabel} 핏
                </span>
              </div>

              {/* 신체 정보 수정 소형 링크 버튼 */}
              <button
                type="button"
                onClick={handleOpenSizeModal}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-neutral-950 hover:underline transition-colors cursor-pointer"
                title="등록된 키, 몸무게, 가슴둘레, 허리둘레, 선호 핏 수정"
              >
                <Edit3 className="w-3 h-3" />
                <span>신체 정보 수정</span>
              </button>
            </div>

            {/* 메인 추천 문구 카드 */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs sm:text-[13px] font-bold text-neutral-900 leading-snug">
                  <span className="font-extrabold text-neutral-950">
                    {recommendation.customerName}
                  </span>
                  님께는{" "}
                  <button
                    type="button"
                    onClick={handleApplyRecommendedSize}
                    className="inline-flex items-center gap-1 font-black text-xs sm:text-sm text-neutral-950 bg-amber-100/90 border border-amber-300/80 hover:bg-amber-200 px-2 py-0.5 rounded-lg mx-1 shadow-2xs transition-all cursor-pointer group"
                    title={`클릭 시 [${recommendation.recommendedSize}] 사이즈 옵션이 바로 선택됩니다.`}
                  >
                    <span>[{recommendation.recommendedSize}]</span>
                    {selectedSize === recommendation.recommendedSize && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 inline-block" />
                    )}
                  </button>{" "}
                  사이즈를 추천합니다!
                </p>
                <p className="text-[11px] text-neutral-500 font-medium">
                  ({recommendation.fitComment})
                </p>
              </div>

              {/* 추천 사이즈 바로 적용 버튼 */}
              {onSelectSize && recommendation.recommendedSize && (
                <button
                  type="button"
                  onClick={handleApplyRecommendedSize}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    selectedSize === recommendation.recommendedSize
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                      : "bg-white text-neutral-800 border-neutral-300 hover:border-neutral-950"
                  }`}
                >
                  {selectedSize === recommendation.recommendedSize
                    ? "✓ 추천 사이즈 선택됨"
                    : `[${recommendation.recommendedSize}] 선택하기`}
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* 신체 정보 입력/수정 모달 (로그인 회원 전용) */}
      <SizeProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          updateProfileAndRecommendation();
        }}
      />

      {/* 비회원용 회원가입 안내 알림창 (Modal) */}
      {showGuestAlertModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-alert-title"
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mb-3.5 shadow-2xs">
              <Sparkles className="w-6 h-6 text-amber-500 fill-amber-300/30" />
            </div>
            <h3 id="guest-alert-title" className="text-base font-extrabold text-neutral-950 tracking-tight">
              회원가입 안내
            </h3>
            <p className="text-xs text-neutral-600 mt-2.5 leading-relaxed font-medium">
              맞춤 사이즈 추천 서비스는 회원 전용 혜택입니다.
              <br />
              간편 회원가입 후 나만의 맞춤 사이즈를 확인해 보세요!
            </p>

            <div className="flex items-center gap-2.5 w-full mt-5">
              <button
                type="button"
                onClick={() => setShowGuestAlertModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGuestAlertModal(false);
                  router.push("/login?mode=signup");
                }}
                className="flex-[1.4] py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white text-xs font-black tracking-tight transition-all cursor-pointer shadow-sm hover:shadow"
              >
                회원가입하러 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
