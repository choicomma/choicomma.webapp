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

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_inbound_schedules");
      if (saved) {
        try {
          setInboundSchedulesList(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Real-time sync across tabs & windows
  useEffect(() => {
    const syncInbound = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("admin_inbound_schedules");
        if (saved) {
          try {
            setInboundSchedulesList((prev) => {
              if (JSON.stringify(prev) !== saved) {
                return JSON.parse(saved);
              }
              return prev;
            });
          } catch (e) { }
        }
      }
    };
    window.addEventListener("storage", syncInbound);
    window.addEventListener("admin_inbound_updated", syncInbound);
    const interval = setInterval(syncInbound, 3000);
    return () => {
      window.removeEventListener("storage", syncInbound);
      window.removeEventListener("admin_inbound_updated", syncInbound);
      clearInterval(interval);
    };
  }, []);

  // Persist to localStorage when list changes
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const currentSaved = localStorage.getItem("admin_inbound_schedules");
      const nextJson = JSON.stringify(inboundSchedulesList);
      if (currentSaved !== nextJson) {
        localStorage.setItem("admin_inbound_schedules", nextJson);
        window.dispatchEvent(new CustomEvent("admin_inbound_updated"));
      }
    }
  }, [inboundSchedulesList, isMounted]);

  const handleDeleteInboundSchedule = (id: string) => {
    if (!window.confirm("정말로 해당 입고 일정을 삭제하시겠습니까?")) return;
    setInboundSchedulesList((prev) => prev.filter((item) => item.id !== id));
    if (selectedInboundItem?.id === id) setSelectedInboundItem(null);
    triggerToast?.("입고 일정이 삭제되었습니다.");
  };

  const handleUpdateInboundStatus = (id: string, status: string) => {
    const updated = inboundSchedulesList.map((item: any) =>
      item.id === id ? { ...item, status } : item
    );
    setInboundSchedulesList(updated);
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
      createdAt: new Date().toISOString(),
    };
    setInboundSchedulesList((prev) => [newItem, ...prev]);
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
    isInboundModalOpen,
    setIsInboundModalOpen,
    inboundItemSearchQuery,
    setInboundItemSearchQuery,
    handleUpdateInboundStatus,
    handleAddInboundSchedule,
    handleDeleteInboundSchedule,
  };
}
