"use client";

import React from "react";
import {
  Download,
  Calendar,
  Search,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
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
  let revList = importedMonthlyRevenue;

  if (revenueSelectedMonth !== "all") {
    revList = revList.filter((item: any) => item.일자 === revenueSelectedMonth);
  } else if (revenueSelectedYear !== "all") {
    revList = revList.filter((item: any) => item.일자.startsWith(revenueSelectedYear));
  }

  if (revenueSearchQuery.trim()) {
    const q = revenueSearchQuery.trim().toLowerCase();
    revList = revList.filter((item: any) => item.일자.toLowerCase().includes(q));
  }

  // Monthly Calculations
  const totalNetRevenue = revList.reduce((sum: number, r: any) => sum + (Number(r["매출"]) || 0), 0);
  const totalOrders = revList.reduce((sum: number, r: any) => sum + (Number(r["주문건수"]) || 0), 0);
  const totalItems = revList.reduce((sum: number, r: any) => sum + (Number(r["품목건수"]) || 0), 0);
  const totalProductSales = revList.reduce((sum: number, r: any) => sum + (Number(r["상품금액"]) || 0), 0);
  const totalRefunds = revList.reduce((sum: number, r: any) => sum + (Number(r["환불금액"]) || 0), 0);
  const averageOrderValue = Math.round(totalNetRevenue / (totalOrders || 1));
  const refundRate = ((totalRefunds / (totalProductSales || 1)) * 100).toFixed(1);

  const monthlyAvgRevenue = Math.round(totalNetRevenue / (revList.length || 1));
  const monthlyAvgOrders = Math.round(totalOrders / (revList.length || 1));

  // Peak Month
  const sortedByNet = [...revList].sort((a: any, b: any) => (Number(b["매출"]) || 0) - (Number(a["매출"]) || 0));
  const peakMonthItem = sortedByNet[0];

  const allAvailableMonths = Array.from(new Set(importedMonthlyRevenue.map((r: any) => r.일자)));

  const handleExportRevenueCSV = () => {
    const headers = ["정산월", "주문건수", "품목건수", "상품금액(원)", "배송비(원)", "할인금액(원)", "결제금액(원)", "환불금액(원)", "최종순매출(원)"];
    const rows = revList.map((r: any) => [
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
    const suffix = revenueSelectedMonth !== "all" ? revenueSelectedMonth : (revenueSelectedYear !== "all" ? `${revenueSelectedYear}년` : "전체월");
    link.setAttribute("download", `초이콤마_월별_매출_정산_리포트_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("월별 매출 정산 리포트(CSV) 다운로드가 완료되었습니다.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              📊 REAL MONTHLY REVENUE DATA INTEGRATED
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-950">
            월별 매출 관리 & 정산 분석
          </h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
            <strong>월별 실시간 매출 실적 엑셀 데이터</strong> 기반의 월별 정산 내역입니다. 월별 매출액, 주문건수, 평균 객단가(AOV) 및 환불율을 월 단위로 상세 정산·분석합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportRevenueCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer shrink-0 border border-emerald-500 self-start sm:self-auto hover:scale-[1.02] active:scale-95"
        >
          <Download className="w-4 h-4" />
          월별 매출 정산 리포트 (CSV) 다운로드
        </button>
      </div>

      {/* Filter & Month Selector Control Bar */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 px-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> 월별 범위 필터:
            </span>
            {[
              { key: "all", monthKey: "all", label: "전체 월별 데이터" },
              { key: "2026", monthKey: "all", label: "2026년 월별 (1~7월)" },
              { key: "2025", monthKey: "all", label: "2025년 월별 (12개월)" },
              { key: "2024", monthKey: "all", label: "2024년 월별 (12개월)" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setRevenueSelectedYear(item.key);
                  setRevenueSelectedMonth("all");
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  revenueSelectedYear === item.key && revenueSelectedMonth === "all"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-neutral-600 shrink-0">특정 월 선택:</span>
            <select
              value={revenueSelectedMonth}
              onChange={(e) => {
                setRevenueSelectedMonth(e.target.value);
                if (e.target.value !== "all") {
                  setRevenueSelectedYear("all");
                }
              }}
              className="bg-neutral-50 border border-neutral-300 text-neutral-950 text-xs font-black px-3.5 py-2 rounded-xl focus:outline-none focus:border-neutral-950 shadow-2xs"
            >
              <option value="all">전체 월 (전체 목록)</option>
              {allAvailableMonths.map((m: string) => (
                <option key={m} value={m}>
                  {m} ({m.replace("-", "년 ")}월)
                </option>
              ))}
            </select>

            <div className="relative w-44 sm:w-52">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="월 검색 (예: 2026-05)..."
                value={revenueSearchQuery}
                onChange={(e) => setRevenueSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
              {revenueSelectedMonth !== "all"
                ? `${revenueSelectedMonth}월 순매출액`
                : revenueSelectedYear !== "all"
                ? `${revenueSelectedYear}년 월별 총 순매출`
                : "선택 기간 총 순매출액"}
            </span>
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
              {formatPrice(totalNetRevenue.toString())}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-extrabold text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>월별 정산 {revList.length}개 월 집계됨</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-sky-100/40 border border-sky-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sky-900 uppercase tracking-wide">
              월별 결제 주문 건수
            </span>
            <div className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-950 font-mono tracking-tight">
              {totalOrders.toLocaleString()} <span className="text-base font-bold text-sky-800">건</span>
            </div>
            <div className="text-[11px] font-bold text-sky-700 mt-1">
              월별 총 판매 품목 수: <strong className="font-black text-sky-950">{totalItems.toLocaleString()}개</strong>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
              월별 평균 객단가 (AOV)
            </span>
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight">
              {formatPrice(averageOrderValue.toString())}
            </div>
            <div className="text-[11px] font-bold text-amber-800 mt-1">
              주문 1건당 평균 순 결제금액
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100/40 border border-rose-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wide">
              월별 환불 & 취소액
            </span>
            <div className="p-2.5 bg-rose-500 text-white rounded-2xl shadow-xs">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-950 font-mono tracking-tight">
              {formatPrice(totalRefunds.toString())}
            </div>
            <div className="text-[11px] font-bold text-rose-700 mt-1">
              전체 상품금액 대비 환불율 <strong className="font-black">{refundRate}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-emerald-400/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase">
              월 평균 순매출액
            </span>
            <p className="text-xl font-black text-neutral-950 font-mono mt-1.5">
              {formatPrice(monthlyAvgRevenue.toString())}
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
            월 단위 평균
          </span>
        </div>

        <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded-full uppercase">
              최고 매출 달성 월 (PEAK MONTH)
            </span>
            <p className="text-xl font-black text-neutral-950 font-mono mt-1.5 flex items-center gap-2">
              <span>{peakMonthItem?.일자 || "-"}</span>
              <span className="text-xs text-amber-700 font-extrabold">({formatPrice((peakMonthItem?.매출 || 0).toString())})</span>
            </p>
          </div>
          <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
            최고 실적 🔥
          </span>
        </div>

        <div className="bg-white border-2 border-sky-400/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black bg-sky-600 text-white px-2.5 py-0.5 rounded-full uppercase">
              월 평균 주문건수
            </span>
            <p className="text-xl font-black text-neutral-950 font-mono mt-1.5">
              {monthlyAvgOrders.toLocaleString()} 건 / 월
            </p>
          </div>
          <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg">
            월평균 주문량
          </span>
        </div>
      </div>

      {/* Complete Monthly Settlement Ledger Table */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <span className="bg-amber-500/10 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              MONTHLY FINANCIAL LEDGER
            </span>
            <h3 className="text-xl font-extrabold text-neutral-950 mt-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              월별 정산 상세 내역표 ({revList.length}개 월)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              24년, 25년, 26년 월별 실적 데이터 원본을 월별로 정산하여 표로 제공합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">
              총 항목: <strong className="text-neutral-950 font-black">{revList.length}건</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left text-xs text-neutral-800">
            <thead className="bg-neutral-50 text-neutral-600 uppercase text-[11px] font-extrabold border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-4">정산월 (일자)</th>
                <th className="py-3.5 px-4 text-right">주문건수</th>
                <th className="py-3.5 px-4 text-right">품목건수</th>
                <th className="py-3.5 px-4 text-right">총 상품금액</th>
                <th className="py-3.5 px-4 text-right">배송비</th>
                <th className="py-3.5 px-4 text-right">할인금액</th>
                <th className="py-3.5 px-4 text-right">결제금액</th>
                <th className="py-3.5 px-4 text-right text-rose-600">환불금액</th>
                <th className="py-3.5 px-4 text-right text-emerald-700 font-black">최종 순매출액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-medium">
              {revList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500 text-sm">
                    검색 조건과 일치하는 월별 매출 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                revList.map((row: any, idx: number) => {
                  const netRev = Number(row["매출"]) || 0;
                  return (
                    <tr key={`${row.일자}-${idx}`} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-950">{row.일자}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-950">{Number(row.주문건수).toLocaleString()}건</td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-600">{Number(row.품목건수).toLocaleString()}개</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">{formatPrice((row.상품금액 || 0).toString())}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-600">{formatPrice((row.배송비 || 0).toString())}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-900">{formatPrice((row.할인금액 || 0).toString())}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">{formatPrice((row.결제금액 || 0).toString())}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-bold">{formatPrice((row.환불금액 || 0).toString())}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/50">{formatPrice(netRev.toString())}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
