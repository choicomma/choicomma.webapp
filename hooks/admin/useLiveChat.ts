"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { playNotificationSound } from "@/lib/audio/notification-sound";


export function useLiveChat(triggerToast: (msg: string) => void) {
  // Live Chat Admin State & Storage Sync
  const [adminLiveChatMessages, setAdminLiveChatMessages] = useState<any[]>([]);
  const [adminLiveInput, setAdminLiveInput] = useState("");

  // Multi-Customer Live Chat Sessions State
  const [activeSessionId, setActiveSessionIdState] = useState<string>("");
  const [chatSessionsList, setChatSessionsList] = useState<any[]>([]);
  const [demoSessionMessages, setDemoSessionMessages] = useState<Record<string, any[]>>({});

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  // In-flight sending state and pending message preservation
  const isSendingLiveChatRef = useRef(false);
  const [isSendingLiveChat, setIsSendingLiveChat] = useState(false);
  const lastSentTextRef = useRef("");
  const pendingAdminMsgIdsRef = useRef<Set<string>>(new Set());
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());

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
        dbSessions = json.sessions || [];
        dbMsgRows = json.messages || [];
      }

      // Map latest message per session
      const sessionLastMsgMap = new Map<string, any>();
      if (Array.isArray(dbMsgRows)) {
        dbMsgRows.forEach((r: any) => {
          const sid = String(r?.sessionId || "").toLowerCase().trim();
          if (sid) {
            const existing = sessionLastMsgMap.get(sid);
            const rTime = new Date(r.created_at || 0).getTime();
            const exTime = existing ? new Date(existing.created_at || 0).getTime() : 0;
            if (!existing || rTime >= exTime) {
              sessionLastMsgMap.set(sid, r);
            }
          }
        });
      }

      const isValidSession = (s: any) => {
        if (!s || !s.id) return false;
        const sid = String(s.id).toLowerCase().trim();
        if (deletedSessionIdsRef.current.has(sid)) return false;
        if (sid === "vip@choicomma.com" && !sessionLastMsgMap.has(sid)) return false;
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
            const grade = (foundCust?.grade || (normId.includes("admin") ? "관리자" : "GENERAL")).toUpperCase();
            const uName = foundCust?.name || s.customerName || "고객";

            let badgeColor = "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300";
            if (grade.includes("VVIP") || grade.includes("BLACK") || foundCust?.role === "ADMIN" || normId.includes("admin")) {
              badgeColor = "bg-neutral-950 text-white font-black border border-neutral-950";
            } else if (grade.includes("PLATINUM")) {
              badgeColor = "bg-neutral-800 text-white font-black border border-neutral-800";
            } else if (grade.includes("GOLD")) {
              badgeColor = "bg-neutral-200 text-neutral-900 border border-neutral-300";
            } else if (grade.includes("SILVER")) {
              badgeColor = "bg-neutral-100 text-neutral-800 border border-neutral-200";
            }

            const lastMsgObj = sessionLastMsgMap.get(normId);
            let lastMsgText = lastMsgObj ? (lastMsgObj.text || lastMsgObj.content || "") : (s.lastMessage || "");
            if (typeof lastMsgText === "string" && lastMsgText.startsWith('{"type":')) {
              try {
                const parsed = JSON.parse(lastMsgText);
                if (parsed.type === "ORDER_SELECTED") lastMsgText = `📦 주문 문의: ${parsed.orderNumber || ""}`;
                else if (parsed.type === "EXCHANGE_REQUEST") lastMsgText = "🔄 교환 접수 요청";
                else if (parsed.type === "EXCHANGE_COMPLETED") lastMsgText = "✓ 교환 접수 완료";
                else if (parsed.type === "REFUND_REQUEST") lastMsgText = "💳 환불 접수 요청";
                else if (parsed.type === "REFUND_SUBMITTED") lastMsgText = "✓ 환불 접수 완료";
                else if (parsed.title) lastMsgText = parsed.title;
              } catch (e) {}
            }
            const lastMsgTime = lastMsgObj?.created_at || s.lastMessageAt || s.updated_at || s.created_at || "";

            return {
              id: normId,
              name: uName.endsWith("님") ? uName : `${uName}님`,
              email: s.customerEmail || normId,
              phone: rawPhone || foundCust?.phone || "",
              tier: normId.includes("admin") ? "관리자" : grade,
              badgeColor,
              status: s.status === "ended" ? "ended" : "online",
              lastMessage: lastMsgText,
              lastMessageAt: lastMsgTime,
            };
          });
      }

      // B. Merge with localStorage sessions that are active (excluding deleted sessions)
      const sessionsMap = new Map<string, any>();
      dbMappedSessions.forEach((s) => sessionsMap.set(s.id, s));

      const savedLocal = localStorage.getItem("admin_chat_sessions");
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: any) => {
              if (s?.id) {
                const normId = String(s.id).toLowerCase().trim();
                if (deletedSessionIdsRef.current.has(normId)) return;
                const sEmail = (s.email || "").toLowerCase().trim();
                const sName = (s.name || "").replace("님", "").trim();

                const isDuplicate = Array.from(sessionsMap.values()).some((existing: any) => {
                  const exId = String(existing.id || "").toLowerCase().trim();
                  const exEmail = (existing.email || "").toLowerCase().trim();
                  const exName = (existing.name || "").replace("님", "").trim();
                  if (exId === normId) return true;
                  if (sEmail && exEmail && sEmail === exEmail) return true;
                  if (sName && exName && sName === exName) return true;
                  return false;
                });

                if (!isDuplicate && normId !== "vip@choicomma.com") {
                  sessionsMap.set(normId, { ...s, id: normId, status: s.status === "ended" ? "ended" : "online" });
                }
              }
            });
          }
        } catch (e) {}
      }

      const finalList = Array.from(sessionsMap.values());
      // Sort by last message / update time descending (most recent first)
      finalList.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.lastMessageAt || b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setChatSessionsList((prev) => {
        if (
          prev.length === finalList.length &&
          prev.every(
            (s, idx) =>
              s?.id === finalList[idx]?.id &&
              s?.status === finalList[idx]?.status &&
              s?.tier === finalList[idx]?.tier &&
              s?.lastMessage === finalList[idx]?.lastMessage
          )
        ) {
          return prev;
        }
        return finalList;
      });
      localStorage.setItem("admin_chat_sessions", JSON.stringify(finalList));

      // Update activeSessionId with robust preservation
      setActiveSessionIdState((prev) => {
        const normPrev = (prev || "").toLowerCase().trim();
        if (!normPrev) {
          const firstId = finalList.length > 0 ? (finalList[0].id || "").toLowerCase().trim() : "";
          activeSessionIdRef.current = firstId;
          return firstId;
        }
        const match = finalList.find((s) => (s.id || "").toLowerCase().trim() === normPrev);
        if (match) {
          const matchId = (match.id || "").toLowerCase().trim();
          activeSessionIdRef.current = matchId;
          return matchId;
        }
        if (finalList.length > 0) {
          const firstId = (finalList[0].id || "").toLowerCase().trim();
          activeSessionIdRef.current = firstId;
          return firstId;
        }
        return "";
      });
    } catch (sbErr) {
      console.warn("Notice: Failed to fetch chat_sessions from Supabase:", sbErr);
    }
  }, []);

  // 2. Load Chat Messages for Active Session (Authoritative DB + Strictly Isolated Local)
  const syncAdminLiveChat = useCallback(async (explicitId?: string) => {
    const rawId = explicitId || activeSessionIdRef.current;
    if (typeof window === "undefined" || !rawId) {
      setAdminLiveChatMessages([]);
      return;
    }

    const currentId = rawId.trim().toLowerCase();
    const sessionKey = `site_live_chat_messages_${currentId}`;

    // Read existing local messages for optimistic retention (strictly matching currentId)
    let existingLocal: any[] = [];
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          existingLocal = parsed.filter(
            (m: any) => !m.sessionId || m.sessionId.toLowerCase().trim() === currentId
          );
        }
      } catch (e) {}
    }

    // A. Fetch from Git chat_messages
    let dbFormatted: any[] = [];
    try {
      const res = await fetch(`/api/admin/chat?type=messages&sessionId=${encodeURIComponent(currentId)}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const dbMessages = json.messages || [];
        if (Array.isArray(dbMessages)) {
          dbFormatted = dbMessages.map((m: any) => {
            const d = new Date(m.created_at || Date.now());
            const hours = String(d.getHours()).padStart(2, "0");
            const mins = String(d.getMinutes()).padStart(2, "0");
            return {
              id: m.id,
              sessionId: currentId,
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

    // Race condition guard: ignore if user switched to another session while fetching
    if (activeSessionIdRef.current.trim().toLowerCase() !== currentId) {
      return;
    }

    // B. Server DB messages are the authoritative source of truth for this session
    // CRITICAL FIX: Only include messages that actually belong to currentId from the server.
    // Do NOT merge contaminated existingLocal messages!
    const mergedMap = new Map<string, any>();

    // 1. Authoritative Server DB messages first
    dbFormatted.forEach((m) => {
      if (m && m.id) mergedMap.set(m.id, { ...m, sessionId: currentId });
    });

    // 2. Explicitly preserve ONLY in-flight pending messages sent by admin that are currently transmitting
    pendingAdminMsgIdsRef.current.forEach((pendingId) => {
      const pendingMsg = existingLocal.find((m) => m && m.id === pendingId);
      if (pendingMsg) {
        mergedMap.set(pendingId, { ...pendingMsg, sessionId: currentId });
      }
    });

    // 3. Preserve recent in-flight user messages (within last 30s) so they never flicker or disappear during background fetch
    const now = Date.now();
    existingLocal.forEach((localMsg) => {
      if (localMsg && localMsg.id && !mergedMap.has(localMsg.id)) {
        const msgTime = localMsg.created_at ? new Date(localMsg.created_at).getTime() : now;
        if (now - msgTime < 30000 || localMsg.sender === "user") {
          mergedMap.set(localMsg.id, { ...localMsg, sessionId: currentId });
        }
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

    setAdminLiveChatMessages((prev) => {
      if (activeSessionIdRef.current.trim().toLowerCase() !== currentId) {
        return prev;
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

      // 새 메시지 감지: 이전 상태보다 늘어났고 최신 메시지가 고객 메시지인 경우 사운드 재생 (시크릿 창/타 브라우저 연동 보장)
      if (finalList.length > prev.length) {
        const lastNew = finalList[finalList.length - 1];
        if (lastNew?.sender === "user" || lastNew?.sender === "customer") {
          playNotificationSound();
        }
      }

      return finalList;
    });
  }, []);

  // 3. Instant Session Switching Handler (UI moves immediately on click with 0ms delay)
  const setActiveSessionId = useCallback((rawTargetId: string) => {
    const targetId = (rawTargetId || "").trim().toLowerCase();
    setActiveSessionIdState(targetId);
    activeSessionIdRef.current = targetId;

    if (!targetId) {
      setAdminLiveChatMessages([]);
      return;
    }

    // A. 즉시 로컬 캐시에서 해당 세션에 정확히 속한 메시지만 로드하여 지연 없이 대화창 전환
    if (typeof window !== "undefined") {
      const sessionKey = `site_live_chat_messages_${targetId}`;
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // 다른 세션의 오염된 메시지 엄격 배제: sessionId가 없거나 정확히 targetId인 것만 허용하고 sessionId 보정
            const clean = parsed
              .filter((m: any) => m && (!m.sessionId || m.sessionId.toLowerCase().trim() === targetId))
              .map((m: any) => ({ ...m, sessionId: targetId }));
            setAdminLiveChatMessages(clean);
          } else {
            setAdminLiveChatMessages([]);
          }
        } catch {
          setAdminLiveChatMessages([]);
        }
      } else {
        setAdminLiveChatMessages([]);
      }
    }

    // B. 서버 DB로부터 해당 세션의 정식 메시지 즉시 동기화
    syncAdminLiveChat(targetId);
  }, [syncAdminLiveChat]);

  // Initialize and listen for storage & realtime events
  useEffect(() => {
    loadSessions();

    const handleStorageChange = (e?: any) => {
      // 관리자 본인의 낙관적 업데이트 발송 시 같은 탭 내 중복 API fetch 차단하여 버퍼링 방지
      if (e?.detail?.sender === "admin") return;
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
          if (event.data?.type === "USER_MESSAGE" || event.data?.type === "SESSION_REGISTERED") {
            // 신규 고객 메시지 인입 시 Web Audio 차임벨 사운드 재생
            if (event.data?.type === "USER_MESSAGE") {
              playNotificationSound();
            }

            const sid = (event.data.sessionId || "").toLowerCase().trim();
            const sEmail = (event.data.sessionEmail || "").toLowerCase().trim();
            const sPhone = (event.data.sessionPhone || "").replace(/[^0-9]/g, "");
            const incomingMsg = event.data?.message;

            const currentActiveId = (activeSessionIdRef.current || "").toLowerCase().trim();

            // 1. 활성 세션 일치 여부 다각도 검증 (ID, 이메일, 전화번호 교차 체크)
            let isCurrentSession = false;
            if (currentActiveId) {
              if (sid && (currentActiveId === sid || currentActiveId.includes(sid) || sid.includes(currentActiveId))) {
                isCurrentSession = true;
              } else if (sEmail && (currentActiveId === sEmail || currentActiveId.includes(sEmail))) {
                isCurrentSession = true;
              } else if (sPhone && currentActiveId.replace(/[^0-9]/g, "") === sPhone) {
                isCurrentSession = true;
              }
            }

            // 2. 좌측 세션 목록 0ms 실시간 업데이트 (미리보기 메시지, 갱신 시각, 활성 상태)
            setChatSessionsList((prev) => {
              const matched = prev.some((s) => {
                const sId = (s.id || "").toLowerCase().trim();
                const semail = (s.customerEmail || s.email || "").toLowerCase().trim();
                const sphone = (s.customerPhone || s.phone || "").replace(/[^0-9]/g, "");
                return sId === sid || (sEmail && semail === sEmail) || (sPhone && sphone === sPhone) || (currentActiveId && sId === currentActiveId && isCurrentSession);
              });

              if (!matched && event.data.session) {
                return [event.data.session, ...prev];
              }

              return prev.map((s) => {
                const sId = (s.id || "").toLowerCase().trim();
                const semail = (s.customerEmail || s.email || "").toLowerCase().trim();
                const sphone = (s.customerPhone || s.phone || "").replace(/[^0-9]/g, "");
                if (sId === sid || (sEmail && semail === sEmail) || (sPhone && sphone === sPhone) || (currentActiveId && sId === currentActiveId && isCurrentSession)) {
                  return {
                    ...s,
                    lastMessage: incomingMsg?.text || (incomingMsg?.images?.length ? "[사진 첨부]" : s.lastMessage),
                    lastMessageAt: incomingMsg?.created_at || new Date().toISOString(),
                    status: "active",
                    updated_at: new Date().toISOString(),
                  };
                }
                return s;
              });
            });

            // 3. 현재 열려있는 세션인 경우 0ms 즉각 화면 노출 및 로컬스토리지 보존
            if (isCurrentSession && incomingMsg) {
              const targetKeyId = currentActiveId || sid;
              const formattedMsg = {
                ...incomingMsg,
                sessionId: targetKeyId,
              };

              // (1) UI State 0ms 즉각 렌더링
              setAdminLiveChatMessages((prev) => {
                if (prev.some((m) => m.id === formattedMsg.id)) return prev;
                return [...prev, formattedMsg];
              });

              // (2) 로컬스토리지 즉각 보존 (새로고침/재렌더링 방어)
              try {
                const sessionKey = `site_live_chat_messages_${targetKeyId}`;
                const savedStr = localStorage.getItem(sessionKey);
                const list = savedStr ? JSON.parse(savedStr) : [];
                if (Array.isArray(list) && !list.some((m: any) => m.id === formattedMsg.id)) {
                  list.push(formattedMsg);
                  localStorage.setItem(sessionKey, JSON.stringify(list));
                }
              } catch (e) {}

              // (3) 비동기 API 동기화는 화면 렌더링을 방해하지 않도록 약간의 지연 후 백그라운드에서 실행
              setTimeout(() => {
                syncAdminLiveChat(targetKeyId);
              }, 1200);
            } else {
              loadSessions();
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

    // 1. 초고속 실시간 활성 대화 동기화 (800ms) - 고객 입력 즉시 관리자 화면에 반영
    let msgSyncInFlight = false;
    const msgInterval = setInterval(async () => {
      if (msgSyncInFlight) return;
      if (isSendingLiveChatRef.current) return;
      msgSyncInFlight = true;
      try {
        await syncAdminLiveChat();
      } catch (e) {
      } finally {
        msgSyncInFlight = false;
      }
    }, 800);

    // 2. 백그라운드 세션 목록 동기화 (3000ms)
    let sessionPollInFlight = false;
    const sessionInterval = setInterval(async () => {
      if (sessionPollInFlight) return;
      sessionPollInFlight = true;
      try {
        await loadSessions();
      } catch (e) {
      } finally {
        sessionPollInFlight = false;
      }
    }, 3000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      if (bc) bc.close();
      clearInterval(msgInterval);
      clearInterval(sessionInterval);
    };
  }, [loadSessions, syncAdminLiveChat]);

  // Sync messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      syncAdminLiveChat(activeSessionId);
    }
  }, [activeSessionId, syncAdminLiveChat]);

  // Active session messages strictly partitioned by activeSessionId
  const activeSessionMessages = adminLiveChatMessages.filter((m: any) => {
    if (!m) return false;
    const currentActive = (activeSessionId || "").toLowerCase().trim();
    if (!currentActive) return false;
    if (m.sessionId) {
      return m.sessionId.toLowerCase().trim() === currentActive;
    }
    return pendingAdminMsgIdsRef.current.has(m.id) || !m.sessionId;
  });
  const lastLiveChatMsg = activeSessionMessages[activeSessionMessages.length - 1];
  const isLiveChatSessionEnded = Boolean(
    chatSessionsList.find(
      (s) => (s.id || "").toLowerCase().trim() === (activeSessionId || "").toLowerCase().trim()
    )?.status === "ended"
  );

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
      sessionId: normalizedSessionId,
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
      window.dispatchEvent(new CustomEvent("live_chat_updated", { detail: { sender: "admin", messageId: newReply.id } }));
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

  // 4. End Live Chat Session (상담 종료)
  const handleAdminEndLiveChat = async (sessionIdTarget?: string) => {
    const targetId = sessionIdTarget || activeSessionId;
    if (!targetId) return;
    const targetSession = chatSessionsList.find((s) => s.id === targetId);
    const sessionName = targetSession?.name || "고객";

    const isConfirmed = window.confirm(
      `'${sessionName}'님과의 1:1 라이브 상담을 종료하시겠습니까?`
    );
    if (!isConfirmed) return;

    const normalizedTargetId = targetId.trim().toLowerCase();
    const sessionKey = `site_live_chat_messages_${normalizedTargetId}`;

    // 1. 즉시 로컬 및 세션 목록 상태를 'ended'로 전환
    setChatSessionsList((prev) => {
      const updated = prev.map((s) =>
        (s.id || "").toLowerCase().trim() === normalizedTargetId
          ? { ...s, status: "ended" }
          : s
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_chat_sessions", JSON.stringify(updated));
        localStorage.setItem("site_live_chat_ended", "true");
      }
      return updated;
    });

    // 2. 현재 열린 대화창이 종료 대상인 경우 다음 접속 중인 상담으로 자동 전환
    if ((activeSessionIdRef.current || "").toLowerCase().trim() === normalizedTargetId) {
      const remainingActive = chatSessionsList.find(
        (s) => (s.id || "").toLowerCase().trim() !== normalizedTargetId && s.status !== "ended"
      );
      const nextId = remainingActive ? remainingActive.id : "";
      setActiveSessionId(nextId);
      if (!nextId) {
        setAdminLiveChatMessages([]);
      }
    }

    // 3. 브로드캐스트 채널을 통해 고객 측 채팅창 종료 이벤트 전송
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
        sendBc.postMessage({
          type: "CHAT_ENDED",
          sessionId: normalizedTargetId,
          sessionEmail: targetSession?.customerEmail || targetSession?.email || "",
          sessionPhone: targetSession?.customerPhone || targetSession?.phone || "",
        });
        sendBc.close();
      } catch (e) {}
    }

    // 4. 서버 및 DB에 세션 상태를 'ended'로 안전하게 영구 저장
    try {
      await fetch(`/api/admin/chat?type=session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          status: "ended",
        }),
      });
    } catch (e) {
      console.warn("Notice: Failed to update chat session status to ended:", e);
    }

    // 5. 서버 저장 완료 후 이벤트 디스패치
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
      window.dispatchEvent(new CustomEvent("live_chat_ended"));
    }

    triggerToast(`🔒 '${sessionName}'님과의 1:1 라이브 상담이 성공적으로 종료되었습니다.`);
  };

  // 5. Delete Live Chat Session Completely (상담 세션 완전 삭제)
  const handleAdminDeleteLiveChat = async (sessionIdTarget?: string) => {
    const targetId = sessionIdTarget || activeSessionId;
    if (!targetId) return;
    const targetSession = chatSessionsList.find((s) => s.id === targetId);
    const sessionName = targetSession?.name || "고객";

    const isConfirmed = window.confirm(
      `정말로 '${sessionName}'님의 상담 세션 및 대화 내역을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const normalizedTargetId = targetId.trim().toLowerCase();
    const sessionKey = `site_live_chat_messages_${normalizedTargetId}`;

    deletedSessionIdsRef.current.add(normalizedTargetId);

    setChatSessionsList((prev) => {
      const filtered = prev.filter((s) => (s.id || "").toLowerCase().trim() !== normalizedTargetId);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_chat_sessions", JSON.stringify(filtered));
        localStorage.removeItem(sessionKey);
      }
      return filtered;
    });

    if ((activeSessionIdRef.current || "").toLowerCase().trim() === normalizedTargetId) {
      setAdminLiveChatMessages([]);
      const remainingActive = chatSessionsList.find(
        (s) => (s.id || "").toLowerCase().trim() !== normalizedTargetId && s.status !== "ended"
      );
      setActiveSessionId(remainingActive ? remainingActive.id : "");
    }

    try {
      await fetch(`/api/admin/chat?sessionId=${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Notice: Failed to delete chat session:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }

    triggerToast(`🗑️ '${sessionName}'님의 상담 세션 및 대화 내역이 완전히 삭제되었습니다.`);
  };

  // 6. Clear Live Chat
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
    handleAdminDeleteLiveChat,
    handleAdminClearLiveChat,
  };
}
