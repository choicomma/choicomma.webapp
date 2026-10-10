"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";


export function useTimesale(triggerToast: (msg: string) => void) {
  // Time sale states
  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState(() => {
    if (typeof window !== "undefined") {
      const savedSeconds = localStorage.getItem("secret_timesale_seconds");
      if (savedSeconds) {
        return Math.floor(parseInt(savedSeconds) / 3600).toString();
      }
    }
    return "14";
  });
  const [adminTimeSaleMinutes, setAdminTimeSaleMinutes] = useState(() => {
    if (typeof window !== "undefined") {
      const savedSeconds = localStorage.getItem("secret_timesale_seconds");
      if (savedSeconds) {
        return Math.floor((parseInt(savedSeconds) % 3600) / 60).toString();
      }
    }
    return "55";
  });
  const [adminTimeSaleDiscount, setAdminTimeSaleDiscount] = useState("35");
  const [adminTimeSaleTitle, setAdminTimeSaleTitle] = useState("VIP 회원만을 위해 준비된 파격 할인 한정 단독 시크릿 타임세일");
  const [adminTimeSaleStatus, setAdminTimeSaleStatus] = useState("active");
  const [adminTimeSaleCategory, setAdminTimeSaleCategory] = useState("all");
  const [adminTimeSaleProductIds, setAdminTimeSaleProductIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("secret_timesale_product_ids");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.map(String);
        }
      } catch (e) {}
    }
    return [];
  });

  // Secret Time Sale states (Member Target Specific)
  const [secretSalesList, setSecretSalesList] = useState<any[]>([]);

// Load from Git File API and localStorage on mount
  useEffect(() => {
    let isMounted = true;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_secret_timesales");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item: any) => item?.id !== "SECRET-TS-001");
            setSecretSalesList(cleaned);
          }
        } catch (e) {}
      }

      try {
        const savedTS = localStorage.getItem("secret_timesale_product_ids");
        if (savedTS) {
          const parsedTS = JSON.parse(savedTS);
          if (Array.isArray(parsedTS)) {
            setAdminTimeSaleProductIds(parsedTS.map(String));
          }
        }
      } catch (e) {}
    }

    const fetchTimesales = async () => {
      try {
        const res = await fetch("/api/admin/timesale");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            const cleaned = json.data.filter((t: any) => t.id !== "SECRET-TS-001");
            setSecretSalesList(cleaned);
            if (typeof window !== "undefined") {
              localStorage.setItem("admin_secret_timesales", JSON.stringify(cleaned));
            }
          }
        }
      } catch (err) {
        console.warn("Timesale API fetch notice:", err);
      }
    };
    fetchTimesales();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "admin_secret_timesales" && e.newValue && isMounted) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setSecretSalesList(parsed.filter((t: any) => t?.id !== "SECRET-TS-001"));
          }
        } catch (err) {}
      }
      if (e.key === "secret_timesale_product_ids" && e.newValue && isMounted) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAdminTimeSaleProductIds(parsed.map(String));
          }
        } catch (err) {}
      }
    };

    const handleCustomTimesaleSync = () => {
      if (typeof window !== "undefined" && isMounted) {
        try {
          const savedTS = localStorage.getItem("secret_timesale_product_ids");
          if (savedTS) {
            const parsedTS = JSON.parse(savedTS);
            if (Array.isArray(parsedTS)) {
              setAdminTimeSaleProductIds(parsedTS.map(String));
            }
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("secret_timesales_updated", handleCustomTimesaleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("secret_timesales_updated", handleCustomTimesaleSync);
    };
  }, []);

  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("admin_secret_timesales", JSON.stringify(secretSalesList));
      } catch (e) {}
    }
    // Sync to Git File API
    if (Array.isArray(secretSalesList)) {
      fetch("/api/admin/timesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(secretSalesList),
      }).catch((err) => console.warn("Timesale API save notice:", err));
    }
  }, [secretSalesList]);

  // Live Time Sale Countdown
  const [nowTick, setNowTick] = useState(Date.now());
  const [productTimeSaleSettings, setProductTimeSaleSettings] = useState<Record<string, { hours: number; minutes: number; discountPrice?: string; discountRate?: number }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("secret_timesale_item_settings");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {};
  });

  const [productTimeSaleExpiries, setProductTimeSaleExpiries] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("secret_timesale_item_expiries");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {};
  });

  // Ticker every 1 second
  useEffect(() => {
    const interval = setInterval(() => { setNowTick(Date.now()); }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {
    const h = parseInt("14") || 0;
    const m = parseInt("55") || 0;
    return h * 3600 + m * 60;
  });

  useEffect(() => {
    const h = parseInt(adminTimeSaleHours) || 0;
    const m = parseInt(adminTimeSaleMinutes) || 0;
    const totalSec = h * 3600 + m * 60;
    setTimeSaleRemainingSec(totalSec);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("secret_timesale_seconds", totalSec.toString());
      } catch (e) {}
    }
  }, [adminTimeSaleHours, adminTimeSaleMinutes]);

  useEffect(() => {
    if (adminTimeSaleStatus !== "active") return;
    const interval = setInterval(() => {
      setTimeSaleRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [adminTimeSaleStatus]);

  const formatRemainingTimeDisplay = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const formattedHH = String(hours).padStart(2, "0");
    const formattedMM = String(mins).padStart(2, "0");
    const formattedSS = String(secs).padStart(2, "0");
    const expiryDate = new Date(Date.now() + totalSec * 1000);
    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
    const day = String(expiryDate.getDate()).padStart(2, "0");
    const hoursStr = String(expiryDate.getHours()).padStart(2, "0");
    const minsStr = String(expiryDate.getMinutes()).padStart(2, "0");
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = weekDays[expiryDate.getDay()];
    const expiryFormatted = `${year}-${month}-${day} ${hoursStr}:${minsStr} (${dayOfWeek}요일)`;
    return { hours, mins, secs, formattedHH, formattedMM, formattedSS, timeString: `${hours}시간 ${formattedMM}분 ${formattedSS}초`, expiryFormatted };
  };

  const getProductTimeSetting = (productId: string) => {
    if (productTimeSaleSettings[productId]) return productTimeSaleSettings[productId];
    return { hours: parseInt(adminTimeSaleHours) || 24, minutes: parseInt(adminTimeSaleMinutes) || 0 };
  };

  const handleUpdateProductTimeSetting = (productId: string, hours: number, minutes: number, discountPrice?: string, discountRate?: number) => {
    const updatedSettings = {
      ...productTimeSaleSettings,
      [productId]: { ...productTimeSaleSettings[productId], hours, minutes, ...(discountPrice !== undefined ? { discountPrice } : {}), ...(discountRate !== undefined ? { discountRate } : {}) },
    };
    const newExpiry = Date.now() + (hours * 3600 + minutes * 60) * 1000;
    const updatedExpiries = { ...productTimeSaleExpiries, [productId]: newExpiry };
    setProductTimeSaleSettings(updatedSettings);
    setProductTimeSaleExpiries(updatedExpiries);
    if (typeof window !== "undefined") {
      localStorage.setItem("secret_timesale_item_settings", JSON.stringify(updatedSettings));
      localStorage.setItem("secret_timesale_item_expiries", JSON.stringify(updatedExpiries));
      window.dispatchEvent(new CustomEvent("storage"));
    }
  };

  const [isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen] = useState(false);
  const [timeSaleItemSearchQuery, setTimeSaleItemSearchQuery] = useState("");
  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");

  // New product modal timesale states
  const [newIsTimeSale, setNewIsTimeSale] = useState(false);
  const [newTimeSaleHours, setNewTimeSaleHours] = useState("24");
  const [newTimeSaleMinutes, setNewTimeSaleMinutes] = useState("0");
  const [newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice] = useState("");
  const [newTimeSaleDiscountRate, setNewTimeSaleDiscountRate] = useState("35");
  const [newTimeSaleStartMonth, setNewTimeSaleStartMonth] = useState("8");
  const [newTimeSaleStartDay, setNewTimeSaleStartDay] = useState("20");
  const [newTimeSaleStartAmpm, setNewTimeSaleStartAmpm] = useState("오전");
  const [newTimeSaleStartHour, setNewTimeSaleStartHour] = useState("09");
  const [newTimeSaleStartMinute, setNewTimeSaleStartMinute] = useState("00");
  const [newTimeSaleEndMonth, setNewTimeSaleEndMonth] = useState("8");
  const [newTimeSaleEndDay, setNewTimeSaleEndDay] = useState("27");
  const [newTimeSaleEndAmpm, setNewTimeSaleEndAmpm] = useState("오후");
  const [newTimeSaleEndHour, setNewTimeSaleEndHour] = useState("11");
  const [newTimeSaleEndMinute, setNewTimeSaleEndMinute] = useState("59");

  // Edit product modal timesale states
  const [editTimeSaleStartMonth, setEditTimeSaleStartMonth] = useState("8");
  const [editTimeSaleStartDay, setEditTimeSaleStartDay] = useState("20");
  const [editTimeSaleStartAmpm, setEditTimeSaleStartAmpm] = useState("오전");
  const [editTimeSaleStartHour, setEditTimeSaleStartHour] = useState("09");
  const [editTimeSaleStartMinute, setEditTimeSaleStartMinute] = useState("00");
  const [editTimeSaleEndMonth, setEditTimeSaleEndMonth] = useState("8");
  const [editTimeSaleEndDay, setEditTimeSaleEndDay] = useState("27");
  const [editTimeSaleEndAmpm, setEditTimeSaleEndAmpm] = useState("오후");
  const [editTimeSaleEndHour, setEditTimeSaleEndHour] = useState("11");
  const [editTimeSaleEndMinute, setEditTimeSaleEndMinute] = useState("59");

  return {
    adminTimeSaleHours, setAdminTimeSaleHours,
    adminTimeSaleMinutes, setAdminTimeSaleMinutes,
    adminTimeSaleDiscount, setAdminTimeSaleDiscount,
    adminTimeSaleTitle, setAdminTimeSaleTitle,
    adminTimeSaleStatus, setAdminTimeSaleStatus,
    adminTimeSaleCategory, setAdminTimeSaleCategory,
    adminTimeSaleProductIds, setAdminTimeSaleProductIds,
    secretSalesList, setSecretSalesList,
    nowTick,
    productTimeSaleSettings, setProductTimeSaleSettings,
    productTimeSaleExpiries, setProductTimeSaleExpiries,
    timeSaleRemainingSec, setTimeSaleRemainingSec,
    formatRemainingTimeDisplay,
    getProductTimeSetting,
    handleUpdateProductTimeSetting,
    isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen,
    timeSaleItemSearchQuery, setTimeSaleItemSearchQuery,
    timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter,
    newIsTimeSale, setNewIsTimeSale,
    newTimeSaleHours, setNewTimeSaleHours,
    newTimeSaleMinutes, setNewTimeSaleMinutes,
    newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice,
    newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,
    newTimeSaleStartMonth, setNewTimeSaleStartMonth,
    newTimeSaleStartDay, setNewTimeSaleStartDay,
    newTimeSaleStartAmpm, setNewTimeSaleStartAmpm,
    newTimeSaleStartHour, setNewTimeSaleStartHour,
    newTimeSaleStartMinute, setNewTimeSaleStartMinute,
    newTimeSaleEndMonth, setNewTimeSaleEndMonth,
    newTimeSaleEndDay, setNewTimeSaleEndDay,
    newTimeSaleEndAmpm, setNewTimeSaleEndAmpm,
    newTimeSaleEndHour, setNewTimeSaleEndHour,
    newTimeSaleEndMinute, setNewTimeSaleEndMinute,
    editTimeSaleStartMonth, setEditTimeSaleStartMonth,
    editTimeSaleStartDay, setEditTimeSaleStartDay,
    editTimeSaleStartAmpm, setEditTimeSaleStartAmpm,
    editTimeSaleStartHour, setEditTimeSaleStartHour,
    editTimeSaleStartMinute, setEditTimeSaleStartMinute,
    editTimeSaleEndMonth, setEditTimeSaleEndMonth,
    editTimeSaleEndDay, setEditTimeSaleEndDay,
    editTimeSaleEndAmpm, setEditTimeSaleEndAmpm,
    editTimeSaleEndHour, setEditTimeSaleEndHour,
    editTimeSaleEndMinute, setEditTimeSaleEndMinute,
    handleDeleteTimeSale: (id: string) => {
      setSecretSalesList((prev: any[]) => prev.filter((s: any) => s.id !== id));
    },
  };
}
