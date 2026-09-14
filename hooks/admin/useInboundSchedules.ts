"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

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

  // Load from Supabase on mount (fallback: localStorage)
  useEffect(() => {
    setIsMounted(true);
    let mounted = true;

    const fetchInbound = async () => {
      try {
        const { data, error } = await supabase
          .from("inbound_schedules")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0 && mounted) {
          setInboundSchedulesList(data);
          if (typeof window !== "undefined") {
            localStorage.setItem("admin_inbound_schedules", JSON.stringify(data));
          }
          return;
        }
      } catch (err) {
        console.warn("Notice: Using local inbound fallback:", err);
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

    // Supabase Realtime 채널
    let channel: any = null;
    try {
      channel = supabase
        .channel("inbound-realtime-sub")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inbound_schedules" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new;
              setInboundSchedulesList((prev) => [newRow, ...prev.filter((i) => i.id !== newRow.id)]);
            } else if (payload.eventType === "UPDATE") {
              const updatedRow = payload.new;
              setInboundSchedulesList((prev) =>
                prev.map((i) => (i.id === updatedRow.id ? { ...i, ...updatedRow } : i))
              );
            } else if (payload.eventType === "DELETE") {
              setInboundSchedulesList((prev) => prev.filter((i) => i.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Inbound realtime notice:", e);
    }

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
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

    // Supabase DB 삭제
    supabase.from("inbound_schedules").delete().eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase inbound delete notice:", error.message);
    });

    triggerToast?.("입고 일정이 삭제되었습니다.");
  };

  const handleUpdateInboundStatus = (id: string, status: string) => {
    const updated = inboundSchedulesList.map((item: any) =>
      item.id === id ? { ...item, status } : item
    );
    setInboundSchedulesList(updated);

    // Supabase DB 상태 수정
    supabase.from("inbound_schedules").update({ status, updated_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase inbound update notice:", error.message);
    });

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

    // Supabase DB 추가
    supabase.from("inbound_schedules").insert([newItem]).then(({ error }) => {
      if (error) console.warn("Supabase inbound insert notice:", error.message);
    });

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
