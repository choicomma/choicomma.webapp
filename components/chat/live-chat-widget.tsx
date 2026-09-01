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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n/translation";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  senderName: string;
  text: string;
  images?: string[];
  timestamp: string;
}

const CHAT_I18N: Record<string, Record<string, string>> = {
  ko: {
    floatingButton: "1:1 라이브 상담",
    headerTitle: "choicomma 1:1 라이브 케어",
    headerSubtitle: "실시간 VIP 전담 카운슬러 대기 중",
    securityNotice: "🔒 고객 전용 비밀 보안 채팅방입니다",
    placeholder: "메시지를 입력하세요...",
    close: "닫기",
    welcomeText: "안녕하세요! 초이콤마 오리지널 1:1 라이브 전담 케어 팀입니다. 💫\n상품 문의, 주문/배송, 커스텀 사이즈 등 어떤 내용이든 편하게 말씀해 주세요.",
    autoReplyText: "문의해주신 내용을 확인하였습니다. 전담 케어 스타일리스트가 실시간 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕",
    closeNoticeText: "🔒 [안내] 최상위 VIP 회원님과의 1:1 상담이 종료되었습니다. 추가 문의 사항이 있으시면 언제든지 편하게 새 메시지를 남겨주세요. 이용해 주셔서 감사합니다! 💫",
    teamName: "choicomma VIP 케어팀",
    liveTag: "라이브",
    userName: "고객님",
    nowText: "방금 전",
    imageAlt: "첨부 이미지",
    previewAlt: "첨부 미리보기",
  },
  en: {
    floatingButton: "1:1 Live Chat",
    headerTitle: "choicomma 1:1 Live Care",
    headerSubtitle: "VIP Care Specialist Online",
    securityNotice: "🔒 Encrypted & Private Customer Chatroom",
    placeholder: "Type a message...",
    close: "Close",
    welcomeText: "Hello! Welcome to choicomma 1:1 Live Care Team. 💫\nPlease feel free to ask anything about products, orders, shipping, or custom sizing.",
    autoReplyText: "We have received your message. Our dedicated stylist is reviewing it and will respond shortly. Please wait a moment! ☕",
    closeNoticeText: "🔒 [Notice] The 1:1 consultation session with our VIP member has been closed. If you have any further inquiries, please feel free to leave a new message anytime. Thank you! 💫",
    teamName: "choicomma VIP Care",
    liveTag: "LIVE",
    userName: "Customer",
    nowText: "Just now",
    imageAlt: "Attached image",
    previewAlt: "Attached preview",
  },
  ja: {
    floatingButton: "1:1 ライブ相談",
    headerTitle: "choicomma 1:1 ライブケア",
    headerSubtitle: "VIP専任カウンセラー待機中",
    securityNotice: "🔒 お客様専用プライベート暗号化チャット",
    placeholder: "メッセージを入力...",
    close: "閉じる",
    welcomeText: "こんにちは！choicomma 1:1 ライブ専任ケアチームです。💫\n商品のお問い合わせ、注文・配送、カスタムサイズなどお気軽にご相談ください。",
    autoReplyText: "お問い合わせ内容を確認いたしました。担当スタイリストが確認次第、すぐにご案内いたします。少々お待ちください！ ☕",
    closeNoticeText: "🔒 [案内] VIP会員様との1:1相談セッションが終了いたしました。ご不明な点がございましたら、いつでも新しいメッセージをお送りください。ご利用いただきありがとうございます！ 💫",
    teamName: "choicomma VIPケアチーム",
    liveTag: "ライブ",
    userName: "お客様",
    nowText: "たった今",
    imageAlt: "添付画像",
    previewAlt: "添付プレビュー",
  },
  zh: {
    floatingButton: "1:1 实时客服",
    headerTitle: "choicomma 1:1 实时专属客服",
    headerSubtitle: "VIP 专属顾问在线中",
    securityNotice: "🔒 客户专属加密私密聊天室",
    placeholder: "请输入消息...",
    close: "关闭",
    welcomeText: "您好！欢迎使用 choicomma 1:1 实时专属客服团队。💫\n有关商品咨询、订单配送、定制尺寸等任何问题，欢迎随时联系我们。",
    autoReplyText: "已收到您的咨询内容。专属造型师正在实时确认，将尽快为您回复，请稍候！ ☕",
    closeNoticeText: "🔒 [通知] 与尊贵 VIP 会员的 1:1 专属客服咨询已结束。如果您有其他疑问，欢迎随时留下新消息。感谢您的使用！ 💫",
    teamName: "choicomma VIP客服",
    liveTag: "在线",
    userName: "顾客",
    nowText: "刚刚",
    imageAlt: "附件图片",
    previewAlt: "附件预览",
  },
  fr: {
    floatingButton: "Chat en direct 1:1",
    headerTitle: "Soin en direct 1:1 choicomma",
    headerSubtitle: "Conseiller VIP en ligne",
    securityNotice: "🔒 Chat privé et sécurisé pour le client",
    placeholder: "Écrivez votre message...",
    close: "Fermer",
    welcomeText: "Bonjour ! Bienvenue à l'équipe de soin en direct 1:1 choicomma. 💫\nN'hésitez pas à poser vos questions sur les produits, commandes ou tailles personnalisées.",
    autoReplyText: "Nous avons bien reçu votre message. Notre styliste dédié vous répondra très rapidement. Merci de patienter un instant ! ☕",
    closeNoticeText: "🔒 [Avis] La session de consultation 1:1 avec notre membre VIP est terminée. Si vous avez d'autres questions, n'hésitez pas à laisser un nouveau message à tout moment. Merci ! 💫",
    teamName: "Équipe Soin VIP choicomma",
    liveTag: "EN DIRECT",
    userName: "Client",
    nowText: "À l'instant",
    imageAlt: "Image jointe",
    previewAlt: "Aperçu joint",
  },
  de: {
    floatingButton: "1:1 Live-Beratung",
    headerTitle: "choicomma 1:1 Live-Betreuung",
    headerSubtitle: "VIP-Berater online",
    securityNotice: "🔒 Verschlüsselter privater Kundendialog",
    placeholder: "Nachricht eingeben...",
    close: "Schließen",
    welcomeText: "Hallo! Willkommen beim choicomma 1:1 Live-Team. 💫\nFragen zu Produkten, Versand oder Sondergrößen beantworten wir Ihnen gerne.",
    autoReplyText: "Vielen Dank für Ihre Nachricht. Unser VIP-Stylist antwortet Ihnen in Kürze. Bitte haben Sie einen Moment Geduld! ☕",
    closeNoticeText: "🔒 [Hinweis] Das 1:1-Beratungsgespräch mit unserem VIP-Mitglied wurde beendet. Wenn Sie weitere Fragen haben, hinterlassen Sie jederzeit gerne eine neue Nachricht. Vielen Dank! 💫",
    teamName: "choicomma VIP-Betreuung",
    liveTag: "LIVE",
    userName: "Kunde",
    nowText: "Gerade eben",
    imageAlt: "Angehängtes Bild",
    previewAlt: "Angehängte Vorschau",
  },
  es: {
    floatingButton: "Chat en Vivo 1:1",
    headerTitle: "Atención en Vivo 1:1 choicomma",
    headerSubtitle: "Asesor VIP disponible",
    securityNotice: "🔒 Chat privado y encriptado para clientes",
    placeholder: "Escribe un mensaje...",
    close: "Cerrar",
    welcomeText: "¡Hola! Bienvenido al equipo de Atención en Vivo 1:1 de choicomma. 💫\nConsulta lo que desees sobre productos, envíos o medidas personalizadas.",
    autoReplyText: "Hemos recibido tu mensaje. Nuestro estilista VIP te responderá en breve. ¡Por favor espera un momento! ☕",
    closeNoticeText: "🔒 [Aviso] La sesión de consulta 1:1 con nuestro miembro VIP ha finalizado. Si tiene más preguntas, no dude en dejar un nuevo mensaje en cualquier momento. ¡Gracias! 💫",
    teamName: "Equipo VIP choicomma",
    liveTag: "EN VIVO",
    userName: "Cliente",
    nowText: "Hace un momento",
    imageAlt: "Imagen adjunta",
    previewAlt: "Vista previa adjunta",
  },
};

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const t = CHAT_I18N[currentLang] || CHAT_I18N.ko;

  // Check user login status
  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("membership_user_email");
      setIsLoggedIn(!!email);
    }
  };

  const getUserChatKey = () => {
    if (typeof window === "undefined") return "site_live_chat_messages_guest";
    const email = localStorage.getItem("membership_user_email");
    const phone = localStorage.getItem("membership_user_phone");
    const id = email || phone || "guest";
    return `site_live_chat_messages_${id.trim().toLowerCase()}`;
  };

  // Load chat messages from localStorage
  const loadMessages = () => {
    if (typeof window === "undefined") return;
    const chatKey = getUserChatKey();
    const saved = localStorage.getItem(chatKey);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg && (lastMsg.id?.startsWith("admin-close") || lastMsg.text?.includes("상담이 종료되었습니다"))) {
            setIsOpen(false);
          }
          return;
        }
      } catch (e) {}
    }

    // Default initial message on first ever visit
    const defaultInit: ChatMessage[] = [
      {
        id: "msg-welcome-1",
        sender: "admin",
        senderName: t.teamName,
        text: t.welcomeText,
        timestamp: "NOW",
      },
    ];
    setMessages(defaultInit);
    localStorage.setItem(chatKey, JSON.stringify(defaultInit));
  };

  useEffect(() => {
    checkAuth();
    loadMessages();

    const handleStorageChange = (e: Event) => {
      setTimeout(() => {
        checkAuth();
        loadMessages();
      }, 0);
    };

    const handleChatEnded = () => {
      setIsOpen(false);
      setIsMinimized(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("live_chat_updated", handleStorageChange);
    window.addEventListener("live_chat_ended", handleChatEnded);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      window.removeEventListener("live_chat_ended", handleChatEnded);
    };
  }, [currentLang]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // LiveChatWidget is always visible for all users and members

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
      senderName: "User",
      text: inputText.trim(),
      images: attachedImages,
      timestamp: timeStr,
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    const chatKey = getUserChatKey();
    localStorage.setItem(chatKey, JSON.stringify(updated));

    // Register active user to admin chat sessions list
    if (typeof window !== "undefined") {
      const uEmail = localStorage.getItem("membership_user_email") || "guest@choicomma.com";
      const uName = localStorage.getItem("membership_user_name") || "고객님";
      const savedSessions = localStorage.getItem("admin_chat_sessions");
      let sessionList: any[] = [];
      if (savedSessions) {
        try { sessionList = JSON.parse(savedSessions); } catch (err) {}
      }
      if (!sessionList.some((s) => s.email?.toLowerCase() === uEmail.toLowerCase() || s.id?.toLowerCase() === uEmail.toLowerCase())) {
        const newSession = {
          id: uEmail,
          name: `${uName} 회원님`,
          email: uEmail,
          tier: "VIP",
          badgeColor: "bg-amber-400 text-neutral-950 font-black",
          status: "online",
        };
        localStorage.setItem("admin_chat_sessions", JSON.stringify([newSession, ...sessionList]));
      }
    }

    window.dispatchEvent(new CustomEvent("live_chat_updated"));

    setInputText("");
    setAttachedImages([]);

    // Auto simulated response if admin has not replied yet
    setTimeout(() => {
      const savedLatest = localStorage.getItem(chatKey);
      let latestList: ChatMessage[] = updated;
      try {
        if (savedLatest) latestList = JSON.parse(savedLatest);
      } catch (e) {}

      // If last message is still user's message, add automated acknowledgement
      if (latestList[latestList.length - 1]?.id === newMsg.id) {
        const autoReply: ChatMessage = {
          id: `admin-msg-auto-${Date.now()}`,
          sender: "admin",
          senderName: t.teamName,
          text: t.autoReplyText,
          timestamp: `${hours}:${mins}`,
        };
        const updatedWithAuto = [...latestList, autoReply];
        setMessages(updatedWithAuto);
        localStorage.setItem(chatKey, JSON.stringify(updatedWithAuto));
        window.dispatchEvent(new CustomEvent("live_chat_updated"));
      }
    }, 1500);
  };

  const handleResetChat = () => {
    const defaultInit: ChatMessage[] = [
      {
        id: "msg-welcome-1",
        sender: "admin",
        senderName: t.teamName,
        text: t.welcomeText,
        timestamp: "NOW",
      },
    ];
    setMessages(defaultInit);
    if (typeof window !== "undefined") {
      const chatKey = getUserChatKey();
      localStorage.setItem(chatKey, JSON.stringify(defaultInit));
      localStorage.removeItem("site_live_chat_ended");
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }
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
    <div className="fixed bottom-6 right-5 sm:bottom-6 sm:right-6 z-50 font-sans">
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
          title={t.floatingButton}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight whitespace-nowrap">
            {t.floatingButton}
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
        <div className="bg-white border border-neutral-200/90 rounded-3xl shadow-2xl w-[calc(100vw-32px)] max-w-[360px] sm:w-[400px] h-[78vh] max-h-[540px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 backdrop-blur-xl">
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
                  <h4 className="text-xs font-extrabold text-white">{t.headerTitle}</h4>
                  <span className="text-[9px] font-black bg-emerald-500 text-neutral-950 px-1.5 py-0.2 rounded uppercase">
                    {t.liveTag}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {t.headerSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="text-neutral-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Reset Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9F5]/70">
            <div className="text-center my-1">
              <span className="text-[10px] font-bold text-neutral-400 bg-white/80 px-3 py-1 rounded-full border border-neutral-200/60 shadow-2xs">
                {t.securityNotice}
              </span>
            </div>

            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const displayName = isUser ? (t.userName || "Customer") : t.teamName;
              const displayText =
                msg.id === "msg-welcome-1" || (msg.sender === "admin" && (msg.text?.includes("안녕하세요") || msg.text?.includes("Hello") || msg.text?.includes("こんにちは") || msg.text?.includes("您好") || msg.text?.includes("Bonjour") || msg.text?.includes("Hallo") || msg.text?.includes("¡Hola")))
                  ? t.welcomeText
                  : msg.id?.startsWith("admin-msg-auto-") || (msg.sender === "admin" && (msg.text?.includes("확인하였습니다") || msg.text?.includes("received") || msg.text?.includes("確認") || msg.text?.includes("reçu") || msg.text?.includes("Vielen Dank") || msg.text?.includes("recibido")))
                  ? t.autoReplyText
                  : msg.id?.startsWith("admin-close") || (msg.sender === "admin" && (msg.text?.includes("상담이 종료되었습니다") || msg.text?.includes("consultation session") || msg.text?.includes("相談セッション") || msg.text?.includes("咨询已结束") || msg.text?.includes("est terminée") || msg.text?.includes("wurde beendet") || msg.text?.includes("ha finalizado")))
                  ? t.closeNoticeText
                  : msg.text;
              const displayTime =
                msg.timestamp === "방금 전" || msg.timestamp === "NOW" || msg.timestamp === "Just now" || msg.timestamp === "たった今" || msg.timestamp === "刚刚"
                  ? t.nowText
                  : msg.timestamp;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                >
                  <span className="text-[10px] font-bold text-neutral-400 px-1">
                    {displayName} • {displayTime}
                  </span>

                  <div
                    className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                      isUser
                        ? "bg-neutral-950 text-white rounded-tr-xs font-medium"
                        : "bg-white text-neutral-900 border border-neutral-200/80 rounded-tl-xs font-medium"
                    }`}
                  >
                    {displayText}

                    {/* Attached Images */}
                    {Array.isArray(msg.images) && msg.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-neutral-200/30">
                        {msg.images.map((imgUrl, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={imgUrl}
                            alt={t.imageAlt}
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
                  <img src={img} alt={t.previewAlt} className="w-full h-full object-cover" />
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
              placeholder={t.placeholder}
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
