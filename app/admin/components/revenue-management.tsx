"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  TrendingDown,
  Users,
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
  History,
  CheckCircle2,
  Receipt,
  PieChart,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import fallbackRevenueData from "@/lib/sfcc/monthly-revenue-data.json";

export type PeriodType = "monthly" | "yearly";
export type SortColumn = "일자" | "매출" | "결제금액" | "주문건수" | "품목건수" | "환불금액" | "할인금액" | "배송비" | "atv" | "return_rate";

interface MonthlyRevenueRecord {
  일자: string;
  주문건수: string | number;
  품목건수: string | number;
  상품금액: string | number;
  배송비: string | number;
  할인금액: string | number;
  결제금액: string | number;
  환불금액: string | number;
  매출: string | number;
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

export function RevenueManagement({
  triggerToast,
}: RevenueManagementProps) {
  // 1. 기간 모드: 월별 (Monthly) 또는 연도별 (Yearly)
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  // 엑셀 실제 데이터 기준 최신 실적 월: 2026-07
  const [selectedDate, setSelectedDate] = useState<string>("2026-07");

  // 2. 검색 및 테이블 정렬
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("일자");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 3. 슈파베이스(Supabase) 연동 상태
  const [revenueHistory, setRevenueHistory] = useState<MonthlyRevenueRecord[]>(
    fallbackRevenueData as MonthlyRevenueRecord[]
  );
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Supabase site_settings에서 실제 월별매출 데이터 로드 & 실시간 동기화
  const loadRevenueFromSupabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", "monthly_revenue_history")
        .maybeSingle();

      if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
        setRevenueHistory(data.value);
        setIsSupabaseSynced(true);
      } else {
        setRevenueHistory(fallbackRevenueData as MonthlyRevenueRecord[]);
        setIsSupabaseSynced(false);
      }
    } catch (err) {
      console.warn("Supabase fetch failed, fallback to local data:", err);
      setRevenueHistory(fallbackRevenueData as MonthlyRevenueRecord[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenueFromSupabase();

    // Supabase Realtime 구독
    const channel = supabase
      .channel("site_settings_revenue_sub")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "key=eq.monthly_revenue_history",
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            setRevenueHistory((payload.new as any).value);
            setIsSupabaseSynced(true);
            if (triggerToast) {
              triggerToast("슈파베이스(Supabase)로부터 최신 매출 정산 데이터가 실시간 동기화되었습니다.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRevenueFromSupabase, triggerToast]);

  // 실제 데이터에 존재하는 월/연도 목록
  const availableMonths = useMemo(() => {
    return Array.from(new Set(revenueHistory.map((r) => r.일자))).sort((a, b) => b.localeCompare(a));
  }, [revenueHistory]);

  const availableYears = useMemo(() => {
    const years = new Set(revenueHistory.map((r) => r.일자.slice(0, 4)));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [revenueHistory]);

  // 월별 인덱스 맵
  const monthlyDataMap = useMemo(() => {
    const map = new Map<string, MonthlyRevenueRecord>();
    revenueHistory.forEach((item) => {
      map.set(item.일자, item);
    });
    return map;
  }, [revenueHistory]);

  // 기간별 기준일 & 직전 동기 계산
  const comparisonInfo = useMemo(() => {
    if (periodType === "yearly") {
      const curYear = parseInt(selectedDate || "2026", 10);
      return {
        currentLabel: `${curYear}년`,
        previousLabel: `${curYear - 1}년`,
        compareText: "전년 동기",
      };
    } else {
      const cur = selectedDate || "2026-07";
      const [y, m] = cur.split("-").map(Number);
      const prevDate = new Date(Date.UTC(y, m - 2, 1));
      const prevY = prevDate.getUTCFullYear();
      const prevM = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
      const prev = `${prevY}-${prevM}`;
      return { currentLabel: `${cur}월`, previousLabel: `${prev}월`, compareText: "전월 동기" };
    }
  }, [periodType, selectedDate]);

  // 100% 실제 엑셀/Supabase 원본 데이터 기준 KPI 지표 계산 (임의 추정 분배 완전 배제)
  const analyticsSummary = useMemo(() => {
    let curGross = 0;
    let curRefund = 0;
    let curNet = 0;
    let curOrders = 0;
    let curItemCount = 0;
    let curDiscount = 0;
    let curShipping = 0;

    let prevGross = 0;
    let prevRefund = 0;
    let prevNet = 0;
    let prevOrders = 0;
    let prevItemCount = 0;
    let prevDiscount = 0;

    if (periodType === "monthly") {
      const curData = monthlyDataMap.get(selectedDate) || monthlyDataMap.get("2026-07");
      const [y, m] = (selectedDate || "2026-07").split("-").map(Number);
      const prevDate = new Date(Date.UTC(y, m - 2, 1));
      const prevKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
      const prevData = monthlyDataMap.get(prevKey);

      curGross = Number(curData?.결제금액 || 0);
      curRefund = Number(curData?.환불금액 || 0);
      curNet = Number(curData?.매출 || curGross - curRefund);
      curOrders = Number(curData?.주문건수 || 0);
      curItemCount = Number(curData?.품목건수 || 0);
      curDiscount = Number(curData?.할인금액 || 0);
      curShipping = Number(curData?.배송비 || 0);

      prevGross = Number(prevData?.결제금액 || 0);
      prevRefund = Number(prevData?.환불금액 || 0);
      prevNet = Number(prevData?.매출 || prevGross - prevRefund);
      prevOrders = Number(prevData?.주문건수 || 0);
      prevItemCount = Number(prevData?.품목건수 || 0);
      prevDiscount = Number(prevData?.할인금액 || 0);
    } else {
      // Yearly
      const targetYear = selectedDate || "2026";
      const prevYear = String(parseInt(targetYear, 10) - 1);

      revenueHistory.forEach((item) => {
        if (item.일자.startsWith(targetYear)) {
          curGross += Number(item.결제금액 || 0);
          curRefund += Number(item.환불금액 || 0);
          curNet += Number(item.매출 || 0);
          curOrders += Number(item.주문건수 || 0);
          curItemCount += Number(item.품목건수 || 0);
          curDiscount += Number(item.할인금액 || 0);
          curShipping += Number(item.배송비 || 0);
        } else if (item.일자.startsWith(prevYear)) {
          prevGross += Number(item.결제금액 || 0);
          prevRefund += Number(item.환불금액 || 0);
          prevNet += Number(item.매출 || 0);
          prevOrders += Number(item.주문건수 || 0);
          prevItemCount += Number(item.품목건수 || 0);
          prevDiscount += Number(item.할인금액 || 0);
        }
      });
    }

    const calcRate = (current: number, previous: number) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // 실측 기반 객단가 (ATV: 순매출 / 주문건수)
    const curAtv = curOrders > 0 ? Math.round(curNet / curOrders) : 0;
    const prevAtv = prevOrders > 0 ? Math.round(prevNet / prevOrders) : 0;

    // 실측 기반 환불율 (%) = (환불금액 / 결제금액) * 100
    const curRefundRate = curGross > 0 ? Number(((curRefund / curGross) * 100).toFixed(2)) : 0;
    const prevRefundRate = prevGross > 0 ? Number(((prevRefund / prevGross) * 100).toFixed(2)) : 0;

    // 실측 기반 품목단가 (순매출 / 품목수)
    const curPerItemPrice = curItemCount > 0 ? Math.round(curNet / curItemCount) : 0;
    const prevPerItemPrice = prevItemCount > 0 ? Math.round(prevNet / prevItemCount) : 0;

    return {
      netSales: { current: curNet, previous: prevNet, rate: calcRate(curNet, prevNet) },
      grossSales: { current: curGross, previous: prevGross, rate: calcRate(curGross, prevGross) },
      refundAmount: { current: curRefund, previous: prevRefund, rate: calcRate(curRefund, prevRefund) },
      orders: { current: curOrders, previous: prevOrders, rate: calcRate(curOrders, prevOrders) },
      itemCount: { current: curItemCount, previous: prevItemCount, rate: calcRate(curItemCount, prevItemCount) },
      discountAmount: { current: curDiscount, previous: prevDiscount, rate: calcRate(curDiscount, prevDiscount) },
      shippingFee: { current: curShipping },
      atv: { current: curAtv, previous: prevAtv, rate: calcRate(curAtv, prevAtv) },
      refundRate: { current: curRefundRate, previous: prevRefundRate, rate: Number((curRefundRate - prevRefundRate).toFixed(2)) },
      perItemPrice: { current: curPerItemPrice, previous: prevPerItemPrice, rate: calcRate(curPerItemPrice, prevPerItemPrice) },
    };
  }, [periodType, selectedDate, monthlyDataMap, revenueHistory]);

  // 테이블용 실제 월별 정산 데이터 (검색 및 컬럼별 정렬 지원)
  const processedMonthlyTable = useMemo(() => {
    return revenueHistory
      .filter((row) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return row.일자.toLowerCase().includes(q);
      })
      .map((row) => {
        const net = Number(row.매출 || 0);
        const gross = Number(row.결제금액 || 0);
        const orders = Number(row.주문건수 || 0);
        const items = Number(row.품목건수 || 0);
        const refund = Number(row.환불금액 || 0);
        const discount = Number(row.할인금액 || 0);
        const shipping = Number(row.배송비 || 0);
        const atv = orders > 0 ? Math.round(net / orders) : 0;
        const refundRate = gross > 0 ? Number(((refund / gross) * 100).toFixed(2)) : 0;

        return {
          ...row,
          netNum: net,
          grossNum: gross,
          ordersNum: orders,
          itemsNum: items,
          refundNum: refund,
          discountNum: discount,
          shippingNum: shipping,
          atv,
          refundRate,
        };
      })
      .sort((a, b) => {
        let valA: any = a[sortColumn as keyof typeof a];
        let valB: any = b[sortColumn as keyof typeof b];

        if (sortColumn === "매출") {
          valA = a.netNum;
          valB = b.netNum;
        } else if (sortColumn === "결제금액") {
          valA = a.grossNum;
          valB = b.grossNum;
        } else if (sortColumn === "주문건수") {
          valA = a.ordersNum;
          valB = b.ordersNum;
        } else if (sortColumn === "품목건수") {
          valA = a.itemsNum;
          valB = b.itemsNum;
        } else if (sortColumn === "환불금액") {
          valA = a.refundNum;
          valB = b.refundNum;
        } else if (sortColumn === "할인금액") {
          valA = a.discountNum;
          valB = b.discountNum;
        } else if (sortColumn === "배송비") {
          valA = a.shippingNum;
          valB = b.shippingNum;
        } else if (sortColumn === "atv") {
          valA = a.atv;
          valB = b.atv;
        } else if (sortColumn === "return_rate") {
          valA = a.refundRate;
          valB = b.refundRate;
        }

        if (sortDirection === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [revenueHistory, searchQuery, sortColumn, sortDirection]);

  // 테이블 정렬 헤더 핸들러
  const handleSortToggle = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  // 100% 실제 데이터 엑셀 다운로드 (XLSX)
  const handleDownloadExcel = () => {
    if (processedMonthlyTable.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    try {
      const exportRows = processedMonthlyTable.map((r, idx) => ({
        "순번": idx + 1,
        "정산월(일자)": r.일자,
        "주문건수": r.ordersNum,
        "품목건수": r.itemsNum,
        "상품금액(원)": Number(r.상품금액 || 0),
        "배송비(원)": r.shippingNum,
        "할인금액(원)": r.discountNum,
        "결제금액(원)": r.grossNum,
        "환불금액(원)": r.refundNum,
        "최종순매출(원)": r.netNum,
        "환불율(%)": `${r.refundRate}%`,
        "객단가(원)": r.atv,
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "월별_매출_실제정산");
      const filename = `초이콤마_실제월별매출_${selectedDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      if (triggerToast) {
        triggerToast("실제 월별 정산 매출 엑셀 파일이 성공적으로 다운로드되었습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("엑셀 파일 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. 상단 타이틀 & 슈파베이스 연동 상태 & 기간 컨트롤러
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neutral-950 text-white rounded-2xl shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-neutral-950">
                실제 월별 매출 및 정산 분석 대시보드
              </h1>
              {isSupabaseSynced ? (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>슈파베이스(Supabase) 실시간 연동 완료</span>
                </span>
              ) : (
                <span className="text-xs bg-neutral-100 text-neutral-800 border border-neutral-200 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-600" />
                  <span>24~26년 실제 엑셀 31개월 전수 데이터 적용</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              제공해주신 24년·25년·26년 월별매출 정산표를 100% 원본 그대로 집계하여 전년/전월 동기 대비 성장률을 분석합니다.
            </p>
          </div>
        </div>

        {/* 기간 컨트롤러 & 엑셀 다운로드 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 기간 모드 탭 (월별 Monthly / 연도별 Yearly) */}
          <div className="inline-flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200/80">
            <button
              type="button"
              onClick={() => {
                setPeriodType("monthly");
                setSelectedDate("2026-07");
              }}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                periodType === "monthly"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              월별 (Monthly)
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodType("yearly");
                setSelectedDate("2026");
              }}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                periodType === "yearly"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              연도별 (Yearly)
            </button>
          </div>

          {/* 기간 셀렉터 */}
          <div className="relative">
            {periodType === "monthly" ? (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-700 cursor-pointer shadow-xs border border-neutral-800"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m.slice(0, 4)}년 {m.slice(5, 7)}월 {m === "2026-07" ? "(최신 실적)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-700 cursor-pointer shadow-xs border border-neutral-800"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}년도 전체 실적
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 엑셀 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>실제 매출 엑셀 다운로드 (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. 100% 실제 데이터 기준 핵심 지표 6대 요약 카드
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. 순매출 (Net Sales) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>최종 순매출 (Net)</span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            ₩{analyticsSummary.netSales.current.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.netSales.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.netSales.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.netSales.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 2. 결제 완료 금액 (Gross Sales) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>총 결제금액 (Gross)</span>
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            ₩{analyticsSummary.grossSales.current.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.grossSales.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.grossSales.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.grossSales.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 3. 주문 건수 */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>총 주문 건수</span>
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            {analyticsSummary.orders.current.toLocaleString()}건
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.orders.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.orders.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.orders.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 4. 판매 품목 건수 */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>판매 품목 건수</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            {analyticsSummary.itemCount.current.toLocaleString()}개
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.itemCount.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.itemCount.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.itemCount.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 5. 실제 객단가 (ATV) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>실제 객단가 (ATV)</span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            ₩{analyticsSummary.atv.current.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.atv.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.atv.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.atv.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 6. 환불 및 취소액 & 환불율 */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>환불액 / 환불율</span>
            <RotateCcw className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-rose-600 font-mono tracking-tight">
            ₩{analyticsSummary.refundAmount.current.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-700 font-extrabold">
              환불율: {analyticsSummary.refundRate.current}%
            </span>
            <span className="text-[10px] text-neutral-400">
              할인: ₩{(analyticsSummary.discountAmount.current / 10000).toFixed(0)}만
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. 100% 실제 엑셀 데이터 기반 월별 정산 전수 내역표 (31개월)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>실제 월별 정산 상세 내역표 ({processedMonthlyTable.length}개 월 데이터)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              24년, 25년, 26년 엑셀 원본 파일의 결제금액, 환불액, 할인금액, 최종 순매출, 주문건수를 100% 원본 그대로 표시합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="정산월 검색 (예: 2026-07, 2025)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-neutral-50 text-neutral-600 font-extrabold border-b border-neutral-200 uppercase text-[11px]">
              <tr>
                <th
                  onClick={() => handleSortToggle("일자")}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>정산월 (일자)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("주문건수")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>주문 건수</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("품목건수")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>품목 건수</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("결제금액")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>결제금액 (원)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("할인금액")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>할인금액</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("환불금액")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none text-rose-600"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>환불금액</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("매출")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none text-emerald-700"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>최종 순매출액</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("return_rate")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>환불율 (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("atv")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>객단가 (ATV)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60 font-mono">
              {processedMonthlyTable.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-neutral-400 font-sans text-xs">
                    검색 조건과 일치하는 월별 매출 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                processedMonthlyTable.map((r) => {
                  const isSelected = r.일자 === selectedDate;
                  const isLatest = r.일자 === "2026-07";

                  return (
                    <tr
                      key={r.일자}
                      onClick={() => {
                        setPeriodType("monthly");
                        setSelectedDate(r.일자);
                      }}
                      className={`hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                        isSelected ? "bg-emerald-50/80 font-bold" : ""
                      }`}
                    >
                      {/* 정산월 */}
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-950">
                        <div className="flex items-center gap-2">
                          {isLatest && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                              최신
                            </span>
                          )}
                          <span>{r.일자}</span>
                        </div>
                      </td>

                      {/* 주문 건수 */}
                      <td className="py-3.5 px-4 text-right text-neutral-800 font-bold">
                        {r.ordersNum.toLocaleString()}건
                      </td>

                      {/* 품목 건수 */}
                      <td className="py-3.5 px-4 text-right text-neutral-600">
                        {r.itemsNum.toLocaleString()}개
                      </td>

                      {/* 결제금액 */}
                      <td className="py-3.5 px-4 text-right text-neutral-900 font-bold">
                        ₩{r.grossNum.toLocaleString()}
                      </td>

                      {/* 할인금액 */}
                      <td className="py-3.5 px-4 text-right text-amber-800">
                        -₩{r.discountNum.toLocaleString()}
                      </td>

                      {/* 환불금액 */}
                      <td className="py-3.5 px-4 text-right text-rose-600 font-bold">
                        -₩{r.refundNum.toLocaleString()}
                      </td>

                      {/* 최종 순매출액 */}
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 bg-emerald-50/40 text-sm">
                        ₩{r.netNum.toLocaleString()}
                      </td>

                      {/* 환불율 */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                            r.refundRate > 10
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {r.refundRate}%
                        </span>
                      </td>

                      {/* 객단가 (ATV) */}
                      <td className="py-3.5 px-4 text-right text-neutral-800 font-bold">
                        ₩{r.atv.toLocaleString()}
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
  );
}
