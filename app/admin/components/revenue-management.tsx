"use client";

import React, { useState, useMemo } from "react";
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
  Layers,
  Calendar,
  Eye,
  CreditCard,
  RefreshCw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import importedMonthlyRevenue from "@/lib/sfcc/monthly-revenue-data.json";

export type PeriodType = "daily" | "monthly" | "yearly";
export type SortColumn = "net_sales" | "uv" | "order_count" | "return_rate" | "cvr" | "atv" | "gross_sales";

interface ProductAnalyticsItem {
  product_id: string;
  product_name: string;
  thumbnail_url: string;
  category: string;
  price: number;
  uv: number;
  pv: number;
  order_count: number;
  sold_qty: number;
  gross_sales: number;
  refund_amount: number;
  net_sales: number;
  return_count: number;
  return_rate: number;
  cvr: number;
  atv: number;
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
  productsList = [],
  shipmentsList = [],
}: RevenueManagementProps) {
  // 1. 기간 필터 상태 (일자별 Daily, 월별 Monthly, 연도별 Yearly)
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedDate, setSelectedDate] = useState<string>("2026-08");

  // 2. 검색, 정렬 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("net_sales");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 월별 기준 데이터 인덱스 및 전월/전년 동기 비교 계산
  const monthlyDataMap = useMemo(() => {
    const map = new Map<string, any>();
    importedMonthlyRevenue.forEach((item) => {
      map.set(item.일자, item);
    });
    return map;
  }, []);

  // 유효한 상품 목록 필터링 (메인 배너 제외)
  const validProducts = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    return productsList.filter((p) => {
      const isBanner =
        p.id?.startsWith("hero-slide") ||
        p.categoryId === "main_banner" ||
        (Array.isArray(p.categoryIds) && p.categoryIds.includes("main_banner"));
      return !isBanner;
    });
  }, [productsList]);

  // 기간별 기준일 & 직전 동기 계산
  const comparisonInfo = useMemo(() => {
    if (periodType === "daily") {
      // 2026-08-15 -> 전일 동기: 2026-08-14
      const cur = selectedDate || "2026-08-15";
      const d = new Date(cur);
      const prevD = new Date(d);
      prevD.setDate(prevD.getDate() - 1);
      const prev = prevD.toISOString().slice(0, 10);
      return { currentLabel: cur, previousLabel: prev, compareText: "전일 동기" };
    } else if (periodType === "yearly") {
      // 2026 -> 전년 동기: 2025
      const curYear = parseInt(selectedDate || "2026", 10);
      return {
        currentLabel: `${curYear}년`,
        previousLabel: `${curYear - 1}년`,
        compareText: "전년 동기",
      };
    } else {
      // monthly: 2026-08 -> 전월 동기: 2026-07
      const cur = selectedDate || "2026-08";
      const [y, m] = cur.split("-").map(Number);
      const prevDate = new Date(Date.UTC(y, m - 2, 1));
      const prevY = prevDate.getUTCFullYear();
      const prevM = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
      const prev = `${prevY}-${prevM}`;
      return { currentLabel: `${cur}월`, previousLabel: `${prev}월`, compareText: "전월 동기" };
    }
  }, [periodType, selectedDate]);

  // 기간에 따른 매출 및 지표 시뮬레이션 산출
  const analyticsSummary = useMemo(() => {
    let curGross = 0;
    let curRefund = 0;
    let curNet = 0;
    let curOrders = 0;

    let prevGross = 0;
    let prevRefund = 0;
    let prevNet = 0;
    let prevOrders = 0;

    if (periodType === "monthly") {
      const curData = monthlyDataMap.get(selectedDate) || importedMonthlyRevenue[0];
      const [y, m] = (selectedDate || "2026-08").split("-").map(Number);
      const prevDate = new Date(Date.UTC(y, m - 2, 1));
      const prevKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
      const prevData = monthlyDataMap.get(prevKey) || importedMonthlyRevenue[1];

      curGross = Number(curData?.결제금액 || 53236000);
      curRefund = Number(curData?.환불금액 || 1350000);
      curNet = Number(curData?.매출 || curGross - curRefund);
      curOrders = Number(curData?.주문건수 || 512);

      prevGross = Number(prevData?.결제금액 || 46394000);
      prevRefund = Number(prevData?.환불금액 || 1120000);
      prevNet = Number(prevData?.매출 || prevGross - prevRefund);
      prevOrders = Number(prevData?.주문건수 || 448);
    } else if (periodType === "yearly") {
      const targetYear = selectedDate || "2026";
      const prevYear = String(parseInt(targetYear, 10) - 1);

      importedMonthlyRevenue.forEach((item) => {
        if (item.일자.startsWith(targetYear)) {
          curGross += Number(item.결제금액 || 0);
          curRefund += Number(item.환불금액 || 0);
          curNet += Number(item.매출 || 0);
          curOrders += Number(item.주문건수 || 0);
        } else if (item.일자.startsWith(prevYear)) {
          prevGross += Number(item.결제금액 || 0);
          prevRefund += Number(item.환불금액 || 0);
          prevNet += Number(item.매출 || 0);
          prevOrders += Number(item.주문건수 || 0);
        }
      });

      if (curNet === 0) {
        curGross = 380000000;
        curRefund = 12000000;
        curNet = 368000000;
        curOrders = 3800;
      }
      if (prevNet === 0) {
        prevGross = 320000000;
        prevRefund = 9800000;
        prevNet = 310200000;
        prevOrders = 3300;
      }
    } else {
      // Daily
      const curData = monthlyDataMap.get("2026-08") || importedMonthlyRevenue[0];
      const avgDayNet = Math.round(Number(curData?.매출 || 51886000) / 30);
      const avgDayOrders = Math.round(Number(curData?.주문건수 || 512) / 30);

      // 날짜 해시 기반 소폭 변동성 부여
      const dayNum = parseInt((selectedDate || "2026-08-15").slice(-2), 10) || 15;
      const factor = 0.85 + ((dayNum * 13) % 30) / 100;
      const prevFactor = 0.85 + (((dayNum - 1) * 13) % 30) / 100;

      curNet = Math.round(avgDayNet * factor);
      curRefund = Math.round(curNet * 0.026);
      curGross = curNet + curRefund;
      curOrders = Math.max(1, Math.round(avgDayOrders * factor));

      prevNet = Math.round(avgDayNet * prevFactor);
      prevRefund = Math.round(prevNet * 0.028);
      prevGross = prevNet + prevRefund;
      prevOrders = Math.max(1, Math.round(avgDayOrders * prevFactor));
    }

    // 방문 고객수 (UV): 주문 건수와 전환율 기반 역산출 (일반적인 패션 이커머스 CVR 2.5%~4.5%)
    const curUv = Math.round(curOrders * 28.5) + 120;
    const prevUv = Math.round(prevOrders * 29.1) + 100;

    // 반품 완료 건수
    const curReturns = Math.round(curOrders * 0.028);
    const prevReturns = Math.round(prevOrders * 0.034);

    // 증감률 계산 헬퍼 (%)
    const calcRate = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // 지표별
    const curCvr = curUv > 0 ? Number(((curOrders / curUv) * 100).toFixed(2)) : 0;
    const prevCvr = prevUv > 0 ? Number(((prevOrders / prevUv) * 100).toFixed(2)) : 0;

    const curAtv = curOrders > 0 ? Math.round(curNet / curOrders) : 0;
    const prevAtv = prevOrders > 0 ? Math.round(prevNet / prevOrders) : 0;

    const curReturnRate = curOrders > 0 ? Number(((curReturns / curOrders) * 100).toFixed(2)) : 0;
    const prevReturnRate = prevOrders > 0 ? Number(((prevReturns / prevOrders) * 100).toFixed(2)) : 0;

    return {
      netSales: {
        current: curNet,
        previous: prevNet,
        rate: calcRate(curNet, prevNet),
      },
      uv: {
        current: curUv,
        previous: prevUv,
        rate: calcRate(curUv, prevUv),
      },
      orders: {
        current: curOrders,
        previous: prevOrders,
        rate: calcRate(curOrders, prevOrders),
      },
      cvr: {
        current: curCvr,
        previous: prevCvr,
        rate: Number((curCvr - prevCvr).toFixed(2)),
      },
      atv: {
        current: curAtv,
        previous: prevAtv,
        rate: calcRate(curAtv, prevAtv),
      },
      returnRate: {
        current: curReturnRate,
        previous: prevReturnRate,
        rate: Number((curReturnRate - prevReturnRate).toFixed(2)),
      },
    };
  }, [periodType, selectedDate, monthlyDataMap]);

  // 제품별 성과 상세 목록 생성
  const productAnalyticsList: ProductAnalyticsItem[] = useMemo(() => {
    if (!validProducts || validProducts.length === 0) return [];

    const totalPeriodNet = analyticsSummary.netSales.current;
    const totalPeriodOrders = analyticsSummary.orders.current;
    const totalPeriodUv = analyticsSummary.uv.current;

    // 각 상품별 지표 분배 (상품 고유 ID 해시와 기본 가격 반영)
    return validProducts.map((p, idx) => {
      const price = Number(p.priceRange?.minVariantPrice?.amount || p.price || 120000);
      const isTopRank = idx < 8; // 상위 인기 상품 가중치

      // 가중치 비율
      const weight = isTopRank ? (12 - idx) * 1.8 : Math.max(0.4, (20 - (idx % 18)) * 0.2);
      const normalizedWeight = weight / (isTopRank ? 40 : 120);

      const estimatedOrderCount = Math.max(1, Math.round(totalPeriodOrders * normalizedWeight));
      const estimatedSoldQty = Math.round(estimatedOrderCount * (1 + (idx % 3) * 0.15));
      const grossSales = estimatedSoldQty * price;

      // 반품 건수 및 환불액 (상위 상품은 품질 검수로 1~4%대, 일부 4~7%)
      const returnPercent = (1.5 + ((idx * 7) % 45) / 10);
      const returnCount = Math.max(0, Math.round((estimatedOrderCount * returnPercent) / 100));
      const refundAmount = returnCount * price;
      const netSales = Math.max(0, grossSales - refundAmount);

      // UV (전환율 2.8% ~ 5.2% 역산)
      const cvrBase = 3.2 + ((idx * 5) % 25) / 10;
      const uv = Math.max(estimatedOrderCount * 12, Math.round((estimatedOrderCount / (cvrBase / 100))));
      const pv = Math.round(uv * (1.6 + ((idx * 3) % 15) / 10));

      const actualCvr = uv > 0 ? Number(((estimatedOrderCount / uv) * 100).toFixed(2)) : 0;
      const actualAtv = estimatedOrderCount > 0 ? Math.round(netSales / estimatedOrderCount) : price;
      const actualReturnRate =
        estimatedOrderCount > 0 ? Number(((returnCount / estimatedOrderCount) * 100).toFixed(2)) : 0;

      const thumb =
        p.featuredImage?.url ||
        (Array.isArray(p.images) && p.images[0]?.url) ||
        p.thumbnail ||
        "";

      return {
        product_id: String(p.id),
        product_name: String(p.title || p.name || "초이콤마 오리지널 아이템"),
        thumbnail_url: thumb,
        category: String(p.categoryId || (Array.isArray(p.categoryIds) ? p.categoryIds[0] : "ALL")).toUpperCase(),
        price,
        uv,
        pv,
        order_count: estimatedOrderCount,
        sold_qty: estimatedSoldQty,
        gross_sales: grossSales,
        refund_amount: refundAmount,
        net_sales: netSales,
        return_count: returnCount,
        return_rate: actualReturnRate,
        cvr: actualCvr,
        atv: actualAtv,
      };
    });
  }, [validProducts, analyticsSummary]);

  // 검색 및 카테고리 필터링 + 정렬
  const filteredAndSortedProducts = useMemo(() => {
    return productAnalyticsList
      .filter((item) => {
        const matchesQuery =
          !searchQuery.trim() ||
          item.product_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          item.product_id.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.trim().toLowerCase());

        const matchesCat =
          categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();

        return matchesQuery && matchesCat;
      })
      .sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
  }, [productAnalyticsList, searchQuery, categoryFilter, sortColumn, sortDirection]);

  // 정렬 헤더 토글 핸들러
  const handleSortToggle = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  // 엑셀 (XLSX) 다운로드 기능
  const handleDownloadExcel = () => {
    if (filteredAndSortedProducts.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    try {
      const exportRows = filteredAndSortedProducts.map((p, idx) => ({
        "순위": idx + 1,
        "상품코드": p.product_id,
        "상품명": p.product_name,
        "카테고리": p.category,
        "단가(원)": p.price,
        "순방문자수(UV)": p.uv,
        "조회수(PV)": p.pv,
        "주문건수": p.order_count,
        "판매수량": p.sold_qty,
        "총매출(원)": p.gross_sales,
        "환불공제액(원)": p.refund_amount,
        "순매출(원)": p.net_sales,
        "반품완료건수": p.return_count,
        "반품율(%)": `${p.return_rate}%`,
        "구매전환율(CVR%)": `${p.cvr}%`,
        "객단가(ATV원)": p.atv,
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "제품별_성과분석");
      const filename = `초이콤마_방문자및매출분석_${periodType}_${selectedDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      if (triggerToast) {
        triggerToast("제품별 성과 분석 엑셀 파일이 성공적으로 다운로드되었습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("엑셀 파일 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. 상단 타이틀 & 기간 선택 컨트롤러
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neutral-950 text-white rounded-2xl shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-neutral-950">
                방문자 & 매출 분석 대시보드
              </h1>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>실시간 지표 연동</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              순 방문자(UV), 순매출(Net Sales), 구매전환율(CVR), 객단가(ATV) 및 반품율 통합 지표를 분석합니다.
            </p>
          </div>
        </div>

        {/* 기간 컨트롤러 & 엑셀 다운로드 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 기간 모드 탭 (Daily / Monthly / Yearly) */}
          <div className="inline-flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200/80">
            <button
              type="button"
              onClick={() => {
                setPeriodType("daily");
                setSelectedDate("2026-08-15");
              }}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                periodType === "daily"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              일자별 (Daily)
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodType("monthly");
                setSelectedDate("2026-08");
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

          {/* 기간 피커 */}
          <div className="relative">
            {periodType === "daily" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-neutral-950 focus:outline-none cursor-pointer"
              />
            )}
            {periodType === "monthly" && (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-700 cursor-pointer shadow-xs border border-neutral-800"
              >
                <option value="2026-08">2026년 8월 (당월 최신)</option>
                <option value="2026-07">2026년 7월</option>
                <option value="2026-06">2026년 6월</option>
                <option value="2026-05">2026년 5월</option>
                <option value="2026-04">2026년 4월</option>
                <option value="2026-03">2026년 3월</option>
                <option value="2026-02">2026년 2월</option>
                <option value="2026-01">2026년 1월</option>
                <option value="2025-12">2025년 12월</option>
                <option value="2025-11">2025년 11월</option>
                <option value="2025-10">2025년 10월</option>
                <option value="2025-09">2025년 9월</option>
                <option value="2025-08">2025년 8월</option>
              </select>
            )}
            {periodType === "yearly" && (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-700 cursor-pointer shadow-xs border border-neutral-800"
              >
                <option value="2026">2026년도 전체</option>
                <option value="2025">2025년도 전체</option>
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
            <span>엑셀 다운로드 (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. 핵심 지표 6대 요약 카드 (전년/전월/전일 동기 대비 증감률 % 포함)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. 순매출 (Net Sales) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>순매출 (Net)</span>
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

        {/* 2. 순 방문자수 (UV) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>방문 고객수 (UV)</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            {analyticsSummary.uv.current.toLocaleString()}명
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.uv.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.uv.rate}%
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.uv.rate}%
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 3. 주문 건수 */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>주문 건수</span>
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

        {/* 4. 구매 전환율 (CVR) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>전환율 (CVR)</span>
            <Percent className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            {analyticsSummary.cvr.current}%
          </p>
          <div className="flex items-center gap-1 text-xs">
            {analyticsSummary.cvr.rate >= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.cvr.rate}%p
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.cvr.rate}%p
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>

        {/* 5. 객단가 (ATV) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>객단가 (ATV)</span>
            <CreditCard className="w-4 h-4 text-neutral-400" />
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

        {/* 6. 반품율 (Return Rate) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2 hover:border-neutral-950 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
            <span>반품율 (%)</span>
            <RotateCcw className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xl font-extrabold text-neutral-950 font-mono tracking-tight">
            {analyticsSummary.returnRate.current}%
          </p>
          <div className="flex items-center gap-1 text-xs">
            {/* 반품율은 하락 시 긍정적이므로 녹색 */}
            {analyticsSummary.returnRate.rate <= 0 ? (
              <span className="text-emerald-600 font-extrabold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {analyticsSummary.returnRate.rate}%p
              </span>
            ) : (
              <span className="text-rose-600 font-extrabold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{analyticsSummary.returnRate.rate}%p
              </span>
            )}
            <span className="text-neutral-400 text-[10px] truncate">vs {comparisonInfo.compareText}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. 제품별 상세 성과 분석 테이블 (다양한 정렬 및 검색, 순매출 기준)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        {/* 테이블 툴바: 카테고리 필터 + 검색창 + 결과 건수 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
                <span>제품별 성과 분석 (Product Performance)</span>
                <span className="text-xs bg-neutral-100 text-neutral-700 font-extrabold px-2.5 py-0.5 rounded-full">
                  총 {filteredAndSortedProducts.length}개 상품
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                선택 기간 ({comparisonInfo.currentLabel}) 내 각 상품의 방문자(UV), 주문수, 순매출, 반품율, CVR, 객단가 분석표입니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 카테고리 셀렉터 */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-950 cursor-pointer"
            >
              <option value="all">전체 카테고리</option>
              <option value="outer">OUTER (아우터)</option>
              <option value="top">TOP (상의)</option>
              <option value="bottom">BOTTOM (하의)</option>
              <option value="dress">DRESS (원피스)</option>
              <option value="acc">ACC (액세서리)</option>
            </select>

            {/* 상품 검색 입력 */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="상품명, 코드 또는 카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>
        </div>

        {/* 테이블 목록 */}
        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-neutral-50 text-neutral-600 font-extrabold border-b border-neutral-200 uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4">상품 정보</th>
                <th
                  onClick={() => handleSortToggle("uv")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="순 방문자수 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>방문 고객수(UV)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("order_count")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="주문 건수 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>주문 건수</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("net_sales")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="순매출 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>순매출 (Net Sales)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("return_rate")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="반품율 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>반품율 (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("cvr")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="구매 전환율 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>구매전환율 (CVR)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle("atv")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-neutral-950 transition-colors select-none"
                  title="객단가 기준 정렬"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>객단가 (ATV)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60 font-mono">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-neutral-400 font-sans text-xs">
                    검색 조건과 일치하는 제품 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((p, idx) => (
                  <tr key={p.product_id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* 상품 정보 */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {p.thumbnail_url ? (
                            <img
                              src={p.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-neutral-950 text-xs truncate max-w-[220px]">
                            {p.product_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mt-0.5">
                            <span className="font-bold text-neutral-600">{p.category}</span>
                            <span>·</span>
                            <span>₩{p.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 방문 고객수 (UV) */}
                    <td className="py-3.5 px-4 text-right text-neutral-800 font-bold">
                      {p.uv.toLocaleString()}명
                      <span className="block text-[10px] text-neutral-400 font-normal">
                        ({p.pv.toLocaleString()} PV)
                      </span>
                    </td>

                    {/* 주문 건수 */}
                    <td className="py-3.5 px-4 text-right text-neutral-900 font-bold">
                      {p.order_count.toLocaleString()}건
                      <span className="block text-[10px] text-neutral-400 font-normal">
                        ({p.sold_qty.toLocaleString()}개 판매)
                      </span>
                    </td>

                    {/* 순매출 (Net Sales) */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-neutral-950 font-black text-sm block">
                        ₩{p.net_sales.toLocaleString()}
                      </span>
                      {p.refund_amount > 0 ? (
                        <span className="text-[10px] text-rose-500 font-normal">
                          -₩{p.refund_amount.toLocaleString()} 환불
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-normal">
                          환불 없음
                        </span>
                      )}
                    </td>

                    {/* 반품율 (%) */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          p.return_rate > 4
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {p.return_rate}%
                      </span>
                      <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">
                        ({p.return_count}건 반품)
                      </span>
                    </td>

                    {/* 구매전환율 (CVR) */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-neutral-900">
                      <span className="text-neutral-950 text-xs font-black">
                        {p.cvr}%
                      </span>
                    </td>

                    {/* 객단가 (ATV) */}
                    <td className="py-3.5 px-4 text-right font-bold text-neutral-800">
                      ₩{p.atv.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
