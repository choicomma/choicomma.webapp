"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Ticket,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Receipt,
} from "lucide-react";
import {
  AvailableCoupon,
  CouponUsageRecord,
  getCouponDistributionStatus,
  CouponRecipientStatus,
  restoreCouponByOrder,
} from "@/lib/membership/coupons";

interface CouponRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: AvailableCoupon | null;
  customersList: any[];
  usageHistory: CouponUsageRecord[];
  triggerToast?: (msg: string) => void;
  onUsageHistoryUpdated?: () => void;
}

const ITEMS_PER_PAGE = 15;

export function CouponRecipientsModal({
  isOpen,
  onClose,
  coupon,
  customersList,
  usageHistory,
  triggerToast = () => {},
  onUsageHistoryUpdated,
}: CouponRecipientsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "AVAILABLE" | "EXHAUSTED" | "UNLIMITED">("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<string[]>([]);

  // 아코디언 토글
  const toggleExpandCustomer = (customerId: string) => {
    setExpandedCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  // 관리자 CS: 쿠폰 사용 수동 복구(반환) 핸들러
  const handleRestoreCoupon = (record: CouponUsageRecord) => {
    if (!coupon) return;
    const confirmMsg = `주문번호 [${record.orderId}]에서 사용된 "${record.couponTitle}" 쿠폰을 복구(사용 취소) 처리하시겠습니까?\n\n복구 시 해당 회원은 쿠폰을 다시 사용할 수 있게 됩니다.`;
    if (!window.confirm(confirmMsg)) return;

    const res = restoreCouponByOrder(record.orderId, coupon.id);
    if (res.restored) {
      triggerToast(`주문번호 [${record.orderId}]의 쿠폰 사용이 정상 취소/복구되었습니다.`);
      onUsageHistoryUpdated?.();
    } else {
      triggerToast("쿠폰 복구 처리에 실패했거나 이미 취소된 내역입니다.");
    }
  };

  // 실시간 발급 및 잔여 현황 계산
  const distributionSummary = useMemo(() => {
    if (!coupon) return null;
    return getCouponDistributionStatus(coupon, customersList, usageHistory);
  }, [coupon, customersList, usageHistory]);

  // 검색 및 필터링 적용
  const filteredRecipients = useMemo(() => {
    if (!distributionSummary) return [];

    let list = distributionSummary.recipients;

    // 1. 검색어 (이름, 이메일, 연락처, 회원ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(q);
        const emailMatch = r.email.toLowerCase().includes(q);
        const phoneMatch = r.phone.replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
        const idMatch = r.customerId.toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || idMatch;
      });
    }

    // 2. 상태 필터
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // 3. 등급 필터
    if (gradeFilter !== "all") {
      list = list.filter((r) => {
        const g = String(r.grade || "").toUpperCase();
        return g === gradeFilter.toUpperCase();
      });
    }

    return list;
  }, [distributionSummary, searchQuery, statusFilter, gradeFilter]);

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(filteredRecipients.length / ITEMS_PER_PAGE));
  const paginatedRecipients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecipients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecipients, currentPage]);

  if (!isOpen || !coupon || !distributionSummary) return null;

  // CSV 엑셀 내보내기 핸들러
  const handleExportCsv = () => {
    if (filteredRecipients.length === 0) {
      triggerToast("다운로드할 회원 목록이 없습니다.");
      return;
    }

    const headers = [
      "회원고유번호(ID)",
      "성명",
      "이메일",
      "연락처",
      "회원등급",
      "가입일자",
      "쿠폰발급방식",
      "당월사용횟수",
      "총누적사용횟수",
      "잔여수량",
      "쿠폰상태",
      "최근사용일시",
      "최근주문번호",
    ];

    const rows = filteredRecipients.map((r) => [
      `"${r.customerId}"`,
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.grade}"`,
      `"${r.joinedDate}"`,
      `"${r.totalLimitText}"`,
      `"${r.usedCountInMonth}회"`,
      `"${r.totalUsageCount}회"`,
      `"${r.remainingCount !== null ? `${r.remainingCount}회` : "무제한"}"`,
      `"${r.statusText}"`,
      `"${r.lastUsedAt || "-"}"`,
      `"${r.lastOrderId || "-"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedTitle = coupon.title.replace(/[\/\\?%*:|"<>]/g, "_");
    link.href = url;
    link.download = `쿠폰발급_잔여현황_${sanitizedTitle}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("회원별 쿠폰 현황 CSV 파일이 성공적으로 다운로드되었습니다.");
  };

  const getGradeBadge = (grade: string) => {
    const g = String(grade || "").toUpperCase();
    if (g.includes("VVIP")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
          VVIP
        </span>
      );
    }
    if (g.includes("PLATINUM")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
          PLATINUM
        </span>
      );
    }
    if (g.includes("GOLD")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
          GOLD
        </span>
      );
    }
    if (g.includes("SILVER")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">
          SILVER
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600">
        {grade || "일반"}
      </span>
    );
  };

  const getStatusBadge = (r: CouponRecipientStatus) => {
    if (r.status === "UNLIMITED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200/80">
          <Sparkles className="w-3 h-3 text-purple-600" />
          상시 무제한
        </span>
      );
    }
    if (r.status === "AVAILABLE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {coupon.refreshCycle === "MONTHLY" ? `당월 잔여 ${r.remainingCount}회` : `사용 가능 (1회)`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
        <Clock className="w-3 h-3 text-neutral-400" />
        {coupon.refreshCycle === "MONTHLY" ? "당월 소진 완료" : "사용 완료"}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-neutral-200/80 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 bg-gradient-to-b from-neutral-50/80 to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-md">
                <Ticket className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-neutral-900 text-white">
                    {coupon.discount}
                  </span>
                  {coupon.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      {coupon.badge}
                    </span>
                  )}
                  {coupon.isUnlimited ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                      무제한
                    </span>
                  ) : coupon.refreshCycle === "MONTHLY" ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-blue-600" />
                      매월 1일 {coupon.usageLimitPerMonth || 1}회 갱신
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                      1회성
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                  {coupon.title}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  발급 대상 및 회원별 실시간 잔여 수량 · 사용 현황 관리
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KPI 요약 통계 4종 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-5">
            <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 mb-1">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                <span>총 발급 회원</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-neutral-900">
                {distributionSummary.totalRecipientsCount.toLocaleString()}
                <span className="text-xs font-normal text-neutral-500 ml-1">명</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>사용 가능 (보유)</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700">
                {coupon.isUnlimited
                  ? `${distributionSummary.unlimitedCount.toLocaleString()}`
                  : `${distributionSummary.availableCount.toLocaleString()}`}
                <span className="text-xs font-normal text-emerald-600 ml-1">
                  {coupon.isUnlimited ? "명 (상시)" : "명"}
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>사용 소진/완료</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-neutral-700">
                {distributionSummary.exhaustedCount.toLocaleString()}
                <span className="text-xs font-normal text-neutral-500 ml-1">명</span>
              </div>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/60 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                <span>누적 주문 사용</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-900">
                {distributionSummary.totalUsedCount.toLocaleString()}
                <span className="text-xs font-normal text-amber-700 ml-1">건</span>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 바 */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 bg-white flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* 검색 입력 */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="회원 성명, 이메일, 연락처 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer"
            >
              <option value="all">모든 상태</option>
              <option value="AVAILABLE">사용 가능(보유)</option>
              <option value="EXHAUSTED">사용 완료(소진)</option>
              {coupon.isUnlimited && <option value="UNLIMITED">무제한 이용 회원</option>}
            </select>

            {/* 등급 필터 */}
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer"
            >
              <option value="all">모든 등급</option>
              <option value="VVIP">VVIP</option>
              <option value="PLATINUM">PLATINUM</option>
              <option value="GOLD">GOLD</option>
              <option value="SILVER">SILVER</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          {/* 엑셀 CSV 다운로드 버튼 */}
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-neutral-500 font-medium">
              조회: <strong className="text-neutral-900 font-bold">{filteredRecipients.length}</strong>명
            </span>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀(CSV) 저장
            </button>
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {filteredRecipients.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <Users className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-neutral-600">조건에 일치하는 발급 회원이 없습니다.</p>
              <p className="text-xs text-neutral-400 mt-1">검색어나 필터 조건을 변경해 보세요.</p>
            </div>
          ) : (
            <div className="min-w-full divide-y divide-neutral-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50/80 sticky top-0 z-10 backdrop-blur-xs text-[11px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100">
                  <tr>
                    <th className="py-3 px-4">회원 정보</th>
                    <th className="py-3 px-3">등급</th>
                    <th className="py-3 px-3">발급 주기/한도</th>
                    <th className="py-3 px-3 text-center">쿠폰 잔여 현황</th>
                    <th className="py-3 px-3 text-center">사용 횟수</th>
                    <th className="py-3 px-4">최근 사용 기록 / CS 지원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {paginatedRecipients.map((r, idx) => {
                    const isExpanded = expandedCustomerIds.includes(r.customerId);
                    const records = r.usageRecords || [];
                    const hasRecords = records.length > 0;

                    return (
                      <React.Fragment key={`${r.customerId}-${idx}`}>
                        <tr className={`transition-colors ${isExpanded ? "bg-amber-50/30" : "hover:bg-neutral-50/70"}`}>
                          {/* 회원 기본 정보 */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <span>{r.name}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">({r.customerId})</span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">{r.email}</div>
                            {r.phone && r.phone !== "-" && (
                              <div className="text-[10px] text-neutral-400 mt-0.5">{r.phone}</div>
                            )}
                          </td>

                          {/* 등급 */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {getGradeBadge(r.grade)}
                          </td>

                          {/* 발급 한도 */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-md text-[11px]">
                              {r.totalLimitText}
                            </span>
                          </td>

                          {/* 상태 & 잔여 수량 뱃지 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(r)}
                          </td>

                          {/* 사용 횟수 (당월 / 누적) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="font-bold text-neutral-900">
                              {coupon.refreshCycle === "MONTHLY" ? (
                                <span>
                                  당월 <strong className="text-amber-600">{r.usedCountInMonth}</strong>회{" "}
                                  <span className="text-neutral-400 font-normal">/ 누적 {r.totalUsageCount}회</span>
                                </span>
                              ) : (
                                <span>
                                  누적 <strong className="text-neutral-900">{r.totalUsageCount}</strong>회
                                </span>
                              )}
                            </div>
                            {hasRecords && (
                              <button
                                type="button"
                                onClick={() => toggleExpandCustomer(r.customerId)}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Receipt className="w-2.5 h-2.5 text-neutral-500" />
                                <span>주문 내역 ({records.length}건)</span>
                                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              </button>
                            )}
                          </td>

                          {/* 최근 사용 일시 & 주문번호 */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {r.lastUsedAt ? (
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="font-mono text-[11px] text-neutral-700 font-medium">
                                    {r.lastUsedAt}
                                  </div>
                                  {r.lastOrderId && r.lastOrderId !== "-" && (
                                    <div className="text-[10px] text-neutral-400 font-mono">
                                      주문: {r.lastOrderId}
                                    </div>
                                  )}
                                </div>
                                {hasRecords && !isExpanded && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandCustomer(r.customerId)}
                                    className="text-[10px] text-blue-600 hover:underline font-bold"
                                  >
                                    상세보기
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400">-</span>
                            )}
                          </td>
                        </tr>

                        {/* 상세 사용 이력 서브 로우 (아코디언) */}
                        {isExpanded && hasRecords && (
                          <tr className="bg-neutral-50/80 border-y border-neutral-200/60">
                            <td colSpan={6} className="p-3.5 sm:px-6">
                              <div className="bg-white rounded-xl border border-neutral-200/80 p-3.5 shadow-xs space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 pb-2 border-b border-neutral-100">
                                  <div className="flex items-center gap-1.5">
                                    <Receipt className="w-4 h-4 text-amber-600" />
                                    <span>[{r.name}] 회원의 쿠폰 주문 사용 이력 ({records.length}건)</span>
                                  </div>
                                  <span className="text-[11px] text-neutral-500 font-normal">
                                    주문 취소/고객 요청 시 우측의 <strong>[쿠폰 복구]</strong> 버튼으로 즉시 환급할 수 있습니다.
                                  </span>
                                </div>

                                <div className="divide-y divide-neutral-100 text-[11px]">
                                  {records.map((rec, rIdx) => (
                                    <div
                                      key={`${rec.id}-${rIdx}`}
                                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-[10px]">
                                            주문번호 {rec.orderId}
                                          </span>
                                          <span className="font-mono text-neutral-500 text-[11px]">
                                            {rec.usedAt}
                                          </span>
                                        </div>
                                        <div className="text-neutral-600 mt-1">
                                          구매 상품: <span className="font-semibold text-neutral-800">{rec.orderItemsSummary || "상품 결제"}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                          <div className="font-mono font-black text-rose-600 text-xs">
                                            -{(rec.discountAmount || 0).toLocaleString()}원 할인
                                          </div>
                                          {rec.orderTotalAmount ? (
                                            <div className="text-[10px] text-neutral-400 font-mono">
                                              주문금액: {rec.orderTotalAmount.toLocaleString()}원
                                            </div>
                                          ) : null}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleRestoreCoupon(rec)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer shadow-xs"
                                          title="주문 취소 등으로 인한 쿠폰 1회 복구"
                                        >
                                          <RotateCcw className="w-3 h-3 text-amber-600" />
                                          <span>쿠폰 복구 (환급)</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 모달 하단 페이지네이션 및 닫기 버튼 */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-500">
            총 <strong className="text-neutral-900">{filteredRecipients.length}</strong>명 중{" "}
            {filteredRecipients.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecipients.length)}명 표시 (페이지 {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-neutral-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-xs transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="ml-3 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
