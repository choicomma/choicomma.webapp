"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Crown,
  Sparkles,
  Paperclip,
  CheckCheck,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  senderName: string;
  text: string;
  images?: string[];
  timestamp: string;
}

const DEFAULT_WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome-1",
    sender: "admin",
    senderName: "choicomma VIP 케어팀",
    text: "안녕하세요! 초이콤마 오리지널 1:1 라이브 전담 케어 팀입니다. 💫\n상품 문의, 주문/배송, 커스텀 사이즈 등 어떤 내용이든 편하게 말씀해 주세요.",
    timestamp: "방금 전",
  },
];

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check user login status
  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("membership_user_email");
      setIsLoggedIn(!!email);
    }
  };

  // Load chat messages from localStorage
  const loadMessages = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("site_live_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg && (lastMsg.id?.startsWith("admin-close") || lastMsg.text?.includes("상담이 종료되었습니다"))) {
            setIsOpen(false);
          }
          return;
        }
      } catch (e) {}
    }
    // Default initial message
    setMessages(DEFAULT_WELCOME_MESSAGES);
    localStorage.setItem("site_live_chat_messages", JSON.stringify(DEFAULT_WELCOME_MESSAGES));
  };

  useEffect(() => {
    checkAuth();
    loadMessages();

    const handleStorageChange = () => {
      checkAuth();
      loadMessages();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("live_chat_updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  if (!isLoggedIn) {
    return null;
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && attachedImages.length === 0) return;

    const dateNow = new Date();
    const hours = String(dateNow.getHours()).padStart(2, "0");
    const mins = String(dateNow.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${mins}`;

    const newMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: "user",
      senderName: "고객님",
      text: inputText.trim(),
      images: attachedImages,
      timestamp: timeStr,
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem("site_live_chat_messages", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("live_chat_updated"));

    setInputText("");
    setAttachedImages([]);

    // Auto simulated response if admin has not replied yet
    setTimeout(() => {
      const savedLatest = localStorage.getItem("site_live_chat_messages");
      let latestList: ChatMessage[] = updated;
      try {
        if (savedLatest) latestList = JSON.parse(savedLatest);
      } catch (e) {}

      // If last message is still user's message, add automated acknowledgement
      if (latestList[latestList.length - 1]?.id === newMsg.id) {
        const autoReply: ChatMessage = {
          id: `admin-msg-auto-${Date.now()}`,
          sender: "admin",
          senderName: "choicomma VIP 케어팀",
          text: "문의해주신 내용을 확인하였습니다. 전담 케어 스타일리스트가 실시간 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕",
          timestamp: `${hours}:${mins}`,
        };
        const updatedWithAuto = [...latestList, autoReply];
        setMessages(updatedWithAuto);
        localStorage.setItem("site_live_chat_messages", JSON.stringify(updatedWithAuto));
        window.dispatchEvent(new CustomEvent("live_chat_updated"));
      }
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (attachedImages.length < 3) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const res = evt.target?.result as string;
          if (res) {
            setAttachedImages((prev) => (prev.length < 3 ? [...prev, res] : prev));
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setUnreadCount(0);
          }}
          className="group relative bg-neutral-950 hover:bg-black text-white px-4 py-2.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 border border-neutral-800"
          title="1:1 사이트 내 실시간 라이브 채팅"
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight whitespace-nowrap">
            1:1 라이브 상담
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="bg-white border border-neutral-200/90 rounded-3xl shadow-2xl w-[360px] sm:w-[400px] h-[540px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 backdrop-blur-xl">
          {/* Header Bar */}
          <div className="bg-neutral-950 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-neutral-950 font-black text-xs flex items-center justify-center shadow-xs">
                  <Crown className="w-4 h-4 fill-neutral-950 text-neutral-950" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-extrabold text-white">choicomma 1:1 라이브 케어</h4>
                  <span className="text-[9px] font-black bg-emerald-500 text-neutral-950 px-1.5 py-0.2 rounded uppercase">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  실시간 VIP 전담 카운슬러 대기 중
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9F5]/70">
            <div className="text-center my-1">
              <span className="text-[10px] font-bold text-neutral-400 bg-white/80 px-3 py-1 rounded-full border border-neutral-200/60 shadow-2xs">
                🔒 고객 전용 비밀 보안 채팅방입니다
              </span>
            </div>

            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                >
                  <span className="text-[10px] font-bold text-neutral-400 px-1">
                    {msg.senderName} • {msg.timestamp}
                  </span>

                  <div
                    className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                      isUser
                        ? "bg-neutral-950 text-white rounded-tr-xs font-medium"
                        : "bg-white text-neutral-900 border border-neutral-200/80 rounded-tl-xs font-medium"
                    }`}
                  >
                    {msg.text}

                    {/* Attached Images */}
                    {Array.isArray(msg.images) && msg.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-neutral-200/30">
                        {msg.images.map((imgUrl, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={imgUrl}
                            alt="첨부 이미지"
                            className="w-full aspect-square object-cover rounded-xl border border-neutral-300 bg-neutral-100"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Image Preview Row */}
          {attachedImages.length > 0 && (
            <div className="px-4 py-2 bg-neutral-100 border-t border-neutral-200 flex gap-2 overflow-x-auto shrink-0">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-neutral-300 shrink-0">
                  <img src={img} alt="첨부 미리보기" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setAttachedImages(attachedImages.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-200/80 flex items-center gap-2 shrink-0">
            <label className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl cursor-pointer transition-colors shrink-0">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && attachedImages.length === 0}
              className="bg-neutral-950 hover:bg-black text-white p-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
