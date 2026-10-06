"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ruler,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ShoppingBag,
  Info,
  TrendingUp,
  User,
  Heart,
} from "lucide-react";
import {
  UserSizeProfile,
  PreferredFit,
  getUserSizeProfile,
  saveUserSizeProfile,
  clearUserSizeProfile,
  getPreferredFitLabel,
} from "@/lib/size-profile";
import { toast } from "sonner";

interface SizeRecommendationTabProps {
  userName?: string;
  userEmail?: string;
}

export function SizeRecommendationTab({ userName, userEmail }: SizeRecommendationTabProps) {
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [preferredFit, setPreferredFit] = useState<PreferredFit>("regular");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  useEffect(() => {
    const existing = getUserSizeProfile();
    if (existing) {
      setHeight(String(existing.height));
      setWeight(String(existing.weight));
      setChest(String(existing.chest_circumference));
      setWaist(String(existing.waist_circumference));
      setPreferredFit(existing.preferred_fit || "regular");
      setIsSaved(true);
      if (existing.updated_at) {
        setLastUpdatedAt(new Date(existing.updated_at).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }));
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const hNum = parseFloat(height);
    const wNum = parseFloat(weight);
    const cNum = parseFloat(chest);
    const waNum = parseFloat(waist);

    if (isNaN(hNum) || hNum < 120 || hNum > 230) {
      toast.error("올바른 키(120 ~ 230cm)를 입력해 주세요.");
      return;
    }
    if (isNaN(wNum) || wNum < 30 || wNum > 200) {
      toast.error("올바른 몸무게(30 ~ 200kg)를 입력해 주세요.");
      return;
    }
    if (isNaN(cNum) || cNum < 50 || cNum > 160) {
      toast.error("올바른 가슴둘레(50 ~ 160cm)를 입력해 주세요.");
      return;
    }
    if (isNaN(waNum) || waNum < 40 || waNum > 150) {
      toast.error("올바른 허리둘레(40 ~ 150cm)를 입력해 주세요.");
      return;
    }

    const newProfile: UserSizeProfile = {
      height: hNum,
      weight: wNum,
      chest_circumference: cNum,
      waist_circumference: waNum,
      preferred_fit: preferredFit,
    };

    saveUserSizeProfile(newProfile);
    setIsSaved(true);
    setLastUpdatedAt(new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }));

    toast.success("✨ 맞춤 신체 사이즈 정보가 안전하게 저장되었습니다!");
  };

  const handleReset = () => {
    if (window.confirm("등록된 신체 치수 정보를 초기화하시겠습니까?")) {
      clearUserSizeProfile();
      setHeight("");
      setWeight("");
      setChest("");
      setWaist("");
      setPreferredFit("regular");
      setIsSaved(false);
      setLastUpdatedAt("");
      toast.info("신체 치수 정보가 초기화되었습니다.");
    }
  };

  // BMI 계산
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white p-6 sm:p-8 border border-neutral-800 shadow-xl">
        <div className="absolute -right-8 -top-8 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                AI SMART SIZING
              </span>
              {isSaved && (
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  프로필 등록 완료
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{userName || "회원"} 님의 맞춤 사이즈 추천</span>
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              신체 치수와 선호하는 핏을 등록해 두시면 모든 의류 상품 상세페이지에서 고객님께 가장 잘 어울리는 최적의 사이즈를 자동으로 계산하여 추천해 드립니다.
            </p>

            {lastUpdatedAt && (
              <p className="text-[11px] text-neutral-400 font-mono pt-1">
                최근 수정일: {lastUpdatedAt}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-black px-4 py-3 rounded-2xl shadow-md transition-all cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>상품 보러가기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Input & Summary Layout (2 Columns on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Ruler className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-neutral-950 tracking-tight">
                신체 치수 직접 입력
              </h3>
            </div>

            {isSaved && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="등록된 치수 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* 키 & 몸무게 2열 그리드 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  키 (Height) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="165"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-12 font-mono"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                    cm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  몸무게 (Weight) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="52"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-12 font-mono"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                    kg
                  </span>
                </div>
              </div>
            </div>

            {/* 가슴둘레 & 허리둘레 2열 그리드 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  가슴둘레 (Chest) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    placeholder="86"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-12 font-mono"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                    cm
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  가장 볼록한 부위 수평 측정
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  허리둘레 (Waist) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="68"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-12 font-mono"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                    cm
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  배꼽 위 가장 잘록한 부위
                </p>
              </div>
            </div>

            {/* 선호 핏 선택 버튼 그룹 */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-2.5">
                선호하는 핏 선택 (Preferred Fit)
              </label>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPreferredFit("tight")}
                  className={`py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    preferredFit === "tight"
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-md ring-2 ring-neutral-950/20"
                      : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90 text-neutral-700"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-extrabold tracking-tight">딱 맞게</span>
                  <span
                    className={`text-[10px] ${
                      preferredFit === "tight" ? "text-neutral-300" : "text-neutral-400"
                    }`}
                  >
                    슬림 실루엣 (여유 ~3cm)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreferredFit("regular")}
                  className={`py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    preferredFit === "regular"
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-md ring-2 ring-neutral-950/20"
                      : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90 text-neutral-700"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-extrabold tracking-tight">정사이즈</span>
                  <span
                    className={`text-[10px] ${
                      preferredFit === "regular" ? "text-neutral-300" : "text-neutral-400"
                    }`}
                  >
                    스탠다드 핏 (여유 ~7cm)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreferredFit("loose")}
                  className={`py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    preferredFit === "loose"
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-md ring-2 ring-neutral-950/20"
                      : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90 text-neutral-700"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-extrabold tracking-tight">여유있게</span>
                  <span
                    className={`text-[10px] ${
                      preferredFit === "loose" ? "text-neutral-300" : "text-neutral-400"
                    }`}
                  >
                    루즈 / 오버핏 (여유 ~13cm)
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-black tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
                <span>{isSaved ? "사이즈 정보 수정 저장하기" : "맞춤 사이즈 프로필 등록하기"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Profile Summary & Sizing Tips (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-neutral-50 to-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-neutral-900" />
              <h4 className="text-sm font-extrabold text-neutral-950">내 체형 분석 미리보기</h4>
            </div>

            {isSaved && height && weight && chest && waist ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-2xl border border-neutral-200/70">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block">키 / 몸무게</span>
                    <span className="text-sm font-black text-neutral-950 font-mono">
                      {height}cm / {weight}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block">BMI 체질량 지수</span>
                    <span className="text-sm font-black text-neutral-950 font-mono">
                      {bmi ? `${bmi} kg/m²` : "-"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-400 block">가슴 / 허리둘레</span>
                    <span className="text-sm font-black text-neutral-950 font-mono">
                      {chest}cm / {waist}cm
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-400 block">선호 핏</span>
                    <span className="text-sm font-black text-neutral-950">
                      {getPreferredFitLabel(preferredFit)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>추천 의류 피팅 가이드</span>
                  </div>
                  <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                    {parseFloat(chest) <= 84
                      ? "• 상의 44~55(S) 정사이즈를 추천드리며, 슬림핏 연출 시 바디라인이 깔끔하게 정돈됩니다."
                      : parseFloat(chest) <= 90
                      ? "• 상의 55~66(M) 정사이즈를 추천드리며, 기본 스탠다드 핏으로 단정하게 착용 가능합니다."
                      : parseFloat(chest) <= 96
                      ? "• 상의 66~77(L) 사이즈를 추천드리며, 활동하기 편안한 여유감이 확보됩니다."
                      : "• 77 이상(XL) 또는 루즈핏 FREE 사이즈를 추천드리며, 멋스러운 드롭숄더 실루엣이 연출됩니다."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Ruler className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-500">
                  신체 치수를 입력하시면 실시간 체형 요약과 권장 핏이 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>

          {/* Measuring Guide Tips Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-neutral-900" />
              <h4 className="text-sm font-extrabold text-neutral-950">정확한 치수 측정 방법</h4>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed font-medium">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  <strong className="text-neutral-950">가슴둘레 측정:</strong> 가슴의 가장 볼록한 부위(BP점)를 지나도록 줄자를 수평으로 둘러 여유 없이 자연스럽게 측정합니다.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  <strong className="text-neutral-950">허리둘레 측정:</strong> 배꼽 바로 위, 상체를 좌우로 숙였을 때 가장 깊게 접히는 가장 잘록한 부위를 수평으로 측정합니다.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  <strong className="text-neutral-950">선호 핏 선택:</strong> 같은 옷이라도 취향에 따라 슬림핏, 정사이즈, 오버핏으로 입으실 수 있도록 알고리즘이 여유 치수를 가감합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
