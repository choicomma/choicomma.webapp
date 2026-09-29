"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

export type VisitorSubTab = "overview" | "logs" | "access";
export type TrendRange = "7d" | "30d";
export type DeviceFilter = "all" | "PC" | "Mobile" | "Tablet";
export type DateRangeFilter = "all" | "today" | "7d" | "30d";

export interface VisitorLog {
  id: string;
  timestamp: string;
  ip: string;
  country: string;
  countryCode: string;
  flag: string;
  deviceType: "PC" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  landingPath: string;
  landingTitle: string;
  referrer: string;
  referrerLabel: string;
  isBlocked?: boolean;
}

export interface BlockedIp {
  id: string;
  ip: string;
  reason: string;
  blockedAt: string;
  status: "BLOCKED";
}

export interface SuspiciousActivity {
  id: string;
  ip: string;
  country: string;
  countryCode: string;
  flag: string;
  pattern: string;
  requestCount: number;
  timeWindow: string;
  threatLevel: "CRITICAL" | "HIGH" | "WARNING";
  detectedAt: string;
  isBlocked: boolean;
}

export interface ChannelShare {
  name: string;
  visitors: number;
  share: number;
  color: string;
}

export interface TrendPoint {
  date: string;
  shortDate: string;
  uv: number;
  pv: number;
}

export function useVisitors(triggerToast?: (msg: string) => void) {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<VisitorSubTab>("overview");
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");

  // Overview Stats - 100% 실제 데이터 기반 (초기값 0)
  const [activeUsers, setActiveUsers] = useState(0);
  const [overviewMetrics, setOverviewMetrics] = useState({
    today: { uv: 0, pv: 0, uvChangeRate: 0, pvChangeRate: 0 },
    thisWeek: { uv: 0, pv: 0, uvChangeRate: 0, pvChangeRate: 0 },
    thisMonth: { uv: 0, pv: 0, uvChangeRate: 0, pvChangeRate: 0 },
    avgDuration: "-",
    bounceRate: "-",
    totalCollectedLogs: 0,
  });

  // Charts Data - 실제 데이터
  const [trend7Days, setTrend7Days] = useState<TrendPoint[]>([]);
  const [trend30Days, setTrend30Days] = useState<TrendPoint[]>([]);
  const [channels, setChannels] = useState<ChannelShare[]>([]);

  // Visitor Logs - 실제 수집 로그
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logDeviceFilter, setLogDeviceFilter] = useState<DeviceFilter>("all");
  const [logDateFilter, setLogDateFilter] = useState<DateRangeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Access Control - 실제 차단 및 이상 행동 감지
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("admin_blocked_ips_cache");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);

  // Admin IP Exclusion State (관리자 IP 통계 제외 관리)
  const [adminIps, setAdminIps] = useState<string[]>([]);
  const [currentClientIp, setCurrentClientIp] = useState<string>("");
  const [excludedAdminLogsCount, setExcludedAdminLogsCount] = useState<number>(0);
  const [isAddAdminIpModalOpen, setIsAddAdminIpModalOpen] = useState(false);
  const [newAdminIpInput, setNewAdminIpInput] = useState("");

  // Modal State
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [newBlockIp, setNewBlockIp] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // Fetch Real API data
  const fetchVisitorData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch("/api/admin/visitors", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.overview) {
            setOverviewMetrics(data.overview);
            setActiveUsers(data.overview.activeUsers ?? 0);
            if (typeof data.overview.excludedAdminLogsCount === "number") {
              setExcludedAdminLogsCount(data.overview.excludedAdminLogsCount);
            }
          }
          if (Array.isArray(data.trend7Days)) setTrend7Days(data.trend7Days);
          if (Array.isArray(data.trend30Days)) setTrend30Days(data.trend30Days);
          if (Array.isArray(data.channels)) setChannels(data.channels);
          if (Array.isArray(data.logs)) setLogs(data.logs);
          if (Array.isArray(data.adminIps)) setAdminIps(data.adminIps);
          if (data.currentClientIp) setCurrentClientIp(data.currentClientIp);

          if (Array.isArray(data.blockedIps)) {
            setBlockedIps(data.blockedIps);
            if (typeof window !== "undefined") {
              localStorage.setItem("admin_blocked_ips_cache", JSON.stringify(data.blockedIps));
            }
          }
          if (Array.isArray(data.suspiciousActivities)) {
            setSuspiciousActivities(data.suspiciousActivities);
          }

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          setLastRefreshedAt(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch real visitors API data:", err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // 초기 로딩
  useEffect(() => {
    fetchVisitorData();
  }, [fetchVisitorData]);

  // 실시간 실제 데이터 자동 갱신 (10초 주기 실시간 폴링)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVisitorData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchVisitorData]);

  // Sync blocked IPs to logs
  const enrichedLogs = useMemo(() => {
    const blockedSet = new Set(blockedIps.map((b) => b.ip.trim()));
    return logs.map((log) => ({
      ...log,
      isBlocked: blockedSet.has(log.ip.trim()),
    }));
  }, [logs, blockedIps]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    return enrichedLogs.filter((log) => {
      // 1. IP 및 국가 검색
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.trim().toLowerCase();
        const matchesIp = log.ip.toLowerCase().includes(q);
        const matchesCountry = (log.country || "").toLowerCase().includes(q);
        const matchesLanding = (log.landingPath || "").toLowerCase().includes(q);
        const matchesReferrer = (log.referrer || "").toLowerCase().includes(q);
        if (!matchesIp && !matchesCountry && !matchesLanding && !matchesReferrer) {
          return false;
        }
      }

      // 2. 디바이스 필터
      if (logDeviceFilter !== "all" && log.deviceType !== logDeviceFilter) {
        return false;
      }

      // 3. 날짜 필터
      if (logDateFilter === "today") {
        if (!log.timestamp.startsWith(todayStr)) return false;
      }

      return true;
    });
  }, [enrichedLogs, logSearchQuery, logDeviceFilter, logDateFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [logSearchQuery, logDeviceFilter, logDateFilter, itemsPerPage]);

  // Action: Manual Block IP
  const handleAddBlockIp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanIp = newBlockIp.trim();
    if (!cleanIp) {
      triggerToast?.("차단할 IP 주소를 입력해 주세요.");
      return;
    }

    // IP 형식 기본 검증
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(cleanIp) && !cleanIp.includes(".") && cleanIp !== "127.0.0.1") {
      triggerToast?.("유효한 IP 주소 형식을 입력해 주세요 (예: 123.45.67.89)");
      return;
    }

    if (blockedIps.some((b) => b.ip === cleanIp)) {
      triggerToast?.("이미 차단 목록에 등록된 IP 주소입니다.");
      return;
    }

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", ip: cleanIp, reason: newBlockReason.trim() }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.blockedIps)) {
        setBlockedIps(data.blockedIps);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_blocked_ips_cache", JSON.stringify(data.blockedIps));
        }
      }
    } catch (err) {}

    setIsAddBlockModalOpen(false);
    setNewBlockIp("");
    setNewBlockReason("");
    triggerToast?.(`IP [${cleanIp}]가 차단 목록에 성공적으로 등록되었습니다.`);
    fetchVisitorData(true);
  };

  // Action: Unblock IP
  const handleUnblockIp = async (ip: string) => {
    if (!window.confirm(`IP [${ip}]의 차단을 해제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", ip }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.blockedIps)) {
        setBlockedIps(data.blockedIps);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_blocked_ips_cache", JSON.stringify(data.blockedIps));
        }
      }
    } catch (err) {}

    triggerToast?.(`IP [${ip}]의 차단이 해제되었습니다.`);
    fetchVisitorData(true);
  };

  // Action: Quick Block Suspicious Activity
  const handleQuickBlockSuspicious = async (item: SuspiciousActivity) => {
    if (item.isBlocked) {
      triggerToast?.("이미 차단된 IP입니다.");
      return;
    }

    if (!window.confirm(`이상 행동 감지 IP [${item.ip}]를 즉시 차단하시겠습니까?\n사유: ${item.pattern}`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          ip: item.ip,
          reason: `[이상 행동 즉시 차단] ${item.pattern}`,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.blockedIps)) {
        setBlockedIps(data.blockedIps);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_blocked_ips_cache", JSON.stringify(data.blockedIps));
        }
      }
    } catch (err) {}

    triggerToast?.(`이상 행동 IP [${item.ip}]가 즉시 차단되었습니다.`);
    fetchVisitorData(true);
  };

  // Action: Add Admin IP (관리자 IP 통계 제외 등록)
  const handleAddAdminIp = async (ipToAdd?: string) => {
    const targetIp = (ipToAdd || newAdminIpInput).trim();
    if (!targetIp) {
      triggerToast?.("등록할 관리자 IP 주소를 입력해 주세요.");
      return;
    }

    // IP 형식 기본 검증
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(targetIp) && !targetIp.includes(".") && targetIp !== "127.0.0.1" && targetIp !== "localhost") {
      triggerToast?.("유효한 IP 주소 형식을 입력해 주세요 (예: 123.45.67.89)");
      return;
    }

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_admin_ip", ip: targetIp }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.adminIps)) {
        setAdminIps(data.adminIps);
        triggerToast?.(`관리자 IP [${targetIp}]가 통계 제외 목록에 등록되었습니다.`);
        setNewAdminIpInput("");
        setIsAddAdminIpModalOpen(false);
        fetchVisitorData(true);
      } else {
        triggerToast?.(data.error || "관리자 IP 등록에 실패했습니다.");
      }
    } catch (e) {
      triggerToast?.("관리자 IP 등록 중 네트워크 오류가 발생했습니다.");
    }
  };

  // Action: Remove Admin IP (관리자 IP 통계 제외 삭제)
  const handleRemoveAdminIp = async (ipToRemove: string) => {
    if (ipToRemove === "127.0.0.1" || ipToRemove === "::1" || ipToRemove === "localhost") {
      triggerToast?.("로컬 루프백 IP는 기본 보호 항목으로 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`IP [${ipToRemove}]를 관리자 제외 목록에서 해제하시겠습니까?\n해제 시 해당 IP의 접속이 일반 방문자 통계에 다시 포함될 수 있습니다.`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_admin_ip", ip: ipToRemove }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.adminIps)) {
        setAdminIps(data.adminIps);
        triggerToast?.(`관리자 IP [${ipToRemove}]가 제외 목록에서 해제되었습니다.`);
        fetchVisitorData(true);
      }
    } catch (e) {
      triggerToast?.("관리자 IP 삭제 중 오류가 발생했습니다.");
    }
  };

  // Action: Excel Export
  const handleExportLogsExcel = () => {
    if (filteredLogs.length === 0) {
      triggerToast?.("내보낼 실제 로그 데이터가 없습니다.");
      return;
    }

    try {
      const exportData = filteredLogs.map((log, idx) => ({
        번호: idx + 1,
        접속일시: log.timestamp,
        접속IP: log.ip,
        접속국가: `${log.country || "-"} (${log.countryCode || "-"})`,
        디바이스: log.deviceType,
        브라우저_환경: log.browser,
        OS: log.os,
        최초진입페이지: log.landingPath,
        페이지명: log.landingTitle,
        이전출처: log.referrer,
        출처상세: log.referrerLabel,
        차단여부: log.isBlocked ? "차단됨 (Y)" : "정상 (N)",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "실제방문자로그");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `CHOICOMMA_실제방문자유입로그_${today}.xlsx`);
      triggerToast?.("실제 방문자 유입 로그 엑셀 파일이 다운로드되었습니다.");
    } catch (err) {
      console.error("Export logs error:", err);
      triggerToast?.("엑셀 내보내기 중 오류가 발생했습니다.");
    }
  };

  return {
    activeSubTab,
    setActiveSubTab,
    trendRange,
    setTrendRange,
    activeUsers,
    overviewMetrics,
    trend7Days,
    trend30Days,
    channels,
    logs: filteredLogs,
    rawLogsCount: logs.length,
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
    refreshData: () => fetchVisitorData(false),
    isLoading,
    lastRefreshedAt,
  };
}
