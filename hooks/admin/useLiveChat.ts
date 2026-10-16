"use client";

import { useState, useEffect, useCallback, useRef } from "react";


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

  // In-flight sending state and pending message preservation
  const isSendingLiveChatRef = useRef(false);
  const [isSendingLiveChat, setIsSendingLiveChat] = useState(false);
  const lastSentTextRef = useRef("");
  const pendingAdminMsgIdsRef = useRef<Set<string>>(new Set());

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

    // A. Fetch active sessions and messages from Git chat API
    let dbMappedSessions: any[] = [];
    try {
      let dbSessions: any[] = [];
      let dbMsgRows: any[] = [];
      const res = await fetch("/api/admin/chat?type=all", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        dbSessions = (json.sessions || []).filter((s: any) => s.status !== "closed");
        dbMsgRows = json.messages || [];
      }

      const dbMsgSessionIds = new Set<string>();
      if (Array.isArray(dbMsgRows)) {
        dbMsgRows.forEach((r: any) => {
          if (r?.sessionId) {
            dbMsgSessionIds.add(String(r.sessionId).toLowerCase().trim());
          }
        });
      }

      const isValidSession = (s: any) => {
        if (!s || !s.id) return false;
        const sid = String(s.id).toLowerCase().trim();
        if (s.status === "closed") return false;
        if (sid === "vip@choicomma.com" && !dbMsgSessionIds.has(sid)) return false;
        if (sid === "admin@choicomma.com" || sid === "admin") return false;
        return true;
      };

      if (Array.isArray(dbSessions)) {
        dbMappedSessions = dbSessions
          .filter(isValidSession)
          .map((s: any) => {
            const normId = String(s.id || "").toLowerCase().trim();
            const rawEmail = (s.customerEmail || normId || "").toLowerCase().trim();
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
              id: normId,
              name: uName.endsWith("님") ? uName : `${uName}님`,
              email: s.customerEmail || normId,
              phone: rawPhone || foundCust?.phone || "",
              tier: grade,
              badgeColor,
              status: s.status === "active" ? "online" : (s.status || "online"),
            };
          });
      }

      // B. Merge with localStorage sessions that are active
      const sessionsMap = new Map<string, any>();
      dbMappedSessions.forEach((s) => sessionsMap.set(s.id, s));

      const savedLocal = localStorage.getItem("admin_chat_sessions");
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: any) => {
              if (s?.id && s.status !== "closed") {
                const normId = String(s.id).toLowerCase().trim();
                if (normId === "admin@choicomma.com" || normId === "admin") return;
                if (!sessionsMap.has(normId)) {
                  sessionsMap.set(normId, { ...s, id: normId });
                }
              }
            });
          }
        } catch (e) {}
      }

      const finalList = Array.from(sessionsMap.values());
      setChatSessionsList((prev) => {
        if (
          prev.length === finalList.length &&
          prev.every(
            (s, idx) =>
              s?.id === finalList[idx]?.id &&
              s?.status === finalList[idx]?.status &&
              s?.tier === finalList[idx]?.tier
          )
        ) {
          return prev;
        }
        return finalList;
      });
      localStorage.setItem("admin_chat_sessions", JSON.stringify(finalList));

      // Update activeSessionId with robust preservation (관리자 계정은 활성 세션에서 영구 제외)
      setActiveSessionId((prev) => {
        const normPrev = (prev || "").toLowerCase().trim();
        if (!normPrev || normPrev === "admin@choicomma.com" || normPrev === "admin") {
          return finalList.length > 0 ? finalList[0].id : "";
        }
        const match = finalList.find((s) => s.id.toLowerCase().trim() === normPrev);
        if (match) return match.id;
        if (finalList.length > 0) return finalList[0].id;
        return "";
      });
    } catch (sbErr) {
      console.warn("Notice: Failed to fetch chat_sessions from Supabase:", sbErr);
    }
  }, []);

  // 2. Load Chat Messages for Active Session (Supabase + localStorage merge)
  const syncAdminLiveChat = useCallback(async () => {
    const rawId = activeSessionIdRef.current;
    if (typeof window === "undefined" || !rawId) {
      setAdminLiveChatMessages([]);
      return;
    }

    const currentId = rawId.trim().toLowerCase();
    // 관리자 계정은 상담 메시지 API를 호출하지 않음
    if (currentId === "admin@choicomma.com" || currentId === "admin") {
      setAdminLiveChatMessages([]);
      return;
    }
    const sessionKey = `site_live_chat_messages_${currentId}`;

    // Read existing local messages for optimistic retention
    let existingLocal: any[] = [];
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) existingLocal = parsed;
      } catch (e) {}
    }

    // A. Fetch from Git chat_messages
    let dbFormatted: any[] = [];
    try {
      const res = await fetch(`/api/admin/chat?type=messages&sessionId=${encodeURIComponent(currentId)}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const dbMessages = json.messages || [];
        if (Array.isArray(dbMessages) && dbMessages.length > 0) {
          dbFormatted = dbMessages.map((m: any) => {
            const d = new Date(m.created_at || Date.now());
            const hours = String(d.getHours()).padStart(2, "0");
            const mins = String(d.getMinutes()).padStart(2, "0");
            return {
              id: m.id,
              sender: m.sender || "user",
              senderName: m.sender === "admin" ? "choicomma VIP 케어팀" : "고객님",
              text: m.text || m.content || m.message || "",
              timestamp: `${hours}:${mins}`,
              created_at: m.created_at,
            };
          });
        }
      }
    } catch (e) {}

    // B. Merge DB messages with local messages (Non-destructive Smart Merge)
    setAdminLiveChatMessages((prev) => {
      const mergedMap = new Map<string, any>();

      // 1. Local/existing messages first
      const candidates = [...existingLocal, ...prev];
      candidates.forEach((m) => {
        if (m && m.id) mergedMap.set(m.id, m);
      });

      // 2. Server DB messages (authoritative updates)
      dbFormatted.forEach((m) => {
        if (m && m.id) mergedMap.set(m.id, m);
      });

      // 3. Explicitly preserve any in-flight pending messages against polling overwrite
      pendingAdminMsgIdsRef.current.forEach((pendingId) => {
        const pendingMsg = candidates.find((m) => m && m.id === pendingId);
        if (pendingMsg) {
          mergedMap.set(pendingId, pendingMsg);
        }
      });

      const finalList = Array.from(mergedMap.values());
      // Chronological sort
      finalList.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (parseInt((a.id || "").match(/\d{10,}/)?.[0] || "0", 10) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (parseInt((b.id || "").match(/\d{10,}/)?.[0] || "0", 10) || 0);
        return timeA - timeB;
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(sessionKey, JSON.stringify(finalList));
      }
      if (
        prev.length === finalList.length &&
        prev.every(
          (msg, idx) =>
            msg?.id === finalList[idx]?.id &&
            msg?.text === finalList[idx]?.text &&
            msg?.sender === finalList[idx]?.sender
        )
      ) {
        return prev;
      }
      return finalList;
    });
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

    // BroadcastChannel for instant cross-tab sync with customer chat widget
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("choicomma_live_chat_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "USER_MESSAGE") {
            const sid = (event.data.sessionId || "").toLowerCase().trim();
            loadSessions();
            if (activeSessionIdRef.current.toLowerCase().trim() === sid) {
              setAdminLiveChatMessages((prev) => {
                if (prev.some((m) => m.id === event.data.message.id)) return prev;
                return [...prev, event.data.message];
              });
            }
          } else if (event.data?.type === "CHAT_RESET" || event.data?.type === "CHAT_CLEARED") {
            const sid = (event.data.sessionId || "").toLowerCase().trim();
            if (sid) {
              const sessionKey = `site_live_chat_messages_${sid}`;
              localStorage.setItem(sessionKey, JSON.stringify([]));
              if (activeSessionIdRef.current.toLowerCase().trim() === sid) {
                setAdminLiveChatMessages([]);
              }
            }
          }
        };
      } catch (e) {}
    }

    // Resilient Polling (every 3.5 seconds)
    // 서버가 느릴 때 요청이 계속 쌓여 상품 저장까지 지연되지 않도록, 이전 조회가 끝나기 전에는 새로 보내지 않고
    // 화면에 보이지 않는 탭에서는 조회하지 않는다. 관리자가 메시지 전송 중일 때도 덮어쓰기 방지를 위해 폴링을 일시 건너뛴다.
    let pollInFlight = false;
    const interval = setInterval(async () => {
      if (pollInFlight) return;
      if (isSendingLiveChatRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      pollInFlight = true;
      try {
        await Promise.all([loadSessions(), syncAdminLiveChat()]);
      } catch (e) {
      } finally {
        pollInFlight = false;
      }
    }, 3500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      if (bc) bc.close();
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

    // Prevent duplicate rapid submits of the exact same message while sending
    if (isSendingLiveChatRef.current && (!presetText || presetText === lastSentTextRef.current)) {
      return;
    }

    const normalizedSessionId = activeSessionId.trim().toLowerCase();
    const dateNow = new Date();
    const hours = String(dateNow.getHours()).padStart(2, "0");
    const mins = String(dateNow.getMinutes()).padStart(2, "0");

    const newReply = {
      id: `admin-reply-${Date.now()}`,
      sender: "admin",
      senderName: "choicomma VIP 케어팀",
      text: textToSend.trim(),
      timestamp: `${hours}:${mins}`,
      created_at: new Date().toISOString(),
    };

    const sessionKey = `site_live_chat_messages_${normalizedSessionId}`;

    // Mark as in-flight
    isSendingLiveChatRef.current = true;
    setIsSendingLiveChat(true);
    lastSentTextRef.current = textToSend.trim();
    pendingAdminMsgIdsRef.current.add(newReply.id);
    
    // 1. Optimistic Local Update
    setAdminLiveChatMessages((prev) => {
      if (prev.some((m) => m.id === newReply.id)) return prev;
      return [...prev, newReply];
    });

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(sessionKey);
      let list: any[] = [];
      try {
        if (saved) list = JSON.parse(saved);
      } catch (e) {}
      const merged = [...list.filter((m) => m.id !== newReply.id), newReply];
      localStorage.setItem(sessionKey, JSON.stringify(merged));
    }

    setAdminLiveInput("");

    // 2. Broadcast across tabs immediately (0ms lag for customer widget)
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
        sendBc.postMessage({
          type: "ADMIN_REPLY",
          sessionId: normalizedSessionId,
          message: newReply,
        });
        sendBc.close();
      } catch (e) {}
    }

    // 3. Dispatch update event immediately so UI remains responsive
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }

    triggerToast("💬 고객 라이브 채팅방으로 답변이 성공적으로 전송되었습니다!");

    // 4. Atomic Server Persistence (await with timeout & error resilience)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/admin/chat?type=message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          id: newReply.id,
          sessionId: normalizedSessionId,
          sender: "admin",
          text: newReply.text,
          content: newReply.text,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn("Notice: Chat API returned non-ok status:", res.status);
      }
    } catch (e) {
      console.warn("Notice: Chat API insert admin message failed or timed out:", e);
    } finally {
      pendingAdminMsgIdsRef.current.delete(newReply.id);
      isSendingLiveChatRef.current = false;
      setIsSendingLiveChat(false);
      lastSentTextRef.current = "";
    }
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

    const normalizedTargetId = targetId.trim().toLowerCase();
    const sessionKey = `site_live_chat_messages_${normalizedTargetId}`;
    setAdminLiveChatMessages([]);
    if (typeof window !== "undefined") {
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));
      localStorage.setItem("site_live_chat_ended", "true");
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
      window.dispatchEvent(new CustomEvent("live_chat_ended"));

      if ("BroadcastChannel" in window) {
        try {
          const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
          sendBc.postMessage({
            type: "CHAT_ENDED",
            sessionId: normalizedTargetId,
          });
          sendBc.close();
        } catch (e) {}
      }
    }

    // Git chat 세션 및 대화 내역 삭제
    try {
      await fetch(`/api/admin/chat?sessionId=${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Notice: Failed to delete chat_messages on end live chat:", e);
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

  // 5. Clear Live Chat
  const handleAdminClearLiveChat = async () => {
    const isConfirmed = window.confirm(
      "정말로 라이브 채팅 대화 기록을 전체 초기화하시겠습니까?\n이 작업은 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    if (activeSessionId && typeof window !== "undefined") {
      const normalizedActiveId = activeSessionId.trim().toLowerCase();
      const sessionKey = `site_live_chat_messages_${normalizedActiveId}`;
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));

      // Git chat_messages 초기화
      try {
        await fetch(`/api/admin/chat?sessionId=${encodeURIComponent(activeSessionId)}&clearOnly=true`, {
          method: "DELETE",
        });
      } catch (e) {
        console.warn("Notice: Failed to delete chat_messages from Git:", e);
      }

      if ("BroadcastChannel" in window) {
        try {
          const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
          sendBc.postMessage({
            type: "CHAT_CLEARED",
            sessionId: normalizedActiveId,
          });
          sendBc.close();
        } catch (e) {}
      }
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
    isSendingLiveChat,
    handleAdminSendLiveChat,
    handleAdminEndLiveChat,
    handleAdminClearLiveChat,
  };
}
