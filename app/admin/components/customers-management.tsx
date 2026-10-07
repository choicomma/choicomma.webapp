"use client";
import { Pencil, UserPlus, Shield, Mail, Phone, Crown, Lock as LockIcon, X, Plus, Minus, Coins, ChevronRight } from "lucide-react";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { deduplicateCustomers } from "@/hooks/admin/useCustomers";

interface CustomersManagementProps {
  customersList: any[];
  setCustomersList: React.Dispatch<React.SetStateAction<any[]>>;
  customerSearchQuery: string;
  setCustomerSearchQuery: (val: string) => void;
  customerGradeFilter: string;
  setCustomerGradeFilter: (val: string) => void;
  setIsAddCustomerModalOpen: (val: boolean) => void;
  handleOpenEditCustomer: (customer: any) => void;
  handleDeleteCustomer: (id: string, name: string) => void;
  handleClearAllCustomers: () => void;
  handleExcelFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetCustomerData?: () => void;
  isCustomersLoaded?: boolean;
  isAddCustomerModalOpen?: boolean;
  newCustName?: string;
  setNewCustName?: (val: string) => void;
  newCustEmail?: string;
  setNewCustEmail?: (val: string) => void;
  newCustPhone?: string;
  setNewCustPhone?: (val: string) => void;
  newCustGrade?: string;
  setNewCustGrade?: (val: string) => void;
  newCustPoints?: string | number;
  setNewCustPoints?: (val: any) => void;
  newCustAddress?: string;
  setNewCustAddress?: (val: string) => void;
  handleAddCustomerSubmit?: (e: React.FormEvent) => void;
  editingCustomer?: any;
  setEditingCustomer?: (c: any) => void;
  editCustGrade?: string;
  setEditCustGrade?: (val: string) => void;
  editCustPointAmount?: string;
  setEditCustPointAmount?: (val: string) => void;
  editCustPointReason?: string;
  setEditCustPointReason?: (val: string) => void;
  editCustAddress?: string;
  setEditCustAddress?: (val: string) => void;
  handleApplyCustomerPoints?: (action: "add" | "sub", customAmount?: number) => void;
  handleSaveEditCustomer?: (e: React.FormEvent) => void;
}

export function CustomersManagement({
  customersList,
  setCustomersList,
  customerSearchQuery,
  setCustomerSearchQuery,
  customerGradeFilter,
  setCustomerGradeFilter,
  setIsAddCustomerModalOpen,
  handleOpenEditCustomer,
  handleDeleteCustomer,
  handleClearAllCustomers,
  handleExcelFileUpload,
  handleResetCustomerData,
  isCustomersLoaded,
  isAddCustomerModalOpen = false,
  newCustName = "",
  setNewCustName = () => {},
  newCustEmail = "",
  setNewCustEmail = () => {},
  newCustPhone = "",
  setNewCustPhone = () => {},
  newCustGrade = "BASIC",
  setNewCustGrade = () => {},
  newCustPoints = "0",
  setNewCustPoints = () => {},
  newCustAddress = "",
  setNewCustAddress = () => {},
  handleAddCustomerSubmit = (e) => e.preventDefault(),
  editingCustomer = null,
  setEditingCustomer = () => {},
  editCustGrade = "BASIC",
  setEditCustGrade = () => {},
  editCustPointAmount = "",
  setEditCustPointAmount = () => {},
  editCustPointReason = "",
  setEditCustPointReason = () => {},
  editCustAddress = "",
  setEditCustAddress = () => {},
  handleApplyCustomerPoints = () => {},
  handleSaveEditCustomer = (e) => e.preventDefault(),
}: CustomersManagementProps) {
  const [customerPage, setCustomerPage] = useState(1);
  const CUSTOMERS_PER_PAGE = 25;

  const [pointsHistoryCustomer, setPointsHistoryCustomer] = useState<any | null>(null);
  const [pointsHistoryFilter, setPointsHistoryFilter] = useState<"all" | "earn" | "use">("all");
  const [pointsHistoryVersion, setPointsHistoryVersion] = useState(0);

  React.useEffect(() => {
    const handleUpdate = () => setPointsHistoryVersion((v) => v + 1);
    window.addEventListener("membership_points_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("admin_customers_updated", handleUpdate);
    return () => {
      window.removeEventListener("membership_points_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("admin_customers_updated", handleUpdate);
    };
  }, []);

  // 고객별 적립금 상세 이력 계산
  const customerPointsHistory = React.useMemo(() => {
    if (!pointsHistoryCustomer) return [];
    let list: any[] = [];
    if (typeof window !== "undefined") {
      const historyRaw = localStorage.getItem("membership_points_history");
      if (historyRaw) {
        try {
          const parsed = JSON.parse(historyRaw);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {}
      }
    }

    const targetEmail = (pointsHistoryCustomer.email || "").toLowerCase().trim();
    const targetName = (pointsHistoryCustomer.name || "").trim();
    const targetId = String(pointsHistoryCustomer.id || "").trim();

    // 1) 고객에게 매칭되는 내역 필터링
    const matched = list.filter((item: any) => {
      const itemEmail = (item.customerEmail || "").toLowerCase().trim();
      const itemCustId = String(item.customerId || "").trim();
      const itemName = (item.customerName || "").trim();

      if (itemCustId && itemCustId === targetId) return true;
      if (itemEmail && targetEmail && itemEmail === targetEmail) return true;
      if (itemName && targetName && itemName === targetName) return true;

      // 공통 이력(고객 식별자가 저장되지 않은 경우) 조건 매칭:
      if (!itemCustId && !itemEmail && !itemName) {
        if (targetId === "chogun" || targetName === "조건" || targetId === "ADMIN-001") {
          return true;
        }
      }
      return false;
    });

    // 2) 주문 데이터(admin_orders)에서 누락된 결제 사용 내역 보강
    if (typeof window !== "undefined") {
      try {
        const ordersRaw = localStorage.getItem("admin_orders");
        if (ordersRaw) {
          const ordersList = JSON.parse(ordersRaw);
          if (Array.isArray(ordersList)) {
            ordersList.forEach((ord: any) => {
              const ordEmail = (ord.customerEmail || ord.email || "").toLowerCase().trim();
              const ordName = (ord.customerName || ord.customer || ord.ordererName || "").trim();
              const ordCustId = String(ord.customerId || "").trim();
              const isMatch = (ordCustId && ordCustId === targetId) || (ordEmail && ordEmail === targetEmail) || (ordName && ordName === targetName);
              if (isMatch) {
                const usedPts = Number(ord.pointsUsed || 0);
                if (usedPts > 0 && !matched.some((m) => m.id === `point-use-${ord.id}` || (m.label && m.label.includes(ord.id) && m.amount < 0))) {
                  matched.push({
                    id: `point-use-${ord.id}`,
                    label: `[상품 결제 사용] 주문번호: ${ord.orderNumber || ord.id}`,
                    date: (ord.created_at || ord.date || new Date().toISOString()).slice(0, 10),
                    amount: -usedPts,
                    customerName: ordName,
                  });
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    return matched;
  }, [pointsHistoryCustomer, pointsHistoryVersion, customersList]);

  const totalEarnedPoints = React.useMemo(() => {
    return customerPointsHistory
      .filter((item: any) => item.amount > 0)
      .reduce((sum: number, item: any) => sum + item.amount, 0);
  }, [customerPointsHistory]);

  const totalUsedPoints = React.useMemo(() => {
    return customerPointsHistory
      .filter((item: any) => item.amount < 0)
      .reduce((sum: number, item: any) => sum + Math.abs(item.amount), 0);
  }, [customerPointsHistory]);

  const customerPointsHistoryWithBalance = React.useMemo(() => {
    let running = Number(pointsHistoryCustomer?.points || 0);
    return customerPointsHistory.map((item: any) => {
      let balance = running;
      if (item.balance !== undefined && typeof item.balance === "number") {
        balance = item.balance;
      }
      running = running - (Number(item.amount) || 0);
      return {
        ...item,
        remainingBalance: Math.max(0, balance),
      };
    });
  }, [customerPointsHistory, pointsHistoryCustomer]);

  const filteredCustomerHistory = React.useMemo(() => {
    if (pointsHistoryFilter === "earn") {
      return customerPointsHistoryWithBalance.filter((item: any) => item.amount > 0);
    }
    if (pointsHistoryFilter === "use") {
      return customerPointsHistoryWithBalance.filter((item: any) => item.amount < 0);
    }
    return customerPointsHistoryWithBalance;
  }, [customerPointsHistoryWithBalance, pointsHistoryFilter]);

  const getPointsBadgeInfo = (label: string, amount: number) => {
    if (label.includes("관리자 지급")) {
      return { text: "관리자 지급", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (label.includes("관리자 차감")) {
      return { text: "관리자 차감", bg: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (label.includes("구매 적립")) {
      return { text: "구매 적립", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (label.includes("결제 사용")) {
      return { text: "결제 사용", bg: "bg-neutral-100 text-neutral-700 border-neutral-300" };
    }
    if (label.includes("환불") || label.includes("반환")) {
      return { text: "환불 반환", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    if (label.includes("환급")) {
      return { text: "배송비 환급", bg: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    return amount > 0
      ? { text: "적립 (+)", bg: "bg-blue-50 text-blue-700 border-blue-200" }
      : { text: "사용/차감 (-)", bg: "bg-neutral-100 text-neutral-700 border-neutral-300" };
  };

  // 항상 중복이 완전히 제거된 단일 관리자 기반 회원 목록 유지
  const sanitizedCustomersList = React.useMemo(() => {
    return deduplicateCustomers(customersList);
  }, [customersList]);

  const handleDownloadCustomersExcel = () => {
    if (sanitizedCustomersList.length === 0) {
      alert("다운로드할 회원 데이터가 없습니다.");
      return;
    }

    try {
      const exportData = sanitizedCustomersList.map((c, index) => ({
        "번호": index + 1,
        "회원ID": c.id,
        "이름": c.name,
        "이메일": c.email,
        "전화번호": c.phone,
        "배송지주소": c.address || "",
        "회원등급": c.grade || "GENERAL",
        "누적구매금액": Number(c.totalSpent || 0),
        "보유적립금": Number(c.points || 0),
        "가입일": c.joinedDate || "",
        "관리자여부": c.isAdmin || c.role === "ADMIN" ? "Y" : "N",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "회원목록");
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `스토어_회원목록_${today}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("회원 목록 엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  const newCustomersThisMonth = React.useMemo(() => {
    const currentYM = new Date().toISOString().slice(0, 7);
    return sanitizedCustomersList.filter((c) => c.joinedDate && c.joinedDate.startsWith(currentYM)).length;
  }, [sanitizedCustomersList]);

  const filteredCustomers = React.useMemo(() => {
    return sanitizedCustomersList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()));
      const matchesGrade =
        customerGradeFilter === "all" ||
        (customerGradeFilter === "GENERAL" && (c.grade === "GENERAL" || c.grade === "REGULAR" || !c.grade)) ||
        (customerGradeFilter === "VVIP" && (c.grade === "VVIP" || c.grade?.includes("VIP") || c.role === "ADMIN")) ||
        c.grade === customerGradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [sanitizedCustomersList, customerSearchQuery, customerGradeFilter]);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE) || 1;
  const paginatedCustomers = React.useMemo(() => {
    return filteredCustomers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            스토어 회원 관리
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            회원 목록 조회, 신규 회원 등록, 회원 등급 및 적립금(포인트) 통합 관리
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCustomersExcel}
            className="bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center cursor-pointer shadow-xs transition-colors"
          >
            <span>회원정보 다운로드 (.xlsx)</span>
          </button>
          <label className="bg-neutral-900 hover:bg-black text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center cursor-pointer shadow-xs transition-colors">
            <span>엑셀 파일 업로드 (.xls / .xlsx)</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleExcelFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center text-xs cursor-pointer"
          >
            <span>신규 회원 직접 등록</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards: General, Silver, Gold, Platinum, VVIP & Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Customers */}
        <div
          onClick={() => setCustomerGradeFilter("all")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "all" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>전체 회원</span>
          </div>
          <p className="text-xl font-extrabold text-neutral-950 mt-1.5" suppressHydrationWarning>
            {sanitizedCustomersList.length > 0 || isCustomersLoaded ? `${sanitizedCustomersList.length.toLocaleString()} 명` : "-"}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">스토어 전체 등록 회원</p>
        </div>

        {/* General (일반) */}
        <div
          onClick={() => setCustomerGradeFilter("GENERAL")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "GENERAL" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>일반 (GENERAL)</span>
          </div>
          <p className="text-xl font-extrabold text-neutral-950 mt-1.5">
            {sanitizedCustomersList.filter((c) => c.grade === "GENERAL" || c.grade === "REGULAR" || !c.grade).length.toLocaleString()} 명
          </p>
          <p className="text-[11px] text-neutral-500 font-bold mt-0.5">기본 회원</p>
        </div>

        {/* Silver (실버) */}
        <div
          onClick={() => setCustomerGradeFilter("SILVER")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "SILVER" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>실버 (SILVER)</span>
          </div>
          <p className="text-xl font-extrabold text-neutral-950 mt-1.5">
            {sanitizedCustomersList.filter((c) => c.grade === "SILVER").length.toLocaleString()} 명
          </p>
          <p className="text-[11px] text-neutral-500 font-bold mt-0.5">실버 등급 회원</p>
        </div>

        {/* Gold (골드) */}
        <div
          onClick={() => setCustomerGradeFilter("GOLD")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "GOLD" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>골드 (GOLD)</span>
          </div>
          <p className="text-xl font-extrabold text-neutral-950 mt-1.5">
            {sanitizedCustomersList.filter((c) => c.grade === "GOLD").length.toLocaleString()} 명
          </p>
          <p className="text-[11px] text-neutral-500 font-bold mt-0.5">골드 등급 회원</p>
        </div>

        {/* Platinum (플래티넘) */}
        <div
          onClick={() => setCustomerGradeFilter("PLATINUM")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "PLATINUM" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>플래티넘 (PLATINUM)</span>
          </div>
          <p className="text-xl font-extrabold text-neutral-950 mt-1.5">
            {sanitizedCustomersList.filter((c) => c.grade === "PLATINUM").length.toLocaleString()} 명
          </p>
          <p className="text-[11px] text-neutral-500 font-bold mt-0.5">플래티넘 등급 회원</p>
        </div>

        {/* VVIP */}
        <div
          onClick={() => setCustomerGradeFilter("VVIP")}
          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:border-neutral-950 ${
            customerGradeFilter === "VVIP" ? "ring-2 ring-neutral-950 border-neutral-950" : "border-neutral-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-neutral-950 uppercase tracking-wider">
            <span className="font-black">VVIP</span>
          </div>
          <p className="text-xl font-black text-neutral-950 mt-1.5">
            {sanitizedCustomersList.filter((c) => c.grade === "VVIP" || c.grade?.includes("VIP") || c.role === "ADMIN").length.toLocaleString()} 명
          </p>
          <p className="text-[11px] text-neutral-900 font-extrabold mt-0.5">최상위 VIP 회원</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="회원 이름, 이메일, 전화번호, 주소 검색..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
          </div>

          {(customerSearchQuery || customerGradeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setCustomerSearchQuery("");
                setCustomerGradeFilter("all");
              }}
              className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-5">회원 정보</th>
                <th className="py-3.5 px-5">연락처 / 배송지 주소</th>
                <th className="py-3.5 px-5">회원 등급</th>
                <th className="py-3.5 px-5">누적 구매금액</th>
                <th className="py-3.5 px-5">
                  <span className="flex items-center gap-1">
                    보유 적립금
                    <span className="text-[10px] font-normal normal-case text-neutral-400 font-sans">(클릭 시 내역)</span>
                  </span>
                </th>
                <th className="py-3.5 px-5">가입일</th>
                <th className="py-3.5 px-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    검색 조건에 해당되는 회원 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust, index) => (
                  <tr key={`${cust.id || 'cust'}-${cust.email || index}-${index}`} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-extrabold text-neutral-950 text-sm flex items-center gap-1.5">
                          {cust.name}
                          {cust.isAdmin && (
                            <span className="bg-neutral-950 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                              ADMIN
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-neutral-400 font-normal truncate max-w-[120px]">({cust.id})</span>
                        </p>
                        <p className="text-xs text-neutral-500">{cust.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <p className="font-mono text-xs text-neutral-900 font-bold">{cust.phone}</p>
                      {cust.address && cust.address !== "-" ? (
                        <p className="text-[11px] text-neutral-500 font-sans mt-0.5 truncate max-w-[240px]" title={cust.address}>
                          {cust.address}
                        </p>
                      ) : (
                        <p className="text-[11px] text-neutral-400 italic mt-0.5">주소 미등록</p>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                          cust.grade === "VVIP" || cust.grade?.includes("BLACK")
                            ? "bg-neutral-950 text-white border border-neutral-800 shadow-2xs"
                            : cust.grade === "PLATINUM"
                            ? "bg-neutral-800 text-white border border-neutral-700 shadow-2xs"
                            : cust.grade === "GOLD" || cust.grade?.includes("GOLD")
                            ? "bg-neutral-200 text-neutral-900 border border-neutral-300"
                            : cust.grade === "SILVER" || cust.grade?.includes("SILVER")
                            ? "bg-neutral-100 text-neutral-800 border border-neutral-200"
                            : "bg-white text-neutral-600 border border-neutral-300"
                        }`}
                      >
                        {cust.grade || "GENERAL"}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold font-mono text-neutral-950">
                      ₩ {cust.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        type="button"
                        onClick={() => setPointsHistoryCustomer(cust)}
                        className="group inline-flex items-center gap-1.5 font-bold font-mono text-blue-600 hover:text-blue-800 hover:bg-blue-50/90 px-2 py-1 -mx-2 rounded-lg transition-all cursor-pointer border border-transparent hover:border-blue-200"
                        title="클릭하여 적립/사용 상세 내역 확인"
                      >
                        <Coins className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="underline underline-offset-4 decoration-blue-300 group-hover:decoration-blue-600">
                          ₩ {Number(cust.points || 0).toLocaleString()}
                        </span>
                        <ChevronRight className="w-3 h-3 text-blue-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </td>
                    <td className="py-4 px-5 text-xs text-neutral-500 font-mono">
                      {cust.joinedDate}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomer(cust)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            총 {filteredCustomers.length.toLocaleString()}명 중 {filteredCustomers.length > 0 ? ((customerPage - 1) * CUSTOMERS_PER_PAGE + 1).toLocaleString() : 0} - {Math.min(customerPage * CUSTOMERS_PER_PAGE, filteredCustomers.length).toLocaleString()}명 표시 중
          </span>
          {totalCustomerPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={customerPage === 1}
                onClick={() => setCustomerPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                이전
              </button>
              <span className="font-extrabold text-neutral-950 px-2 font-mono">
                {customerPage} / {totalCustomerPages} 페이지
              </span>
              <button
                type="button"
                disabled={customerPage >= totalCustomerPages}
                onClick={() => setCustomerPage((prev) => Math.min(totalCustomerPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
      {/* ADD CUSTOMER MODAL */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950">신규 회원 등록</h3>
                  <p className="text-xs text-neutral-500">관리자가 직접 회원 계정을 새로 생성합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">회원 이름 *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">이메일 주소 *</label>
                <input
                  type="email"
                  required
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="hong@example.com"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">전화번호</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">배송지 주소</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="(우편번호) 주소 상세주소"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">초기 회원 등급</label>
                  <select
                    value={newCustGrade}
                    onChange={(e) => setNewCustGrade(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  >
                    <option value="GENERAL">일반 (GENERAL)</option>
                    <option value="SILVER">실버 (SILVER)</option>
                    <option value="GOLD">골드 (GOLD)</option>
                    <option value="PLATINUM">플래티넘 (PLATINUM)</option>
                    <option value="VVIP">VVIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">초기 적립금 (₩)</label>
                  <input
                    type="number"
                    value={newCustPoints}
                    onChange={(e) => setNewCustPoints(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>회원 등록 완료</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950">회원 정보 / 등급 수정</h3>
                  <p className="text-xs text-neutral-500 font-mono">{editingCustomer.name} ({editingCustomer.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">회원 등급 변경</label>
                <select
                  value={editCustGrade}
                  onChange={(e) => setEditCustGrade(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                >
                  <option value="GENERAL">일반 (GENERAL)</option>
                  <option value="SILVER">실버 (SILVER)</option>
                  <option value="GOLD">골드 (GOLD)</option>
                  <option value="PLATINUM">플래티넘 (PLATINUM)</option>
                  <option value="VVIP">VVIP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  배송지 주소
                </label>
                <div className="w-full bg-neutral-100/90 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-700 font-medium select-all cursor-default">
                  {editingCustomer.address || editCustAddress || "등록된 배송지 주소가 없습니다."}
                </div>
              </div>

              {/* 적립금 지급 / 차감 섹션 (금액 입력 후 지급/차감 버튼 클릭 시 즉시 반영) */}
              <div className="bg-neutral-50/90 border border-neutral-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">
                    적립금 지급 / 차감 관리
                  </label>
                  <span className="text-xs font-medium text-neutral-500">
                    현재 보유:
                    <button
                      type="button"
                      onClick={() => setPointsHistoryCustomer(editingCustomer)}
                      className="inline-flex items-center gap-1 font-extrabold text-blue-600 hover:text-blue-800 font-mono text-sm underline underline-offset-2 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      title="클릭하여 적립/사용 상세 내역 확인"
                    >
                      ₩{Number(editingCustomer.points || 0).toLocaleString()}
                      <Coins className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  </span>
                </div>

                {/* 금액 입력란 + [지급] [차감] 버튼 그룹 */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editCustPointAmount ? Number(editCustPointAmount.replace(/[^0-9]/g, "")).toLocaleString() : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setEditCustPointAmount(raw);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCustomerPoints("add");
                        }
                      }}
                      placeholder="금액 입력 (예: 5000)"
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500 pointer-events-none">
                      원
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomerPoints("add")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                      title="입력한 금액만큼 적립금을 즉시 지급합니다"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>지급</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCustomerPoints("sub")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                      title="입력한 금액만큼 적립금을 즉시 차감합니다"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>차감</span>
                    </button>
                  </div>
                </div>

                {/* 빠른 금액 증액 칩 */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[1000, 5000, 10000, 50000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => {
                        const curr = parseInt(editCustPointAmount || "0", 10);
                        setEditCustPointAmount(String(curr + quick));
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      +{quick.toLocaleString()}원
                    </button>
                  ))}
                  {editCustPointAmount && (
                    <button
                      type="button"
                      onClick={() => setEditCustPointAmount("")}
                      className="text-[11px] font-bold px-2 py-1 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer ml-auto"
                    >
                      초기화
                    </button>
                  )}
                </div>
                {/* 지급 / 차감 사유 입력란 */}
                <div className="pt-2 border-t border-neutral-200/60">
                  <input
                    type="text"
                    value={editCustPointReason || ""}
                    onChange={(e) => setEditCustPointReason(e.target.value)}
                    placeholder="지급 / 차감 사유 입력 (예: 이벤트 당첨, 상담 보상 등 / 기본값: 특별 적립금 지급)"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 shadow-2xs"
                  />
                  <p className="text-[10.5px] text-neutral-400 mt-1 pl-1">
                    * 입력하신 사유는 고객의 마이페이지 [적립 / 사용 상세 내역]에 실시간으로 표시됩니다.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  변경사항 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER POINTS HISTORY MODAL */}
      {pointsHistoryCustomer && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
                    {pointsHistoryCustomer.name} 님의 적립금 상세 내역
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                      {pointsHistoryCustomer.grade || "GENERAL"}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {pointsHistoryCustomer.email} · 회원 ID: {pointsHistoryCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPointsHistoryCustomer(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Summary Cards & Filter */}
            <div className="p-6 pb-4 bg-neutral-50/70 border-b border-neutral-100 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    현재 보유 적립금
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono text-blue-600">
                      ₩ {Number(pointsHistoryCustomer.points || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    총 적립 포인트
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono text-emerald-600">
                      +₩ {totalEarnedPoints.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    총 사용 / 차감
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono text-neutral-700">
                      -₩ {totalUsedPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs & Action */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-neutral-200/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPointsHistoryFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pointsHistoryFilter === "all"
                        ? "bg-neutral-950 text-white shadow-2xs"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    전체 ({customerPointsHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsHistoryFilter("earn")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pointsHistoryFilter === "earn"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    적립 (+) ({customerPointsHistory.filter((i: any) => i.amount > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsHistoryFilter("use")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pointsHistoryFilter === "use"
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    사용 / 차감 (-) ({customerPointsHistory.filter((i: any) => i.amount < 0).length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cust = pointsHistoryCustomer;
                    setPointsHistoryCustomer(null);
                    handleOpenEditCustomer(cust);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-600" />
                  <span>적립금 즉시 지급 / 차감</span>
                </button>
              </div>
            </div>

            {/* List / Table */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[380px]">
              {filteredCustomerHistory.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center justify-center space-y-2 text-neutral-400">
                  <Coins className="w-10 h-10 stroke-1 text-neutral-300" />
                  <p className="text-sm font-bold text-neutral-700">적립 및 사용 상세 내역이 없습니다.</p>
                  <p className="text-xs text-neutral-400">
                    상품 구매 적립, 주문 결제 사용 또는 관리자 지급/차감 이력이 등록되면 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-3 px-4 w-[100px]">일시</th>
                        <th className="py-3 px-4 w-[95px]">구분</th>
                        <th className="py-3 px-4">상세 내용 / 사유</th>
                        <th className="py-3 px-4 text-right w-[110px]">변동 금액</th>
                        <th className="py-3 px-4 text-right w-[110px]">잔여 포인트</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredCustomerHistory.map((item: any, idx: number) => {
                        const badge = getPointsBadgeInfo(item.label || "", item.amount);
                        return (
                          <tr key={item.id || idx} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                              {item.date || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold border ${badge.bg}`}>
                                {badge.text}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-neutral-900">
                              {item.label}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-mono font-black text-xs ${
                                  item.amount > 0 ? "text-blue-600" : "text-rose-600"
                                }`}
                              >
                                {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} P
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-neutral-800 text-xs">
                              {Number(item.remainingBalance ?? 0).toLocaleString()} P
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-neutral-500">
                총 <strong className="text-neutral-900 font-bold">{filteredCustomerHistory.length}</strong>건의 내역 표시 중
              </span>
              <button
                type="button"
                onClick={() => setPointsHistoryCustomer(null)}
                className="px-5 py-2 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
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
