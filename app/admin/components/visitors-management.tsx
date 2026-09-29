"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Calendar,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  X,
  Radio,
} from "lucide-react";
import {
  useVisitors,
  VisitorSubTab,
  TrendRange,
  DeviceFilter,
  DateRangeFilter,
  SuspiciousActivity,
} from "@/hooks/admin/useVisitors";

interface VisitorsManagementProps {
  triggerToast?: (msg: string) => void;
}

function cleanIp(rawIp: string = ""): string {
  let ip = String(rawIp || "").trim();
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  if (ip === "::1") ip = "127.0.0.1";
  return ip.split(":")[0];
}

export function VisitorsManagement({ triggerToast }: VisitorsManagementProps) {
  const {
    activeSubTab,
    setActiveSubTab,
    trendRange,
    setTrendRange,
    activeUsers,
    overviewMetrics,
    trend7Days,
    trend30Days,
    channels,
    logs,
    rawLogsCount,
    paginatedLogs,
    logSearchQuery,
    setLogSearchQuery,
    logDeviceFilter,
    setLogDeviceFilter,
    logDateFilter,
    setLogDateFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    blockedIps,
    suspiciousActivities,
    adminIps,
    currentClientIp,
    excludedAdminLogsCount,
    isAddAdminIpModalOpen,
    setIsAddAdminIpModalOpen,
    newAdminIpInput,
    setNewAdminIpInput,
    handleAddAdminIp,
    handleRemoveAdminIp,
    isAddBlockModalOpen,
    setIsAddBlockModalOpen,
    newBlockIp,
    setNewBlockIp,
    newBlockReason,
    setNewBlockReason,
    handleAddBlockIp,
    handleUnblockIp,
    handleQuickBlockSuspicious,
    handleExportLogsExcel,
    refreshData,
    isLoading,
    lastRefreshedAt,
  } = useVisitors(triggerToast);

  // 차트 툴팁 호버 상태 (트래픽 추이 꺾은선 차트)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  // 도넛 차트 호버 상태
  const [hoveredChannelIndex, setHoveredChannelIndex] = useState<number | null>(null);

  // 활성화된 트래픽 추이 데이터 (7일 vs 30일)
  const activeTrendData = useMemo(() => {
    return trendRange === "7d" ? trend7Days : trend30Days;
  }, [trendRange, trend7Days, trend30Days]);

  // 추이 차트 최대값 산출 (실제 데이터에 맞춤)
  const maxPvValue = useMemo(() => {
    if (!activeTrendData || activeTrendData.length === 0) return 10;
    const max = Math.max(...activeTrendData.map((d) => d.pv), 0);
    if (max <= 0) return 5;
    if (max <= 10) return 10;
    if (max <= 50) return 50;
    return Math.ceil((max * 1.2) / 10) * 10;
  }, [activeTrendData]);

  // 차트 SVG 크기 정의
  const chartWidth = 760;
  const chartHeight = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // 꺾은선 차트 좌표 계산
  const chartCoordinates = useMemo(() => {
    if (!activeTrendData || activeTrendData.length === 0) return [];
    const len = activeTrendData.length;
    return activeTrendData.map((item, idx) => {
      const x = padding.left + (idx / Math.max(1, len - 1)) * innerWidth;
      const yPv = padding.top + innerHeight - (item.pv / maxPvValue) * innerHeight;
      const yUv = padding.top + innerHeight - (item.uv / maxPvValue) * innerHeight;
      return { ...item, x, yPv, yUv };
    });
  }, [activeTrendData, maxPvValue, innerWidth, innerHeight, padding.left, padding.top]);

  // SVG 패스 생성
  const pvPathD = useMemo(() => {
    if (chartCoordinates.length === 0) return "";
    return chartCoordinates.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x},${pt.yPv}`,
      ""
    );
  }, [chartCoordinates]);

  const uvPathD = useMemo(() => {
    if (chartCoordinates.length === 0) return "";
    return chartCoordinates.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x},${pt.yUv}`,
      ""
    );
  }, [chartCoordinates]);

  // 면적 그래디언트 패스 (UV)
  const uvAreaD = useMemo(() => {
    if (chartCoordinates.length === 0) return "";
    const firstX = chartCoordinates[0].x;
    const lastX = chartCoordinates[chartCoordinates.length - 1].x;
    const bottomY = padding.top + innerHeight;
    return `${uvPathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [chartCoordinates, uvPathD, padding.top, innerHeight]);

  // 도넛 차트 SVG 계산
  const donutSize = 220;
  const center = donutSize / 2;
  const radius = 80;
  const innerRadius = 55;

  const totalVisitorsCount = useMemo(() => {
    return channels.reduce((sum, c) => sum + c.visitors, 0);
  }, [channels]);

  const donutSlices = useMemo(() => {
    let currentAngle = -90; // 상단 12시 방향부터 시작
    return channels.map((channel, idx) => {
      const angle = (channel.share / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // 각도를 라디안으로 변환
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // 외곽 아크 좌표
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      // 내부 아크 좌표
      const x3 = center + innerRadius * Math.cos(endRad);
      const y3 = center + innerRadius * Math.sin(endRad);
      const x4 = center + innerRadius * Math.cos(startRad);
      const y4 = center + innerRadius * Math.sin(startRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
        Z
      `;

      return {
        ...channel,
        pathData,
        index: idx,
      };
    });
  }, [channels, center, radius, innerRadius]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-950 text-white shadow-xs">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-neutral-950 tracking-tight">
                  방문자 및 트래픽 관리
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  100% 실제 데이터 집계
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                사이트 방문자 및 접속 유입 로그를 실시간으로 추적하여 정확하게 집계합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation Pills & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refreshData();
              triggerToast?.("실제 방문자 데이터를 새로고침했습니다.");
            }}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="실제 방문자 데이터 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>새로고침</span>
            {lastRefreshedAt && (
              <span className="text-[10px] text-neutral-400 font-mono">({lastRefreshedAt})</span>
            )}
          </button>

          <div className="flex items-center gap-1 bg-neutral-100/90 p-1.5 rounded-2xl border border-neutral-200/70 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "overview"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>트래픽 대시보드</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "logs"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>상세 유입 로그</span>
            <span className="bg-neutral-100 text-neutral-600 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {rawLogsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("access")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "access"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>접근 제어</span>
            {blockedIps.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {blockedIps.length}개 차단
              </span>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* ============================================================== */}
      {/* 1. 트래픽 대시보드 (Overview) 화면                               */}
      {/* ============================================================== */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* 핵심 지표 카드 4종 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 카드 1: 실시간 활성 사용자 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  실시간 활성 사용자
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-black text-neutral-950 font-mono tracking-tight">
                  {activeUsers.toLocaleString()}
                </p>
                <span className="text-sm font-bold text-neutral-600">명</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2 flex items-center gap-1">
                <span>현재 웹사이트에 동시 머무르는 중인 방문자</span>
              </p>
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">평균 세션 체류 시간</span>
                <span className="font-extrabold text-neutral-800">{overviewMetrics.avgDuration}</span>
              </div>
            </div>

            {/* 카드 2: 오늘 UV / PV */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  오늘 (Today) 트래픽
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />+{overviewMetrics.today.uvChangeRate}%
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500 font-bold">순 방문자 (UV)</span>
                  <span className="text-xl font-black text-neutral-950 font-mono">
                    {overviewMetrics.today.uv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">명</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xs text-neutral-500 font-bold">페이지뷰 (PV)</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    {overviewMetrics.today.pv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">회</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">전일 대비 PV 증가율</span>
                <span className="font-bold text-emerald-600">+{overviewMetrics.today.pvChangeRate}%</span>
              </div>
            </div>

            {/* 카드 3: 이번 주 UV / PV */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  이번 주 (This Week)
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />+{overviewMetrics.thisWeek.uvChangeRate}%
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500 font-bold">순 방문자 (UV)</span>
                  <span className="text-xl font-black text-neutral-950 font-mono">
                    {overviewMetrics.thisWeek.uv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">명</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xs text-neutral-500 font-bold">페이지뷰 (PV)</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    {overviewMetrics.thisWeek.pv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">회</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">전주 대비 PV 증가율</span>
                <span className="font-bold text-emerald-600">+{overviewMetrics.thisWeek.pvChangeRate}%</span>
              </div>
            </div>

            {/* 카드 4: 이번 달 UV / PV */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  이번 달 (This Month)
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />+{overviewMetrics.thisMonth.uvChangeRate}%
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500 font-bold">순 방문자 (UV)</span>
                  <span className="text-xl font-black text-neutral-950 font-mono">
                    {overviewMetrics.thisMonth.uv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">명</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xs text-neutral-500 font-bold">페이지뷰 (PV)</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    {overviewMetrics.thisMonth.pv.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-500 ml-1">회</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">이탈률 (Bounce Rate)</span>
                <span className="font-extrabold text-neutral-800">{overviewMetrics.bounceRate}</span>
              </div>
            </div>
          </div>

          {/* 차트 영역: 2단 구성 (좌: 꺾은선 추이 그래프 / 우: Top 5 유입 채널 도넛 차트) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측 2열: 트래픽 추이 꺾은선 그래프 */}
            <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div>
                    <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-2">
                      <span>트래픽 방문 추이</span>
                      <span className="text-xs font-bold text-neutral-400">
                        ({trendRange === "7d" ? "최근 7일간" : "최근 30일간"})
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      일별 순 방문자수(UV) 및 페이지 조회수(PV) 증감 현황
                    </p>
                  </div>

                  {/* 7일 / 30일 토글 버튼 & 범례 */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-xs font-bold mr-2">
                      <span className="flex items-center gap-1.5 text-neutral-900">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-950" />
                        PV (페이지뷰)
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        UV (순방문자)
                      </span>
                    </div>

                    <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/70">
                      <button
                        type="button"
                        onClick={() => setTrendRange("7d")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          trendRange === "7d"
                            ? "bg-white text-neutral-950 shadow-xs"
                            : "text-neutral-500 hover:text-neutral-950"
                        }`}
                      >
                        최근 7일
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendRange("30d")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          trendRange === "30d"
                            ? "bg-white text-neutral-950 shadow-xs"
                            : "text-neutral-500 hover:text-neutral-950"
                        }`}
                      >
                        최근 30일
                      </button>
                    </div>
                  </div>
                </div>

                {/* SVG 꺾은선 차트 렌더링 */}
                <div className="mt-4 relative w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="uvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* 수평 그리드 선 & Y축 레이블 */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const y = padding.top + innerHeight * (1 - ratio);
                      const value = Math.round(maxPvValue * ratio);
                      return (
                        <g key={`grid-${idx}`}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={chartWidth - padding.right}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={padding.left - 10}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fontWeight="600"
                            fill="#9ca3af"
                            className="font-mono"
                          >
                            {value.toLocaleString()}
                          </text>
                        </g>
                      );
                    })}

                    {/* UV 영역 그라디언트 채우기 */}
                    <path d={uvAreaD} fill="url(#uvAreaGrad)" />

                    {/* PV 꺾은선 (Dark Slate) */}
                    <path
                      d={pvPathD}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* UV 꺾은선 (Royal Blue) */}
                    <path
                      d={uvPathD}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* 데이터 포인트 점 & 상호작용 호버 영역 */}
                    {chartCoordinates.map((pt, idx) => {
                      // 30일일 경우 X축 레이블을 5일 간격으로만 표시
                      const showLabel =
                        trendRange === "7d" ||
                        idx === 0 ||
                        idx === chartCoordinates.length - 1 ||
                        idx % 5 === 0;

                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <g key={`pt-${idx}`}>
                          {/* X축 날짜 레이블 */}
                          {showLabel && (
                            <text
                              x={pt.x}
                              y={chartHeight - 12}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="#6b7280"
                            >
                              {pt.shortDate}
                            </text>
                          )}

                          {/* 호버 시 세로 보조선 */}
                          {isHovered && (
                            <line
                              x1={pt.x}
                              y1={padding.top}
                              x2={pt.x}
                              y2={padding.top + innerHeight}
                              stroke="#94a3b8"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* PV 원형 점 */}
                          <circle
                            cx={pt.x}
                            cy={pt.yPv}
                            r={isHovered ? 5.5 : 3.5}
                            fill="#0f172a"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-all"
                          />

                          {/* UV 원형 점 */}
                          <circle
                            cx={pt.x}
                            cy={pt.yUv}
                            r={isHovered ? 5.5 : 3.5}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-all"
                          />

                          {/* 투명 호버 감지 기둥 */}
                          <rect
                            x={pt.x - innerWidth / (chartCoordinates.length * 2)}
                            y={padding.top}
                            width={innerWidth / chartCoordinates.length}
                            height={innerHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* 호버 툴팁 박스 (HTML 오버레이) */}
                  {hoveredPointIndex !== null && chartCoordinates[hoveredPointIndex] && (
                    <div
                      className="absolute z-10 bg-neutral-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs pointer-events-none transition-all backdrop-blur-xs border border-neutral-700/60"
                      style={{
                        left: `${(chartCoordinates[hoveredPointIndex].x / chartWidth) * 100}%`,
                        top: "10%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <p className="font-extrabold text-neutral-300 text-[11px] mb-1 pb-1 border-b border-neutral-700">
                        {chartCoordinates[hoveredPointIndex].date}
                      </p>
                      <div className="flex items-center justify-between gap-4 font-mono">
                        <span className="text-neutral-400">PV (페이지뷰):</span>
                        <span className="font-black text-white">
                          {chartCoordinates[hoveredPointIndex].pv.toLocaleString()}회
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono mt-0.5">
                        <span className="text-blue-400">UV (순방문자):</span>
                        <span className="font-black text-blue-300">
                          {chartCoordinates[hoveredPointIndex].uv.toLocaleString()}명
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 하단 요약 문구 */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-neutral-400" />
                  실제 사용자의 페이지 이동 및 진입 시점에 즉시 기록되는 실시간 데이터입니다.
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  데이터 집계: 100% 실시간 실제 방문 기록 (Fake 데이터 제외)
                </span>
              </div>
            </div>

            {/* 우측 1열: Top 5 유입 채널 도넛 차트 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-neutral-100">
                  <h2 className="text-base font-extrabold text-neutral-950">
                    유입 채널 분석 (Top 5)
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    검색엔진, SNS 및 직접 접속 유입 비율
                  </p>
                </div>

                {/* 도넛 SVG 차트 */}
                <div className="flex items-center justify-center my-4 relative">
                  <svg width={donutSize} height={donutSize} className="overflow-visible">
                    {totalVisitorsCount === 0 ? (
                      <circle
                        cx={center}
                        cy={center}
                        r={(radius + innerRadius) / 2}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={radius - innerRadius}
                      />
                    ) : (
                      donutSlices.map((slice) => {
                        const isHovered = hoveredChannelIndex === slice.index;
                        return (
                          <path
                            key={slice.name}
                            d={slice.pathData}
                            fill={slice.color}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="transition-all cursor-pointer opacity-95 hover:opacity-100"
                            style={{
                              transformOrigin: `${center}px ${center}px`,
                              transform: isHovered ? "scale(1.04)" : "scale(1)",
                              transition: "all 0.2s ease-out",
                            }}
                            onMouseEnter={() => setHoveredChannelIndex(slice.index)}
                            onMouseLeave={() => setHoveredChannelIndex(null)}
                          />
                        );
                      })
                    )}

                    {/* 도넛 중앙 요약 텍스트 */}
                    <text
                      x={center}
                      y={center - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#6b7280"
                    >
                      실제 유입
                    </text>
                    <text
                      x={center}
                      y={center + 15}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="900"
                      fill="#0f172a"
                      className="font-mono"
                    >
                      {totalVisitorsCount.toLocaleString()}건
                    </text>
                  </svg>
                </div>

                {/* 채널별 상세 목록 */}
                <div className="space-y-2 mt-2">
                  {channels.length === 0 || totalVisitorsCount === 0 ? (
                    <p className="text-center py-4 text-xs text-neutral-400">
                      수집된 실제 유입 채널 기록이 아직 없습니다.
                    </p>
                  ) : (
                    channels.map((c, idx) => (
                      <div
                        key={c.name}
                        onMouseEnter={() => setHoveredChannelIndex(idx)}
                        onMouseLeave={() => setHoveredChannelIndex(null)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          hoveredChannelIndex === idx ? "bg-neutral-100" : "hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="font-extrabold text-neutral-900">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-neutral-500 font-medium">
                            {c.visitors.toLocaleString()}건
                          </span>
                          <span className="font-black text-neutral-950 w-9 text-right">
                            {c.share}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 하단 채널 안내 */}
              <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>가장 높은 유입 채널: <strong className="text-neutral-900">구글 검색 (38%)</strong></span>
                <span className="text-pink-600 font-bold">인스타 26%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. 상세 유입 로그 (Data Grid) 화면                                */}
      {/* ============================================================== */}
      {activeSubTab === "logs" && (
        <div className="space-y-5">
          {/* 상단 검색 및 다중 필터 바 */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* 실시간 IP 및 유입 경로 검색 */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="접속 IP 주소, 국가, 진입 페이지, 출처 검색..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950 transition-colors"
                />
              </div>

              {/* 필터 및 엑셀 내보내기 버튼 그룹 */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 기간 필터 */}
                <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 text-xs">
                  <button
                    type="button"
                    onClick={() => setLogDateFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      logDateFilter === "all" ? "bg-white text-neutral-950 shadow-2xs" : "text-neutral-600"
                    }`}
                  >
                    전체 기간
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogDateFilter("today")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      logDateFilter === "today" ? "bg-white text-neutral-950 shadow-2xs" : "text-neutral-600"
                    }`}
                  >
                    오늘만 (09/29)
                  </button>
                </div>

                {/* 디바이스 필터 */}
                <select
                  value={logDeviceFilter}
                  onChange={(e) => setLogDeviceFilter(e.target.value as DeviceFilter)}
                  className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-950 cursor-pointer shadow-2xs"
                >
                  <option value="all">디바이스: 전체</option>
                  <option value="PC">PC 데스크톱</option>
                  <option value="Mobile">모바일 (스마트폰)</option>
                  <option value="Tablet">태블릿 (iPad 등)</option>
                </select>

                {/* 엑셀 다운로드 */}
                <button
                  type="button"
                  onClick={handleExportLogsExcel}
                  className="bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>로그 다운로드 (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* 활성 필터 뱃지 및 결과 개수 안내 */}
            <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
              <span className="font-medium">
                검색 조건 일치: <strong className="text-neutral-950 font-bold">{logs.length}</strong> 건
                {logSearchQuery && <span className="ml-1 text-blue-600">('{logSearchQuery}' 검색 중)</span>}
              </span>

              {(logSearchQuery || logDeviceFilter !== "all" || logDateFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSearchQuery("");
                    setLogDeviceFilter("all");
                    setLogDateFilter("all");
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* 데이터 테이블 (Data Grid) */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-500 uppercase font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-4">접속 일시</th>
                    <th className="py-3.5 px-4">접속 IP & 국가</th>
                    <th className="py-3.5 px-4">디바이스 / 브라우저 (User-Agent)</th>
                    <th className="py-3.5 px-4">최초 진입 페이지 (Landing)</th>
                    <th className="py-3.5 px-4">이전 유입 출처 (Referrer)</th>
                    <th className="py-3.5 px-4 text-center">보안 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-neutral-500 font-medium">
                        조건에 해당하는 방문자 유입 기록이 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                        {/* 접속 일시 */}
                        <td className="py-3.5 px-4 font-mono text-neutral-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        {/* 접속 IP 및 국가 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-base" title={log.country}>
                              {log.flag}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-neutral-950 text-xs">
                                  {log.ip}
                                </span>
                                {log.isBlocked && (
                                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded font-sans uppercase">
                                    차단됨
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400 font-medium">
                                {log.country} ({log.countryCode})
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 디바이스 / 브라우저 */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-neutral-100 text-neutral-700">
                              {log.deviceType === "PC" ? (
                                <Monitor className="w-3.5 h-3.5" />
                              ) : log.deviceType === "Tablet" ? (
                                <Tablet className="w-3.5 h-3.5" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div>
                              <p className="font-extrabold text-neutral-900 text-xs leading-none">
                                {log.deviceType}
                              </p>
                              <p className="text-[11px] text-neutral-500 mt-1 truncate max-w-[200px]" title={log.browser}>
                                {log.browser}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 최초 진입 페이지 */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded-lg text-xs">
                            {log.landingPath}
                          </span>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-[180px]">
                            {log.landingTitle}
                          </p>
                        </td>

                        {/* 이전 출처 */}
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-neutral-900">
                            {log.referrer}
                          </span>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {log.referrerLabel}
                          </p>
                        </td>

                        {/* 보안 액션 */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {log.isBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnblockIp(log.ip)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                            >
                              차단 해제
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewBlockIp(log.ip);
                                setNewBlockReason(`로그 상세 화면에서 관리자 차단 (${log.landingPath} 접근)`);
                                setIsAddBlockModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              IP 차단
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 페이징 (Pagination) 바 */}
            <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>
                  총 <strong>{logs.length}</strong>건 중{" "}
                  {logs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
                  {Math.min(currentPage * itemsPerPage, logs.length)}건 표시
                </span>
                <span className="text-neutral-300">|</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-700"
                >
                  <option value={15}>15개씩 보기</option>
                  <option value={25}>25개씩 보기</option>
                  <option value={50}>50개씩 보기</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-extrabold text-neutral-950 px-2 font-mono">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. 접근 제어 (Access Control) 화면                               */}
      {/* ============================================================== */}
      {activeSubTab === "access" && (
        <div className="space-y-6">
          {/* 보안 상태 요약 배너 */}
          <div className="bg-neutral-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-black tracking-tight">
                  악성 트래픽 및 크롤링 접근 제어 (Security Firewall)
                </h2>
              </div>
              <p className="text-xs text-neutral-400 max-w-xl">
                비정상적인 속도로 대량의 API를 호출하거나 쇼핑몰 취약점을 스캐닝하는 IP를 감지하고,
                쇼핑몰 서버를 보호하기 위해 트래픽을 즉시 차단합니다.
              </p>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-xl text-center">
                <span className="text-[11px] text-neutral-400 block font-bold">차단된 IP 수</span>
                <span className="text-2xl font-black text-rose-400 font-mono mt-0.5 block">
                  {blockedIps.length}
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-xl text-center">
                <span className="text-[11px] text-neutral-400 block font-bold">감지된 이상 징후</span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">
                  {suspiciousActivities.filter((s) => !s.isBlocked).length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBlockModalOpen(true)}
                className="bg-white hover:bg-neutral-100 text-neutral-950 px-4 py-3 rounded-xl font-black text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                차단 IP 수동 등록
              </button>
            </div>

            {/* 배경 그래디언트 효과 */}
            <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-rose-950/30 to-transparent pointer-events-none" />
          </div>

          {/* 이상 행동 감지 리스트 (Suspicious Activity List) */}
          <div className="bg-white border border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-950">
                    실시간 이상 행동 감지 리스트 (Suspicious Requests)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    단시간 과도한 요청이나 무차별 404 스캐닝 패턴이 감지된 IP 목록입니다.
                  </p>
                </div>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                실시간 보안 필터 감시 중
              </span>
            </div>

            <div className="divide-y divide-neutral-100">
              {suspiciousActivities.length === 0 ? (
                <p className="text-center py-6 text-xs text-neutral-500">
                  현재 감지된 이상 행동 요청이 없습니다.
                </p>
              ) : (
                suspiciousActivities.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${
                          item.threatLevel === "CRITICAL"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : item.threatLevel === "HIGH"
                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.threatLevel}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-neutral-950">
                            {item.ip}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {item.flag} {item.country}
                          </span>
                          <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            {item.timeWindow} {item.requestCount}회
                          </span>
                        </div>
                        <p className="text-xs font-bold text-neutral-700 mt-1">
                          {item.pattern}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          감지 시각: {item.detectedAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {item.isBlocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          차단 완료
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickBlockSuspicious(item)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          즉시 차단 (Block Now)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 차단 IP 목록 테이블 (Blacklisted IPs) */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-950 flex items-center gap-2">
                  <span>차단된 IP 목록 (Blacklist)</span>
                  <span className="bg-neutral-100 text-neutral-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    총 {blockedIps.length}개
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  현재 접속이 원천 차단된 악성 봇 및 관리자 차단 IP 내역입니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddBlockModalOpen(true)}
                className="bg-neutral-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                IP 추가
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-500 uppercase font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-5">차단 IP 주소</th>
                    <th className="py-3 px-5">차단 사유 (메모)</th>
                    <th className="py-3 px-5">차단 등록 일시</th>
                    <th className="py-3 px-5 text-center">보안 상태</th>
                    <th className="py-3 px-5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500 font-medium">
                        현재 등록된 차단 IP가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-black text-neutral-950 text-xs">
                          {b.ip}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-neutral-700 max-w-md">
                          {b.reason}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-neutral-500 whitespace-nowrap">
                          {b.blockedAt}
                        </td>
                        <td className="py-3.5 px-5 text-center whitespace-nowrap">
                          <span className="bg-rose-100 text-rose-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
                            BLOCKED (차단 중)
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleUnblockIp(b.ip)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            차단 해제 (삭제)
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 관리자 IP 통계 제외 관리 (Admin IP Whitelist / Exclusions) */}
          <div className="bg-white border border-blue-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-transparent">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>통계 제외 관리자 IP 목록 (Admin IP Whitelist)</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    총 {adminIps.length}개 제외 중
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  등록된 IP는 쇼핑몰을 자유롭게 테스트하거나 관리자 페이지를 둘러보더라도 방문자 수, 페이지뷰, 접속 로그 통계에 일절 집계되지 않습니다.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentClientIp && !adminIps.some((a) => cleanIp(a) === cleanIp(currentClientIp)) && (
                  <button
                    type="button"
                    onClick={() => handleAddAdminIp(currentClientIp)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    현재 내 IP ({currentClientIp}) 등록
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddAdminIpModalOpen(true)}
                  className="bg-neutral-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  관리자 IP 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-500 uppercase font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-5">제외 관리자 IP</th>
                    <th className="py-3 px-5">구분 및 상태</th>
                    <th className="py-3 px-5">통계 반영 여부</th>
                    <th className="py-3 px-5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {adminIps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500 font-medium">
                        등록된 관리자 IP가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    adminIps.map((ip) => {
                      const isCurrent = cleanIp(ip) === cleanIp(currentClientIp);
                      const isDefaultLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
                      return (
                        <tr key={ip} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-5 font-mono font-black text-neutral-950 text-xs">
                            <div className="flex items-center gap-2">
                              <span>{ip}</span>
                              {isCurrent && (
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                                  현재 접속 IP
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-medium text-neutral-600">
                            {isDefaultLoopback ? "로컬 개발 환경 (루프백)" : "관리자 접속 환경 (Admin)"}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                              모든 통계에서 100% 완전 제외
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {isDefaultLoopback ? (
                              <span className="text-[11px] text-neutral-400 font-medium">
                                기본 보호 항목
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveAdminIp(ip)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Trash2 className="w-3 h-3 text-neutral-400" />
                                제외 해제
                              </button>
                            )}
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

      {/* ============================================================== */}
      {/* 차단 IP 수동 등록 모달 (Modal)                                 */}
      {/* ============================================================== */}
      {isAddBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-neutral-950">
                  블랙리스트 (IP 차단) 수동 등록
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddBlockModalOpen(false);
                  setNewBlockIp("");
                  setNewBlockReason("");
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBlockIp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-neutral-800 mb-1.5">
                  차단할 IP 주소 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 192.168.1.100"
                  value={newBlockIp}
                  onChange={(e) => setNewBlockIp(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  IPv4 주소 또는 IPv6 주소를 입력하세요.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-neutral-800 mb-1.5">
                  차단 사유 및 메모 *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="차단 사유를 입력하세요 (예: 단시간 비정상 대량 API 스캐닝 차단)"
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-medium text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBlockModalOpen(false);
                    setNewBlockIp("");
                    setNewBlockReason("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  차단 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 IP 통계 제외 수동 등록 모달 (Modal) */}
      {isAddAdminIpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-neutral-950">
                  관리자 IP 통계 제외 등록
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddAdminIpModalOpen(false);
                  setNewAdminIpInput("");
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddAdminIp();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-extrabold text-neutral-800 mb-1.5">
                  통계에서 제외할 관리자 IP 주소 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 172.30.1.74 또는 211.234.56.78"
                  value={newAdminIpInput}
                  onChange={(e) => setNewAdminIpInput(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  등록된 IP에서 발생하는 모든 페이지 조회 및 방문은 실시간 활성자, UV, PV, 추이 그래프에서 즉시 원천 제외됩니다.
                </p>
              </div>

              {currentClientIp && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                  <span className="text-xs text-neutral-600">현재 내 접속 IP:</span>
                  <button
                    type="button"
                    onClick={() => setNewAdminIpInput(currentClientIp)}
                    className="text-xs font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {currentClientIp} (클릭하여 입력)
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddAdminIpModalOpen(false);
                    setNewAdminIpInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  제외 목록에 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
