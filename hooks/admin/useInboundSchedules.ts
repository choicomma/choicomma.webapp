"use client";

import { useState, useEffect } from "react";

const initialInboundSchedules: any[] = [];

export function useInboundSchedules(triggerToast?: (msg: string) => void) {
  const [inboundSchedulesList, setInboundSchedulesList] = useState<any[]>(initialInboundSchedules);
  const [isMounted, setIsMounted] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [inboundSearchQuery, setInboundSearchQuery] = useState("");
  const [inboundStatusFilter, setInboundStatusFilter] = useState("all");
  const [isAddInboundModalOpen, setIsAddInboundModalOpen] = useState(false);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [inboundItemSearchQuery, setInboundItemSearchQuery] = useState("");
  const [selectedInboundItem, setSelectedInboundItem] = useState<any | null>(null);
  const [newInboundDate, setNewInboundDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newInboundTitle, setNewInboundTitle] = useState("");
  const [newInboundQuantity, setNewInboundQuantity] = useState(100);
  const [newInboundSupplier, setNewInboundSupplier] = useState("");
  const [newInboundWarehouse, setNewInboundWarehouse] = useState("제1물류센터 A구역");
  const [newInboundNotes, setNewInboundNotes] = useState("");
  const [newInboundStatus, setNewInboundStatus] = useState("Scheduled");

  // Load from Central Git File API (/api/admin/inbound) on mount
  useEffect(() => {
    setIsMounted(true);
    let mounted = true;

    const fetchInbound = async () => {
      try {
        const res = await fetch("/api/admin/inbound");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && mounted) {
            setInboundSchedulesList(json.data);
            if (typeof window !== "undefined") {
              localStorage.setItem("admin_inbound_schedules", JSON.stringify(json.data));
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Notice: Inbound API fetch fallback:", err);
      }

      if (typeof window !== "undefined" && mounted) {
        const saved = localStorage.getItem("admin_inbound_schedules");
        if (saved) {
          try {
            setInboundSchedulesList(JSON.parse(saved));
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    fetchInbound();

    const handleUpdated = () => fetchInbound();
    window.addEventListener("admin_inbound_updated", handleUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("admin_inbound_updated", handleUpdated);
    };
  }, []);

  // Persist to localStorage when list changes
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const currentSaved = localStorage.getItem("admin_inbound_schedules");
      const nextJson = JSON.stringify(inboundSchedulesList);
      if (currentSaved !== nextJson) {
        localStorage.setItem("admin_inbound_schedules", nextJson);
      }
    }
  }, [inboundSchedulesList, isMounted]);

  const handleDeleteInboundSchedule = (id: string) => {
    if (!window.confirm("정말로 해당 입고 일정을 삭제하시겠습니까?")) return;
    setInboundSchedulesList((prev) => prev.filter((item) => item.id !== id));
    if (selectedInboundItem?.id === id) setSelectedInboundItem(null);

    // Git File API 삭제
    fetch(`/api/admin/inbound?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(() => window.dispatchEvent(new CustomEvent("admin_inbound_updated")))
      .catch((err) => console.warn("Inbound delete notice:", err));

    triggerToast?.("입고 일정이 삭제되었습니다.");
  };

  const handleUpdateInboundStatus = (id: string, status: string) => {
    const updated = inboundSchedulesList.map((item: any) =>
      item.id === id ? { ...item, status } : item
    );
    setInboundSchedulesList(updated);

    const target = updated.find((item: any) => item.id === id);
    if (target) {
      // Git File API 업데이트
      fetch("/api/admin/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      })
        .then(() => window.dispatchEvent(new CustomEvent("admin_inbound_updated")))
        .catch((err) => console.warn("Inbound update notice:", err));
    }

    triggerToast?.("입고 상태가 변경되었습니다.");
  };

  const handleAddInboundSchedule = () => {
    if (!newInboundTitle.trim()) {
      alert("입고 품목명을 입력해주세요.");
      return;
    }
    const newItem = {
      id: `INBOUND-${Date.now()}`,
      title: newInboundTitle.trim(),
      date: newInboundDate,
      quantity: newInboundQuantity,
      supplier: newInboundSupplier.trim(),
      warehouse: newInboundWarehouse,
      notes: newInboundNotes.trim(),
      status: newInboundStatus,
    };
    setInboundSchedulesList((prev) => [newItem, ...prev]);

    // Git File API 추가
    fetch("/api/admin/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then(() => window.dispatchEvent(new CustomEvent("admin_inbound_updated")))
      .catch((err) => console.warn("Inbound insert notice:", err));

    setIsAddInboundModalOpen(false);
    setNewInboundTitle("");
    setNewInboundQuantity(100);
    setNewInboundSupplier("");
    setNewInboundNotes("");
    setNewInboundStatus("Scheduled");
    triggerToast?.("입고 일정이 등록되었습니다.");
  };

  return {
    inboundSchedulesList,
    setInboundSchedulesList,
    isMounted,
    calendarDate,
    setCalendarDate,
    inboundSearchQuery,
    setInboundSearchQuery,
    inboundStatusFilter,
    setInboundStatusFilter,
    isAddInboundModalOpen,
    setIsAddInboundModalOpen,
    selectedInboundItem,
    setSelectedInboundItem,
    isInboundModalOpen,
    setIsInboundModalOpen,
    inboundItemSearchQuery,
    setInboundItemSearchQuery,
    newInboundDate,
    setNewInboundDate,
    newInboundTitle,
    setNewInboundTitle,
    newInboundQuantity,
    setNewInboundQuantity,
    newInboundSupplier,
    setNewInboundSupplier,
    newInboundWarehouse,
    setNewInboundWarehouse,
    newInboundNotes,
    setNewInboundNotes,
    newInboundStatus,
    setNewInboundStatus,
    handleDeleteInboundSchedule,
    handleUpdateInboundStatus,
    handleAddInboundSchedule,
  };
}
