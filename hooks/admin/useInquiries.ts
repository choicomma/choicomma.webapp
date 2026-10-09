"use client";

import { useState, useEffect, useCallback } from "react";

export function useInquiries(triggerToast?: (msg: string) => void) {
  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setInquiriesList(json.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("admin_customer_inquiries", JSON.stringify(json.data));
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Notice: Inquiries API fetch fallback:", err);
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customer_inquiries");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setInquiriesList(parsed);
        } catch (e) {}
      }
    }
  }, []);

  // Load inquiries on mount (Git file API & localStorage fallback)
  useEffect(() => {
    // 1. 빠른 초기 로딩 (로컬 캐시)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customer_inquiries");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setInquiriesList(parsed);
        } catch (e) {}
      }
    }

    // 2. Git API 데이터 페칭
    fetchInquiries();

    // 3. 브라우저 실시간 동기화 이벤트
    const handleUpdated = () => fetchInquiries();
    window.addEventListener("admin_inquiries_updated", handleUpdated);
    return () => {
      window.removeEventListener("admin_inquiries_updated", handleUpdated);
    };
  }, [fetchInquiries]);

  // 답변 등록 처리 (Git JSON 파일 동기화)
  const handleReplyToInquiry = async (inquiry: any, replyMessage: string) => {
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
      window.dispatchEvent(new CustomEvent("admin_inquiries_updated"));
    }

    try {
      await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inquiry.id,
          status: "completed",
          reply: replyMessage,
          repliedAt,
        }),
      });
    } catch (err) {
      console.warn("Inquiries API reply save notice:", err);
    }

    triggerToast?.("답변이 등록되었습니다.");
  };

  // 문의 삭제 처리 (Git JSON 파일 동기화)
  const handleDeleteInquiry = async (id: string) => {
    const updated = inquiriesList.filter((item: any) => item.id !== id);
    setInquiriesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customer_inquiries", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("admin_inquiries_updated"));
    }

    try {
      await fetch(`/api/admin/inquiries?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Inquiries API delete notice:", err);
    }

    triggerToast?.("문의가 삭제되었습니다.");
  };

  return {
    inquiriesList,
    setInquiriesList,
    zoomedInquiryImage,
    setZoomedInquiryImage,
    handleReplyToInquiry,
    handleDeleteInquiry,
    inquiriesFilter,
    setInquiriesFilter,
    refreshInquiries: fetchInquiries,
  };
}
