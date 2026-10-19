"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Ruler,
  Sparkles,
  Info,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import {
  UserSizeProfile,
  PreferredFit,
  getUserSizeProfile,
  saveUserSizeProfile,
  getPreferredFitLabel,
} from "@/lib/size-profile";

interface SizeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (profile: UserSizeProfile) => void;
}

export function SizeProfileModal({ isOpen, onClose, onSaved }: SizeProfileModalProps) {
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [preferredFit, setPreferredFit] = useState<PreferredFit>("regular");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // 모달이 열릴 때 기존 저장된 프로필 로드
  useEffect(() => {
    if (isOpen) {
      const existing = getUserSizeProfile();
      if (existing) {
        setHeight(String(existing.height));
        setWeight(String(existing.weight));
        setChest(String(existing.chest_circumference));
        setWaist(String(existing.waist_circumference));
        setPreferredFit(existing.preferred_fit || "regular");
      } else {
        // 기본 권장 초깃값 비워두기
        setHeight("");
        setWeight("");
        setChest("");
        setWaist("");
        setPreferredFit("regular");
      }
      setErrorMsg("");
      setIsSuccessToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const hNum = parseFloat(height);
    const wNum = parseFloat(weight);
    const cNum = parseFloat(chest);
    const waNum = parseFloat(waist);

    if (isNaN(hNum) || hNum < 120 || hNum > 230) {
      setErrorMsg("올바른 키(120 ~ 230cm)를 입력해 주세요.");
      return;
    }
    if (isNaN(wNum) || wNum < 30 || wNum > 200) {
      setErrorMsg("올바른 몸무게(30 ~ 200kg)를 입력해 주세요.");
      return;
    }
    if (isNaN(cNum) || cNum < 50 || cNum > 160) {
      setErrorMsg("올바른 가슴둘레(50 ~ 160cm)를 입력해 주세요.");
      return;
    }
    if (isNaN(waNum) || waNum < 40 || waNum > 150) {
      setErrorMsg("올바른 허리둘레(40 ~ 150cm)를 입력해 주세요.");
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
    setIsSuccessToast(true);

    if (onSaved) {
      onSaved(newProfile);
    }

    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-neutral-100 bg-gradient-to-b from-neutral-50/70 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shadow-xs">
                <Ruler className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight flex items-center gap-1.5">
                  맞춤 사이즈 신체 정보 입력
                  <Sparkles className="w-4 h-4 text-amber-500 inline-block fill-amber-500/20" />
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  신체 치수를 입력하면 상품별 최적의 사이즈를 자동 계산합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>사이즈 정보가 성공적으로 저장되었습니다!</span>
            </div>
          )}

          {/* 1. 키 & 몸무게 2열 그리드 */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                키 (Height) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="예: 165"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-10 font-mono"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                  cm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                몸무게 (Weight) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="예: 52"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-10 font-mono"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* 2. 가슴둘레 & 허리둘레 2열 그리드 */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  가슴둘레 (Chest) <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="예: 86"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-10 font-mono"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                  cm
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 leading-tight flex items-center gap-1">
                <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                가장 볼록한 부위 수평 측정
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  허리둘레 (Waist) <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="예: 68"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all pr-10 font-mono"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                  cm
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 leading-tight flex items-center gap-1">
                <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                배꼽 위 가장 잘록한 부위
              </p>
            </div>
          </div>

          {/* 3. 선호하는 핏 선택 버튼 그룹 */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-2">
              선호하는 핏 (Preferred Fit)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreferredFit("tight")}
                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  preferredFit === "tight"
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700"
                }`}
              >
                <span className="text-xs font-extrabold tracking-tight">딱 맞게</span>
                <span
                  className={`text-[10px] ${
                    preferredFit === "tight" ? "text-neutral-300" : "text-neutral-400"
                  }`}
                >
                  슬림 실루엣
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredFit("regular")}
                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  preferredFit === "regular"
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700"
                }`}
              >
                <span className="text-xs font-extrabold tracking-tight">정사이즈</span>
                <span
                  className={`text-[10px] ${
                    preferredFit === "regular" ? "text-neutral-300" : "text-neutral-400"
                  }`}
                >
                  스탠다드 핏
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredFit("loose")}
                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  preferredFit === "loose"
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700"
                }`}
              >
                <span className="text-xs font-extrabold tracking-tight">여유있게</span>
                <span
                  className={`text-[10px] ${
                    preferredFit === "loose" ? "text-neutral-300" : "text-neutral-400"
                  }`}
                >
                  루즈 / 오버핏
                </span>
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70 text-[11px] text-neutral-500 leading-relaxed">
            💡 입력하신 신체 치수는 오직 브라우저 및 회원 맞춤 추천 용도로만 안전하게 활용되며, 모든 의류 상세페이지에서 즉시 최적의 사이즈가 안내됩니다.
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-bold transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-extrabold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>저장하고 추천 사이즈 받기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
