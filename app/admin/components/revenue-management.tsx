"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  RotateCcw,
  Percent,
  Download,
  ArrowUpDown,
  Search,
  Calendar,
  CreditCard,
  Database,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers3,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// 정적 백업 JSON 데이터 임포트
import fallbackDailyData from "@/lib/sfcc/sales-daily-data.json";
import fallbackMonthlyData from "@/lib/sfcc/sales-monthly-data.json";
import fallbackItemsData from "@/lib/sfcc/sales-items-data.json";

export type ViewTab = "period" | "items";
export type PeriodGranularity = "daily" | "monthly" | "yearly";
export type ItemSortCol = "netSales" | "paymentAmount" | "orderCount" | "cancelRate" | "cancelCount" | "avgPrice";
export type PeriodSortCol = "date" | "netSales" | "paymentAmount" | "orderCount" | "itemCount" | "refundAmount" | "discountAmount" | "atv" | "refundRate";

interface DailyRecord {
  date: string;
  orderCount: number;
  itemCount: number;
  productAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentAmount: number;
  refundAmount: number;
  netSales: number;
}

interface MonthlyRecord {
  month: string;
  orderCount: number;
  itemCount: number;
  productAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentAmount: number;
  refundAmount: number;
  netSales: number;
}

interface ItemRecord {
  year: string;
  name: string;
  avgPrice: number;
  orderCount: number;
  cancelCount: number;
  cancelRate: number;
  paymentAmount: number;
  refundAmount: number;
  netSales: number;
}

interface RevenueManagementProps {
  revenueSelectedMonth?: string;
  setRevenueSelectedMonth?: (val: string) => void;
  revenueSelectedYear?: string;
  setRevenueSelectedYear?: (val: string) => void;
  revenueSearchQuery?: string;
  setRevenueSearchQuery?: (val: string) => void;
  triggerToast?: (msg: string) => void;
  productsList?: any[];
  shipmentsList?: any[];
}

export function RevenueManagement({ triggerToast, shipmentsList = [] }: RevenueManagementProps) {
  // 1. 대시보드 뷰 탭: 'period'(기간별 매출통계) vs 'items'(아이템별 매출통계)
  const [activeTab, setActiveTab] = useState<ViewTab>("period");

  // 2. 기간별 매출통계 옵션
  const [periodGranularity, setPeriodGranularity] = useState<PeriodGranularity>("monthly");
  const [selectedPeriodDate, setSelectedPeriodDate] = useState<string>("2026-09");

  // 3. 아이템별 매출통계 옵션 (2024, 2025, 2026, all)
  const [itemSelectedYear, setItemSelectedYear] = useState<string>("2026");

  // 4. 검색 및 정렬
  const [searchQuery, setSearchQuery] = useState("");
  const [periodSortCol, setPeriodSortCol] = useState<PeriodSortCol>("date");
  const [periodSortDir, setPeriodSortDir] = useState<"asc" | "desc">("desc");
  const [itemSortCol, setItemSortCol] = useState<ItemSortCol>("netSales");
  const [itemSortDir, setItemSortDir] = useState<"asc" | "desc">("desc");

  // 5. 실시간 Supabase 데이터 상태
  const [dailySalesList, setDailySalesList] = useState<DailyRecord[]>(fallbackDailyData as DailyRecord[]);
  const [monthlySalesList, setMonthlySalesList] = useState<MonthlyRecord[]>(fallbackMonthlyData as MonthlyRecord[]);
  const [itemsSalesMap, setItemsSalesMap] = useState<Record<string, ItemRecord[]>>(
    fallbackItemsData as Record<string, ItemRecord[]>
  );
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(false);

  // Supabase 실시간 동기화
  const loadSalesFromSupabase = useCallback(async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "monthly_revenue_history").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "items_revenue_history").maybeSingle(),
      ]);

      let syncedCount = 0;
      if (mRes.data?.value && Array.isArray(mRes.data.value)) {
        setMonthlySalesList(mRes.data.value);
        syncedCount++;
      }
      if (iRes.data?.value && typeof iRes.data.value === "object") {
        setItemsSalesMap(iRes.data.value);
        syncedCount++;
      }

      if (syncedCount > 0) {
        setIsSupabaseSynced(true);
      }
    } catch (err) {
      console.warn("Failed to load sales from Supabase, using local data:", err);
    }
  }, []);

  useEffect(() => {
    loadSalesFromSupabase();

    const channel = supabase
      .channel("sales_stats_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          if (payload.new && (payload.new as any).key === "monthly_revenue_history") {
            setMonthlySalesList((payload.new as any).value);
            setIsSupabaseSynced(true);
          }
          if (payload.new && (payload.new as any).key === "items_revenue_history") {
            setItemsSalesMap((payload.new as any).value);
            setIsSupabaseSynced(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSalesFromSupabase]);

  // 가용 연도 및 월 목록 동적 산출
  const availableYears = useMemo(() => ["2026", "2025", "2024"], []);
  const availableMonths = useMemo(() => {
    return monthlySalesList.map((m) => m.month).sort((a, b) => b.localeCompare(a));
  }, [monthlySalesList]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [A] 기간별 매출 분석 KPI 산출 (선택 기간 및 전년/전월 동기 비교)
  // ─────────────────────────────────────────────────────────────────────────────
  const periodKpi = useMemo(() => {
    let curGross = 0;
    let curRefund = 0;
    let curNet = 0;
    let curOrders = 0;
    let curItemCount = 0;
    let curDiscount = 0;

    let prevGross = 0;
    let prevRefund = 0;
    let prevNet = 0;
    let prevOrders = 0;
    let prevItemCount = 0;
    let compareLabel = "전월 동기";

    if (periodGranularity === "daily") {
      const curDaily = dailySalesList.find((d) => d.date === selectedPeriodDate) || dailySalesList[0];
      const curDateObj = new Date(curDaily?.date || "2026-09-14");
      const prevDateObj = new Date(curDateObj);
      prevDateObj.setDate(prevDateObj.getDate() - 1);
      const prevDateStr = prevDateObj.toISOString().slice(0, 10);
      const prevDaily = dailySalesList.find((d) => d.date === prevDateStr);

      curGross = curDaily?.paymentAmount || 0;
      curRefund = curDaily?.refundAmount || 0;
      curNet = curDaily?.netSales || 0;
      curOrders = curDaily?.orderCount || 0;
      curItemCount = curDaily?.itemCount || 0;
      curDiscount = curDaily?.discountAmount || 0;

      prevGross = prevDaily?.paymentAmount || 0;
      prevRefund = prevDaily?.refundAmount || 0;
      prevNet = prevDaily?.netSales || 0;
      prevOrders = prevDaily?.orderCount || 0;
      prevItemCount = prevDaily?.itemCount || 0;
      compareLabel = "전일 동기";
    } else if (periodGranularity === "yearly") {
      const targetYear = selectedPeriodDate || "2026";
      const prevYearStr = String(parseInt(targetYear, 10) - 1);

      monthlySalesList.forEach((m) => {
        if (m.month.startsWith(targetYear)) {
          curGross += m.paymentAmount;
          curRefund += m.refundAmount;
          curNet += m.netSales;
          curOrders += m.orderCount;
          curItemCount += m.itemCount;
          curDiscount += m.discountAmount;
        } else if (m.month.startsWith(prevYearStr)) {
          prevGross += m.paymentAmount;
          prevRefund += m.refundAmount;
          prevNet += m.netSales;
          prevOrders += m.orderCount;
          prevItemCount += m.itemCount;
        }
      });
      compareLabel = "전년 동기";
    } else {
      // monthly
      const curMonthly = monthlySalesList.find((m) => m.month === selectedPeriodDate) || monthlySalesList[0];
      const [y, m] = (selectedPeriodDate || "2026-09").split("-").map(Number);
      const prevDate = new Date(Date.UTC(y, m - 2, 1));
      const prevKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
      const prevMonthly = monthlySalesList.find((item) => item.month === prevKey);

      curGross = curMonthly?.paymentAmount || 0;
      curRefund = curMonthly?.refundAmount || 0;
      curNet = curMonthly?.netSales || 0;
      curOrders = curMonthly?.orderCount || 0;
      curItemCount = curMonthly?.itemCount || 0;
      curDiscount = curMonthly?.discountAmount || 0;

      prevGross = prevMonthly?.paymentAmount || 0;
      prevRefund = prevMonthly?.refundAmount || 0;
      prevNet = prevMonthly?.netSales || 0;
      prevOrders = prevMonthly?.orderCount || 0;
      prevItemCount = prevMonthly?.itemCount || 0;
      compareLabel = "전월 동기";
    }

    const calcRate = (cur: number, prev: number) => {
      if (!prev || prev === 0) return cur > 0 ? 100 : 0;
      return Number((((cur - prev) / prev) * 100).toFixed(1));
    };

    const curAtv = curOrders > 0 ? Math.round(curNet / curOrders) : 0;
    const prevAtv = prevOrders > 0 ? Math.round(prevNet / prevOrders) : 0;

    const curRefundRate = curGross > 0 ? Number(((curRefund / curGross) * 100).toFixed(2)) : 0;
    const prevRefundRate = prevGross > 0 ? Number(((prevRefund / prevGross) * 100).toFixed(2)) : 0;

    return {
      netSales: { current: curNet, rate: calcRate(curNet, prevNet) },
      grossSales: { current: curGross, rate: calcRate(curGross, prevGross) },
      orders: { current: curOrders, rate: calcRate(curOrders, prevOrders) },
      itemCount: { current: curItemCount, rate: calcRate(curItemCount, prevItemCount) },
      atv: { current: curAtv, rate: calcRate(curAtv, prevAtv) },
      refundAmount: { current: curRefund, refundRate: curRefundRate, rate: Number((curRefundRate - prevRefundRate).toFixed(2)) },
      compareLabel,
    };
  }, [periodGranularity, selectedPeriodDate, dailySalesList, monthlySalesList]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [B] 기간별 상세 테이블 데이터 (일자별 / 월별)
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredPeriodList = useMemo(() => {
    let source: any[] = [];
    if (periodGranularity === "daily") {
      source = dailySalesList.map((d) => ({
        key: d.date,
        date: d.date,
        orderCount: d.orderCount,
        itemCount: d.itemCount,
        paymentAmount: d.paymentAmount,
        refundAmount: d.refundAmount,
        discountAmount: d.discountAmount,
        netSales: d.netSales,
        atv: d.orderCount > 0 ? Math.round(d.netSales / d.orderCount) : 0,
        refundRate: d.paymentAmount > 0 ? Number(((d.refundAmount / d.paymentAmount) * 100).toFixed(2)) : 0,
      }));
    } else {
      source = monthlySalesList.map((m) => ({
        key: m.month,
        date: m.month,
        orderCount: m.orderCount,
        itemCount: m.itemCount,
        paymentAmount: m.paymentAmount,
        refundAmount: m.refundAmount,
        discountAmount: m.discountAmount,
        netSales: m.netSales,
        atv: m.orderCount > 0 ? Math.round(m.netSales / m.orderCount) : 0,
        refundRate: m.paymentAmount > 0 ? Number(((m.refundAmount / m.paymentAmount) * 100).toFixed(2)) : 0,
      }));
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      source = source.filter((r) => r.date.toLowerCase().includes(q));
    }

    // 컬럼 정렬
    return source.sort((a, b) => {
      const valA = a[periodSortCol];
      const valB = b[periodSortCol];
      if (periodSortDir === "asc") {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [periodGranularity, dailySalesList, monthlySalesList, searchQuery, periodSortCol, periodSortDir]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [C] 아이템별 매출 상세 테이블 데이터 (100% 실제 아이템별 엑셀 파일 원본)
  // ─────────────────────────────────────────────────────────────────────────────
  const currentItemsList = useMemo(() => {
    const list = itemsSalesMap[itemSelectedYear] || [];
    let filtered = list;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(q));
    }

    return filtered.sort((a, b) => {
      const valA = a[itemSortCol];
      const valB = b[itemSortCol];
      if (itemSortDir === "asc") {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [itemsSalesMap, itemSelectedYear, searchQuery, itemSortCol, itemSortDir]);

  // 아이템별 KPI 요약
  const itemsKpi = useMemo(() => {
    const list = itemsSalesMap[itemSelectedYear] || [];
    const totalNet = list.reduce((acc, i) => acc + i.netSales, 0);
    const totalGross = list.reduce((acc, i) => acc + i.paymentAmount, 0);
    const totalOrders = list.reduce((acc, i) => acc + i.orderCount, 0);
    const totalCancels = list.reduce((acc, i) => acc + i.cancelCount, 0);
    const totalRefund = list.reduce((acc, i) => acc + i.refundAmount, 0);
    const avgCancelRate = totalOrders > 0 ? Number(((totalCancels / totalOrders) * 100).toFixed(2)) : 0;
    const avgAtv = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0;

    return {
      totalItemsCount: list.length,
      totalNet,
      totalGross,
      totalOrders,
      totalCancels,
      totalRefund,
      avgCancelRate,
      avgAtv,
    };
  }, [itemsSalesMap, itemSelectedYear]);

  // 정렬 헤더 핸들러
  const handlePeriodSort = (col: PeriodSortCol) => {
    if (periodSortCol === col) {
      setPeriodSortDir(periodSortDir === "asc" ? "desc" : "asc");
    } else {
      setPeriodSortCol(col);
      setPeriodSortDir("desc");
    }
  };

  const handleItemSort = (col: ItemSortCol) => {
    if (itemSortCol === col) {
      setItemSortDir(itemSortDir === "asc" ? "desc" : "asc");
    } else {
      setItemSortCol(col);
      setItemSortDir("desc");
    }
  };

  // 엑셀 다운로드 핸들러
  const handleExportExcel = () => {
    try {
      if (activeTab === "period") {
        const rows = filteredPeriodList.map((r, idx) => ({
          순번: idx + 1,
          일자: r.date,
          주문건수: r.orderCount,
          품목건수: r.itemCount,
          결제금액: r.paymentAmount,
          할인금액: r.discountAmount,
          환불금액: r.refundAmount,
          최종순매출: r.netSales,
          객단가: r.atv,
          환불율: `${r.refundRate}%`,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "기간별_매출통계");
        XLSX.writeFile(wb, `초이콤마_기간별_매출통계_${periodGranularity}_${selectedPeriodDate}.xlsx`);
      } else {
        const rows = currentItemsList.map((i, idx) => ({
          순위: idx + 1,
          상품명: i.name,
          평균상품금액: i.avgPrice,
          주문건수: i.orderCount,
          취소반품수: i.cancelCount,
          취소반품률: `${i.cancelRate}%`,
          결제금액: i.paymentAmount,
          환불금액: i.refundAmount,
          매출금액: i.netSales,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "아이템별_매출통계");
        XLSX.writeFile(wb, `초이콤마_아이템별_매출통계_${itemSelectedYear}년.xlsx`);
      }

      if (triggerToast) {
        triggerToast("100% 실제 데이터 기반 엑셀 파일이 성공적으로 다운로드되었습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. 상단 타이틀 & 탭 전환 & 슈파베이스 연동 상태
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neutral-950 text-white rounded-2xl shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-neutral-950">
                매출 & 아이템 성과 분석 대시보드
              </h1>
              {isSupabaseSynced ? (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>슈파베이스(Supabase) 실시간 연동 완료</span>
                </span>
              ) : (
                <span className="text-xs bg-neutral-100 text-neutral-800 border border-neutral-200 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-600" />
                  <span>2024년 ~ 오늘까지 실제 엑셀 전수 데이터 연동</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              임의 추정 데이터 없이 2024년부터 오늘까지의 <strong>기간별 매출통계</strong> 및 <strong>아이템별 실판매 엑셀 원본</strong>을 100% 정밀 분석합니다.
            </p>
          </div>
        </div>

        {/* 탭 전환 버튼 & 엑셀 다운로드 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab("period");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                activeTab === "period"
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>기간별 매출통계</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("items");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                activeTab === "items"
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>아이템별 매출통계</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>실제 데이터 엑셀 다운로드 (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2-A. 기간별 매출통계 모드 (일자별 / 월별 / 연도별 & 6대 KPI & 전수 내역표)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "period" && (
        <div className="space-y-6">
          {/* 기간 필터 서브 바 */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-neutral-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodGranularity("daily");
                    setSelectedPeriodDate("2026-09-14");
                  }}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    periodGranularity === "daily" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  일자별 (Daily)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodGranularity("monthly");
                    setSelectedPeriodDate("2026-09");
                  }}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    periodGranularity === "monthly" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  월별 (Monthly)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodGranularity("yearly");
                    setSelectedPeriodDate("2026");
                  }}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    periodGranularity === "yearly" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  연도별 (Yearly)
                </button>
              </div>

              {/* 일자 / 월 / 연도 셀렉터 */}
              {periodGranularity === "daily" && (
                <input
                  type="date"
                  value={selectedPeriodDate}
                  onChange={(e) => setSelectedPeriodDate(e.target.value)}
                  className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-neutral-950 focus:outline-none cursor-pointer"
                />
              )}
              {periodGranularity === "monthly" && (
                <select
                  value={selectedPeriodDate}
                  onChange={(e) => setSelectedPeriodDate(e.target.value)}
                  className="bg-neutral-900 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m.slice(0, 4)}년 {m.slice(5, 7)}월 {m === "2026-09" ? "(당월 최신)" : ""}
                    </option>
                  ))}
                </select>
              )}
              {periodGranularity === "yearly" && (
                <select
                  value={selectedPeriodDate}
                  onChange={(e) => setSelectedPeriodDate(e.target.value)}
                  className="bg-neutral-900 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}년도 전체 실적
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-xs text-neutral-500 font-bold">
              선택 기준: <strong className="text-neutral-950">{selectedPeriodDate}</strong> ({periodKpi.compareLabel} 비교 분석)
            </div>
          </div>

          {/* 6대 실측 KPI 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">최종 순매출액</span>
              <p className="text-xl font-black text-neutral-950 font-mono tracking-tight">
                ₩{periodKpi.netSales.current.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {periodKpi.netSales.rate >= 0 ? (
                  <span className="text-emerald-600 font-extrabold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{periodKpi.netSales.rate}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {periodKpi.netSales.rate}%
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">vs {periodKpi.compareLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">결제 승인금액</span>
              <p className="text-xl font-black text-neutral-950 font-mono tracking-tight">
                ₩{periodKpi.grossSales.current.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {periodKpi.grossSales.rate >= 0 ? (
                  <span className="text-emerald-600 font-extrabold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{periodKpi.grossSales.rate}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {periodKpi.grossSales.rate}%
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">vs {periodKpi.compareLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">총 주문 건수</span>
              <p className="text-xl font-black text-neutral-950 font-mono tracking-tight">
                {periodKpi.orders.current.toLocaleString()}건
              </p>
              <div className="flex items-center gap-1 text-xs">
                {periodKpi.orders.rate >= 0 ? (
                  <span className="text-emerald-600 font-extrabold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{periodKpi.orders.rate}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {periodKpi.orders.rate}%
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">vs {periodKpi.compareLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">판매 품목 수량</span>
              <p className="text-xl font-black text-neutral-950 font-mono tracking-tight">
                {periodKpi.itemCount.current.toLocaleString()}개
              </p>
              <div className="flex items-center gap-1 text-xs">
                {periodKpi.itemCount.rate >= 0 ? (
                  <span className="text-emerald-600 font-extrabold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{periodKpi.itemCount.rate}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {periodKpi.itemCount.rate}%
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">vs {periodKpi.compareLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">실제 객단가 (ATV)</span>
              <p className="text-xl font-black text-neutral-950 font-mono tracking-tight">
                ₩{periodKpi.atv.current.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {periodKpi.atv.rate >= 0 ? (
                  <span className="text-emerald-600 font-extrabold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{periodKpi.atv.rate}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {periodKpi.atv.rate}%
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">vs {periodKpi.compareLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-neutral-500 text-xs font-bold block">환불액 & 환불율</span>
              <p className="text-xl font-black text-rose-600 font-mono tracking-tight">
                ₩{periodKpi.refundAmount.current.toLocaleString()}
              </p>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-700 font-extrabold">환불율: {periodKpi.refundAmount.refundRate}%</span>
                <span className="text-neutral-400 text-[10px]">({periodKpi.refundAmount.rate > 0 ? `+${periodKpi.refundAmount.rate}%p` : `${periodKpi.refundAmount.rate}%p`})</span>
              </div>
            </div>
          </div>

          {/* 기간별 매출 상세 표 */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <span>
                    기간별 매출 상세 표 ({periodGranularity === "daily" ? "일자별 989건" : "월별 33건"})
                  </span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  행을 클릭하면 상단 지표 카드가 해당 기간 수치로 즉시 전환됩니다.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="일자 또는 월 검색 (예: 2026-09)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-extrabold border-b border-neutral-200 uppercase text-[11px] sticky top-0 z-10">
                  <tr>
                    <th onClick={() => handlePeriodSort("date")} className="py-3 px-4 cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>{periodGranularity === "daily" ? "일자" : "정산월"}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("orderCount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>주문 건수</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("itemCount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>품목 수량</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("paymentAmount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>결제금액 (원)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("refundAmount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950 text-rose-600">
                      <div className="inline-flex items-center gap-1">
                        <span>환불금액</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("netSales")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950 text-emerald-700">
                      <div className="inline-flex items-center gap-1">
                        <span>최종 순매출액</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("refundRate")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>환불율</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handlePeriodSort("atv")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>객단가 (ATV)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60 font-mono">
                  {filteredPeriodList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400 font-sans text-xs">
                        검색 조건과 일치하는 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredPeriodList.map((r) => {
                      const isSelected = r.date === selectedPeriodDate;
                      return (
                        <tr
                          key={r.key}
                          onClick={() => setSelectedPeriodDate(r.date)}
                          className={`hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                            isSelected ? "bg-emerald-50/80 font-bold" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-neutral-950">{r.date}</td>
                          <td className="py-3 px-4 text-right text-neutral-800 font-bold">{r.orderCount.toLocaleString()}건</td>
                          <td className="py-3 px-4 text-right text-neutral-600">{r.itemCount.toLocaleString()}개</td>
                          <td className="py-3 px-4 text-right text-neutral-900 font-bold">₩{r.paymentAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-rose-600 font-bold">-₩{r.refundAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700 bg-emerald-50/40 text-sm">
                            ₩{r.netSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold ${
                                r.refundRate > 10 ? "bg-rose-50 text-rose-600" : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {r.refundRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-neutral-800">₩{r.atv.toLocaleString()}</td>
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          2-B. 아이템별 매출통계 모드 (100% 실제 엑셀 파일 기반 순위, 주문수, 매출, 반품률)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "items" && (
        <div className="space-y-6">
          {/* 연도 셀렉터 & 아이템 KPI 서브 바 */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex bg-neutral-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setItemSelectedYear("2026")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    itemSelectedYear === "2026" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  2026년 (152개)
                </button>
                <button
                  type="button"
                  onClick={() => setItemSelectedYear("2025")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    itemSelectedYear === "2025" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  2025년 (247개)
                </button>
                <button
                  type="button"
                  onClick={() => setItemSelectedYear("2024")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    itemSelectedYear === "2024" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  2024년 (132개)
                </button>
                <button
                  type="button"
                  onClick={() => setItemSelectedYear("all")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer ${
                    itemSelectedYear === "all" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500"
                  }`}
                >
                  3개년 전체 누적 (432개)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span>총 매출: <strong className="text-emerald-700 font-extrabold">₩{itemsKpi.totalNet.toLocaleString()}</strong></span>
              <span>·</span>
              <span>총 주문: <strong className="text-neutral-900 font-extrabold">{itemsKpi.totalOrders.toLocaleString()}건</strong></span>
              <span>·</span>
              <span>평균 취소반품률: <strong className="text-rose-600 font-extrabold">{itemsKpi.avgCancelRate}%</strong></span>
            </div>
          </div>

          {/* 아이템별 상세 테이블 */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>
                    아이템별 실판매 랭킹 및 성과표 ({itemSelectedYear === "all" ? "전체 누적" : `${itemSelectedYear}년`} · 총 {currentItemsList.length}개 품목)
                  </span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  각 연도별 <strong>아이템별 매출통계 엑셀 원본</strong>에서 집계된 실제 상품명, 주문건수, 반품률, 결제금액, 순매출액입니다.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="상품명 검색 (예: T-SHIRT, 자켓, 틴트)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-extrabold border-b border-neutral-200 uppercase text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">순위</th>
                    <th className="py-3 px-4">상품명</th>
                    <th onClick={() => handleItemSort("avgPrice")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>평균 상품금액</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleItemSort("orderCount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>주문 건수</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleItemSort("cancelCount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>취소·반품 수</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleItemSort("cancelRate")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>취소·반품률 (%)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleItemSort("paymentAmount")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950">
                      <div className="inline-flex items-center gap-1">
                        <span>결제금액 (원)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleItemSort("netSales")} className="py-3 px-4 text-right cursor-pointer hover:text-neutral-950 text-emerald-700">
                      <div className="inline-flex items-center gap-1">
                        <span>최종 순매출금액</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60 font-mono">
                  {currentItemsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-neutral-400 font-sans text-xs">
                        검색 조건과 일치하는 아이템이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    currentItemsList.map((item, idx) => (
                      <tr key={`${item.name}-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                        {/* 순위 */}
                        <td className="py-3 px-4 text-center font-bold text-neutral-500">
                          {idx < 3 ? (
                            <span className="w-5 h-5 rounded-full bg-neutral-950 text-white text-[10px] inline-flex items-center justify-center font-extrabold">
                              {idx + 1}
                            </span>
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* 상품명 */}
                        <td className="py-3 px-4 font-sans font-extrabold text-neutral-950 max-w-[320px] truncate" title={item.name}>
                          {item.name}
                        </td>

                        {/* 평균 상품금액 */}
                        <td className="py-3 px-4 text-right text-neutral-700 font-bold">
                          ₩{item.avgPrice.toLocaleString()}
                        </td>

                        {/* 주문 건수 */}
                        <td className="py-3 px-4 text-right font-extrabold text-neutral-950">
                          {item.orderCount.toLocaleString()}건
                        </td>

                        {/* 취소·반품 수 */}
                        <td className="py-3 px-4 text-right text-rose-600 font-bold">
                          {item.cancelCount.toLocaleString()}개
                        </td>

                        {/* 취소·반품률 */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                              item.cancelRate > 10
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {item.cancelRate}%
                          </span>
                        </td>

                        {/* 결제금액 */}
                        <td className="py-3 px-4 text-right text-neutral-900 font-bold">
                          ₩{item.paymentAmount.toLocaleString()}
                        </td>

                        {/* 최종 순매출금액 */}
                        <td className="py-3 px-4 text-right font-black text-emerald-700 bg-emerald-50/40 text-sm">
                          ₩{item.netSales.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
