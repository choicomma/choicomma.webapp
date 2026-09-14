"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function useInquiries(triggerToast?: (msg: string) => void) {
  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

  // Load inquiries from Supabase on mount (fallback: localStorage)
  useEffect(() => {
    let isMounted = true;
    const fetchInquiries = async () => {
      try {
        const { data, error } = await supabase
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setInquiriesList(data);
          if (typeof window !== "undefined") {
            localStorage.setItem("admin_customer_inquiries", JSON.stringify(data));
          }
          return;
        }
      } catch (err) {
        console.warn("Notice: Inquiries fallback:", err);
      }

      if (typeof window !== "undefined" && isMounted) {
        const saved = localStorage.getItem("admin_customer_inquiries");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setInquiriesList(parsed);
          } catch (e) {}
        }
      }
    };

    fetchInquiries();

    // Supabase Realtime 채널
    let channel: any = null;
    try {
      channel = supabase
        .channel("inquiries-realtime-sub")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inquiries" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setInquiriesList((prev) => [payload.new, ...prev.filter((i) => i.id !== payload.new.id)]);
            } else if (payload.eventType === "UPDATE") {
              setInquiriesList((prev) =>
                prev.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i))
              );
            } else if (payload.eventType === "DELETE") {
              setInquiriesList((prev) => prev.filter((i) => i.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    } catch (e) {}

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleReplyToInquiry = (inquiry: any, replyMessage: string) => {
    if (!replyMessage?.trim()) return;
    const repliedAt = new Date().toISOString();
    const updated = inquiriesList.map((item: any) =>
      item.id === inquiry.id
        ? { ...item, status: "completed", reply: replyMessage, repliedAt }
        : item
    );
    setInquiriesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customer_inquiries", JSON.stringify(updated));
    }

    // Supabase DB 비동기 업데이트
    supabase.from("inquiries").update({
      status: "completed",
      reply: replyMessage,
      repliedAt,
      updated_at: new Date().toISOString(),
    }).eq("id", inquiry.id).then(({ error }) => {
      if (error) console.warn("Supabase inquiry reply notice:", error.message);
    });

    triggerToast?.("답변이 등록되었습니다.");
  };

  return {
    inquiriesList,
    setInquiriesList,
    zoomedInquiryImage,
    setZoomedInquiryImage,
    handleReplyToInquiry,
    inquiriesFilter,
    setInquiriesFilter,
  };
}
