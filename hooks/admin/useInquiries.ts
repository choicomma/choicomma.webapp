"use client";

import { useState, useEffect } from "react";

export function useInquiries(triggerToast?: (msg: string) => void) {
  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

  // Load inquiries from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customer_inquiries");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setInquiriesList(parsed);
          }
        } catch (e) { }
      }
    }
  }, []);

  // Sync inquiries state to localStorage & live refresh
  useEffect(() => {
    const syncInquiries = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("admin_customer_inquiries");
        if (saved) {
          try {
            setInquiriesList(JSON.parse(saved));
          } catch (e) { }
        }
      }
    };
    window.addEventListener("storage", syncInquiries);
    const interval = setInterval(syncInquiries, 2000);
    return () => {
      window.removeEventListener("storage", syncInquiries);
      clearInterval(interval);
    };
  }, []);

  const handleReplyToInquiry = (inquiry: any, replyMessage: string) => {
    if (!replyMessage?.trim()) return;
    const updated = inquiriesList.map((item: any) =>
      item.id === inquiry.id
        ? { ...item, status: "completed", reply: replyMessage, repliedAt: new Date().toISOString() }
        : item
    );
    setInquiriesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customer_inquiries", JSON.stringify(updated));
    }
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
