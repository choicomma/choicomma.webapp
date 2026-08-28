"use client";

import React, { useState } from "react";
import {
  Download,
  Calendar,
  Search,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Layers,
  History,
  CheckCircle2,
  X,
  CreditCard,
  Receipt,
  Info,
  ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import importedMonthlyRevenue from "@/lib/sfcc/monthly-revenue-data.json";

interface RevenueManagementProps {
  revenueSelectedMonth: string;
  setRevenueSelectedMonth: (val: string) => void;
  revenueSelectedYear: string;
  setRevenueSelectedYear: (val: string) => void;
  revenueSearchQuery: string;
  setRevenueSearchQuery: (val: string) => void;
  triggerToast: (msg: string) => void;
}

export function RevenueManagement({
  revenueSelectedMonth,
  setRevenueSelectedMonth,
  revenueSelectedYear,
  setRevenueSelectedYear,
  revenueSearchQuery,
  setRevenueSearchQuery,
  triggerToast,
}: RevenueManagementProps) {
  // Selected month for viewing revenue (Default: latest month "2026-08")
  const [selectedViewMonth, setSelectedViewMonth] = useState<string>("2026-08");

  // Modal active state: null | "revenue_detail" | "payment_methods" | "settlement_summary"
  const [activeModal, setActiveModal] = useState<null | "revenue_detail" | "payment_methods" | "settlement_summary">(null);

  // Toss Payments Fee Rate State (Default 2.2%)
  const [tossFeeRate, setTossFeeRate] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toss_payments_fee_rate");
      if (saved) return parseFloat(saved) || 2.2;
    }
    return 2.2;
  });

  // Get active selected month item data
  const activeMonthIndex = importedMonthlyRevenue.findIndex((item) => item.일자 === selectedViewMonth);
  const activeMonthData = importedMonthlyRevenue[activeMonthIndex >= 0 ? activeMonthIndex : 0] || {
    일자: "2026-08",
    주문건수: "512",
    품목건수: "1240",
    상품금액: "58900000",
    배송비: "1536000",
    할인금액: "7200000",
    결제금액: "53236000",
    환불금액: "1350000",
    매출: "51886000",
  };

  // Previous month item for growth comparison
  const prevMonthIndex = activeMonthIndex >= 0 ? activeMonthIndex + 1 : 1;
  const prevMonthData = importedMonthlyRevenue[prevMonthIndex] || {
    일자: "2026-07",
    매출: "45274000",
  };

  const currRevenue = Number(activeMonthData.매출) || 0;
  const prevRevenue = Number(prevMonthData.매출) || 1;
  const growthRate = (((currRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1);
  const isPositiveGrowth = Number(growthRate) >= 0;

  const isCurrentMonth = selectedViewMonth === "2026-08";

  // Filtered List for Table
  let revList = importedMonthlyRevenue;
  if (selectedViewMonth !== "all") {
    revList = revList.filter((item: any) => item.일자 === selectedViewMonth);
  } else if (revenueSelectedYear !== "all") {
    revList = revList.filter((item: any) => item.일자.startsWith(revenueSelectedYear));
  }

  if (revenueSearchQuery.trim()) {
    const q = revenueSearchQuery.trim().toLowerCase();
    revList = importedMonthlyRevenue.filter((item: any) => item.일자.toLowerCase().includes(q));
  }

  const handleExportRevenueCSV = () => {
    const exportData = selectedViewMonth === "all" ? importedMonthlyRevenue : revList;
    const headers = [
      "정산월",
      "주문건수",
      "품목건수",
      "상품금액(원)",
      "배송비(원)",
      "할인금액(원)",
      "결제금액(원)",
      "환불금액(원)",
      "최종순매출(원)",
    ];
    const rows = exportData.map((r: any) => [
      r["일자"],
      r["주문건수"],
      r["품목건수"],
      r["상품금액"],
      r["배송비"],
      r["할인금액"],
      r["결제금액"],
      r["환불금액"],
      r["매출"],
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `초이콤마_월별_매출_정산_리포트_${selectedViewMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("월별 매출 정산 리포트(CSV) 다운로드가 완료되었습니다.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Top Banner & Past Month Dropdown Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-neutral-950">
                매출 관리 & 정산 분석
              </h1>
              {isCurrentMonth ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>2026년 8월 당월 실적</span>
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                  {selectedViewMonth} 지난 매출 조회 중
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              카드를 클릭하시면 각 항목별 **상세 세부 분석 모달**을 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Dropdown for selecting past months */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-xs pointer-events-none flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>지난 매출 조회:</span>
            </span>
            <select
              value={selectedViewMonth}
              onChange={(e) => setSelectedViewMonth(e.target.value)}
              className="bg-neutral-900 text-white font-extrabold text-xs pl-28 pr-9 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-md appearance-none border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <option value="2026-08">2026년 8월 (당월 최신 실적)</option>
              <option value="2026-07">2026년 7월 (45,274,000원)</option>
              <option value="2026-06">2026년 6월 (42,465,000원)</option>
              <option value="2026-05">2026년 5월 (39,680,000원)</option>
              <option value="2026-04">2026년 4월 (37,596,000원)</option>
              <option value="2026-03">2026년 3월 (36,330,000원)</option>
              <option value="2026-02">2026년 2월 (34,325,000원)</option>
              <option value="2026-01">2026년 1월 (35,010,000원)</option>
              <option value="2025-12">2025년 12월 (49,320,000원)</option>
              <option value="2025-11">2025년 11월 (42,940,000원)</option>
              <option value="2025-10">2025년 10월 (38,290,000원)</option>
              <option value="2025-09">2025년 9월 (36,805,000원)</option>
              <option value="2025-08">2025년 8월 (35,710,000원)</option>
              <option value="all">📜 전체 월별 매출 정산표 전체보기</option>
            </select>
            <ChevronDown className="w-4 h-4 text-white/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleExportRevenueCSV}
            className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl transition-all cursor-pointer border border-neutral-200 shrink-0"
            title="CSV 엑셀 리포트 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GRAND HERO CARD: 클릭 가능한 당월 총 순매출액 대형 부각 카드 */}
      <div
        onClick={() => setActiveModal("revenue_detail")}
        className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950 text-white rounded-3xl p-8 md:p-10 shadow-2xl border border-emerald-900/60 relative overflow-hidden space-y-6 cursor-pointer group hover:border-emerald-500/80 hover:shadow-emerald-900/20 transition-all"
      >
        {/* Background Decorative Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-extrabold text-emerald-300 uppercase tracking-widest">
              {activeMonthData.일자} {isCurrentMonth ? "당월" : "선택월"} 총 순매출액
            </span>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold group-hover:bg-emerald-500 group-hover:text-neutral-950 transition-all flex items-center gap-1">
            <span>🔍 클릭하여 세부 분석 내역 보기</span>
          </span>
        </div>

        {/* Prominent Revenue Big Number Display */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight text-white group-hover:text-emerald-300 transition-colors">
              {formatPrice(currRevenue.toString())}
            </h2>
            <span className="text-lg font-bold text-neutral-400">KRW</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
                isPositiveGrowth
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {isPositiveGrowth ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>직전 월({prevMonthData.일자}) 대비 {growthRate}% 성장</span>
            </span>

            <span className="text-xs text-neutral-400 font-medium">
              직전 월 순매출: <strong className="text-neutral-300 font-mono font-bold">{formatPrice(prevMonthData.매출)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Payment Method Distribution & Month Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Channels Breakdown (7 cols) - CLICKABLE */}
        <div
          onClick={() => setActiveModal("payment_methods")}
          className="lg:col-span-7 bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4 cursor-pointer group hover:border-sky-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-neutral-950">결제 수단별 매출 비중</h3>
            </div>
            <span className="text-xs bg-sky-50 text-sky-800 font-bold px-2.5 py-0.5 rounded-full group-hover:bg-sky-500 group-hover:text-white transition-colors">
              🔍 수단별 상세 내역 보기
            </span>
          </div>

          <div className="space-y-4">
            {/* Credit Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                <span>💳 국내 신용/체크카드 (Toss Payments)</span>
                <span className="font-mono text-emerald-700 font-extrabold">65% ({formatPrice(Math.round(currRevenue * 0.65).toString())})</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full group-hover:bg-emerald-400 transition-colors" style={{ width: "65%" }} />
              </div>
            </div>

            {/* Easy Payments */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                <span>📱 간편결제 (토스페이/카카오페이)</span>
                <span className="font-mono text-sky-700 font-extrabold">25% ({formatPrice(Math.round(currRevenue * 0.25).toString())})</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full group-hover:bg-sky-400 transition-colors" style={{ width: "25%" }} />
              </div>
            </div>

            {/* Global Foreign Payments */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                <span>🌐 해외 결제 (USD / JPY / CNY)</span>
                <span className="font-mono text-amber-700 font-extrabold">10% ({formatPrice(Math.round(currRevenue * 0.10).toString())})</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full group-hover:bg-amber-400 transition-colors" style={{ width: "10%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Month Summary Card (5 cols) - CLICKABLE */}
        <div
          onClick={() => setActiveModal("settlement_summary")}
          className="lg:col-span-5 bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4 cursor-pointer group hover:border-emerald-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-neutral-950">{activeMonthData.일자} 정산 요약</h3>
            </div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              🔍 정산 수수료 & 순수익 세부 내역
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-500 font-sans font-bold">결제 완료 금액</span>
              <span className="font-extrabold text-neutral-950">{formatPrice(activeMonthData.결제금액)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-500 font-sans font-bold">환불 및 취소액</span>
              <span className="font-bold text-rose-600">-{formatPrice(activeMonthData.환불금액)}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-sans font-black">
              <span className="text-emerald-700">최종 순매출액</span>
              <span className="font-mono text-emerald-700 text-lg font-black">{formatPrice(activeMonthData.매출)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Settlement Ledger Table */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>월별 정산 상세 내역표 ({revList.length}개 월 데이터)</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              상단 드롭다운에서 선택한 월 또는 전체 월별 정산 내역 원본 데이터입니다. 행을 클릭하면 해당 월의 대시보드로 이동합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="월 검색 (예: 2026-05)..."
                value={revenueSearchQuery}
                onChange={(e) => setRevenueSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left text-xs text-neutral-800">
            <thead className="bg-neutral-50 text-neutral-600 uppercase text-[11px] font-extrabold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">정산월 (일자)</th>
                <th className="py-3.5 px-4 text-right">총 상품금액</th>
                <th className="py-3.5 px-4 text-right">배송비</th>
                <th className="py-3.5 px-4 text-right">할인금액</th>
                <th className="py-3.5 px-4 text-right">결제금액</th>
                <th className="py-3.5 px-4 text-right text-rose-600">환불금액</th>
                <th className="py-3.5 px-4 text-right text-emerald-700 font-black">최종 순매출액</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60 font-medium">
              {revList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 text-sm">
                    검색 조건과 일치하는 월별 매출 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                revList.map((row: any, idx: number) => {
                  const netRev = Number(row["매출"]) || 0;
                  return (
                    <tr
                      key={`${row.일자}-${idx}`}
                      onClick={() => setSelectedViewMonth(row.일자)}
                      className={`hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                        row.일자 === selectedViewMonth ? "bg-emerald-50/80 font-bold" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-950 flex items-center gap-1.5">
                        {row.일자 === "2026-08" && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                            당월
                          </span>
                        )}
                        <span>{row.일자}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatPrice((row.상품금액 || 0).toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-600">
                        {formatPrice((row.배송비 || 0).toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-900">
                        {formatPrice((row.할인금액 || 0).toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatPrice((row.결제금액 || 0).toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-bold">
                        {formatPrice((row.환불금액 || 0).toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/50">
                        {formatPrice(netRev.toString())}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: GRAND HERO REVENUE DETAIL MODAL (총 순매출액 세부 분석 모달) */}
      {/* ========================================================================= */}
      {activeModal === "revenue_detail" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-950 text-emerald-400 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
                    <span>{activeMonthData.일자} 총 순매출액 세부 분석 리포트</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                      상세 명세서
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    선택한 정산월의 매출 구성 요소 및 최종 집계액 산출 명세입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-950 text-white rounded-2xl p-5 font-mono space-y-3">
              <div className="text-xs text-neutral-400 font-sans font-bold flex justify-between">
                <span>{activeMonthData.일자} 최종 순매출액</span>
                <span>정산완료</span>
              </div>
              <div className="text-3xl font-black text-emerald-400">
                {formatPrice(currRevenue.toString())} KRW
              </div>
            </div>

            {/* Detailed Item List */}
            <div className="space-y-3 text-xs font-mono border-t border-b border-neutral-100 py-4">
              <div className="flex justify-between items-center py-1.5">
                <span className="font-sans font-bold text-neutral-700">1. 총 상품 판매 금액 (Gross Product Sales)</span>
                <span className="font-extrabold text-neutral-950">{formatPrice(activeMonthData.상품금액)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sky-700">
                <span className="font-sans font-bold">+ 2. 고객 부담 배송비 수입 (Shipping Revenue)</span>
                <span className="font-extrabold">+{formatPrice(activeMonthData.배송비)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-amber-800">
                <span className="font-sans font-bold">- 3. 프로모션 쿠폰 및 타임세일 할인액 (Discounts)</span>
                <span className="font-extrabold">-{formatPrice(activeMonthData.할인금액)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-rose-600">
                <span className="font-sans font-bold">- 4. 고객 환불 및 취소 공제액 (Refunds & Cancellations)</span>
                <span className="font-extrabold">-{formatPrice(activeMonthData.환불금액)}</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                위 집계 금액은 과세표준에 맞추어 산정되었으며, 가맹점 계좌로 입금될 예정 금액입니다. 상단 CSV 다운로드로 영수증을 출력하실 수 있습니다.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PAYMENT METHODS DETAIL MODAL (결제수단별 세부 결제 분석 모달) */}
      {/* ========================================================================= */}
      {activeModal === "payment_methods" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
                    <span>{activeMonthData.일자} 결제수단별 세부 매출 분석</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    PG사별 및 통합 간편결제/해외 통화 결제비율 상세 내역입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Card 1: Domestic Card */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-950">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>국내 신용 / 체크카드 (Toss Payments)</span>
                  </span>
                  <span className="text-emerald-700 font-mono font-extrabold text-sm">65%</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-neutral-600">
                  <span>총 매출액: <strong>{formatPrice(Math.round(currRevenue * 0.65).toString())}</strong></span>
                  <span>추정 주문수: 약 {Math.round(Number(activeMonthData.주문건수) * 0.65)}건</span>
                </div>
              </div>

              {/* Card 2: Easy Payment */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-950">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-sky-600" />
                    <span>간편결제 (토스페이 / 카카오페이 / 네이버페이)</span>
                  </span>
                  <span className="text-sky-700 font-mono font-extrabold text-sm">25%</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-neutral-600">
                  <span>총 매출액: <strong>{formatPrice(Math.round(currRevenue * 0.25).toString())}</strong></span>
                  <span>추정 주문수: 약 {Math.round(Number(activeMonthData.주문건수) * 0.25)}건</span>
                </div>
              </div>

              {/* Card 3: Global Currency */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-950">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>해외 결제 (USD / JPY / CNY - 관세 30% 적용)</span>
                  </span>
                  <span className="text-amber-700 font-mono font-extrabold text-sm">10%</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-neutral-600">
                  <span>총 매출액: <strong>{formatPrice(Math.round(currRevenue * 0.10).toString())}</strong></span>
                  <span>추정 주문수: 약 {Math.round(Number(activeMonthData.주문건수) * 0.10)}건</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SETTLEMENT SUMMARY DETAIL MODAL (정산 수수료 및 순수익 산출서) */}
      {/* ========================================================================= */}
      {activeModal === "settlement_summary" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
                    <span>{activeMonthData.일자} 정산 수수료 & 순수익 세부 산출서</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    PG 수수료, 부가가치세 및 가맹점 최종 입금 추산액 명세입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toss Payments Fee Rate Input & Settlement Calculation */}
            <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-950">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>토스페이먼츠(Toss Payments) 가맹점 우대/계약 수수료율 설정</span>
                </div>
                <span className="text-[10px] bg-sky-200 text-sky-900 font-mono font-bold px-2 py-0.5 rounded-full">
                  PG 수수료 자동산산
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-neutral-700 shrink-0">계약 PG 수수료율 (%):</label>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={tossFeeRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTossFeeRate(val);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("toss_payments_fee_rate", val.toString());
                      }
                    }}
                    className="w-full bg-white border border-sky-300 font-mono font-extrabold text-neutral-950 px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    %
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                영세/중소 우대 수수료율(1.1%~2.2%) 및 전자결제 계약 수수료율을 입력하시면 하단 입금 순수익이 즉시 계산됩니다.
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono border border-neutral-200/80 rounded-2xl p-4 bg-neutral-50">
              <div className="flex justify-between py-1.5 border-b border-neutral-200">
                <span className="font-sans font-bold text-neutral-700">총 결제 승인금액</span>
                <span className="font-extrabold text-neutral-950">{formatPrice(activeMonthData.결제금액)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-200 text-rose-600">
                <span className="font-sans font-bold">- 토스페이먼츠 PG 수수료 ({tossFeeRate}%)</span>
                <span className="font-extrabold">
                  -{formatPrice(Math.round(Number(activeMonthData.결제금액) * (tossFeeRate / 100)).toString())}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-200 text-amber-800">
                <span className="font-sans font-bold">- PG 수수료 부가가치세 (VAT 10%)</span>
                <span className="font-extrabold">
                  -{formatPrice(Math.round(Number(activeMonthData.결제금액) * (tossFeeRate / 100) * 0.1).toString())}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-200 text-rose-600">
                <span className="font-sans font-bold">- 환불 & 취소 공제액</span>
                <span className="font-extrabold">-{formatPrice(activeMonthData.환불금액)}</span>
              </div>
              <div className="flex justify-between pt-3 text-sm font-sans font-black text-emerald-700">
                <span>가맹점 계좌 최종 입금 예상 순수익액</span>
                <span className="font-mono text-emerald-700 text-base font-black">
                  {formatPrice(
                    (
                      Number(activeMonthData.결제금액) -
                      Math.round(Number(activeMonthData.결제금액) * (tossFeeRate / 100) * 1.1) -
                      Number(activeMonthData.환불금액)
                    ).toString()
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
