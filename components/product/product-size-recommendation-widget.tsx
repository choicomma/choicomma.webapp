"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const [profile, setProfile] = useState<UserSizeProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<SizeRecommendationResult | null>(null);

  // 로컬스토리지에서 프로필 로드 및 추천값 계산
  const updateProfileAndRecommendation = useCallback(() => {
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

    return () => {
      window.removeEventListener("user_size_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, [updateProfileAndRecommendation]);

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
              onClick={() => setIsModalOpen(true)}
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
                onClick={() => setIsModalOpen(true)}
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

      {/* 신체 정보 입력/수정 모달 */}
      <SizeProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          updateProfileAndRecommendation();
        }}
      />
    </div>
  );
}
