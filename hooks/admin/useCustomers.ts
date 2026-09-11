"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import initialCustomersData from "@/lib/sfcc/mock/customers-data.json";

const initialCustomers: any[] = initialCustomersData;

const DEFAULT_ADMIN_CUSTOMER = {
  id: "ADMIN-001",
  name: "최고관리자 (Admin)",
  email: "admin@choicomma.com",
  phone: "010-1234-5678",
  address: "서울특별시 강남구 개포로22길 12 6층 (주)초이콤마 본사",
  grade: "VVIP",
  totalSpent: 25000000,
  points: 100000,
  couponsCount: 5,
  joinedDate: "2026-01-01",
  status: "Active",
  role: "ADMIN",
  isAdmin: true,
};

export function useCustomers(triggerToast: (msg: string) => void) {
  // Customer Management Admin State
  const [customersList, setCustomersList] = useState<any[]>([DEFAULT_ADMIN_CUSTOMER]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          const parsed: any[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasAdmin = parsed.some(
              (c) =>
                (c.email && c.email.toLowerCase() === "admin@choicomma.com") ||
                c.id === "ADMIN-001" ||
                c.isAdmin === true
            );
            if (!hasAdmin) {
              const updated = [DEFAULT_ADMIN_CUSTOMER, ...parsed];
              setCustomersList(updated);
              localStorage.setItem("admin_customers", JSON.stringify(updated));
            } else {
              setCustomersList(parsed);
            }
            return;
          }
        } catch (e) { }
      }
      // If no saved customers, initialize with default admin account
      setCustomersList([DEFAULT_ADMIN_CUSTOMER]);
      localStorage.setItem("admin_customers", JSON.stringify([DEFAULT_ADMIN_CUSTOMER]));
    }
  }, []);

  // Real-time sync across tabs & windows
  useEffect(() => {
    const syncAdminCustomers = () => {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomersList(parsed);
          }
        } catch (e) { }
      }
    };

    window.addEventListener("storage", syncAdminCustomers);
    window.addEventListener("admin_customers_updated", syncAdminCustomers);
    const interval = setInterval(syncAdminCustomers, 2000);
    return () => {
      window.removeEventListener("storage", syncAdminCustomers);
      window.removeEventListener("admin_customers_updated", syncAdminCustomers);
      clearInterval(interval);
    };
  }, []);

  // Customer Search & Filters
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerGradeFilter, setCustomerGradeFilter] = useState("all");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all");

  // Add Customer Modal State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("010-");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustGrade, setNewCustGrade] = useState("SILVER");
  const [newCustPoints, setNewCustPoints] = useState("0");
  const [newCustStatus, setNewCustStatus] = useState("Active");

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editCustGrade, setEditCustGrade] = useState("");
  const [editCustAddress, setEditCustAddress] = useState("");
  const [editCustPointsDelta, setEditCustPointsDelta] = useState("0");
  const [editCustStatus, setEditCustStatus] = useState("Active");

  // Customer Handlers
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustEmail.trim()) {
      triggerToast("회원 이름과 이메일 주소를 정확히 입력해 주세요.");
      return;
    }

    const newCust = {
      id: `CUST-${1000 + customersList.length + 1}`,
      name: newCustName.trim(),
      email: newCustEmail.trim(),
      phone: newCustPhone.trim() || "010-0000-0000",
      address: newCustAddress.trim() || "-",
      grade: newCustGrade,
      totalSpent: 0,
      points: parseInt(newCustPoints) || 0,
      couponsCount: 0,
      joinedDate: new Date().toISOString().split("T")[0],
      status: newCustStatus,
    };

    const updated = [newCust, ...customersList];
    setCustomersList(updated);
    setIsAddCustomerModalOpen(false);
    setNewCustName("");
    setNewCustEmail("");
    setNewCustPhone("010-");
    setNewCustAddress("");
    setNewCustGrade("SILVER");
    setNewCustPoints("0");
    triggerToast(`[${newCust.name}] 회원이 정상적으로 등록되었습니다.`);
  };

  const handleOpenEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setEditCustGrade(customer.grade);
    setEditCustAddress(customer.address || "");
    setEditCustPointsDelta("0");
    setEditCustStatus(customer.status || "Active");
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const delta = parseInt(editCustPointsDelta) || 0;
    const currentPoints = editingCustomer.points || 0;
    const calculatedPoints = Math.max(0, currentPoints + delta);

    const updatedList = customersList.map((c) => {
      if (c.id === editingCustomer.id) {
        return {
          ...c,
          grade: editCustGrade,
          address: editCustAddress,
          points: calculatedPoints,
          status: editCustStatus,
        };
      }
      return c;
    });

    setCustomersList(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customers", JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("admin_customers_updated"));
    }
    setEditingCustomer(null);
    triggerToast(`회원 '${editingCustomer.name}'님의 정보가 반영되었습니다.`);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (window.confirm(`정말로 회원 '${name}'님의 계정 정보를 삭제하시겠습니까?`)) {
      const targetCustomer = customersList.find((c) => c.id === id);
      const updated = customersList.filter((c) => c.id !== id);
      setCustomersList(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify(updated));
        if (targetCustomer?.email) {
          localStorage.removeItem(`user_pwd_${targetCustomer.email.trim().toLowerCase()}`);
        }
        if (targetCustomer?.phone) {
          const cleanPhone = targetCustomer.phone.replace(/[^0-9]/g, "");
          localStorage.removeItem(`user_pwd_${cleanPhone}`);
          localStorage.removeItem(`user_pwd_${targetCustomer.phone.trim()}`);
        }
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
      }
      triggerToast(`회원 '${name}'님의 정보가 삭제되었습니다.`);
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const parsedCustomers = rows.map((row, idx) => {
          const rawGrade = String(row["회원 등급"] || row["회원 그룹"] || "").toUpperCase().trim();
          let grade = "GENERAL";
          if (rawGrade.includes("VVIP") || rawGrade.includes("BLACK") || rawGrade.includes("블랙")) grade = "VVIP";
          else if (rawGrade.includes("PLATINUM") || rawGrade.includes("플래티넘")) grade = "PLATINUM";
          else if (rawGrade.includes("GOLD") || rawGrade.includes("골드")) grade = "GOLD";
          else if (rawGrade.includes("SILVER") || rawGrade.includes("실버")) grade = "SILVER";
          else if (rawGrade.includes("GENERAL") || rawGrade.includes("일반") || rawGrade.includes("REGULAR")) grade = "GENERAL";
          else if (parseFloat(row["구매금액(KRW)"]) >= 20000000) grade = "VVIP";
          else if (parseFloat(row["구매금액(KRW)"]) >= 10000000) grade = "PLATINUM";
          else if (parseFloat(row["구매금액(KRW)"]) >= 5000000) grade = "GOLD";
          else if (parseFloat(row["구매금액(KRW)"]) >= 1000000) grade = "SILVER";
          else grade = "GENERAL";

          const rawPhone = String(row["연락처"] || "").trim();
          const rawDate = String(row["가입일"] || "").trim();

          return {
            id: String(row["고유키"] || `CUST-${Date.now()}-${idx}`),
            name: String(row["이름"] || "무명 회원").trim(),
            email: String(row["이메일"] || row["아이디"] || "-").trim(),
            phone: rawPhone || "-",
            grade: grade,
            rawGrade: rawGrade,
            totalSpent: parseFloat(row["구매금액(KRW)"]) || 0,
            points: parseInt(row["보유 적립금 포인트"]) || 0,
            couponsCount: parseInt(row["작성 게시물 개수"]) || 1,
            joinedDate: rawDate ? rawDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            status: "Active",
          };
        });

        const combined = [...parsedCustomers, ...customersList];
        setCustomersList(combined);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_customers", JSON.stringify(combined));
          window.dispatchEvent(new CustomEvent("storage"));
        }
        triggerToast(`엑셀 파일에서 총 ${parsedCustomers.length.toLocaleString()}명의 회원 정보가 연동되었습니다!`);
      } catch (err) {
        console.error(err);
        triggerToast("엑셀 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleResetCustomerData = () => {
    if (window.confirm("엑셀 회원 데이터(5,666명)로 복원하시겠습니까?")) {
      setCustomersList(initialCustomers);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify(initialCustomers));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      triggerToast("엑셀 회원 데이터(5,666명)로 복원되었습니다.");
    }
  };

  const handleClearAllCustomers = () => {
    if (window.confirm("정말로 모든 회원 정보를 초기화(0명) 하시겠습니까?")) {
      setCustomersList([]);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify([]));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      triggerToast("전체 회원 목록이 0명으로 초기화되었습니다.");
    }
  };

  const newCustomersThisMonth = useMemo(() => {
    const currentYM = new Date().toISOString().slice(0, 7);
    return customersList.filter((c) => c.joinedDate && c.joinedDate.startsWith(currentYM)).length;
  }, [customersList]);

  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()));
      const matchesGrade = customerGradeFilter === "all" || c.grade === customerGradeFilter;
      const matchesStatus = customerStatusFilter === "all" || c.status === customerStatusFilter;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [customersList, customerSearchQuery, customerGradeFilter, customerStatusFilter]);

  // Pagination
  const [customerPage, setCustomerPage] = useState(1);
  const CUSTOMERS_PER_PAGE = 25;

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchQuery, customerGradeFilter, customerStatusFilter]);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  return {
    customersList,
    setCustomersList,
    customerSearchQuery,
    setCustomerSearchQuery,
    customerGradeFilter,
    setCustomerGradeFilter,
    customerStatusFilter,
    setCustomerStatusFilter,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
    newCustName, setNewCustName,
    newCustEmail, setNewCustEmail,
    newCustPhone, setNewCustPhone,
    newCustAddress, setNewCustAddress,
    newCustGrade, setNewCustGrade,
    newCustPoints, setNewCustPoints,
    newCustStatus, setNewCustStatus,
    editingCustomer, setEditingCustomer,
    editCustGrade, setEditCustGrade,
    editCustAddress, setEditCustAddress,
    editCustPointsDelta, setEditCustPointsDelta,
    editCustStatus, setEditCustStatus,
    handleAddCustomerSubmit,
    handleOpenEditCustomer,
    handleSaveEditCustomer,
    handleDeleteCustomer,
    handleExcelFileUpload,
    handleResetCustomerData,
    handleClearAllCustomers,
    newCustomersThisMonth,
    filteredCustomers,
    customerPage,
    setCustomerPage,
    totalCustomerPages,
    paginatedCustomers,
    CUSTOMERS_PER_PAGE,
  };
}
