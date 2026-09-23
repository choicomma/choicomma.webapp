"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Sparkles,
  Paperclip,
  CheckCheck,
  Minimize2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n/translation";
import { DEFAULT_AUTO_RULES, type AutoReplyRule } from "@/app/admin/components/inquiries-management";
import { supabase } from "@/lib/supabase/client";

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
    welcomeText: "안녕하세요! 초이콤마 오리지널 1:1 라이브 전담 케어 팀입니다. 💫\n상품 문의, 주문/배송 등 어떤 내용이든 편하게 말씀해 주세요.",
    autoReplyText: "문의해주신 내용을 전달되었습니다. 담당자 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕",
    closeNoticeText: "🔒 [안내] 1:1 상담이 종료되었습니다. 추가 문의 사항이 있으시면 언제든지 편하게 새 메시지를 남겨주세요. 이용해 주셔서 감사합니다! 💫",
    teamName: "choicomma VIP 케어팀",
    liveTag: "라이브",
    userName: "고객님",
    nowText: "방금 전",
    typingText: "상담원이 답변을 작성 중입니다...",
    imageAlt: "첨부 이미지",
    previewAlt: "첨부 미리보기",
    loginModalTitle: "1:1 라이브 VIP 케어",
    loginModalBadge: "회원 전용 서비스",
    loginModalDesc: "초이콤마 1:1 실시간 맞춤 상담은 회원 전용 서비스입니다.\n로그인 후 1:1 맞춤 케어를 이용해 보세요.",
    loginModalAction: "로그인하러 가기",
    loginModalClose: "닫기",
  },
  en: {
    floatingButton: "1:1 Live Chat",
    headerTitle: "choicomma 1:1 Live Care",
    headerSubtitle: "VIP Care Specialist Online",
    securityNotice: "🔒 Encrypted & Private Customer Chatroom",
    placeholder: "Type a message...",
    close: "Close",
    welcomeText: "Hello! Welcome to choicomma 1:1 Live Care Team. 💫\nPlease feel free to ask anything about products, orders, shipping, or custom sizing.",
    autoReplyText: "We have received your message. Our team is reviewing it and will respond shortly. Please wait a moment! ☕",
    closeNoticeText: "🔒 [Notice] The 1:1 consultation session has been closed. If you have any further inquiries, please feel free to leave a new message anytime. Thank you! 💫",
    teamName: "choicomma VIP Care",
    liveTag: "LIVE",
    userName: "Customer",
    nowText: "Just now",
    typingText: "Care specialist is typing a reply...",
    imageAlt: "Attached image",
    previewAlt: "Attached preview",
    loginModalTitle: "1:1 Live VIP Care",
    loginModalBadge: "Members Only",
    loginModalDesc: "choicomma 1:1 Live Consultation is an exclusive service for registered members.\nPlease log in to enjoy 1:1 personalized care.",
    loginModalAction: "Log In",
    loginModalClose: "Close",
  },
  ja: {
    floatingButton: "1:1 ライブ相談",
    headerTitle: "choicomma 1:1 ライブケア",
    headerSubtitle: "VIP専任カウンセラー待机中",
    securityNotice: "🔒 お客様専用プライベート暗号化チャット",
    placeholder: "メッセージを入力...",
    close: "閉じる",
    welcomeText: "こんにちは！choicomma 1:1 ライブ専任ケアチームです。💫\n商品のお問い合わせ、注文・配送、カスタムサイズなどお気軽にご相談ください。",
    autoReplyText: "お問い合わせ内容を確認いたしました。担当者が確認次第、すぐにご案内いたします。少々お待ちください！ ☕",
    closeNoticeText: "🔒 [案内] VIP会員様との1:1相談セッションが終了いたしました。ご不明な点がございましたら、いつでも新しいメッセージをお送りください。ご利用いただきありがとうございます！ 💫",
    teamName: "choicomma VIPケアチーム",
    liveTag: "ライブ",
    userName: "お客様",
    nowText: "たった今",
    typingText: "担当者が返信を入力中です...",
    imageAlt: "添付画像",
    previewAlt: "添付プレビュー",
    loginModalTitle: "1:1 ライブVIPケア",
    loginModalBadge: "会員専用サービス",
    loginModalDesc: "choicomma 1:1 リアルタイム相談は会員専用サービスです。\nログイン後、1:1カスタムケアをご利用ください。",
    loginModalAction: "ログインする",
    loginModalClose: "閉じる",
  },
  zh: {
    floatingButton: "1:1 实时客服",
    headerTitle: "choicomma 1:1 实时专属客服",
    headerSubtitle: "VIP 专属顾问在线中",
    securityNotice: "🔒 客户专属加密私密聊天室",
    placeholder: "请输入消息...",
    close: "关闭",
    welcomeText: "您好！欢迎使用 choicomma 1:1 实时专属客服团队。💫\n有关商品咨询、订单配送、定制尺寸等任何问题，欢迎随时联系我们。",
    autoReplyText: "已收到您的咨询内容。客服人员正在实时确认，将尽快为您回复，请稍候！ ☕",
    closeNoticeText: "🔒 [通知] 与尊贵 VIP 会员的 1:1 专属客服咨询已结束。如果您有其他疑问，欢迎随时留下新消息。感谢您的使用！ 💫",
    teamName: "choicomma VIP客服",
    liveTag: "在线",
    userName: "顾客",
    nowText: "刚刚",
    typingText: "专属客服正在输入回复...",
    imageAlt: "附件图片",
    previewAlt: "附件预览",
    loginModalTitle: "1:1 VIP 专属客服",
    loginModalBadge: "会员专享服务",
    loginModalDesc: "choicomma 1:1 实时专属客服为会员专享服务。\n登录后即可享受 1:1 专属贴心服务。",
    loginModalAction: "前往登录",
    loginModalClose: "关闭",
  },
  fr: {
    floatingButton: "Chat en direct 1:1",
    headerTitle: "Soin en direct 1:1 choicomma",
    headerSubtitle: "Conseiller VIP en ligne",
    securityNotice: "🔒 Chat privé et sécurisé pour le client",
    placeholder: "Écrivez votre message...",
    close: "Fermer",
    welcomeText: "Bonjour ! Bienvenue à l'équipe de soin en direct 1:1 choicomma. 💫\nN'hésitez pas à poser vos questions sur les produits, commandes ou tailles personnalisées.",
    autoReplyText: "Nous avons bien reçu votre message. Notre conseiller vous répondra très rapidement. Merci de patienter un instant ! ☕",
    closeNoticeText: "🔒 [Avis] La session de consultation 1:1 avec notre membre VIP est terminée. Si vous avez d'autres questions, n'hésitez pas à laisser un nouveau message à tout moment. Merci ! 💫",
    teamName: "Équipe Soin VIP choicomma",
    liveTag: "EN DIRECT",
    userName: "Client",
    nowText: "À l'instant",
    typingText: "Le conseiller rédige une réponse...",
    imageAlt: "Image jointe",
    previewAlt: "Aperçu joint",
    loginModalTitle: "Soin VIP 1:1 en direct",
    loginModalBadge: "Réservé aux membres",
    loginModalDesc: "Le soin 1:1 en direct choicomma est réservé aux membres.\nVeuillez vous connecter pour profiter de notre service personnalisé 1:1.",
    loginModalAction: "Se connecter",
    loginModalClose: "Fermer",
  },
  de: {
    floatingButton: "1:1 Live-Beratung",
    headerTitle: "choicomma 1:1 Live-Betreuung",
    headerSubtitle: "VIP-Berater online",
    securityNotice: "🔒 Verschlüsselter privater Kundendialog",
    placeholder: "Nachricht eingeben...",
    close: "Schließen",
    welcomeText: "Hallo! Willkommen beim choicomma 1:1 Live-Team. 💫\nFragen zu Produkten, Versand oder Sondergrößen beantworten wir Ihnen gerne.",
    autoReplyText: "Vielen Dank für Ihre Nachricht. Unser Team antwortet Ihnen in Kürze. Bitte haben Sie einen Moment Geduld! ☕",
    closeNoticeText: "🔒 [Hinweis] Das 1:1-Beratungsgespräch mit unserem VIP-Mitglied wurde beendet. Wenn Sie weitere Fragen haben, hinterlassen Sie jederzeit gerne eine neue Nachricht. Vielen Dank! 💫",
    teamName: "choicomma VIP-Betreuung",
    liveTag: "LIVE",
    userName: "Kunde",
    nowText: "Gerade eben",
    typingText: "Berater tippt eine Antwort...",
    imageAlt: "Angehängtes Bild",
    previewAlt: "Angehängte Vorschau",
    loginModalTitle: "1:1 VIP Live-Betreuung",
    loginModalBadge: "Nur für Mitglieder",
    loginModalDesc: "Die choicomma 1:1 Live-Beratung ist exklusiv für registrierte Mitglieder.\nBitte melden Sie sich an, um Ihren VIP-Berater zu kontaktieren.",
    loginModalAction: "Jetzt anmelden",
    loginModalClose: "Schließen",
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
    closeNoticeText: "🔒 [Aviso] La session de consulta 1:1 con nuestro miembro VIP ha finalizado. Si tiene más preguntas, no dude en dejar un nuevo mensaje en cualquier momento. ¡Gracias! 💫",
    teamName: "Equipo VIP choicomma",
    liveTag: "EN VIVO",
    userName: "Cliente",
    nowText: "Hace un momento",
    typingText: "El asesor está escribiendo...",
    imageAlt: "Imagen adjunta",
    previewAlt: "Vista previa adjunta",
    loginModalTitle: "Atención VIP 1:1 en Vivo",
    loginModalBadge: "Exclusivo para miembros",
    loginModalDesc: "La atención 1:1 en vivo de choicomma es un servicio exclusivo para miembros.\nInicie sesión para contactar con su asesor VIP dedicado.",
    loginModalAction: "Iniciar sesión",
    loginModalClose: "Cerrar",
  },
};

export function LiveChatWidget() {
  const router = useRouter();
  const pathname = usePathname();

  // Do not render floating customer live chat on admin dashboard
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const t = CHAT_I18N[currentLang] || CHAT_I18N.ko;

  // Check user login status strictly
  const checkAuth = (): boolean => {
    if (typeof window !== "undefined") {
      const isLoggedInFlag = localStorage.getItem("is_logged_in") === "true";
      const email = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const name = (localStorage.getItem("membership_user_name") || "").trim();
      const role = (localStorage.getItem("user_role") || "").toLowerCase().trim();
      const isAdminSession = sessionStorage.getItem("choicomma_admin_authenticated") === "true";

      const isLogged = Boolean(
        isLoggedInFlag ||
        (email && email.length > 0) ||
        (name && name.length > 0) ||
        role === "admin" ||
        isAdminSession
      );

      setIsLoggedIn(isLogged);
      return isLogged;
    }
    return false;
  };

  const getUserChatKey = () => {
    if (typeof window === "undefined") return "site_live_chat_messages_guest";
    const email = localStorage.getItem("membership_user_email");
    const phone = localStorage.getItem("membership_user_phone");
    const id = email || phone || "guest";
    return `site_live_chat_messages_${id.trim().toLowerCase()}`;
  };

  const registerUserSession = (status: "active" | "online" = "active") => {
    if (typeof window === "undefined") return;
    const email = localStorage.getItem("membership_user_email");
    const phone = localStorage.getItem("membership_user_phone");
    if (!email && !phone) return;

    const rawId = email || phone || "";
    const uEmail = email || `${rawId}@customer.choicomma.com`;
    const uName = localStorage.getItem("membership_user_name") || "회원";

    let userTier = "GENERAL";
    let badgeColor = "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300";

    const savedCustomers = localStorage.getItem("admin_customers");
    if (savedCustomers) {
      try {
        const list: any[] = JSON.parse(savedCustomers);
        const found = list.find((c: any) =>
          (c.email && c.email.toLowerCase() === uEmail.toLowerCase()) ||
          (c.phone && phone && c.phone.replace(/[^0-9]/g, "") === phone.replace(/[^0-9]/g, "")) ||
          (c.name && c.name === uName)
        );
        if (found && (found.grade || found.tier)) {
          userTier = (found.grade || found.tier).toUpperCase();
        }
      } catch (e) {}
    }

    if (userTier.includes("VVIP") || userTier.includes("BLACK")) {
      badgeColor = "bg-neutral-950 text-white font-black border border-neutral-950";
    } else if (userTier.includes("PLATINUM")) {
      badgeColor = "bg-neutral-800 text-white font-black border border-neutral-800";
    } else if (userTier.includes("GOLD")) {
      badgeColor = "bg-neutral-200 text-neutral-900 border border-neutral-300";
    } else if (userTier.includes("SILVER")) {
      badgeColor = "bg-neutral-100 text-neutral-800 border border-neutral-200";
    }

    const savedSessions = localStorage.getItem("admin_chat_sessions");
    let sessionList: any[] = [];
    if (savedSessions) {
      try { sessionList = JSON.parse(savedSessions); } catch (err) {}
    }

    const updatedSession = {
      id: rawId,
      name: uName.endsWith("님") ? uName : `${uName}님`,
      email: uEmail,
      tier: userTier,
      badgeColor: badgeColor,
      status: status,
    };

    const existingIndex = sessionList.findIndex((s) => s.id?.toLowerCase() === rawId.toLowerCase() || s.email?.toLowerCase() === uEmail.toLowerCase());
    if (existingIndex >= 0) {
      sessionList[existingIndex] = { ...sessionList[existingIndex], ...updatedSession };
    } else {
      sessionList = [updatedSession, ...sessionList];
    }
    localStorage.setItem("admin_chat_sessions", JSON.stringify(sessionList));

    try {
      supabase.from("chat_sessions").upsert([
        {
          id: rawId,
          customerName: uName,
          customerEmail: uEmail,
          customerPhone: phone || "",
          status: status,
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: "id" }).then(() => {});
    } catch (e) {}

    window.dispatchEvent(new CustomEvent("live_chat_updated"));
  };

  // Load chat messages from localStorage + Supabase (only for authenticated members)
  const loadMessages = () => {
    if (typeof window === "undefined") return;
    const authed = checkAuth();
    if (!authed) {
      setMessages([]);
      return;
    }

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
        }
      } catch (e) { }
    } else {
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
    }

    // Sync from Supabase chat_messages
    const email = localStorage.getItem("membership_user_email");
    const phone = localStorage.getItem("membership_user_phone");
    const rawId = email || phone || "";
    if (rawId) {
      supabase
        .from("chat_messages")
        .select("*")
        .eq("sessionId", rawId)
        .order("created_at", { ascending: true })
        .then(({ data: dbMsgs, error }) => {
          if (!error && Array.isArray(dbMsgs) && dbMsgs.length > 0) {
            const formatted: ChatMessage[] = dbMsgs.map((m: any) => {
              const d = new Date(m.created_at || Date.now());
              const hours = String(d.getHours()).padStart(2, "0");
              const mins = String(d.getMinutes()).padStart(2, "0");
              return {
                id: m.id,
                sender: m.sender || "user",
                senderName: m.sender === "admin" ? t.teamName : (t.userName || "Customer"),
                text: m.text,
                timestamp: `${hours}:${mins}`,
              };
            });
            setMessages(formatted);
            localStorage.setItem(chatKey, JSON.stringify(formatted));
          }
        });
    }
  };

  useEffect(() => {
    const isAuthed = checkAuth();
    if (isAuthed) {
      loadMessages();
    }

    const handleStorageChange = () => {
      setTimeout(() => {
        const authed = checkAuth();
        if (!authed) {
          setIsOpen(false);
          setShowLoginModal(false);
          setMessages([]);
        } else {
          loadMessages();
        }
      }, 0);
    };

    const handleChatEnded = () => {
      setIsOpen(false);
      setIsMinimized(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth_changed", handleStorageChange);
    window.addEventListener("live_chat_updated", handleStorageChange);
    window.addEventListener("live_chat_ended", handleChatEnded);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth_changed", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      window.removeEventListener("live_chat_ended", handleChatEnded);
    };
  }, [currentLang]);

  // Periodic sync & realtime updates from Supabase when chat is open
  useEffect(() => {
    if (!isOpen) return;
    registerUserSession("active");
    loadMessages();

    const email = typeof window !== "undefined" ? localStorage.getItem("membership_user_email") : null;
    const phone = typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") : null;
    const rawId = email || phone || "";

    let channel: any = null;
    if (rawId) {
      const channelId = `customer_live_chat_${rawId.replace(/[^a-zA-Z0-9]/g, "_")}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `sessionId=eq.${rawId}`,
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();
    }

    const interval = setInterval(() => {
      loadMessages();
    }, 3500);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isOpen]);

  // Scroll to bottom on new message or typing indicator
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isTyping, isOpen]);

  // LiveChatWidget is always visible for all users and members

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Strict guard: unauthenticated users cannot send messages
    const authed = checkAuth();
    if (!authed) {
      setIsOpen(false);
      setShowLoginModal(true);
      return;
    }

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

    const email = typeof window !== "undefined" ? localStorage.getItem("membership_user_email") : null;
    const phone = typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") : null;
    const rawId = email || phone || "";

    // Register active user to admin chat sessions list with accurate grade/tier & Supabase
    registerUserSession("active");

    // Supabase DB message insert
    if (rawId) {
      supabase
        .from("chat_messages")
        .insert([
          {
            id: newMsg.id,
            sessionId: rawId,
            sender: "user",
            text: newMsg.text || (newMsg.images?.length ? "[사진 첨부]" : ""),
          },
        ])
        .then(() => {});
    }

    window.dispatchEvent(new CustomEvent("live_chat_updated"));

    setInputText("");
    setAttachedImages([]);

    // Auto simulated response based on Admin Smart Auto-reply settings
    let isAutoEnabled = true;
    let autoDelayMs = 1500;
    let autoReplyMessage = t.autoReplyText;
    // Evaluate keyword matching from DEFAULT_AUTO_RULES or saved rules
    let activeRules: AutoReplyRule[] = DEFAULT_AUTO_RULES;

    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("admin_auto_reply_enabled");
      if (savedEnabled !== null) {
        isAutoEnabled = savedEnabled === "true";
      }

      const savedDelay = localStorage.getItem("admin_auto_reply_delay");
      if (savedDelay !== null) {
        const parsedDelay = parseFloat(savedDelay);
        if (!isNaN(parsedDelay) && parsedDelay >= 0) {
          autoDelayMs = parsedDelay * 1000;
        }
      }

      const savedFallback = localStorage.getItem("admin_auto_reply_fallback");
      if (savedFallback) {
        autoReplyMessage = savedFallback;
      }

      const savedRules = localStorage.getItem("admin_auto_reply_rules");
      if (savedRules) {
        try {
          const rules = JSON.parse(savedRules);
          if (Array.isArray(rules) && rules.length > 0) {
            activeRules = rules;
          }
        } catch (e) {}
      }
    }

    // Keyword match against active rules
    const userTextLower = (newMsg.text || "").toLowerCase();
    const matchedRule = activeRules.find((rule: AutoReplyRule) => {
      if (!rule.enabled) return false;
      const kws = (rule.keywords || "").split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
      return kws.some((kw: string) => userTextLower.includes(kw));
    });

    if (matchedRule && matchedRule.replyText) {
      autoReplyMessage = matchedRule.replyText;
    }

    if (isAutoEnabled) {
      // 1. 대기시간(말풍선 등장 전 대기)은 5초(5000ms)로 항상 고정
      const fixedWaitDelay = 5000; 

      // 2. '상담원이 답변을 작성 중입니다...' 말풍선이 켜진 후 답변이 전송되기까지의 지연 속도는 관리자 설정(autoDelayMs)으로 동작
      const typingDuration = Math.max(autoDelayMs, 1000); 
      const totalDeliveryTime = fixedWaitDelay + typingDuration; // 5초 대기 + 관리자 설정 지연시간 후 답변 전송

      // [5초 고정 대기 후] '상담원이 답변을 작성 중입니다...' 말풍선 등장
      setTimeout(() => {
        setIsTyping(true);
      }, fixedWaitDelay);

      // [말풍선 등장 후 설정된 지연시간 동안 타이핑 후] 최종 자동 답변 전송
      setTimeout(() => {
        setIsTyping(false);
        const savedLatest = localStorage.getItem(chatKey);
        let latestList: ChatMessage[] = updated;
        try {
          if (savedLatest) latestList = JSON.parse(savedLatest);
        } catch (e) { }

        // If last message is still user's message, send the keyword-matched auto reply
        if (latestList[latestList.length - 1]?.id === newMsg.id) {
          const autoReply: ChatMessage = {
            id: `admin-msg-auto-${Date.now()}`,
            sender: "admin",
            senderName: t.teamName,
            text: autoReplyMessage,
            timestamp: `${hours}:${mins}`,
          };
          const updatedWithAuto = [...latestList, autoReply];
          setMessages(updatedWithAuto);
          localStorage.setItem(chatKey, JSON.stringify(updatedWithAuto));
          window.dispatchEvent(new CustomEvent("live_chat_updated"));

          if (rawId) {
            supabase
              .from("chat_messages")
              .insert([
                {
                  id: autoReply.id,
                  sessionId: rawId,
                  sender: "admin",
                  text: autoReply.text,
                },
              ])
              .then(() => {});
          }
        }
      }, totalDeliveryTime);
    }
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
      {/* Floating Toggle Button with Speech Bubble Tooltip */}
      {!isOpen && (
        <div className="relative flex flex-col items-center">
          {/* Speech Bubble above the button */}
          <div className="mb-2 bg-neutral-900 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl border border-neutral-700/80 animate-bounce tracking-tight whitespace-nowrap relative select-none pointer-events-none">
            {t.floatingButton}
            {/* Speech bubble bottom tail */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 rotate-45 border-r border-b border-neutral-700/80" />
          </div>

          {/* Circular Icon-only Button (Clean Large Circle) */}
          <button
            type="button"
            onClick={() => {
              const authed = checkAuth();
              if (!authed) {
                setShowLoginModal(true);
                return;
              }
              setIsOpen(true);
              setIsMinimized(false);
              setUnreadCount(0);
              registerUserSession("active");
            }}
            className="group relative w-[60px] h-[60px] rounded-full bg-neutral-950 hover:bg-black text-white shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 border-2 border-neutral-700 shrink-0"
            title={t.floatingButton}
          >
            <div className="relative flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white group-hover:rotate-6 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
            </div>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded-full border-2 border-white animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="bg-white border border-neutral-200/90 rounded-3xl shadow-2xl w-[calc(100vw-32px)] max-w-[360px] sm:w-[400px] h-[78vh] max-h-[540px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-xl">
          {/* Header Bar */}
          <div className="bg-neutral-950 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-neutral-800 text-white font-black text-xs flex items-center justify-center shadow-xs border border-neutral-700">
                  <MessageSquare className="w-4 h-4 text-white" />
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
                msg.id === "msg-welcome-1" && currentLang !== "ko"
                  ? t.welcomeText
                  : msg.id?.startsWith("admin-close") && currentLang !== "ko"
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
                    className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${isUser
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

            {/* Real-time Typing Indicator Bubble */}
            {isTyping && (
              <div className="flex flex-col items-start space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <span className="text-[10px] font-bold text-neutral-400 px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  {t.teamName}
                </span>
                <div className="bg-white border border-neutral-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce" />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-500 ml-1">
                    {t.typingText}
                  </span>
                </div>
              </div>
            )}

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
              className="flex-1 bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2 text-base sm:text-xs font-medium text-neutral-950 focus:outline-none focus:border-neutral-950"
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

      {/* Luxury Member-Only Login Notice Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white border border-neutral-200/90 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 sm:p-7 relative text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              title={t.loginModalClose}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h3 className="text-lg font-black text-neutral-950 tracking-tight mb-2 pt-2">
              {t.loginModalTitle}
            </h3>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed mb-6 whitespace-pre-line">
              {t.loginModalDesc}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  const redirectPath = typeof window !== "undefined" ? window.location.pathname : "/";
                  router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-neutral-950 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.loginModalAction}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 px-4 rounded-xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t.loginModalClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

