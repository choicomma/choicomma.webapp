import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let chatMutex = Promise.resolve();

async function runWithChatLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = chatMutex;
  let release: () => void = () => {};
  chatMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getSessionsFilePath() {
  return path.join(process.cwd(), "data", "chat-sessions.json");
}

function getMessagesFilePath() {
  return path.join(process.cwd(), "data", "chat-messages.json");
}

function isGuestSession(id?: string, email?: string): boolean {
  // Allow all sessions including guests/visitors to communicate seamlessly
  return false;
}

function readJsonFile(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn(`[Read Warning: ${filePath}]:`, err);
  }
  return [];
}

function safeAtomicWriteJson(filePath: string, data: any): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const jsonStr = JSON.stringify(data, null, 2);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
      try {
        fs.writeFileSync(tempPath, jsonStr, "utf-8");
        try {
          fs.renameSync(tempPath, filePath);
        } catch {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch {}
          fs.writeFileSync(filePath, jsonStr, "utf-8");
        }
        return true;
      } catch {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }
    }

    fs.writeFileSync(filePath, jsonStr, "utf-8");
    return true;
  } catch (err) {
    console.error(`[Atomic Write Error: ${filePath}]:`, err);
    return false;
  }
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 라이브 채팅 세션 및 메시지 조회
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // sessions | messages | all
  const sessionId = url.searchParams.get("sessionId");

  if (type === "messages" && sessionId) {
    const norm = sessionId.trim().toLowerCase();
    const cleanPhone = norm.replace(/[^0-9]/g, "");
    const sessions = readJsonFile(getSessionsFilePath());

    // Resolve all possible session ID aliases (id, email, phone)
    const matchIds = new Set<string>([norm]);
    if (cleanPhone.length >= 7) matchIds.add(cleanPhone);

    const matchedSession = sessions.find((s) => {
      const sId = String(s.id || "").trim().toLowerCase();
      const sEmail = String(s.customerEmail || s.email || "").trim().toLowerCase();
      const sPhone = String(s.customerPhone || s.phone || "").replace(/[^0-9]/g, "");
      return (
        sId === norm ||
        (sEmail && sEmail === norm) ||
        (cleanPhone.length >= 7 && sPhone && sPhone === cleanPhone) ||
        (sId.replace(/[^0-9]/g, "") && cleanPhone.length >= 7 && sId.replace(/[^0-9]/g, "") === cleanPhone)
      );
    });

    if (matchedSession) {
      if (matchedSession.id) matchIds.add(String(matchedSession.id).trim().toLowerCase());
      if (matchedSession.customerEmail) matchIds.add(String(matchedSession.customerEmail).trim().toLowerCase());
      if (matchedSession.email) matchIds.add(String(matchedSession.email).trim().toLowerCase());
      if (matchedSession.customerPhone) {
        matchIds.add(String(matchedSession.customerPhone).trim().toLowerCase());
        const pClean = String(matchedSession.customerPhone).replace(/[^0-9]/g, "");
        if (pClean.length >= 7) matchIds.add(pClean);
      }
    }

    const messages = readJsonFile(getMessagesFilePath());
    let filtered = messages.filter((m) => {
      const mSid = String(m.sessionId || "").trim().toLowerCase();
      const mClean = mSid.replace(/[^0-9]/g, "");
      return matchIds.has(mSid) || (cleanPhone.length >= 7 && mClean.length >= 7 && mClean === cleanPhone);
    });

    // 비상 복구(Self-Healing): 로컬 메시지가 없는 경우 Supabase에서 복구 시도
    if (filtered.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) =>
            supabase
              .from("chat_messages")
              .select("*")
              .or(`sessionId.eq.${norm}${matchedSession?.id ? `,sessionId.eq.${matchedSession.id}` : ""}`)
              .order("created_at", { ascending: true }),
          2000
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          filtered = data;
          // 로컬 메시지 파일에도 영구 보존
          const allMsgs = readJsonFile(getMessagesFilePath());
          const merged = [...allMsgs];
          data.forEach((dbMsg) => {
            if (!merged.some((m) => m.id === dbMsg.id)) {
              merged.push(dbMsg);
            }
          });
          safeAtomicWriteJson(getMessagesFilePath(), merged);
        }
      } catch (fallbackErr) {
        console.warn("[Chat Messages Remote Fallback Warning]:", fallbackErr);
      }
    }

    return NextResponse.json({ success: true, count: filtered.length, messages: filtered }, { headers: NO_CACHE_HEADERS });
  }

  if (type === "sessions") {
    let sessions = readJsonFile(getSessionsFilePath());

    // 로컬 세션이 비어있는 경우에만 Supabase에서 동기 복구, 있으면 백그라운드 비동기 동기화
    if (sessions.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) =>
            supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          sessions = data.filter((s) => !isGuestSession(s?.id, s?.customerEmail));
          safeAtomicWriteJson(getSessionsFilePath(), sessions);
        }
      } catch (fallbackErr) {
        console.warn("[Chat Sessions Remote Fallback Warning]:", fallbackErr);
      }
    } else {
      // 비동기 백그라운드 자가 복구 (UI 대기 0ms)
      runSafeSupabaseQuery<any[]>(
        async (supabase) => supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
        2000
      ).then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length > 0) {
          const current = readJsonFile(getSessionsFilePath());
          const sessionMap = new Map<string, any>();
          data.forEach((s) => {
            if (s?.id && !isGuestSession(s.id, s.customerEmail)) {
              sessionMap.set(String(s.id).trim().toLowerCase(), s);
            }
          });
          current.forEach((s) => {
            if (s?.id && !isGuestSession(s.id, s.customerEmail)) {
              const key = String(s.id).trim().toLowerCase();
              const existing = sessionMap.get(key);
              sessionMap.set(key, { ...existing, ...s });
            }
          });
          safeAtomicWriteJson(getSessionsFilePath(), Array.from(sessionMap.values()));
        }
      }).catch(() => {});
    }

    sessions = sessions.filter((s) => !isGuestSession(s.id, s.customerEmail || s.email));
    return NextResponse.json({ success: true, count: sessions.length, sessions }, { headers: NO_CACHE_HEADERS });
  }

  // DEFAULT / TYPE === "ALL"
  let sessions = readJsonFile(getSessionsFilePath());
  let messages = readJsonFile(getMessagesFilePath());

  // 로컬 데이터가 비어있을 때만 동기 복구, 데이터가 있으면 즉시 반환(0ms)하고 백그라운드 비동기 동기화
  if (sessions.length === 0 && messages.length === 0) {
    try {
      const [sbSessionsRes, sbMessagesRes] = await Promise.all([
        runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
          1500
        ),
        runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("chat_messages").select("*").order("created_at", { ascending: true }),
          1500
        ),
      ]);

      if (!sbSessionsRes.error && Array.isArray(sbSessionsRes.data) && sbSessionsRes.data.length > 0) {
        sessions = sbSessionsRes.data.filter((s) => !isGuestSession(s?.id, s?.customerEmail));
        safeAtomicWriteJson(getSessionsFilePath(), sessions);
      }
      if (!sbMessagesRes.error && Array.isArray(sbMessagesRes.data) && sbMessagesRes.data.length > 0) {
        messages = sbMessagesRes.data;
        safeAtomicWriteJson(getMessagesFilePath(), messages);
      }
    } catch (syncErr) {
      console.warn("[Chat API Sync All Warning]:", syncErr);
    }
  } else {
    // 비동기 백그라운드 듀얼 동기화 (0ms 블로킹 방지)
    Promise.all([
      runSafeSupabaseQuery<any[]>(
        async (supabase) => supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
        2000
      ),
      runSafeSupabaseQuery<any[]>(
        async (supabase) => supabase.from("chat_messages").select("*").order("created_at", { ascending: true }),
        2000
      ),
    ]).then(([sbSessionsRes, sbMessagesRes]) => {
      let sessionsChanged = false;
      let messagesChanged = false;

      const curSessions = readJsonFile(getSessionsFilePath());
      const curMessages = readJsonFile(getMessagesFilePath());

      if (!sbSessionsRes.error && Array.isArray(sbSessionsRes.data) && sbSessionsRes.data.length > 0) {
        const sessionMap = new Map<string, any>();
        sbSessionsRes.data.forEach((s) => {
          if (s?.id && !isGuestSession(s.id, s.customerEmail)) {
            sessionMap.set(String(s.id).trim().toLowerCase(), s);
          }
        });
        curSessions.forEach((s) => {
          if (s?.id && !isGuestSession(s.id, s.customerEmail)) {
            const key = String(s.id).trim().toLowerCase();
            const existing = sessionMap.get(key);
            sessionMap.set(key, { ...existing, ...s });
          }
        });
        safeAtomicWriteJson(getSessionsFilePath(), Array.from(sessionMap.values()));
      }

      if (!sbMessagesRes.error && Array.isArray(sbMessagesRes.data) && sbMessagesRes.data.length > 0) {
        const msgMap = new Map<string, any>();
        sbMessagesRes.data.forEach((m) => {
          if (m?.id) msgMap.set(String(m.id), m);
        });
        curMessages.forEach((m) => {
          if (m?.id) {
            const existing = msgMap.get(String(m.id));
            msgMap.set(String(m.id), { ...existing, ...m });
          }
        });
        safeAtomicWriteJson(getMessagesFilePath(), Array.from(msgMap.values()));
      }
    }).catch(() => {});
  }

  // GET 요청 시에는 삭제되거나 종료된 세션이 임의로 재등록되지 않도록, 메시지 기반 자동 세션 생성을 비활성화합니다.
  // 신규 세션은 고객이 채팅을 열거나 메시지를 전송할 때(POST)만 등록됩니다.

  sessions = sessions.filter((s) => !isGuestSession(s.id, s.customerEmail || s.email));
  return NextResponse.json({ success: true, sessions, messages }, { headers: NO_CACHE_HEADERS });
}

// POST: 채팅 세션 등록 또는 메시지 추가 (동시성 락 및 Supabase 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithChatLock(async () => {
    try {
      const url = new URL(req.url);
      const type = url.searchParams.get("type") || "message";
      const body = await req.json();

      if (type === "session") {
        const normId = String(body.id || "").trim().toLowerCase();
        if (isGuestSession(normId, body.customerEmail)) {
          return NextResponse.json({ success: true, ignored: true, message: "Guest sessions are ignored" }, { headers: NO_CACHE_HEADERS });
        }
        const sessions = readJsonFile(getSessionsFilePath());
        const idx = sessions.findIndex((s) => String(s.id || "").trim().toLowerCase() === normId);
        const sessionRecord = {
          ...body,
          id: normId || body.id,
          customerEmail: body.customerEmail || (normId.includes("@") ? normId : ""),
          updated_at: new Date().toISOString(),
        };

        if (idx !== -1) {
          sessions[idx] = { ...sessions[idx], ...sessionRecord };
        } else {
          sessions.unshift({
            ...sessionRecord,
            created_at: new Date().toISOString(),
          });
        }

        // 1. 로컬 저장 (0ms 보장, 원자적 쓰기)
        safeAtomicWriteJson(getSessionsFilePath(), sessions);

        // 2. Supabase 듀얼 라이트 (완료 대기)
        const supabaseSession = {
          id: normId,
          customerName: body.customerName || body.name || "방문자",
          customerEmail: body.customerEmail || (normId.includes("@") ? normId : ""),
          customerPhone: body.customerPhone || body.phone || "",
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        };

        // 백그라운드 실행: 로컬 저장이 기준 데이터이므로 응답을 기다리지 않아 직렬 락을 즉시 해제
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("chat_sessions").upsert([supabaseSession], { onConflict: "id" }),
          2500
        ).catch((err) => {
          console.warn("[Chat Session Supabase Dual-Write Warning]:", err);
        });


        return NextResponse.json({ success: true, session: sessionRecord }, { headers: NO_CACHE_HEADERS });
      }

      // Default: append or update message
      const normSessionId = String(body.sessionId || "").trim().toLowerCase() || `session_${Date.now()}`;
      const messages = readJsonFile(getMessagesFilePath());
      const msgId = String(body.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);

      const newMsg = {
        ...body,
        id: msgId,
        sessionId: normSessionId,
        sender: body.sender || "customer",
        content: body.content || body.message || body.text || "",
        text: body.text || body.content || body.message || "",
        created_at: body.created_at || new Date().toISOString(),
      };

      const existingIdx = messages.findIndex((m) => m.id === msgId);
      if (existingIdx !== -1) {
        messages[existingIdx] = { ...messages[existingIdx], ...newMsg };
      } else {
        messages.push(newMsg);
      }

      // 1. 로컬 메시지 파일 저장
      safeAtomicWriteJson(getMessagesFilePath(), messages);

      // 2. 부모 세션 최신 메시지 갱신 (없으면 신규 세션 자동 등록)
      const sessions = readJsonFile(getSessionsFilePath());
      const sIdx = sessions.findIndex((s) => String(s.id || "").trim().toLowerCase() === normSessionId);
      if (sIdx !== -1) {
        sessions[sIdx].lastMessage = newMsg.content;
        sessions[sIdx].lastMessageAt = newMsg.created_at;
        sessions[sIdx].status = "active";
        sessions[sIdx].updated_at = new Date().toISOString();
        safeAtomicWriteJson(getSessionsFilePath(), sessions);
      } else {
        const autoSession = {
          id: normSessionId,
          customerName: body.customerName || body.senderName || (normSessionId.includes("@") ? normSessionId.split("@")[0] : normSessionId),
          customerEmail: body.customerEmail || (normSessionId.includes("@") ? normSessionId : ""),
          customerPhone: body.customerPhone || "",
          status: "active",
          lastMessage: newMsg.content,
          lastMessageAt: newMsg.created_at,
          created_at: newMsg.created_at,
          updated_at: new Date().toISOString(),
        };
        sessions.unshift(autoSession);
        safeAtomicWriteJson(getSessionsFilePath(), sessions);
      }

      // 3. Supabase 비동기 듀얼 라이트 (외래키 제약조건 방어: 세션 보장 후 메시지 Upsert)
      const supabaseMsg = {
        id: msgId,
        sessionId: normSessionId,
        sender: body.sender === "admin" ? "admin" : "user",
        text: body.text || body.content || body.message || "",
        created_at: newMsg.created_at || new Date().toISOString(),
      };

      runSafeSupabaseQuery(
        async (supabase) => {
          // 세션 존재 보장
          await supabase.from("chat_sessions").upsert(
            {
              id: normSessionId,
              customerName: body.customerName || body.name || "방문자",
              customerEmail: body.customerEmail || (normSessionId.includes("@") ? normSessionId : ""),
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          // 메시지 적재
          return await supabase.from("chat_messages").upsert([supabaseMsg], { onConflict: "id" });
        },
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Chat Message Supabase Dual-Write Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Chat Message Supabase Dual-Write Success] Msg ID: ${msgId}`);
          }
        })
        .catch((err) => {
          console.warn("[Chat Message Supabase Dual-Write Warning]:", err);
        });

      return NextResponse.json({ success: true, message: newMsg }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 채팅 세션 및 메시지 삭제 (또는 메시지만 초기화, 동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithChatLock(async () => {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");
      const clearOnly = url.searchParams.get("clearOnly") === "true";

      if (!sessionId) {
        return NextResponse.json({ success: false, message: "sessionId 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const normTarget = sessionId.trim().toLowerCase();

      // 1. 로컬 메시지 삭제
      const messages = readJsonFile(getMessagesFilePath());
      const filteredMessages = messages.filter((m) => String(m.sessionId || "").trim().toLowerCase() !== normTarget);
      safeAtomicWriteJson(getMessagesFilePath(), filteredMessages);

      // 2. 로컬 세션 처리
      const sessions = readJsonFile(getSessionsFilePath());
      if (clearOnly) {
        // 대화내용만 비우고 세션은 유지
        const updatedSessions = sessions.map((s) => {
          if (String(s.id || "").trim().toLowerCase() === normTarget) {
            return { ...s, lastMessage: "", lastMessageAt: "", updated_at: new Date().toISOString() };
          }
          return s;
        });
        safeAtomicWriteJson(getSessionsFilePath(), updatedSessions);

        // Supabase 메시지만 듀얼 삭제 (완료 대기)
        try {
          await runSafeSupabaseQuery(
            async (supabase) => supabase.from("chat_messages").delete().eq("sessionId", normTarget),
            2500
          );
        } catch (err) {
          console.warn("[Chat Clear Supabase Dual-Delete Warning]:", err);
        }
      } else {
        // 세션 완전 삭제
        const filteredSessions = sessions.filter((s) => String(s.id || "").trim().toLowerCase() !== normTarget);
        safeAtomicWriteJson(getSessionsFilePath(), filteredSessions);

        // Supabase 세션 및 메시지 듀얼 삭제 (완료 대기)
        try {
          await runSafeSupabaseQuery(
            async (supabase) => {
              await supabase.from("chat_messages").delete().eq("sessionId", normTarget);
              return await supabase.from("chat_sessions").delete().eq("id", normTarget);
            },
            2500
          );
        } catch (err) {
          console.warn("[Chat Session Supabase Dual-Delete Warning]:", err);
        }
      }

      return NextResponse.json({ success: true, sessionId, clearOnly }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
