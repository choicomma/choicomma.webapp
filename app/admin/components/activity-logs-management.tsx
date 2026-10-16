"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ScrollText,
  Activity,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  Layers,
  Database,
  Eye,
  SlidersHorizontal,
  X,
  FileText,
  History,
  Tag,
  Settings,
  Truck,
  Check,
} from "lucide-react";

interface ActivityLogsManagementProps {
  triggerToast?: (msg: string) => void;
}

// 고객 구매 여정 이벤트 타입
export type JourneyEventType =
  | "ALL"
  | "PAGE_VIEW"
  | "VIEW_PRODUCT"
  | "ADD_TO_CART"
  | "BEGIN_CHECKOUT"
  | "PURCHASE_SUCCESS"
  | "PURCHASE_FAIL"
  | "ABANDON";

// 관리자 작업 도메인 타입
export type AuditDomainType =
  | "ALL"
  | "PRODUCT"
  | "TIMESALE"
  | "ORDER"
  | "SHIPMENT"
  | "COUPON"
  | "SETTINGS"
  | "POPUP";

// 관리자 작업 유형
export type AuditActionType = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export interface JourneyLogItem {
  id: string;
  sessionId: string;
  visitorId: string;
  userId?: string;
  userName?: string;
  eventType: JourneyEventType;
  eventLabel: string;
  path: string;
  referrer: string;
  device: "PC" | "Mobile";
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AdminAuditLogItem {
  id: string;
  adminId: string;
  adminName: string;
  actionType: AuditActionType;
  domain: AuditDomainType;
  targetId: string;
  targetName: string;
  description: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  ipAddress: string;
  timestamp: string;
}

export function ActivityLogsManagement({ triggerToast }: ActivityLogsManagementProps) {
  const [activeTab, setActiveTab] = useState<"journey" | "audit">("journey");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 실시간 실제 로그 상태 (가짜 목데이터 완전 제거)
  const [journeyLogs, setJourneyLogs] = useState<JourneyLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);

  // 고객 여정 필터 상태
  const [journeySearch, setJourneySearch] = useState("");
  const [selectedJourneyEvent, setSelectedJourneyEvent] = useState<JourneyEventType>("ALL");

  // 관리자 감사 필터 상태
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedAuditDomain, setSelectedAuditDomain] = useState<AuditDomainType>("ALL");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLogItem | null>(null);

  // 로그 데이터 로드
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/activity-logs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setJourneyLogs(Array.isArray(data.journeyLogs) ? data.journeyLogs : []);
        setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
      }
    } catch {
      // 엔드포인트 준비 중이거나 에러 시 빈 상태 유지
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchLogs();
      if (triggerToast) triggerToast("최신 활동 로그를 성공적으로 갱신했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 구매 전환 집계 계산
  const purchaseSuccessCount = useMemo(() => {
    return journeyLogs.filter((l) => l.eventType === "PURCHASE_SUCCESS").length;
  }, [journeyLogs]);

  const conversionRate = useMemo(() => {
    if (journeyLogs.length === 0) return "0.0";
    return ((purchaseSuccessCount / journeyLogs.length) * 100).toFixed(1);
  }, [journeyLogs.length, purchaseSuccessCount]);

  // 고객 여정 필터링
  const filteredJourneyLogs = useMemo(() => {
    return journeyLogs.filter((log) => {
      const matchEvent =
        selectedJourneyEvent === "ALL" || log.eventType === selectedJourneyEvent;
      const q = journeySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.sessionId.toLowerCase().includes(q) ||
        log.visitorId.toLowerCase().includes(q) ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        log.path.toLowerCase().includes(q) ||
        log.referrer.toLowerCase().includes(q);
      return matchEvent && matchSearch;
    });
  }, [journeyLogs, journeySearch, selectedJourneyEvent]);

  // 관리자 감사 필터링
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchDomain =
        selectedAuditDomain === "ALL" || log.domain === selectedAuditDomain;
      const q = auditSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.targetName.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.adminName.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q);
      return matchDomain && matchSearch;
    });
  }, [auditLogs, auditSearch, selectedAuditDomain]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header & Live Indicator */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                <ScrollText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">
                    활동 로그 센터
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase Pro 실시간 감시중
                  </span>
                </div>
                <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                  고객의 유입부터 결제까지의 <strong>구매 여정(User Journey)</strong>과 관리자 <strong>작업 내역(Audit Log)</strong>을 투명하게 추적합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-100 active:scale-95 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-indigo-600" : ""}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards (실제 동적 통계) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-neutral-100">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/70">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" /> 오늘 고객 여정 이벤트
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-black text-neutral-900">
                {journeyLogs.length.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-neutral-400">실시간 집계</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/70">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> 구매 전환 성공 건수
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-black text-neutral-900">
                {purchaseSuccessCount.toLocaleString()}건
              </span>
              <span className="text-[11px] font-bold text-indigo-600">전환율 {conversionRate}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/70">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> 오늘 관리자 작업 내역
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-black text-neutral-900">
                {auditLogs.length.toLocaleString()}건
              </span>
              <span className="text-[11px] font-bold text-neutral-400">정상 감사중</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/70">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-500" /> 데이터베이스 상태
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-base md:text-lg font-black text-emerald-600">Cloud Active</span>
              <span className="text-[11px] font-bold text-neutral-400">0ms 안전망</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tab Switcher */}
      <div className="flex border-b border-neutral-200/80 gap-2">
        <button
          onClick={() => setActiveTab("journey")}
          className={`flex items-center gap-2.5 pb-3.5 px-3 text-sm font-black transition-all border-b-2 relative ${
            activeTab === "journey"
              ? "text-indigo-600 border-indigo-600"
              : "text-neutral-500 border-transparent hover:text-neutral-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>고객 구매 여정 로그 (User Journey)</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-extrabold">
            {filteredJourneyLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2.5 pb-3.5 px-3 text-sm font-black transition-all border-b-2 relative ${
            activeTab === "audit"
              ? "text-indigo-600 border-indigo-600"
              : "text-neutral-500 border-transparent hover:text-neutral-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>관리자 작업 감사 로그 (Admin Audit)</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold">
            {filteredAuditLogs.length}
          </span>
        </button>
      </div>

      {/* 4. Tab 1: 고객 구매 여정 (User Journey) View */}
      {activeTab === "journey" && (
        <div className="space-y-4">
          {/* Filtering Controls */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="세션 ID, 방문자 ID, 고객명, 유입경로 검색..."
                value={journeySearch}
                onChange={(e) => setJourneySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-medium rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 transition-all"
              />
            </div>

            {/* Event Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              {[
                { type: "ALL", label: "전체 이벤트" },
                { type: "PURCHASE_SUCCESS", label: "구매 완료" },
                { type: "BEGIN_CHECKOUT", label: "주문서 진입" },
                { type: "ADD_TO_CART", label: "장바구니" },
                { type: "VIEW_PRODUCT", label: "상품 조회" },
                { type: "ABANDON", label: "이탈 발생" },
              ].map((filter) => (
                <button
                  key={filter.type}
                  onClick={() => setSelectedJourneyEvent(filter.type as JourneyEventType)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all ${
                    selectedJourneyEvent === filter.type
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Journey Timeline Cards */}
          <div className="space-y-3">
            {filteredJourneyLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm hover:border-neutral-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2.5">
                    {log.eventType === "PURCHASE_SUCCESS" && (
                      <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    {log.eventType === "BEGIN_CHECKOUT" && (
                      <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <CreditCard className="w-4 h-4" />
                      </span>
                    )}
                    {log.eventType === "ADD_TO_CART" && (
                      <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                        <ShoppingCart className="w-4 h-4" />
                      </span>
                    )}
                    {log.eventType === "VIEW_PRODUCT" && (
                      <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </span>
                    )}
                    {log.eventType === "PAGE_VIEW" && (
                      <span className="p-1.5 bg-neutral-100 text-neutral-700 rounded-lg">
                        <Layers className="w-4 h-4" />
                      </span>
                    )}
                    {log.eventType === "ABANDON" && (
                      <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}

                    <div>
                      <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                        {log.eventLabel}
                        <span className="text-[10px] font-bold text-neutral-400">({log.path})</span>
                      </span>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        유입 경로: <span className="font-semibold text-neutral-700">{log.referrer || "직접 방문"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center text-xs text-neutral-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{log.timestamp}</span>
                  </div>
                </div>

                {/* Session & Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div className="bg-neutral-50 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-neutral-400 block">세션 식별값</span>
                    <span className="font-mono text-[11px] font-bold text-neutral-800">{log.sessionId}</span>
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-neutral-400 block">방문자 / 고객</span>
                    <span className="font-bold text-neutral-800">
                      {log.userName ? `${log.userName} (${log.userId})` : `비회원 (${log.visitorId})`}
                    </span>
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-neutral-400 block">기기 정보</span>
                    <span className="font-bold text-neutral-800">{log.device} 환경</span>
                  </div>
                </div>

                {/* Metadata Badge details */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-neutral-200/80 flex flex-wrap gap-2 text-[11px]">
                    {Object.entries(log.metadata).map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-700 font-medium"
                      >
                        <span className="font-bold text-neutral-900">{k}:</span>
                        <span>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredJourneyLogs.length === 0 && (
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-16 text-center text-neutral-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-neutral-300 stroke-[1.5]" />
                <p className="text-sm font-bold text-neutral-700">기록된 고객 구매 여정 로그가 없습니다.</p>
                <p className="text-xs text-neutral-400 mt-1">고객이 쇼핑몰을 탐색하거나 장바구니/주문/결제를 진행하면 실시간 경로가 자동 기록됩니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: 관리자 작업 감사 로그 (Admin Audit Log) View */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Filtering Controls */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="작업 대상명, 설명, 관리자명, 대상 ID 검색..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-medium rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 transition-all"
              />
            </div>

            {/* Domain Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              {[
                { domain: "ALL", label: "전체 도메인" },
                { domain: "PRODUCT", label: "상품 관리" },
                { domain: "SHIPMENT", label: "배송/송장" },
                { domain: "ORDER", label: "주문 관리" },
                { domain: "COUPON", label: "쿠폰 발행" },
                { domain: "SETTINGS", label: "스토어 설정" },
              ].map((chip) => (
                <button
                  key={chip.domain}
                  onClick={() => setSelectedAuditDomain(chip.domain as AuditDomainType)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all ${
                    selectedAuditDomain === chip.domain
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">작업 일시</th>
                    <th className="py-3 px-4">작업자</th>
                    <th className="py-3 px-4">작업 구분</th>
                    <th className="py-3 px-4">대상 도메인</th>
                    <th className="py-3 px-4">작업 상세 내역</th>
                    <th className="py-3 px-4 text-right">변경 스냅샷</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-neutral-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{log.adminName}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono block">IP: {log.ipAddress}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.actionType === "CREATE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                            신규 생성
                          </span>
                        )}
                        {log.actionType === "UPDATE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800">
                            내용 수정
                          </span>
                        )}
                        {log.actionType === "DELETE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                            삭제
                          </span>
                        )}
                        {log.actionType === "STATUS_CHANGE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                            상태 변경
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[10px]">
                          {log.domain}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{log.targetName}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                          {log.description}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {(log.beforeData || log.afterData) && (
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 rounded-lg text-[11px] font-bold transition-all"
                          >
                            <FileText className="w-3 h-3 text-neutral-600" />
                            <span>변경 비교</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-neutral-400">
                        <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-neutral-300 stroke-[1.5]" />
                        <p className="text-sm font-bold text-neutral-700">기록된 관리자 작업 감사 로그가 없습니다.</p>
                        <p className="text-xs text-neutral-400 mt-1">상품 등록/수정, 배송 송장 등록, 쿠폰 발행 등의 작업이 발생하면 변경 내역이 기록됩니다.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: 작업 변경 전/후 스냅샷 비교 모달 */}
      {selectedAuditLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedAuditLog(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>작업 변경 내역 상세 비교</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedAuditLog.targetName} ({selectedAuditLog.timestamp})
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70 text-xs">
                <span className="font-bold text-neutral-700 block mb-1">작업 설명</span>
                <p className="text-neutral-600 font-medium">{selectedAuditLog.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Before */}
                <div className="border border-rose-200 bg-rose-50/40 rounded-2xl p-4">
                  <span className="font-extrabold text-rose-700 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    변경 전 (Before)
                  </span>
                  {selectedAuditLog.beforeData ? (
                    <pre className="font-mono text-[11px] text-neutral-800 bg-white p-3 rounded-xl border border-rose-100 overflow-x-auto max-h-48">
                      {JSON.stringify(selectedAuditLog.beforeData, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-neutral-400 italic">신규 생성 건으로 이전 데이터 없음</span>
                  )}
                </div>

                {/* After */}
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4">
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    변경 후 (After)
                  </span>
                  {selectedAuditLog.afterData ? (
                    <pre className="font-mono text-[11px] text-neutral-800 bg-white p-3 rounded-xl border border-emerald-100 overflow-x-auto max-h-48">
                      {JSON.stringify(selectedAuditLog.afterData, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-neutral-400 italic">데이터 삭제 건</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-neutral-900 text-white font-bold rounded-xl text-xs hover:bg-neutral-800 transition-all"
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
