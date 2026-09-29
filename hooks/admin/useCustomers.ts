"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase/client";
import { splitKoreanAddress } from "@/lib/address";

const initialCustomers: any[] = [];

const DEFAULT_CUSTOMERS = [
  {
    id: "ADMIN-001",
    name: "최고관리자 (Admin)",
    email: "admin@choicomma.com",
    phone: "02-579-1171",
    postcode: "06306",
    address: "서울특별시 강남구 개포로22길 12",
    detailAddress: "6층 (주)초이콤마 본사",
    grade: "VVIP",
    totalSpent: 25000000,
    points: 100000,
    couponsCount: 0,
    joinedDate: "2026-01-01",
    status: "Active",
    role: "ADMIN",
    isAdmin: true,
  },
  {
    id: "chogun",
    name: "조건",
    email: "cho@findcategory.co.kr",
    phone: "010-7576-3031",
    postcode: "10835",
    address: "경기 파주시 파주읍 파주리 722-1",
    detailAddress: "한울하임 106동 202호",
    grade: "GENERAL",
    totalSpent: 0,
    points: 0,
    couponsCount: 0,
    joinedDate: "2026-09-28",
    status: "Active",
    role: "CUSTOMER",
    isAdmin: false,
  },
];

export const DEFAULT_ADMIN_CUSTOMER = DEFAULT_CUSTOMERS[0];

export function isSuperAdmin(c: any): boolean {
  if (!c) return false;
  const id = String(c.id || "").trim().toUpperCase();
  const email = String(c.email || "").trim().toLowerCase();
  const name = String(c.name || "");
  return (
    id === "ADMIN-001" ||
    email === "admin@choicomma.com" ||
    email === "admin" ||
    name.includes("최고관리자") ||
    c.isAdmin === true ||
    c.role === "ADMIN"
  );
}

export function getCustomerKey(c: any): string {
  if (isSuperAdmin(c)) return "ADMIN-001";
  const id = String(c.id || "").trim().toLowerCase();
  const email = String(c.email || "").trim().toLowerCase();
  return id || email || "";
}

/**
 * 회원 목록 중복 완전 제거 (최고관리자 ADMIN-001 단 1개 보장 및 ID/이메일 충돌 원천 방지)
 */
export function deduplicateCustomers(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_CUSTOMERS;
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const result: any[] = [];

  let adminAdded = false;

  for (const c of list) {
    if (!c) continue;
    if (isSuperAdmin(c)) {
      if (!adminAdded) {
        result.push({
          ...DEFAULT_ADMIN_CUSTOMER,
          ...c,
          id: "ADMIN-001",
          name: "최고관리자 (Admin)",
          email: "admin@choicomma.com",
          role: "ADMIN",
          isAdmin: true,
        });
        seenIds.add("ADMIN-001");
        seenEmails.add("admin@choicomma.com");
        adminAdded = true;
      }
      continue;
    }

    const id = String(c.id || "").trim();
    const email = String(c.email || "").trim().toLowerCase();

    // ID 또는 고유 이메일 중복 시 건너뜀
    if (id && seenIds.has(id.toUpperCase())) continue;
    if (email && email !== "-" && seenEmails.has(email)) continue;

    if (id) seenIds.add(id.toUpperCase());
    if (email && email !== "-") seenEmails.add(email);

    result.push(c);
  }

  if (!adminAdded) {
    result.unshift(DEFAULT_ADMIN_CUSTOMER);
  }

  return result;
}

function parseCustomerRow(row: any, idx: number) {
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

  const rawZip = String(row["우편번호"] || row["받는분우편번호"] || "").trim();
  const rawAddr = String(row["주소"] || row["받는분주소(전체, 분할)"] || row["받는분주소"] || row["배송지주소"] || row["기본주소"] || "").trim();
  const rawDetailAddr = String(row["상세주소"] || row["받는분상세주소(분할)"] || row["받는분상세주소"] || "").trim();

  // 기본 주소와 상세 주소를 엄격히 분리 (중복 포함 방지)
  const parsedAddr = splitKoreanAddress(rawAddr, rawZip, rawDetailAddr);

  return {
    id: String(row["고유키"] || `CUST-${Date.now()}-${idx}`),
    name: String(row["이름"] || row["받는분성명"] || row["고객명"] || "무명 회원").trim(),
    email: String(row["이메일"] || row["아이디"] || "-").trim(),
    phone: rawPhone || "-",
    postcode: parsedAddr.postcode,
    address: parsedAddr.baseAddress || "-",
    detailAddress: parsedAddr.detailAddress,
    grade: grade,
    rawGrade: rawGrade,
    totalSpent: parseFloat(row["구매금액(KRW)"]) || 0,
    points: parseInt(row["보유 적립금 포인트"]) || 0,
    couponsCount: 0,
    joinedDate: rawDate ? rawDate.split(" ")[0] : new Date().toISOString().split("T")[0],
    status: "Active",
  };
}

export function getCachedCustomers(): any[] {
  if (typeof window === "undefined") return DEFAULT_CUSTOMERS;
  try {
    const saved = localStorage.getItem("admin_customers");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = deduplicateCustomers([
          ...DEFAULT_CUSTOMERS,
          ...parsed.map((c: any) => {
            if (!c || isSuperAdmin(c)) return c;
            const parsedAddr = splitKoreanAddress(
              c.address,
              c.postcode || c.zipCode || "",
              c.detailAddress || c.addressDetail || ""
            );
            return {
              ...c,
              postcode: parsedAddr.postcode,
              address: parsedAddr.baseAddress,
              detailAddress: parsedAddr.detailAddress,
            };
          }),
        ]);
        try {
          localStorage.setItem("admin_customers", JSON.stringify(cleaned));
        } catch (e) {}
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (e) {}
  return DEFAULT_CUSTOMERS;
}

export function useCustomers(triggerToast: (msg: string) => void) {
  const [isCustomersLoaded, setIsCustomersLoaded] = useState(true);

  // Customer Management Admin State - Synchronous initial read from localStorage cache
  const [customersList, setCustomersList] = useState<any[]>(() => {
    return getCachedCustomers();
  });

  // Load from Supabase on mount (fallback: localStorage)
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately apply cached customers on client mount (0ms latency, eliminates any 1-count flicker)
    const cached = getCachedCustomers();
    if (cached.length > 0) {
      setCustomersList(cached);
      setIsCustomersLoaded(true);
    }

    const fetchCustomers = async () => {
      try {
        let serverData: any[] = [];
        try {
          const apiRes = await fetch("/api/admin/customers", { cache: "no-store" });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson.success && Array.isArray(apiJson.customers)) {
              serverData = apiJson.customers;
            }
          }
        } catch (e) {}

        if (serverData.length === 0) {
          const { data, error } = await supabase
            .from("customers")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && Array.isArray(data)) {
            serverData = data;
          }
        }

        const localCached = getCachedCustomers();
        const customerMap = new Map<string, any>();

        // 1. 최고관리자 및 기본 등록 회원 우선 등록
        DEFAULT_CUSTOMERS.forEach((dc) => {
          const key = getCustomerKey(dc);
          if (key) {
            customerMap.set(key, dc);
          }
        });

        // 2. 로컬 캐시 회원 우선 유지 (최고관리자는 ADMIN-001 단일 키로 병합)
        localCached.forEach((c) => {
          const key = getCustomerKey(c);
          if (key && (key === "ADMIN-001" || !c.rawGrade)) {
            if (key === "ADMIN-001") {
              const existingAdmin = customerMap.get("ADMIN-001") || DEFAULT_ADMIN_CUSTOMER;
              customerMap.set("ADMIN-001", {
                ...DEFAULT_ADMIN_CUSTOMER,
                ...existingAdmin,
                ...c,
                id: "ADMIN-001",
                name: "최고관리자 (Admin)",
                email: "admin@choicomma.com",
                role: "ADMIN",
                isAdmin: true,
              });
            } else {
              customerMap.set(key, c);
            }
          }
        });

        // 3. Supabase 원격 DB 회원 병합 및 주소 정제 (최고관리자는 ADMIN-001 단일 키로 병합)
        serverData.forEach((c) => {
          const key = getCustomerKey(c);
          if (key && (key === "ADMIN-001" || !c.rawGrade)) {
            const existing = customerMap.get(key) || {};
            const parsed = splitKoreanAddress(
              c.address,
              c.postcode || c.zipCode || existing.postcode || "",
              c.detailAddress || c.addressDetail || existing.detailAddress || ""
            );
            if (key === "ADMIN-001") {
              customerMap.set("ADMIN-001", {
                ...DEFAULT_ADMIN_CUSTOMER,
                ...existing,
                ...c,
                id: "ADMIN-001",
                name: "최고관리자 (Admin)",
                email: "admin@choicomma.com",
                role: "ADMIN",
                isAdmin: true,
                postcode: parsed.postcode,
                address: parsed.baseAddress,
                detailAddress: parsed.detailAddress,
              });
            } else {
              customerMap.set(key, {
                ...existing,
                ...c,
                postcode: parsed.postcode,
                address: parsed.baseAddress,
                detailAddress: parsed.detailAddress,
              });
            }
          }
        });

        const finalList = deduplicateCustomers(Array.from(customerMap.values()));
        if (isMounted) {
          setCustomersList(finalList);
          setIsCustomersLoaded(true);
          if (typeof window !== "undefined") {
            localStorage.setItem("admin_customers", JSON.stringify(finalList));
          }

          // 4. 로컬에만 있고 원격 DB에 누락된 회원은 백그라운드 자동 동기화 (최고관리자 제외)
          localCached.forEach((lc) => {
            if (
              !isSuperAdmin(lc) &&
              !serverData.some((sc) => sc.id === lc.id || (sc.email && sc.email === lc.email))
            ) {
              fetch("/api/admin/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lc),
              }).catch(() => {});
            }
          });
        }
        return;
      } catch (err) {
        console.warn("Notice: Using local customers fallback:", err);
      }

      // Local storage fallback (엑셀 원본 회원2026_08_03_1.xls에서 가져온 더미 데이터 완전 배제)
      if (typeof window !== "undefined" && isMounted) {
        const localList = getCachedCustomers();
        const finalList = deduplicateCustomers(localList.length > 0 ? localList : DEFAULT_CUSTOMERS);
        setCustomersList(finalList);
        setIsCustomersLoaded(true);
        localStorage.setItem("admin_customers", JSON.stringify(finalList));
      }
    };

    fetchCustomers();

    // Supabase Realtime 채널
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel("customers-realtime-sub")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "customers" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new;
              setCustomersList((prev) => deduplicateCustomers([newRow, ...prev]));
            } else if (payload.eventType === "UPDATE") {
              const updatedRow = payload.new;
              setCustomersList((prev) =>
                deduplicateCustomers(
                  prev.map((c) => (c.id === updatedRow.id ? { ...c, ...updatedRow } : c))
                )
              );
            } else if (payload.eventType === "DELETE") {
              setCustomersList((prev) =>
                deduplicateCustomers(prev.filter((c) => c.id !== payload.old.id))
              );
            }
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn("Customers Realtime error:", realtimeErr);
    }

    // 로컬 스토리지 변경 및 타 컴포넌트(합배송 등) 적립금 변동 실시간 동기화
    const handleCustomersUpdated = (e?: any) => {
      if (e && e.key && e.key !== "admin_customers") return;
      if (typeof window !== "undefined" && isMounted) {
        setCustomersList(getCachedCustomers());
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("admin_customers_updated", handleCustomersUpdated);
      window.addEventListener("storage", handleCustomersUpdated);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("admin_customers_updated", handleCustomersUpdated);
        window.removeEventListener("storage", handleCustomersUpdated);
      }
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
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
  const [editCustPointAction, setEditCustPointAction] = useState<"add" | "sub">("add");
  const [editCustPointAmount, setEditCustPointAmount] = useState("");
  const [editCustStatus, setEditCustStatus] = useState("Active");

  // Customer Handlers
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustEmail.trim()) {
      triggerToast("회원 이름과 이메일 주소를 정확히 입력해 주세요.");
      return;
    }
    if (isSuperAdmin({ name: newCustName, email: newCustEmail })) {
      triggerToast("최고관리자 계정은 추가로 등록할 수 없습니다.");
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

    const updated = deduplicateCustomers([newCust, ...customersList]);
    setCustomersList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customers", JSON.stringify(updated));
    }

    // Supabase DB 비동기 저장 (Server API & Client SDK)
    fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCust),
    }).catch(() => {
      supabase.from("customers").upsert([newCust], { onConflict: "id" }).then(({ error }) => {
        if (error) console.warn("Supabase customer insert notice:", error.message);
      });
    });

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
    setEditCustPointAction("add");
    setEditCustPointAmount("");
    setEditCustStatus(customer.status || "Active");
  };

  const handleApplyCustomerPoints = (action: "add" | "sub", customAmount?: number) => {
    if (!editingCustomer) return;

    let amount = customAmount;
    if (amount === undefined) {
      amount = parseInt((editCustPointAmount || "").replace(/[^0-9]/g, ""), 10);
    }

    if (isNaN(amount) || amount <= 0) {
      triggerToast("지급 또는 차감할 적립금 금액을 입력해 주세요.");
      return;
    }

    const currentPoints = Number(editingCustomer.points || 0);
    if (action === "sub" && currentPoints <= 0) {
      triggerToast("현재 보유 적립금이 0원이므로 차감할 수 없습니다.");
      return;
    }

    const delta = action === "add" ? amount : -amount;
    const newPoints = Math.max(0, currentPoints + delta);

    // 모달 내부 상태 즉각 갱신
    setEditingCustomer((prev: any) => (prev ? { ...prev, points: newPoints } : null));

    // 전체 회원 목록 갱신
    const updatedList = customersList.map((c) => {
      if (c.id === editingCustomer.id) {
        return {
          ...c,
          points: newPoints,
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

    // Supabase DB 비동기 수정
    supabase
      .from("customers")
      .update({
        points: newPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCustomer.id)
      .then(({ error }) => {
        if (error) console.warn("Supabase points update notice:", error.message);
      });

    setEditCustPointAmount("");
    triggerToast(
      `${editingCustomer.name}님에게 적립금 ₩${amount.toLocaleString()}원이 ${
        action === "add" ? "지급" : "차감"
      }되었습니다. (현재: ₩${newPoints.toLocaleString()})`
    );
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    let delta = 0;
    const cleanAmount = parseInt((editCustPointAmount || "").replace(/[^0-9]/g, ""), 10);
    if (!isNaN(cleanAmount) && cleanAmount > 0) {
      delta = editCustPointAction === "add" ? cleanAmount : -cleanAmount;
    }

    const currentPoints = Number(editingCustomer.points || 0);
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

    // Supabase DB 비동기 수정
    supabase.from("customers").update({
      grade: editCustGrade,
      address: editCustAddress,
      points: calculatedPoints,
      status: editCustStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", editingCustomer.id).then(({ error }) => {
      if (error) console.warn("Supabase customer update notice:", error.message);
    });

    setEditingCustomer(null);
    triggerToast(`회원 '${editingCustomer.name}'님의 정보가 반영되었습니다.`);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    const targetCustomer = customersList.find((c) => c.id === id);
    if (isSuperAdmin(targetCustomer) || id === "ADMIN-001") {
      triggerToast("최고관리자 계정은 시스템 기본 계정으로 삭제할 수 없습니다.");
      return;
    }
    if (window.confirm(`정말로 회원 '${name}'님의 계정 정보를 삭제하시겠습니까?`)) {
      const updated = deduplicateCustomers(customersList.filter((c) => c.id !== id));
      setCustomersList(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify(updated));
        const custEmail = targetCustomer?.email ? targetCustomer.email.trim().toLowerCase() : "";
        const custLoginId = targetCustomer?.loginId || targetCustomer?.login_id ? (targetCustomer.loginId || targetCustomer.login_id).trim().toLowerCase() : "";
        const custPhone = targetCustomer?.phone ? targetCustomer.phone.trim() : "";
        const cleanPhone = custPhone.replace(/[^0-9]/g, "");

        if (custEmail) {
          localStorage.removeItem(`user_pwd_${custEmail}`);
          localStorage.removeItem(`site_live_chat_messages_${custEmail}`);
        }
        if (custLoginId) {
          localStorage.removeItem(`user_pwd_${custLoginId}`);
          localStorage.removeItem(`site_live_chat_messages_${custLoginId}`);
        }
        if (cleanPhone) {
          localStorage.removeItem(`user_pwd_${cleanPhone}`);
          localStorage.removeItem(`site_live_chat_messages_${cleanPhone}`);
        }
        if (custPhone) {
          localStorage.removeItem(`user_pwd_${custPhone}`);
          localStorage.removeItem(`site_live_chat_messages_${custPhone}`);
        }
        localStorage.removeItem(`user_pwd_${id}`);
        localStorage.removeItem(`site_live_chat_messages_${id}`);

        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
      }

      // Supabase DB 비동기 영구 삭제 (고객 정보 및 채팅 세션/메시지)
      supabase.from("customers").delete().eq("id", id).then(({ error }) => {
        if (error) console.warn("Supabase customer delete notice:", error.message);
      });
      const custEmail = targetCustomer?.email ? targetCustomer.email.trim().toLowerCase() : "";
      const custLoginId = targetCustomer?.loginId || targetCustomer?.login_id ? (targetCustomer.loginId || targetCustomer.login_id).trim().toLowerCase() : "";
      const custPhone = targetCustomer?.phone ? targetCustomer.phone.trim() : "";
      const cleanPhone = custPhone.replace(/[^0-9]/g, "");

      if (custEmail && custEmail !== "admin@choicomma.com") {
        supabase.from("customers").delete().ilike("email", custEmail).then(() => {});
        supabase.from("chat_sessions").delete().eq("id", custEmail).then(() => {});
        supabase.from("chat_messages").delete().eq("sessionId", custEmail).then(() => {});
      }
      if (custLoginId) {
        supabase.from("customers").delete().eq("loginId", custLoginId).then(() => {});
        supabase.from("customers").delete().eq("login_id", custLoginId).then(() => {});
        supabase.from("chat_sessions").delete().eq("id", custLoginId).then(() => {});
        supabase.from("chat_messages").delete().eq("sessionId", custLoginId).then(() => {});
      }
      if (cleanPhone && cleanPhone.length >= 8) {
        supabase.from("customers").delete().eq("phone", custPhone).then(() => {});
        supabase.from("customers").delete().eq("phone", cleanPhone).then(() => {});
        supabase.from("chat_sessions").delete().eq("id", cleanPhone).then(() => {});
        supabase.from("chat_messages").delete().eq("sessionId", cleanPhone).then(() => {});
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

        const parsedCustomers = rows.map((row, idx) => parseCustomerRow(row, idx));

        const combined = deduplicateCustomers([...parsedCustomers, ...customersList]);
        setCustomersList(combined);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_customers", JSON.stringify(combined));
          window.dispatchEvent(new CustomEvent("storage"));
        }
        triggerToast(`엑셀 파일에서 총 ${parsedCustomers.length.toLocaleString()}명의 회원 정보(배송지 주소 포함)가 연동되었습니다!`);
      } catch (err) {
        console.error(err);
        triggerToast("엑셀 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleResetCustomerData = async () => {
    if (window.confirm("회원 목록을 초기화하고 최고관리자 및 기본 등록 회원 상태로 설정하시겠습니까?")) {
      setCustomersList(DEFAULT_CUSTOMERS);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify(DEFAULT_CUSTOMERS));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      triggerToast("회원 목록이 최고관리자 및 기본 등록 회원 상태로 초기화되었습니다.");
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
    editCustPointAction, setEditCustPointAction,
    editCustPointAmount, setEditCustPointAmount,
    editCustStatus, setEditCustStatus,
    handleAddCustomerSubmit,
    handleOpenEditCustomer,
    handleApplyCustomerPoints,
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
    isCustomersLoaded,
  };
}
