"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Truck,
  Coins,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  Globe,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  AvailableCoupon,
  DEFAULT_AVAILABLE_COUPONS,
  getAllUserCoupons,
  saveAdminCoupons,
  resetUsedCoupons,
  isLegacyCoupon,
  CouponUsageRecord,
  getCouponUsageHistory,
  cancelCouponUsage,
  resetCouponUsageHistory,
} from "@/lib/membership/coupons";
import { supabase } from "@/lib/supabase/client";
import { deduplicateCustomers } from "@/hooks/admin/useCustomers";

interface CouponsManagementProps {
  customersList?: any[];
  triggerToast?: (msg: string) => void;
}

const ALL_GRADES = ["GENERAL", "SILVER", "GOLD", "PLATINUM", "VVIP"];

export function CouponsManagement({
  customersList: propCustomersList = [],
  triggerToast,
}: CouponsManagementProps) {
  const [activeTab, setActiveTab] = useState<"list" | "usage">("list");
  const [coupons, setCoupons] = useState<AvailableCoupon[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return getAllUserCoupons();
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  const [usageHistory, setUsageHistory] = useState<CouponUsageRecord[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return getCouponUsageHistory();
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [usageSearchQuery, setUsageSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Customers list for target designation
  const [allCustomers, setAllCustomers] = useState<any[]>(() => deduplicateCustomers(propCustomersList));

  useEffect(() => {
    if (propCustomersList && propCustomersList.length > 0) {
      setAllCustomers(deduplicateCustomers(propCustomersList));
      return;
    }
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("admin_customers");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setAllCustomers(deduplicateCustomers(parsed));
        } catch (e) {}
      }
    }
  }, [propCustomersList]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AvailableCoupon | null>(null);

  // Form State (쿠폰 코드 입력 부분 완전 제거)
  const [formTitle, setFormTitle] = useState("");
  const [formDiscountAmount, setFormDiscountAmount] = useState<number>(10000);
  const [formType, setFormType] = useState<"FIXED" | "SHIPPING">("FIXED");
  const [formCondition, setFormCondition] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("2026.12.31");
  const [formBadge, setFormBadge] = useState("특별할인");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Target Designation Form State
  const [formTargetType, setFormTargetType] = useState<"ALL" | "GRADE" | "CUSTOMER">("ALL");
  const [formTargetGrades, setFormTargetGrades] = useState<string[]>([]);
  const [formSelectedCustomerEmails, setFormSelectedCustomerEmails] = useState<string[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerGradeFilter, setCustomerGradeFilter] = useState("all");

  const notify = (msg: string) => {
    if (triggerToast) triggerToast(msg);
    else alert(msg);
  };

  // 1. Load Coupons & Used Codes & Usage History
  const loadData = () => {
    if (typeof window === "undefined") return;

    const allCoupons = getAllUserCoupons();
    setCoupons(allCoupons);

    const usedRaw = localStorage.getItem("used_coupon_codes") || "[]";
    try {
      setUsedCodes(JSON.parse(usedRaw));
    } catch (e) {
      setUsedCodes([]);
    }

    setUsageHistory(getCouponUsageHistory());
  };

  useEffect(() => {
    loadData();

    // Supabase site_settings로부터 최신 관리자 쿠폰 설정 동기화
    if (typeof window !== "undefined") {
      Promise.resolve(
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "admin_coupons_config")
          .maybeSingle()
      )
        .then(({ data, error }: any) => {
          if (!error && data?.value) {
            try {
              const parsed = JSON.parse(data.value);
              if (Array.isArray(parsed)) {
                const sanitized = parsed.filter((c: any) => !isLegacyCoupon(c));
                localStorage.setItem("admin_coupons", JSON.stringify(sanitized));
                setCoupons(sanitized);
                window.dispatchEvent(new CustomEvent("coupons_updated"));
              }
            } catch (e) {}
          }
        })
        .catch(() => {});
    }

    // Supabase site_settings로부터 최신 쿠폰 사용 내역 동기화
    if (typeof window !== "undefined") {
      Promise.resolve(
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "admin_coupon_usage_history")
          .maybeSingle()
      )
        .then(({ data, error }: any) => {
          if (!error && data?.value) {
            try {
              const parsed = JSON.parse(data.value);
              if (Array.isArray(parsed)) {
                localStorage.setItem("admin_coupon_usage_history", JSON.stringify(parsed));
                setUsageHistory(parsed);
              }
            } catch (e) {}
          }
        })
        .catch(() => {});
    }

    const handleUpdate = () => loadData();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("coupons_updated", handleUpdate);
    window.addEventListener("coupon_usage_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("coupons_updated", handleUpdate);
      window.removeEventListener("coupon_usage_updated", handleUpdate);
    };
  }, []);

  // 2. Open Add / Edit Modal
  const handleOpenAddModal = () => {
    setEditingCoupon(null);
    setFormTitle("");
    setFormDiscountAmount(5000);
    setFormType("FIXED");
    setFormCondition("전 상품 즉시 할인");
    setFormValidUntil("2026.12.31");
    setFormBadge("신규혜택");
    setFormIsActive(true);
    setFormTargetType("ALL");
    setFormTargetGrades([]);
    setFormSelectedCustomerEmails([]);
    setCustomerSearchQuery("");
    setCustomerGradeFilter("all");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: AvailableCoupon) => {
    setEditingCoupon(coupon);
    setFormTitle(coupon.title);
    setFormDiscountAmount(coupon.discountAmount);
    setFormType(coupon.type);
    setFormCondition(coupon.condition);
    setFormValidUntil(coupon.validUntil || "2026.12.31");
    setFormBadge(coupon.badge || "특별할인");
    setFormIsActive(coupon.isActive !== false);

    // Target restoration
    const tType = coupon.targetType || "ALL";
    setFormTargetType(tType);
    setFormTargetGrades(coupon.targetGrades && !coupon.targetGrades.includes("ALL") ? coupon.targetGrades : []);
    setFormSelectedCustomerEmails(coupon.targetCustomerEmails || []);
    setCustomerSearchQuery("");
    setCustomerGradeFilter("all");
    setIsModalOpen(true);
  };

  // Grade toggle
  const toggleGrade = (grade: string) => {
    if (formTargetGrades.includes(grade)) {
      setFormTargetGrades(formTargetGrades.filter((g) => g !== grade));
    } else {
      setFormTargetGrades([...formTargetGrades, grade]);
    }
  };

  // Customer toggle
  const toggleCustomer = (email: string) => {
    if (formSelectedCustomerEmails.includes(email)) {
      setFormSelectedCustomerEmails(formSelectedCustomerEmails.filter((e) => e !== email));
    } else {
      setFormSelectedCustomerEmails([...formSelectedCustomerEmails, email]);
    }
  };

  // 3. Save Coupon (Add or Edit)
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      notify("⚠️ 쿠폰명을 입력해 주세요.");
      return;
    }
    if (formDiscountAmount <= 0) {
      notify("⚠️ 할인 금액은 0원보다 커야 합니다.");
      return;
    }

    if (formTargetType === "GRADE" && formTargetGrades.length === 0) {
      notify("⚠️ 대상 회원 등급을 최소 1개 이상 선택해 주세요.");
      return;
    }

    if (formTargetType === "CUSTOMER" && formSelectedCustomerEmails.length === 0) {
      notify("⚠️ 발급 대상 회원을 최소 1명 이상 선택해 주세요.");
      return;
    }

    const discountText =
      formType === "SHIPPING"
        ? `배송비 ${formDiscountAmount.toLocaleString()}원 지원`
        : `${formDiscountAmount.toLocaleString()}원 할인`;

    // Map customer names for display
    const targetNames = formSelectedCustomerEmails.map((email) => {
      const found = allCustomers.find((c) => (c.email || "").toLowerCase() === email.toLowerCase());
      return found?.name || email;
    });

    let updatedList: AvailableCoupon[];

    if (editingCoupon) {
      // Edit
      updatedList = coupons.map((c) =>
        c.id === editingCoupon.id
          ? {
              ...c,
              title: formTitle.trim(),
              discount: discountText,
              discountAmount: formDiscountAmount,
              type: formType,
              condition: formCondition.trim() || `${discountText} 즉시 적용`,
              validUntil: formValidUntil.trim() || "2026.12.31",
              badge: formBadge.trim() || undefined,
              targetType: formTargetType,
              targetGrades: formTargetType === "GRADE" ? formTargetGrades : ["ALL"],
              targetCustomerEmails: formTargetType === "CUSTOMER" ? formSelectedCustomerEmails : [],
              targetCustomerNames: formTargetType === "CUSTOMER" ? targetNames : [],
              isActive: formIsActive,
            }
          : c
      );
      notify(`✅ 쿠폰 [${formTitle}] 정보가 성공적으로 수정되었습니다.`);
    } else {
      // Add (자동 고유 식별자 생성, 별도 쿠폰 코드 입력 불필요)
      const generatedCode = `CPN-${Date.now().toString(36).toUpperCase()}`;

      const newCoupon: AvailableCoupon = {
        id: `coupon-${Date.now()}`,
        code: generatedCode,
        title: formTitle.trim(),
        discount: discountText,
        discountAmount: formDiscountAmount,
        type: formType,
        condition: formCondition.trim() || `${discountText} 즉시 적용`,
        validUntil: formValidUntil.trim() || "2026.12.31",
        badge: formBadge.trim() || undefined,
        targetType: formTargetType,
        targetGrades: formTargetType === "GRADE" ? formTargetGrades : ["ALL"],
        targetCustomerEmails: formTargetType === "CUSTOMER" ? formSelectedCustomerEmails : [],
        targetCustomerNames: formTargetType === "CUSTOMER" ? targetNames : [],
        isActive: formIsActive,
        createdAt: new Date().toISOString().split("T")[0],
      };

      updatedList = [newCoupon, ...coupons];
      notify(`🎉 새로운 쿠폰 [${formTitle}]이 성공적으로 발급되었습니다.`);
    }

    setCoupons(updatedList);
    saveAdminCoupons(updatedList);
    setIsModalOpen(false);
  };

  // 4. Toggle Active Status
  const handleToggleActive = (id: string) => {
    const target = coupons.find((c) => c.id === id);
    if (!target) return;

    const newStatus = target.isActive === false;
    const updatedList = coupons.map((c) =>
      c.id === id ? { ...c, isActive: newStatus } : c
    );

    setCoupons(updatedList);
    saveAdminCoupons(updatedList);
    notify(
      `쿠폰 [${target.title}]이(가) ${newStatus ? "활성화" : "비활성화(일시정지)"}되었습니다.`
    );
  };

  // 5. Delete Single Coupon
  const handleDeleteCoupon = (id: string, title: string) => {
    if (!window.confirm(`정말로 쿠폰 [${title}]을(를) 삭제하시겠습니까?`)) return;

    const updatedList = coupons.filter((c) => c.id !== id);
    setCoupons(updatedList);
    saveAdminCoupons(updatedList);
    notify(`🗑️ 쿠폰 [${title}]이(가) 삭제되었습니다.`);
  };

  // 5-1. Delete All Coupons
  const handleDeleteAllCoupons = () => {
    if (coupons.length === 0) return;
    if (
      !window.confirm(
        `현재 등록된 모든 쿠폰(${coupons.length}개)을 일괄 삭제하시겠습니까?\n\n삭제 후에는 고객 주문서 및 쿠폰함에서 쿠폰이 노출되지 않습니다.`
      )
    )
      return;

    setCoupons([]);
    saveAdminCoupons([]);
    notify("🗑️ 모든 쿠폰이 삭제되었습니다.");
  };

  // 6. Revoke/Re-enable single used coupon code
  const handleReactivateUsedCode = (code: string) => {
    const updated = usedCodes.filter((c) => c.toUpperCase() !== code.toUpperCase());
    setUsedCodes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("used_coupon_codes", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("coupons_updated"));
    }
    notify(`✅ [${code}] 쿠폰의 사용 완료 상태가 해제되어 재사용 가능해졌습니다.`);
  };

  // 8. Reset All Used Coupons History
  const handleResetAllUsage = () => {
    if (
      !window.confirm(
        "고객들의 모든 쿠폰 사용 완료 이력을 초기화하시겠습니까?\n\n초기화 시 이미 주문했던 고객도 다시 쿠폰을 사용할 수 있게 됩니다."
      )
    )
      return;

    resetUsedCoupons();
    resetCouponUsageHistory();
    setUsedCodes([]);
    setUsageHistory([]);
    notify("🔄 모든 쿠폰 사용 이력이 초기화되었습니다.");
  };
  const handleResetAllUsedCodes = handleResetAllUsage;

  // 9. Cancel Single Usage Record and Restore Coupon
  const handleCancelUsage = (record: CouponUsageRecord) => {
    if (
      window.confirm(
        `[주문번호: ${record.orderId}]\n'${record.customerName}' 고객님의 '${record.couponTitle}' 쿠폰 사용 내역을 취소하고, 회원이 다시 쿠폰을 사용할 수 있도록 재활성화하시겠습니까?`
      )
    ) {
      cancelCouponUsage(record.id, true);
      notify(`✅ [${record.couponTitle}] 쿠폰이 정상적으로 재활성화(회수)되었습니다.`);
    }
  };

  // 10. Download Usage History as Excel
  const handleDownloadUsageExcel = () => {
    if (filteredUsageHistory.length === 0) {
      notify("다운로드할 쿠폰 사용 내역이 없습니다.");
      return;
    }

    try {
      const exportData = filteredUsageHistory.map((u, index) => ({
        "번호": index + 1,
        "사용일시": u.usedAt,
        "주문번호": u.orderId,
        "쿠폰ID": u.couponId,
        "쿠폰명": u.couponTitle,
        "쿠폰유형": u.couponType === "SHIPPING" ? "배송비지원" : "일반할인",
        "할인금액": Number(u.discountAmount || 0),
        "사용회원명": u.customerName,
        "회원이메일": u.customerEmail,
        "전화번호": u.customerPhone || "-",
        "주문상품": u.orderItemsSummary || "-",
        "실결제금액": Number(u.orderTotalAmount || 0),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "쿠폰사용내역");
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `스토어_쿠폰사용내역_${today}.xlsx`);
    } catch (e) {
      console.error(e);
      notify("쿠폰 사용 내역 엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  // Filtered Usage History
  const filteredUsageHistory = useMemo(() => {
    if (!usageSearchQuery.trim()) return usageHistory;
    const q = usageSearchQuery.toLowerCase().trim();
    return usageHistory.filter(
      (u) =>
        u.orderId.toLowerCase().includes(q) ||
        u.customerName.toLowerCase().includes(q) ||
        u.customerEmail.toLowerCase().includes(q) ||
        u.couponTitle.toLowerCase().includes(q) ||
        (u.customerPhone && u.customerPhone.includes(q)) ||
        (u.orderItemsSummary && u.orderItemsSummary.toLowerCase().includes(q))
    );
  }, [usageHistory, usageSearchQuery]);

  // Total Discount Amount Used
  const totalDiscountUsed = useMemo(() => {
    return usageHistory.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0);
  }, [usageHistory]);

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q));

      // Type Filter
      const matchType =
        typeFilter === "all" ||
        (typeFilter === "FIXED" && c.type === "FIXED") ||
        (typeFilter === "SHIPPING" && c.type === "SHIPPING");

      // Status Filter
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.isActive !== false) ||
        (statusFilter === "inactive" && c.isActive === false);

      return matchSearch && matchType && matchStatus;
    });
  }, [coupons, searchQuery, typeFilter, statusFilter]);

  // Filtered Customers in Modal
  const filteredModalCustomers = useMemo(() => {
    return deduplicateCustomers(allCustomers).filter((cust) => {
      const q = customerSearchQuery.toLowerCase().trim();
      const name = (cust.name || "").toLowerCase();
      const email = (cust.email || "").toLowerCase();
      const phone = (cust.phone || "").replace(/[^0-9]/g, "");

      const matchQuery = !q || name.includes(q) || email.includes(q) || phone.includes(q);
      const matchGrade = customerGradeFilter === "all" || (cust.grade || "GENERAL").toUpperCase() === customerGradeFilter.toUpperCase();

      return matchQuery && matchGrade;
    });
  }, [allCustomers, customerSearchQuery, customerGradeFilter]);

  // Helper for displaying target badge
  const renderTargetBadge = (coupon: AvailableCoupon) => {
    const tType = coupon.targetType || "ALL";

    if (tType === "ALL") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl">
          <Globe className="w-3 h-3 text-neutral-500" />
          전체 회원 발급
        </span>
      );
    }

    if (tType === "GRADE") {
      const grades = coupon.targetGrades || [];
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-xl">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          등급: {grades.join(", ")}
        </span>
      );
    }

    if (tType === "CUSTOMER") {
      const count = coupon.targetCustomerEmails?.length || 0;
      const firstCustomer = coupon.targetCustomerNames?.[0] || coupon.targetCustomerEmails?.[0] || "";
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 px-2.5 py-1 rounded-xl">
          <UserCheck className="w-3 h-3 text-purple-600" />
          지정 회원: {firstCustomer} {count > 1 ? `외 ${count - 1}명` : ""}
        </span>
      );
    }

    return null;
  };

  // 11. Render Coupon Usage History Section (Bottom & Tab)
  const renderUsageSection = () => {
    return (
      <div className="space-y-4 pt-6 border-t border-neutral-200/80 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </span>
              <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                회원 쿠폰 사용 내역 (주문 결제 실시간 연동)
              </h3>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900">
                총 {usageHistory.length}건 (누적 ₩{totalDiscountUsed.toLocaleString()}원 할인 지원)
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              회원이 주문서에서 쿠폰을 적용하여 결제를 완료했을 때 실시간으로 기록되는 사용 내역입니다. 주문 취소 또는 테스트 시 회수(재활성화)할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {usageHistory.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadUsageExcel}
                  className="px-3.5 py-2 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>엑셀 다운로드 (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllUsage}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>사용 이력 초기화</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Toolbar for Usage History */}
        {usageHistory.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={usageSearchQuery}
                onChange={(e) => setUsageSearchQuery(e.target.value)}
                placeholder="주문번호, 회원명, 이메일, 쿠폰명 검색..."
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white transition-all"
              />
            </div>
            <div className="text-xs text-neutral-500 font-bold px-2">
              조회 결과: <strong className="text-neutral-900 dark:text-white">{filteredUsageHistory.length}</strong>건
            </div>
          </div>
        )}

        {/* Table / Empty State */}
        {filteredUsageHistory.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 p-12 text-center rounded-3xl border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {usageSearchQuery ? "검색 조건과 일치하는 쿠폰 사용 내역이 없습니다." : "아직 사용 완료된 쿠폰 내역이 없습니다."}
            </p>
            <p className="text-xs text-neutral-400">
              회원이 주문서에서 쿠폰을 적용하여 결제를 완료하면 이곳에 주문번호, 고객 정보, 할인 금액이 실시간으로 자동 기록됩니다.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50 text-neutral-500 font-extrabold">
                    <th className="py-3 px-3.5 text-center w-12">#</th>
                    <th className="py-3 px-3.5">사용 일시</th>
                    <th className="py-3 px-3.5">주문 번호</th>
                    <th className="py-3 px-3.5">쿠폰 정보</th>
                    <th className="py-3 px-3.5 text-right">할인 금액</th>
                    <th className="py-3 px-3.5">사용 회원 (고객)</th>
                    <th className="py-3 px-3.5">주문 상품 요약</th>
                    <th className="py-3 px-3.5 text-right">실 결제금액</th>
                    <th className="py-3 px-3.5 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredUsageHistory.map((item, index) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-3.5 text-center text-neutral-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {item.usedAt}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-black text-neutral-900 dark:text-white whitespace-nowrap">
                        {item.orderId}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {item.couponTitle}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.couponType === "SHIPPING"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60"
                          }`}>
                            {item.couponType === "SHIPPING" ? "배송비지원" : "일반할인"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        -{item.discountAmount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {item.customerName}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {item.customerEmail}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 max-w-[200px] truncate text-neutral-700 dark:text-neutral-300" title={item.orderItemsSummary}>
                        {item.orderItemsSummary || "-"}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                        ₩{item.orderTotalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCancelUsage(item)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 dark:bg-neutral-800 dark:hover:bg-rose-950/50 dark:text-neutral-300 dark:hover:text-rose-400 border border-neutral-200 dark:border-neutral-700 hover:border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                          title="사용 내역을 취소하고 회원이 쿠폰을 다시 사용할 수 있도록 복원"
                        >
                          사용 취소 (재활성화)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl">
              <Ticket className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-neutral-950 dark:text-white tracking-tight">
              쿠폰 관리 (Coupons & Promotions)
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            주문서 자동 적용 쿠폰 발급, 지정 대상 설정, 할인 혜택, 유효기간, 사용 현황을 실시간 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {coupons.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllCoupons}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="등록된 모든 쿠폰 일괄 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              전체 삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            새 쿠폰 발급
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">전체 등록 쿠폰</div>
          <p className="text-xl font-black text-neutral-950 dark:text-white mt-1.5">{coupons.length}개</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">시스템 발급 관리 중인 쿠폰</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">활성 쿠폰</div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {coupons.filter((c) => c.isActive !== false).length}개
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">주문서 즉시 적용 가능</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">누적 사용 건수</div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
            {usageHistory.length}건
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">회원 결제 완료 적용 건수</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">총 할인 지원액</div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            ₩{totalDiscountUsed.toLocaleString()}원
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">고객 혜택 누적 제공액</p>
        </div>
      </div>

      {/* 2. Sub Tabs (쿠폰 목록 / 사용 현황) */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "list"
              ? "bg-neutral-950 text-white shadow-xs dark:bg-white dark:text-neutral-950"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          쿠폰 목록 및 발급 관리 ({coupons.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("usage")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "usage"
              ? "bg-neutral-950 text-white shadow-xs dark:bg-white dark:text-neutral-950"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          쿠폰 사용 내역 ({usageHistory.length}건)
        </button>
      </div>

      {/* 3. Tab 1: Coupon List */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="쿠폰명, 할인 조건 검색..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="all">모든 할인 유형</option>
                <option value="FIXED">금액 할인 (원)</option>
                <option value="SHIPPING">배송비 지원</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="all">모든 상태</option>
                <option value="active">활성 쿠폰만</option>
                <option value="inactive">비활성 (정지)</option>
              </select>
            </div>
          </div>

          {/* Coupons Table / Cards */}
          {filteredCoupons.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 p-12 text-center rounded-3xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <Ticket className="w-10 h-10 text-neutral-300 mx-auto" />
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                조건에 일치하는 쿠폰이 없습니다.
              </p>
              <p className="text-xs text-neutral-400">
                새 쿠폰을 발급하거나 검색 필터를 조정해 보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon, idx) => {
                const isActive = coupon.isActive !== false;
                const isAutoTop = idx === 0 && isActive;

                return (
                  <div
                    key={coupon.id}
                    className={`bg-white dark:bg-neutral-900 rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 hover:shadow-md ${
                      !isActive
                        ? "border-neutral-200/50 opacity-60 bg-neutral-50/50 dark:bg-neutral-900/50"
                        : isAutoTop
                        ? "border-neutral-900 dark:border-neutral-700 shadow-xs ring-1 ring-neutral-900/10"
                        : "border-neutral-200/80 dark:border-neutral-800"
                    }`}
                  >
                    {/* Top Row: Badges */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAutoTop && (
                            <span className="bg-amber-400 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              주문서 최우선 추천
                            </span>
                          )}
                          {coupon.badge && (
                            <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-[10px] px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                              {coupon.badge}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              coupon.type === "SHIPPING"
                                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {coupon.type === "SHIPPING" ? "배송비지원" : "금액할인"}
                          </span>
                        </div>

                        {/* Status Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(coupon.id)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {isActive ? "활성" : "정지"}
                        </button>
                      </div>

                      {/* Title & Discount */}
                      <div>
                        <h3 className="font-black text-base text-neutral-950 dark:text-white">
                          {coupon.title}
                        </h3>
                        <p className="text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
                          {coupon.discount}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {coupon.condition}
                        </p>
                      </div>
                    </div>

                    {/* Middle Info Details */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-neutral-500">
                        <span>유효 기간</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          ~ {coupon.validUntil}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-500">
                        <span>발급 지정 대상</span>
                        <div>{renderTargetBadge(coupon)}</div>
                      </div>
                    </div>

                    {/* Bottom Actions: Target Summary & Edit/Delete */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        주문서 자동 적용 지원
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(coupon)}
                          className="p-2 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
                          title="쿠폰 수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.title)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                          title="쿠폰 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 쿠폰 관리 하단: 회원 쿠폰 사용 내역 실시간 연동 */}
          {renderUsageSection()}
        </div>
      )}

      {/* 4. Tab 2: Used Coupons Tracking */}
      {activeTab === "usage" && (
        <div className="space-y-4">
          {renderUsageSection()}
        </div>
      )}

      {/* 5. Add / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-neutral-900 dark:text-white" />
                <h3 className="font-black text-base text-neutral-900 dark:text-white">
                  {editingCoupon ? "쿠폰 정보 수정" : "새 쿠폰 발급 (신규 등록)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-5 text-xs font-bold overflow-y-auto flex-1">
              {/* Section 1: 쿠폰 기본 정보 */}
              <div className="space-y-3">
                <h4 className="font-black text-sm text-neutral-950 dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" />
                  쿠폰 기본 정보
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">쿠폰명</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="예: VIP 회원 감사 10,000원 할인 쿠폰"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">표시 배지 텍스트</label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="예: VIP전용, 최대할인, 웰컴혜택"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">할인 유형</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs cursor-pointer"
                    >
                      <option value="FIXED">금액 즉시 할인 (원)</option>
                      <option value="SHIPPING">배송비 전액/일부 지원</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">할인 금액 (KRW)</label>
                    <input
                      type="number"
                      value={formDiscountAmount}
                      onChange={(e) => setFormDiscountAmount(parseInt(e.target.value) || 0)}
                      placeholder="10000"
                      step="500"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">사용 조건 설명</label>
                    <input
                      type="text"
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      placeholder="예: 전 상품 즉시 할인"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-700 dark:text-neutral-300">유효 만료일</label>
                    <input
                      type="text"
                      value={formValidUntil}
                      onChange={(e) => setFormValidUntil(e.target.value)}
                      placeholder="2026.12.31"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: 🎯 발급 지정 대상 설정 */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="font-black text-sm text-neutral-950 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    발급 지정 대상 설정
                  </h4>
                  <span className="text-[11px] text-neutral-500">선택된 대상의 주문서에만 노출됩니다</span>
                </div>

                {/* Target Type Selector Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetType("ALL")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      formTargetType === "ALL"
                        ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 shadow-xs"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>전체 회원</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetType("GRADE")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      formTargetType === "GRADE"
                        ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 shadow-xs"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>회원 등급별 지정</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetType("CUSTOMER")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      formTargetType === "CUSTOMER"
                        ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 shadow-xs"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>특정 회원 직접 지정</span>
                  </button>
                </div>

                {/* Target Type 1: ALL */}
                {formTargetType === "ALL" && (
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
                    <p className="font-extrabold text-neutral-900 dark:text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      쇼핑몰의 모든 회원에게 발급됩니다.
                    </p>
                    <p>로그인한 모든 회원의 주문서 작성 시 자동으로 혜택이 적용됩니다.</p>
                  </div>
                )}

                {/* Target Type 2: GRADE */}
                {formTargetType === "GRADE" && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                    <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                      <span>혜택을 부여할 등급을 선택하세요 (복수 선택 가능):</span>
                      <span className="text-[11px] font-bold text-neutral-500">
                        {formTargetGrades.length}개 등급 선택됨
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ALL_GRADES.map((grade) => {
                        const isChecked = formTargetGrades.includes(grade);
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => toggleGrade(grade)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 shadow-2xs"
                                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{grade} 등급</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Target Type 3: CUSTOMER */}
                {formTargetType === "CUSTOMER" && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-800 dark:text-neutral-200">
                        발급할 회원을 검색하여 지정하세요:
                      </span>
                      <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full">
                        {formSelectedCustomerEmails.length}명 선택됨
                      </span>
                    </div>

                    {/* Customer Search Bar */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="회원 이름, 이메일, 전화번호 검색..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>
                      <select
                        value={customerGradeFilter}
                        onChange={(e) => setCustomerGradeFilter(e.target.value)}
                        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 dark:text-white cursor-pointer"
                      >
                        <option value="all">전체 등급</option>
                        <option value="VVIP">VVIP</option>
                        <option value="PLATINUM">PLATINUM</option>
                        <option value="GOLD">GOLD</option>
                        <option value="SILVER">SILVER</option>
                        <option value="GENERAL">GENERAL</option>
                      </select>
                    </div>

                    {/* Selected Members Chips */}
                    {formSelectedCustomerEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-h-24 overflow-y-auto">
                        {formSelectedCustomerEmails.map((email) => {
                          const cust = allCustomers.find(
                            (c) => (c.email || "").toLowerCase() === email.toLowerCase()
                          );
                          const label = cust?.name ? `${cust.name} (${email})` : email;

                          return (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            >
                              <span>{label}</span>
                              <button
                                type="button"
                                onClick={() => toggleCustomer(email)}
                                className="hover:text-purple-950 dark:hover:text-white cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Customer Selection Table List */}
                    <div className="max-h-44 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 bg-white dark:bg-neutral-900 space-y-1">
                      {filteredModalCustomers.length === 0 ? (
                        <p className="text-xs text-neutral-400 text-center py-6">일치하는 회원이 없습니다.</p>
                      ) : (
                        filteredModalCustomers.map((cust, index) => {
                          const isSelected = formSelectedCustomerEmails.includes(cust.email);
                          return (
                            <div
                              key={`${cust.id || cust.email || 'cust'}-${index}`}
                              onClick={() => toggleCustomer(cust.email)}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-neutral-950 text-white font-bold dark:bg-white dark:text-neutral-950"
                                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                    isSelected
                                      ? "bg-white text-neutral-950 border-white dark:bg-neutral-950 dark:text-white"
                                      : "bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="font-extrabold truncate">{cust.name}</span>
                                <span className="text-[11px] opacity-70 truncate font-mono">{cust.email}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isSelected
                                      ? "bg-white/20 text-white dark:bg-neutral-950/20 dark:text-neutral-950"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                  }`}
                                >
                                  {cust.grade || "GENERAL"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: 활성화 스위치 */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-950 focus:ring-neutral-900"
                  />
                  <span className="text-neutral-800 dark:text-neutral-200 font-bold">
                    즉시 활성화 (발급 대상 고객의 주문서에 자동 적용 허용)
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  {editingCoupon ? "수정 내용 저장" : "새 쿠폰 발급하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
