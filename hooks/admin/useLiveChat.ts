"use client";

import { useState, useEffect } from "react";

export function useLiveChat(triggerToast: (msg: string) => void) {
  // Live Chat Admin State & Storage Sync
  const [adminLiveChatMessages, setAdminLiveChatMessages] = useState<any[]>([]);
  const [adminLiveInput, setAdminLiveInput] = useState("");

  // Multi-Customer Live Chat Sessions State
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSessionsList, setChatSessionsList] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadSessions = () => {
      const saved = localStorage.getItem("admin_chat_sessions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (s: any) =>
                s?.id !== "vip@choicomma.com" &&
                s?.email !== "vip@choicomma.com" &&
                !s?.name?.includes("최상위 VIP")
            );
            setChatSessionsList(cleaned);
            localStorage.setItem("admin_chat_sessions", JSON.stringify(cleaned));
            setActiveSessionId((prev) => {
              if (!prev || prev === "vip@choicomma.com") {
                return cleaned.length > 0 ? cleaned[0].id : "";
              }
              return cleaned.some((s: any) => s.id === prev) ? prev : (cleaned[0]?.id || "");
            });
            return;
          }
        } catch (e) {}
      }
      setChatSessionsList([]);
      setActiveSessionId("");
      localStorage.setItem("admin_chat_sessions", JSON.stringify([]));
    };

    loadSessions();
    localStorage.removeItem("site_live_chat_messages_vip@choicomma.com");

    const handleStorageChange = () => {
      loadSessions();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("live_chat_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
    };
  }, []);

  const [demoSessionMessages, setDemoSessionMessages] = useState<Record<string, any[]>>({});

  const syncAdminLiveChat = () => {
    if (typeof window === "undefined" || !activeSessionId) return;
    const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
    const saved = localStorage.getItem(sessionKey) || localStorage.getItem("site_live_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAdminLiveChatMessages(parsed);
          return;
        }
      } catch (e) { }
    }
    setAdminLiveChatMessages([]);
  };

  useEffect(() => {
    syncAdminLiveChat();
    window.addEventListener("storage", syncAdminLiveChat);
    window.addEventListener("live_chat_updated", syncAdminLiveChat);
    return () => {
      window.removeEventListener("storage", syncAdminLiveChat);
      window.removeEventListener("live_chat_updated", syncAdminLiveChat);
    };
  }, [activeSessionId]);

  const lastLiveChatMsg = adminLiveChatMessages[adminLiveChatMessages.length - 1];
  const isLiveChatSessionEnded = !lastLiveChatMsg || lastLiveChatMsg.id?.startsWith("admin-close") || lastLiveChatMsg.text?.includes("상담이 종료되었습니다");
  const activeSessionMessages = adminLiveChatMessages;

  const handleAdminSendLiveChat = (presetText?: string) => {
    const textToSend = presetText || adminLiveInput;
    if (!textToSend.trim() || !activeSessionId) return;

    const dateNow = new Date();
    const hours = String(dateNow.getHours()).padStart(2, "0");
    const mins = String(dateNow.getMinutes()).padStart(2, "0");

    const newReply = {
      id: `admin-reply-${Date.now()}`,
      sender: "admin",
      senderName: "choicomma VIP 케어팀",
      text: textToSend.trim(),
      timestamp: `${hours}:${mins}`,
    };

    const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
    const updated = [...adminLiveChatMessages, newReply];
    setAdminLiveChatMessages(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(sessionKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }
    setAdminLiveInput("");
    triggerToast("💬 고객 라이브 채팅방으로 답변이 성공적으로 전송되었습니다!");
  };

  const handleAdminEndLiveChat = (sessionIdTarget?: string) => {
    const targetId = sessionIdTarget || activeSessionId;
    if (!targetId) return;
    const targetSession = chatSessionsList.find((s) => s.id === targetId);
    const sessionName = targetSession?.name || "고객";

    const isConfirmed = window.confirm(
      `정말로 '${sessionName}'님과의 1:1 라이브 상담을 종료하고 대화 내역 및 세션을 삭제하시겠습니까?`
    );
    if (!isConfirmed) return;

    const sessionKey = `site_live_chat_messages_${targetId.trim().toLowerCase()}`;
    setAdminLiveChatMessages([]);
    if (typeof window !== "undefined") {
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));
      localStorage.setItem("site_live_chat_ended", "true");
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
      window.dispatchEvent(new CustomEvent("live_chat_ended"));
    }

    setChatSessionsList((prev) => {
      const filtered = prev.filter((s) => s.id !== targetId);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_chat_sessions", JSON.stringify(filtered));
      }
      if (activeSessionId === targetId) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : "");
      }
      return filtered;
    });
    triggerToast(`🔒 '${sessionName}'님과의 1:1 라이브 상담 및 대화 내역이 성공적으로 삭제되었습니다.`);
  };

  const handleAdminClearLiveChat = () => {
    const isConfirmed = window.confirm(
      "정말로 라이브 채팅 대화 기록을 전체 초기화하시겠습니까?\n이 작업은 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    if (activeSessionId && typeof window !== "undefined") {
      const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));
    }
    setAdminLiveChatMessages([]);
    window.dispatchEvent(new CustomEvent("live_chat_updated"));
    triggerToast("🧹 라이브 채팅 기록이 전체 초기화되었습니다.");
  };

  return {
    adminLiveChatMessages,
    setAdminLiveChatMessages,
    adminLiveInput,
    setAdminLiveInput,
    activeSessionId,
    setActiveSessionId,
    chatSessionsList,
    setChatSessionsList,
    demoSessionMessages,
    setDemoSessionMessages,
    lastLiveChatMsg,
    isLiveChatSessionEnded,
    activeSessionMessages,
    handleAdminSendLiveChat,
    handleAdminEndLiveChat,
    handleAdminClearLiveChat,
  };
}
