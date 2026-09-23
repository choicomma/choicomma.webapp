"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

export function useLiveChat(triggerToast: (msg: string) => void) {
  // Live Chat Admin State & Storage Sync
  const [adminLiveChatMessages, setAdminLiveChatMessages] = useState<any[]>([]);
  const [adminLiveInput, setAdminLiveInput] = useState("");

  // Multi-Customer Live Chat Sessions State
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSessionsList, setChatSessionsList] = useState<any[]>([]);
  const [demoSessionMessages, setDemoSessionMessages] = useState<Record<string, any[]>>({});

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  // 1. Load Sessions from Supabase + localStorage merge
  const loadSessions = useCallback(async () => {
    if (typeof window === "undefined") return;

    let adminCustomers: any[] = [];
    const adminCustomersRaw = localStorage.getItem("admin_customers");
    if (adminCustomersRaw) {
      try {
        adminCustomers = JSON.parse(adminCustomersRaw);
      } catch (e) {}
    }

    // A. Fetch active sessions from Supabase
    let dbMappedSessions: any[] = [];
    try {
      const { data: dbSessions, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .neq("status", "closed")
        .order("updated_at", { ascending: false });

      if (!error && Array.isArray(dbSessions)) {
        dbMappedSessions = dbSessions
          .filter((s: any) => s?.id && s.id !== "vip@choicomma.com")
          .map((s: any) => {
            const rawEmail = (s.customerEmail || s.id || "").toLowerCase().trim();
            const rawPhone = s.customerPhone || "";
            const foundCust = adminCustomers.find(
              (c: any) =>
                (c.email && c.email.toLowerCase().trim() === rawEmail) ||
                (c.phone && rawPhone && c.phone.replace(/[^0-9]/g, "") === rawPhone.replace(/[^0-9]/g, "")) ||
                (c.name && c.name === s.customerName)
            );
            const grade = (foundCust?.grade || "GENERAL").toUpperCase();
            const uName = foundCust?.name || s.customerName || "고객";

            let badgeColor = "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300";
            if (grade.includes("VVIP") || grade.includes("BLACK") || foundCust?.role === "ADMIN") {
              badgeColor = "bg-neutral-950 text-white font-black border border-neutral-950";
            } else if (grade.includes("PLATINUM")) {
              badgeColor = "bg-neutral-800 text-white font-black border border-neutral-800";
            } else if (grade.includes("GOLD")) {
              badgeColor = "bg-neutral-200 text-neutral-900 border border-neutral-300";
            } else if (grade.includes("SILVER")) {
              badgeColor = "bg-neutral-100 text-neutral-800 border border-neutral-200";
            }

            return {
              id: s.id,
              name: uName.endsWith("님") ? uName : `${uName}님`,
              email: s.customerEmail || s.id,
              phone: rawPhone || foundCust?.phone || "",
              tier: grade,
              badgeColor,
              status: s.status === "active" ? "online" : s.status,
            };
          });
      }
    } catch (sbErr) {
      console.warn("Notice: Failed to fetch chat_sessions from Supabase:", sbErr);
    }

    // B. Merge with localStorage sessions
    const sessionsMap = new Map<string, any>();
    dbMappedSessions.forEach((s) => sessionsMap.set(s.id.toLowerCase(), s));

    const savedLocal = localStorage.getItem("admin_chat_sessions");
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            if (s?.id && s.id !== "vip@choicomma.com") {
              if (!sessionsMap.has(s.id.toLowerCase())) {
                sessionsMap.set(s.id.toLowerCase(), s);
              }
            }
          });
        }
      } catch (e) {}
    }

    const finalList = Array.from(sessionsMap.values());
    setChatSessionsList(finalList);
    localStorage.setItem("admin_chat_sessions", JSON.stringify(finalList));

    // Update activeSessionId
    setActiveSessionId((prev) => {
      if (!prev || !finalList.some((s) => s.id === prev)) {
        return finalList.length > 0 ? finalList[0].id : "";
      }
      return prev;
    });
  }, []);

  // 2. Load Chat Messages for Active Session (Supabase + localStorage merge)
  const syncAdminLiveChat = useCallback(async () => {
    const currentId = activeSessionIdRef.current;
    if (typeof window === "undefined" || !currentId) {
      setAdminLiveChatMessages([]);
      return;
    }

    const sessionKey = `site_live_chat_messages_${currentId.trim().toLowerCase()}`;

    // A. Fetch from Supabase chat_messages
    let dbFormatted: any[] = [];
    try {
      const { data: dbMessages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("sessionId", currentId)
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(dbMessages) && dbMessages.length > 0) {
        dbFormatted = dbMessages.map((m: any) => {
          const d = new Date(m.created_at || Date.now());
          const hours = String(d.getHours()).padStart(2, "0");
          const mins = String(d.getMinutes()).padStart(2, "0");
          return {
            id: m.id,
            sender: m.sender || "user",
            senderName: m.sender === "admin" ? "choicomma VIP 케어팀" : "고객님",
            text: m.text,
            timestamp: `${hours}:${mins}`,
          };
        });
      }
    } catch (e) {
      console.warn("Notice: Failed to fetch chat_messages from Supabase:", e);
    }

    if (dbFormatted.length > 0) {
      setAdminLiveChatMessages(dbFormatted);
      localStorage.setItem(sessionKey, JSON.stringify(dbFormatted));
      return;
    }

    // B. Fallback to localStorage
    const saved = localStorage.getItem(sessionKey) || localStorage.getItem("site_live_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdminLiveChatMessages(parsed);
          return;
        }
      } catch (e) {}
    }

    setAdminLiveChatMessages([]);
  }, []);

  // Initialize and listen for storage & realtime events
  useEffect(() => {
    loadSessions();

    const handleStorageChange = () => {
      loadSessions();
      syncAdminLiveChat();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("live_chat_updated", handleStorageChange);

    // Supabase Realtime Channel
    const channel = supabase
      .channel("admin_live_chat_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => {
          loadSessions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          syncAdminLiveChat();
        }
      )
      .subscribe();

    // Resilient Polling Fallback (every 3.5 seconds)
    const interval = setInterval(() => {
      loadSessions();
      syncAdminLiveChat();
    }, 3500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadSessions, syncAdminLiveChat]);

  // Sync messages when activeSessionId changes
  useEffect(() => {
    syncAdminLiveChat();
  }, [activeSessionId, syncAdminLiveChat]);

  const lastLiveChatMsg = adminLiveChatMessages[adminLiveChatMessages.length - 1];
  const isLiveChatSessionEnded =
    !lastLiveChatMsg ||
    lastLiveChatMsg.id?.startsWith("admin-close") ||
    lastLiveChatMsg.text?.includes("상담이 종료되었습니다");
  const activeSessionMessages = adminLiveChatMessages;

  // 3. Send Message from Admin
  const handleAdminSendLiveChat = async (presetText?: string) => {
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

    // Supabase DB 메시지 동기화
    try {
      await supabase.from("chat_messages").insert([
        {
          id: newReply.id,
          sessionId: activeSessionId,
          sender: "admin",
          text: newReply.text,
        },
      ]);
    } catch (e) {
      console.warn("Supabase insert admin message notice:", e);
    }

    setAdminLiveInput("");
    triggerToast("💬 고객 라이브 채팅방으로 답변이 성공적으로 전송되었습니다!");
  };

  // 4. End Live Chat Session
  const handleAdminEndLiveChat = async (sessionIdTarget?: string) => {
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

    // Supabase 세션 상태 업데이트 (closed)
    try {
      await supabase
        .from("chat_sessions")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", targetId);
    } catch (e) {}

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

  // 5. Clear Live Chat
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
