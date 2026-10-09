import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function writeJsonFile(filePath: string, data: any[]) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, filePath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(filePath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error(`[Write Error: ${filePath}]:`, err);
  }
}

// GET: 라이브 채팅 세션 및 메시지 조회
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // sessions | messages | all
  const sessionId = url.searchParams.get("sessionId");

  if (type === "messages" && sessionId) {
    const norm = sessionId.trim().toLowerCase();
    const messages = readJsonFile(getMessagesFilePath());
    const filtered = messages.filter((m) => String(m.sessionId || "").trim().toLowerCase() === norm);
    return NextResponse.json({ success: true, count: filtered.length, messages: filtered });
  }

  if (type === "sessions") {
    const sessions = readJsonFile(getSessionsFilePath());
    return NextResponse.json({ success: true, count: sessions.length, sessions });
  }

  const sessions = readJsonFile(getSessionsFilePath());
  const messages = readJsonFile(getMessagesFilePath());
  return NextResponse.json({ success: true, sessions, messages });
}

// POST: 채팅 세션 등록 또는 메시지 추가
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "message";
    const body = await req.json();

    if (type === "session") {
      const sessions = readJsonFile(getSessionsFilePath());
      const idx = sessions.findIndex((s) => s.id === body.id);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], ...body, updated_at: new Date().toISOString() };
      } else {
        sessions.unshift({ ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      writeJsonFile(getSessionsFilePath(), sessions);
      return NextResponse.json({ success: true, session: body });
    }

    // Default: append message
    const messages = readJsonFile(getMessagesFilePath());
    const newMsg = {
      id: body.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: body.sessionId,
      sender: body.sender || "customer",
      content: body.content || body.message || body.text || "",
      text: body.text || body.content || body.message || "",
      created_at: body.created_at || new Date().toISOString(),
      ...body,
    };
    messages.push(newMsg);
    writeJsonFile(getMessagesFilePath(), messages);

    // Update parent session's last message
    const sessions = readJsonFile(getSessionsFilePath());
    const sIdx = sessions.findIndex((s) => s.id === body.sessionId);
    if (sIdx !== -1) {
      sessions[sIdx].lastMessage = newMsg.content;
      sessions[sIdx].lastMessageAt = newMsg.created_at;
      sessions[sIdx].updated_at = new Date().toISOString();
      writeJsonFile(getSessionsFilePath(), sessions);
    }

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: 채팅 세션 및 메시지 삭제 (또는 메시지만 초기화)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const clearOnly = url.searchParams.get("clearOnly") === "true";

    if (!sessionId) {
      return NextResponse.json({ success: false, message: "sessionId 누락" }, { status: 400 });
    }

    const normTarget = sessionId.trim().toLowerCase();

    // 1. 메시지 삭제
    const messages = readJsonFile(getMessagesFilePath());
    const filteredMessages = messages.filter((m) => String(m.sessionId || "").trim().toLowerCase() !== normTarget);
    writeJsonFile(getMessagesFilePath(), filteredMessages);

    // 2. 세션 처리
    const sessions = readJsonFile(getSessionsFilePath());
    if (clearOnly) {
      // 대화내용만 비우고 세션은 유지
      const updatedSessions = sessions.map((s) => {
        if (String(s.id || "").trim().toLowerCase() === normTarget) {
          return { ...s, lastMessage: "", lastMessageAt: "", updated_at: new Date().toISOString() };
        }
        return s;
      });
      writeJsonFile(getSessionsFilePath(), updatedSessions);
    } else {
      // 세션 완전 삭제
      const filteredSessions = sessions.filter((s) => String(s.id || "").trim().toLowerCase() !== normTarget);
      writeJsonFile(getSessionsFilePath(), filteredSessions);
    }

    return NextResponse.json({ success: true, sessionId, clearOnly });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
