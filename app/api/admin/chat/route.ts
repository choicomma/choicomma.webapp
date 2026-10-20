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
    const messages = readJsonFile(getMessagesFilePath());
    let filtered = messages.filter((m) => String(m.sessionId || "").trim().toLowerCase() === norm);

    // 비상 복구(Self-Healing): 로컬 메시지가 없는 경우 Supabase에서 복구 시도
    if (filtered.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) =>
            supabase
              .from("chat_messages")
              .select("*")
              .eq("sessionId", norm)
              .order("created_at", { ascending: true }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          filtered = data;
        }
      } catch (fallbackErr) {
        console.warn("[Chat Messages Remote Fallback Warning]:", fallbackErr);
      }
    }

    return NextResponse.json({ success: true, count: filtered.length, messages: filtered }, { headers: NO_CACHE_HEADERS });
  }

  if (type === "sessions") {
    let sessions = readJsonFile(getSessionsFilePath());

    // 비상 복구(Self-Healing): 로컬 세션이 없는 경우 Supabase에서 복구 시도
    if (sessions.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) =>
            supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          sessions = data;
          safeAtomicWriteJson(getSessionsFilePath(), sessions);
        }
      } catch (fallbackErr) {
        console.warn("[Chat Sessions Remote Fallback Warning]:", fallbackErr);
      }
    }

    return NextResponse.json({ success: true, count: sessions.length, sessions }, { headers: NO_CACHE_HEADERS });
  }

  let sessions = readJsonFile(getSessionsFilePath());
  const messages = readJsonFile(getMessagesFilePath());

  // 메시지는 있으나 세션 목록에 누락된 경우 자동 복구/보정
  const sessionMap = new Map<string, any>();
  sessions.forEach((s) => {
    if (s && s.id) sessionMap.set(String(s.id).trim().toLowerCase(), s);
  });
  let sessionsUpdated = false;
  messages.forEach((m) => {
    const sId = String(m?.sessionId || "").trim().toLowerCase();
    if (sId && !sessionMap.has(sId)) {
      const syn = {
        id: sId,
        customerName: sId.includes("@") ? sId.split("@")[0] : sId,
        customerEmail: sId.includes("@") ? sId : "",
        customerPhone: "",
        status: "active",
        lastMessage: m.content || m.text || "",
        lastMessageAt: m.created_at,
        created_at: m.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sessionMap.set(sId, syn);
      sessions.unshift(syn);
      sessionsUpdated = true;
    }
  });
  if (sessionsUpdated) {
    safeAtomicWriteJson(getSessionsFilePath(), sessions);
  }

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

        // 2. Supabase 비동기 듀얼 라이트
        const supabaseSession = {
          id: normId,
          customerName: body.customerName || body.name || "방문자",
          customerEmail: body.customerEmail || (normId.includes("@") ? normId : ""),
          customerPhone: body.customerPhone || body.phone || "",
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        };

        runSafeSupabaseQuery(
          async (supabase) => supabase.from("chat_sessions").upsert([supabaseSession], { onConflict: "id" }),
          2500
        )
          .then((res) => {
            if (res.error) {
              console.warn("[Chat Session Supabase Dual-Write Notice]:", res.error.message || res.error);
            } else {
              console.log(`[Chat Session Supabase Dual-Write Success] ID: ${normId}`);
            }
          })
          .catch((err) => {
            console.warn("[Chat Session Supabase Dual-Write Warning]:", err);
          });

        return NextResponse.json({ success: true, session: sessionRecord }, { headers: NO_CACHE_HEADERS });
      }

      // Default: append or update message
      const messages = readJsonFile(getMessagesFilePath());
      const normSessionId = String(body.sessionId || "").trim().toLowerCase();
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

        // Supabase 메시지만 듀얼 삭제
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("chat_messages").delete().eq("sessionId", normTarget),
          2500
        ).catch((err) => console.warn("[Chat Clear Supabase Dual-Delete Warning]:", err));
      } else {
        // 세션 완전 삭제
        const filteredSessions = sessions.filter((s) => String(s.id || "").trim().toLowerCase() !== normTarget);
        safeAtomicWriteJson(getSessionsFilePath(), filteredSessions);

        // Supabase 세션 및 메시지 듀얼 삭제
        runSafeSupabaseQuery(
          async (supabase) => {
            await supabase.from("chat_messages").delete().eq("sessionId", normTarget);
            return await supabase.from("chat_sessions").delete().eq("id", normTarget);
          },
          2500
        ).catch((err) => console.warn("[Chat Session Supabase Dual-Delete Warning]:", err));
      }

      return NextResponse.json({ success: true, sessionId, clearOnly }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
