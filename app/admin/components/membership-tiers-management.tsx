"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Award,
  Users,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  Save,
  RotateCcw,
  Edit3,
  X,
  Plus,
  Minus,
  Sparkles,
  Truck,
  Percent,
  Coins,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import {
  type TierPolicy,
  DEFAULT_TIER_POLICIES,
  normalizeUserGrade,
  getTierPointRate,
  calculateEarnedPoints,
} from "@/lib/membership/tiers";

export type { TierPolicy };
export { DEFAULT_TIER_POLICIES, normalizeUserGrade, getTierPointRate, calculateEarnedPoints };


interface MembershipTiersManagementProps {
  customersList: any[];
  setCustomersList: React.Dispatch<React.SetStateAction<any[]>>;
  triggerToast?: (msg: string) => void;
}

export function MembershipTiersManagement({
  customersList,
  setCustomersList,
  triggerToast,
}: MembershipTiersManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<"tiers" | "member_benefits">("tiers");

  // 1. Tier Policies State
  const [tierPolicies, setTierPolicies] = useState<TierPolicy[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("membership_tiers_policy");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 5) return parsed;
        } catch (e) {}
      }
    }
    return DEFAULT_TIER_POLICIES;
  });

  const [editingTier, setEditingTier] = useState<TierPolicy | null>(null);

  // 2. Member Benefits Adjustment State
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [editingMember, setEditingMember] = useState<any | null>(null);

  // Member Benefit Form State
  const [targetGrade, setTargetGrade] = useState("GENERAL");
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(0);
  const [customFreeShipping, setCustomFreeShipping] = useState<boolean>(false);
  const [pointsAdjustmentAction, setPointsAdjustmentAction] = useState<"add" | "subtract" | "set">("add");
  const [pointsAdjustmentAmount, setPointsAdjustmentAmount] = useState<number>(0);
  const [customBenefitMemo, setCustomBenefitMemo] = useState<string>("");

  const toast = (msg: string) => {
    if (triggerToast) {
      triggerToast(msg);
    } else {
      alert(msg);
    }
  };

  // Grade Counts
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      GENERAL: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
      VVIP: 0,
    };
    customersList.forEach((c) => {
      const g = String(c.grade || "").toUpperCase();
      if (g.includes("VVIP") || g.includes("BLACK") || c.role === "ADMIN") counts.VVIP++;
      else if (g.includes("PLATINUM")) counts.PLATINUM++;
      else if (g.includes("GOLD")) counts.GOLD++;
      else if (g.includes("SILVER")) counts.SILVER++;
      else counts.GENERAL++;
    });
    return counts;
  }, [customersList]);

  // Save Tier Policies
  const handleSaveTierPolicies = (updatedPolicies: TierPolicy[]) => {
    setTierPolicies(updatedPolicies);
    if (typeof window !== "undefined") {
      localStorage.setItem("membership_tiers_policy", JSON.stringify(updatedPolicies));
      window.dispatchEvent(new CustomEvent("membership_tiers_updated"));
    }
    setEditingTier(null);
    toast("회원 등급별 정책이 성공적으로 저장되었습니다.");
  };

  // Reset to Default Tier Policies
  const handleResetTierPolicies = () => {
    if (window.confirm("회원 등급 정책을 시스템 기본값으로 복원하시겠습니까?")) {
      setTierPolicies(DEFAULT_TIER_POLICIES);
      if (typeof window !== "undefined") {
        localStorage.setItem("membership_tiers_policy", JSON.stringify(DEFAULT_TIER_POLICIES));
        window.dispatchEvent(new CustomEvent("membership_tiers_updated"));
      }
      setEditingTier(null);
      toast("회원 등급 정책이 기본값으로 초기화되었습니다.");
    }
  };

  // Open Member Benefit Modal
  const handleOpenMemberBenefitModal = (customer: any) => {
    setEditingMember(customer);
    const rawGrade = String(customer.grade || "GENERAL").toUpperCase();
    let currentGrade = "GENERAL";
    if (rawGrade.includes("VVIP") || rawGrade.includes("BLACK") || customer.role === "ADMIN") currentGrade = "VVIP";
    else if (rawGrade.includes("PLATINUM")) currentGrade = "PLATINUM";
    else if (rawGrade.includes("GOLD")) currentGrade = "GOLD";
    else if (rawGrade.includes("SILVER")) currentGrade = "SILVER";

    setTargetGrade(currentGrade);
    setCustomDiscountRate(customer.customDiscountRate || 0);
    setCustomFreeShipping(Boolean(customer.customFreeShipping));
    setPointsAdjustmentAction("add");
    setPointsAdjustmentAmount(0);
    setCustomBenefitMemo(customer.customMemo || customer.customBenefitMemo || "");
  };

  // Save Member Benefit Adjustment
  const handleSaveMemberBenefit = () => {
    if (!editingMember) return;

    let newPoints = Number(editingMember.points || 0);
    const delta = Number(pointsAdjustmentAmount || 0);
    if (pointsAdjustmentAction === "add") {
      newPoints += delta;
    } else if (pointsAdjustmentAction === "subtract") {
      newPoints = Math.max(0, newPoints - delta);
    } else if (pointsAdjustmentAction === "set") {
      newPoints = Math.max(0, delta);
    }

    const updatedMember = {
      ...editingMember,
      grade: targetGrade,
      customDiscountRate: Number(customDiscountRate || 0),
      customFreeShipping: Boolean(customFreeShipping),
      points: newPoints,
      customMemo: customBenefitMemo.trim(),
    };

    const nextList = customersList.map((c) => (c.id === editingMember.id ? updatedMember : c));
    setCustomersList(nextList);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customers", JSON.stringify(nextList));
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("admin_customers_updated"));
    }

    // Supabase DB 비동기 영속 업데이트
    supabase
      .from("customers")
      .update({
        grade: targetGrade,
        points: newPoints,
      })
      .eq("id", editingMember.id)
      .then(({ error }) => {
        if (error) console.warn("Supabase member benefit update notice:", error.message);
      });

    toast(`'${editingMember.name}' 회원님의 맞춤 혜택이 성공적으로 조정되었습니다.`);
    setEditingMember(null);
  };

  // Filtered Customers for Benefit Adjustment
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.id && String(c.id).toLowerCase().includes(q));

      const rawG = String(c.grade || "GENERAL").toUpperCase();
      let normGrade = "GENERAL";
      if (rawG.includes("VVIP") || rawG.includes("BLACK") || c.role === "ADMIN") normGrade = "VVIP";
      else if (rawG.includes("PLATINUM")) normGrade = "PLATINUM";
      else if (rawG.includes("GOLD")) normGrade = "GOLD";
      else if (rawG.includes("SILVER")) normGrade = "SILVER";

      const matchesGrade = gradeFilter === "all" || normGrade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [customersList, searchQuery, gradeFilter]);

  // Monochrome Grade Badge Helper
  const renderGradeBadge = (gradeStr: string, isAdmin?: boolean) => {
    const g = String(gradeStr || "GENERAL").toUpperCase();
    if (g.includes("VVIP") || g.includes("BLACK") || isAdmin) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-neutral-950 text-white border border-neutral-950 tracking-wider">
          VVIP
        </span>
      );
    }
    if (g.includes("PLATINUM")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-neutral-800 text-white border border-neutral-800 tracking-wider">
          PLATINUM
        </span>
      );
    }
    if (g.includes("GOLD")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-neutral-200 text-neutral-900 border border-neutral-300 tracking-wider">
          GOLD
        </span>
      );
    }
    if (g.includes("SILVER")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-neutral-100 text-neutral-800 border border-neutral-200 tracking-wider">
          SILVER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-white text-neutral-600 border border-neutral-300 tracking-wider">
        GENERAL
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header (Monochrome Minimalism) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-950" />
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
              회원 등급 및 혜택 관리
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            스토어 회원 등급 정책(할인율, 적립률, 승급기준) 설정 및 회원별 맞춤 우대 혜택 통합 조정
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("tiers")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "tiers"
                ? "bg-neutral-950 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            등급별 기본 정책
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("member_benefits")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "member_benefits"
                ? "bg-neutral-950 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            회원별 혜택 조정 ({customersList.length})
          </button>
        </div>
      </div>

      {/* 2. TAB 1: 등급별 기본 정책 관리 */}
      {activeSubTab === "tiers" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Info className="w-4 h-4 text-neutral-700" />
              <span>
                설정한 등급별 할인율과 적립률은 쇼핑몰 전체 주문서 및 마이페이지에 실시간 반영됩니다.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTierPolicies}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-700" />
                <span>기본값 복원</span>
              </button>
            </div>
          </div>

          {/* 5 Tiers Monochrome Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {tierPolicies.map((tier) => {
              const count = gradeCounts[tier.key] || 0;
              return (
                <div
                  key={tier.key}
                  className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-neutral-950 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Badge & Customer Count */}
                    <div className="flex items-center justify-between">
                      {renderGradeBadge(tier.key)}
                      <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {count.toLocaleString()}명
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-neutral-950">
                        {tier.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        승급 기준: 누적 {tier.minSpend.toLocaleString()}원 이상
                      </p>
                    </div>

                    {/* Benefit Details */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-neutral-700">
                        <span className="text-neutral-500 font-medium">추가 할인율</span>
                        <span className="font-extrabold text-neutral-950">
                          {tier.discountRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-700">
                        <span className="text-neutral-500 font-medium">포인트 적립률</span>
                        <span className="font-extrabold text-neutral-950">
                          {tier.pointRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-700">
                        <span className="text-neutral-500 font-medium">배송비 혜택</span>
                        <span className="font-extrabold text-neutral-950">
                          {tier.freeShipping
                            ? "상시 무료배송"
                            : `${tier.minFreeShippingSpend.toLocaleString()}원 이상 무료`}
                        </span>
                      </div>
                    </div>

                    {/* Special Benefit Note */}
                    <div className="pt-2 border-t border-neutral-100">
                      <p className="text-[11px] text-neutral-600 leading-relaxed font-medium bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
                        {tier.specialBenefit}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingTier(tier)}
                    className="w-full mt-2 py-2 px-3 bg-neutral-100 hover:bg-neutral-950 hover:text-white text-neutral-800 text-xs font-bold rounded-xl transition-all border border-neutral-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>등급 정책 수정</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Tier Policy Description Guide (Monochrome) */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-2 text-xs text-neutral-600">
            <h4 className="font-extrabold text-neutral-950 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-neutral-900" />
              회원 등급 정책 운영 가이드
            </h4>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 pl-1 leading-relaxed">
              <li>
                회원 등급은 고객의 누적 실결제액을 기준으로 시스템에서 자동 판정되거나, 관리자가 [회원별 혜택 조정] 탭에서 특정 회원의 등급을 수동으로 상향/하향 조정할 수 있습니다.
              </li>
              <li>
                설정된 등급별 추가 할인율과 배송비 기준은 주문서(/checkout) 작성 시 결제 금액 계산에 즉시 적용됩니다.
              </li>
              <li>
                개별 회원에게 부여된 추가 할인율 및 상시 무료배송 혜택은 기본 등급 정책보다 최우선으로 적용됩니다.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 3. TAB 2: 회원별 혜택 조정 (Individual Customer Benefit Customization) */}
      {activeSubTab === "member_benefits" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="회원 이름, 이메일, 연락처, ID 검색..."
                className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:border-neutral-950 transition-colors bg-neutral-50/50"
              />
            </div>

            {/* Grade Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-neutral-400 mr-1 shrink-0">등급:</span>
              {["all", "VVIP", "PLATINUM", "GOLD", "SILVER", "GENERAL"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    gradeFilter === g
                      ? "bg-neutral-950 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {g === "all" ? "전체" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">회원 정보</th>
                    <th className="py-3 px-4">연락처 / ID</th>
                    <th className="py-3 px-4">현재 등급</th>
                    <th className="py-3 px-4 text-right">누적 구매금액</th>
                    <th className="py-3 px-4 text-right">보유 적립금</th>
                    <th className="py-3 px-4">적용 중인 맞춤 혜택</th>
                    <th className="py-3 px-4 text-center">혜택 조정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-neutral-400">
                        검색 조건에 일치하는 회원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const hasCustomDiscount = cust.customDiscountRate && cust.customDiscountRate > 0;
                      const hasCustomFreeShip = cust.customFreeShipping;
                      const hasMemo = Boolean(cust.customMemo);

                      return (
                        <tr key={cust.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-neutral-950">
                                {cust.name || "무명 고객"}
                              </span>
                              {cust.isAdmin || cust.role === "ADMIN" ? (
                                <span className="text-[10px] font-black bg-neutral-950 text-white px-1.5 py-0.2 rounded border border-neutral-950">
                                  관리자
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-neutral-400 font-mono block mt-0.5">
                              {cust.email || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-neutral-700 font-medium">{cust.phone || "-"}</span>
                            <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                              {cust.id}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {renderGradeBadge(cust.grade, cust.isAdmin || cust.role === "ADMIN")}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-neutral-900">
                            {Number(cust.totalSpent || 0).toLocaleString()}원
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                            {Number(cust.points || 0).toLocaleString()} P
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {hasCustomDiscount ? (
                                <span className="bg-neutral-100 text-neutral-950 border border-neutral-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                  특별할인 +{cust.customDiscountRate}%
                                </span>
                              ) : null}
                              {hasCustomFreeShip ? (
                                <span className="bg-neutral-100 text-neutral-950 border border-neutral-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                  상시 무료배송
                                </span>
                              ) : null}
                              {hasMemo ? (
                                <span className="bg-neutral-50 text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[140px]" title={cust.customMemo}>
                                  {cust.customMemo}
                                </span>
                              ) : null}
                              {!hasCustomDiscount && !hasCustomFreeShip && !hasMemo && (
                                <span className="text-neutral-400 text-[11px]">기본 등급 정책 적용 중</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenMemberBenefitModal(cust)}
                              className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>혜택 조정</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: 등급 정책 수정 모달 (Monochrome) */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-neutral-950" />
                <h3 className="font-extrabold text-base text-neutral-950">
                  {editingTier.name} 등급 정책 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="text-neutral-400 hover:text-neutral-950 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  승급 최소 누적 실결제액 (원)
                </label>
                <input
                  type="number"
                  value={editingTier.minSpend}
                  onChange={(e) =>
                    setEditingTier({ ...editingTier, minSpend: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    추가 할인율 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingTier.discountRate}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, discountRate: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    적립금 비율 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingTier.pointRate}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, pointRate: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  배송비 혜택 방식
                </label>
                <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-900">
                    <input
                      type="checkbox"
                      checked={editingTier.freeShipping}
                      onChange={(e) =>
                        setEditingTier({ ...editingTier, freeShipping: e.target.checked })
                      }
                      className="w-4 h-4 accent-neutral-950 cursor-pointer"
                    />
                    <span>상시 전 상품 무료배송 적용</span>
                  </label>
                </div>
              </div>

              {!editingTier.freeShipping && (
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    조건부 무료배송 기준 금액 (원)
                  </label>
                  <input
                    type="number"
                    value={editingTier.minFreeShippingSpend}
                    onChange={(e) =>
                      setEditingTier({
                        ...editingTier,
                        minFreeShippingSpend: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  등급 전용 특별 혜택 안내 문구
                </label>
                <textarea
                  rows={3}
                  value={editingTier.specialBenefit}
                  onChange={(e) =>
                    setEditingTier({ ...editingTier, specialBenefit: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-neutral-950 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-neutral-200 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = tierPolicies.map((p) =>
                    p.key === editingTier.key ? editingTier : p
                  );
                  handleSaveTierPolicies(updated);
                }}
                className="px-5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: 개별 회원 혜택 조정 모달 (Individual Benefit Customization) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-neutral-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-neutral-950" />
                <div>
                  <h3 className="font-extrabold text-base text-neutral-950">
                    회원 맞춤 혜택 조정
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {editingMember.name} 님 ({editingMember.email || editingMember.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-neutral-400 hover:text-neutral-950 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Member Summary Card */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-neutral-950">
                      {editingMember.name}
                    </span>
                    {renderGradeBadge(editingMember.grade, editingMember.isAdmin || editingMember.role === "ADMIN")}
                  </div>
                  <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    회원 ID: {editingMember.id}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">현재 누적 실결제액</span>
                  <span className="font-extrabold text-xs text-neutral-950">
                    {Number(editingMember.totalSpent || 0).toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 1) 회원 등급 직접 변경 */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  회원 등급 직접 지정
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-bold text-xs bg-white focus:outline-none focus:border-neutral-950"
                >
                  <option value="GENERAL">GENERAL (일반 등급)</option>
                  <option value="SILVER">SILVER (실버 등급)</option>
                  <option value="GOLD">GOLD (골드 등급)</option>
                  <option value="PLATINUM">PLATINUM (플래티넘 등급)</option>
                  <option value="VVIP">VVIP (최상위 프리미엄 등급)</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  * 관리자가 등급을 직접 변경하면 해당 회원의 마이페이지 및 혜택에 즉시 반영됩니다.
                </p>
              </div>

              {/* 2) 개별 특별 추가 할인율 (%) */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  회원 전용 개별 우대 할인율 (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={customDiscountRate}
                    onChange={(e) => setCustomDiscountRate(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1 px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                  />
                  <span className="text-neutral-500 font-bold">% 추가할인</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  기본 등급 할인 외에 이 회원에게만 상시 적용할 특별 우대 할인율을 지정할 수 있습니다 (0% 설정 시 미적용).
                </p>
              </div>

              {/* 3) 상시 무료배송 강제 부여 */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-extrabold text-neutral-950 block">
                      상시 무료배송 우대 혜택 강제 부여
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      구매 금액과 상관없이 모든 주문을 무료배송으로 자동 처리합니다.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customFreeShipping}
                    onChange={(e) => setCustomFreeShipping(e.target.checked)}
                    className="w-4 h-4 accent-neutral-950 cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* 4) 적립금(포인트) 즉시 조정 */}
              <div className="border border-neutral-200 rounded-2xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-neutral-800">
                    적립금(포인트) 관리
                  </label>
                  <span className="text-[11px] font-bold text-neutral-500">
                    현재: <strong className="text-neutral-950 font-mono">{Number(editingMember.points || 0).toLocaleString()} P</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPointsAdjustmentAction("add")}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      pointsAdjustmentAction === "add"
                        ? "bg-neutral-950 text-white border-neutral-950"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    + 지급 (증가)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsAdjustmentAction("subtract")}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      pointsAdjustmentAction === "subtract"
                        ? "bg-neutral-950 text-white border-neutral-950"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    - 차감 (감소)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsAdjustmentAction("set")}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      pointsAdjustmentAction === "set"
                        ? "bg-neutral-950 text-white border-neutral-950"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    직접 설정
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={pointsAdjustmentAmount}
                    onChange={(e) => setPointsAdjustmentAmount(Number(e.target.value) || 0)}
                    placeholder="조정할 포인트 수량"
                    className="flex-1 px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-950"
                  />
                  <span className="font-bold text-neutral-700">P</span>
                </div>
              </div>

              {/* 5) 관리자 회원 혜택 메모 */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  관리자 전담 혜택 메모
                </label>
                <textarea
                  rows={2}
                  value={customBenefitMemo}
                  onChange={(e) => setCustomBenefitMemo(e.target.value)}
                  placeholder="예: VIP 시크릿 특가 초대 대상 / 분기별 시그니처 사은품 발송 대상"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-neutral-200 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveMemberBenefit}
                className="px-5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                혜택 변경사항 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
