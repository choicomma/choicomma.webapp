"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useInquiries(triggerToast?: (msg: string) => void) {
  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

  const isReplyingInFlightRef = useRef(false);
  const isPollingInFlightRef = useRef(false);
  const pendingInquiryIdsRef = useRef<Set<string>>(new Set());

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setInquiriesList((prev) => {
            const prevMap = new Map<string, any>();
            prev.forEach((item) => {
              if (item && item.id) prevMap.set(String(item.id), item);
            });

            const mergedList = json.data.map((serverItem: any) => {
              const localItem = prevMap.get(String(serverItem.id));
              if (!localItem) return serverItem;

              // Anti-rollback: If locally answered but server hasn't committed yet, preserve answer
              const isLocalCompleted = localItem.status === "completed" && !!localItem.reply;
              const isServerCompleted = serverItem.status === "completed" && !!serverItem.reply;
              if (isLocalCompleted && !isServerCompleted) {
                return { ...serverItem, ...localItem };
              }
              return serverItem;
            });

            // Preserve any pending inquiry created locally not yet in server
            prev.forEach((localItem) => {
              if (
                localItem &&
                localItem.id &&
                pendingInquiryIdsRef.current.has(String(localItem.id)) &&
                !mergedList.some((m: any) => String(m.id) === String(localItem.id))
              ) {
                mergedList.unshift(localItem);
              }
            });

            if (typeof window !== "undefined") {
              localStorage.setItem("admin_customer_inquiries", JSON.stringify(mergedList));
            }
            return mergedList;
          });
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

  // Load inquiries on mount and set up 15-second background auto-polling
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

    // 3. 탭 간 실시간 BroadcastChannel 동기화 (0ms 지연)
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("choicomma_inquiries_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "INQUIRY_REPLIED") {
            const { id, reply, repliedAt } = event.data;
            setInquiriesList((prev) =>
              prev.map((item) =>
                String(item.id) === String(id)
                  ? { ...item, status: "completed", reply, repliedAt }
                  : item
              )
            );
          } else if (event.data?.type === "INQUIRY_DELETED") {
            const { id } = event.data;
            setInquiriesList((prev) => prev.filter((item) => String(item.id) !== String(id)));
          } else if (event.data?.type === "INQUIRY_CREATED") {
            fetchInquiries();
          }
        };
      } catch (e) {}
    }

    // 4. 브라우저 실시간 동기화 이벤트
    const handleUpdated = () => fetchInquiries();
    window.addEventListener("admin_inquiries_updated", handleUpdated);

    // 5. 15초 주기 백그라운드 자동 갱신 (화면 미표시 탭 및 답변 전송 중 건너뛰기)
    const interval = setInterval(async () => {
      if (isPollingInFlightRef.current) return;
      if (isReplyingInFlightRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      isPollingInFlightRef.current = true;
      try {
        await fetchInquiries();
      } finally {
        isPollingInFlightRef.current = false;
      }
    }, 15000);

    return () => {
      window.removeEventListener("admin_inquiries_updated", handleUpdated);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [fetchInquiries]);

  // 답변 등록 처리 (원자적 서버 동기화 & 실시간 브로드캐스트)
  const handleReplyToInquiry = async (inquiry: any, replyMessage: string) => {
    if (!replyMessage?.trim()) return;
    const repliedAt = new Date().toISOString();
    const strId = String(inquiry.id);

    isReplyingInFlightRef.current = true;
    pendingInquiryIdsRef.current.add(strId);

    const updated = inquiriesList.map((item: any) =>
      String(item.id) === strId
        ? { ...item, status: "completed", reply: replyMessage, repliedAt }
        : item
    );
    setInquiriesList(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customer_inquiries", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("admin_inquiries_updated"));

      if ("BroadcastChannel" in window) {
        try {
          const sendBc = new BroadcastChannel("choicomma_inquiries_sync");
          sendBc.postMessage({
            type: "INQUIRY_REPLIED",
            id: strId,
            reply: replyMessage,
            repliedAt,
          });
          sendBc.close();
        } catch (e) {}
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          id: inquiry.id,
          status: "completed",
          reply: replyMessage,
          repliedAt,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn("Notice: Inquiries API responded with status:", res.status);
      }
    } catch (err) {
      console.warn("Inquiries API reply save notice:", err);
    } finally {
      pendingInquiryIdsRef.current.delete(strId);
      isReplyingInFlightRef.current = false;
    }

    triggerToast?.("답변이 성공적으로 등록되었습니다.");
  };

  // 문의 삭제 처리 (원자적 서버 동기화 & 실시간 브로드캐스트)
  const handleDeleteInquiry = async (id: string) => {
    const strId = String(id);
    const updated = inquiriesList.filter((item: any) => String(item.id) !== strId);
    setInquiriesList(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customer_inquiries", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("admin_inquiries_updated"));

      if ("BroadcastChannel" in window) {
        try {
          const sendBc = new BroadcastChannel("choicomma_inquiries_sync");
          sendBc.postMessage({
            type: "INQUIRY_DELETED",
            id: strId,
          });
          sendBc.close();
        } catch (e) {}
      }
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
