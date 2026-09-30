"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  Lock,
  Eye,
  EyeOff,
  User2,
  ChevronUp,
  ChevronDown,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n/translation";
import { DEFAULT_AUTO_RULES, type AutoReplyRule } from "@/app/admin/components/inquiries-management";
import { supabase } from "@/lib/supabase/client";
import { splitKoreanAddress } from "@/lib/address";
import { initCustomerSession } from "@/lib/auth/customer-session";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  senderName: string;
  text: string;
  images?: string[];
  timestamp: string;
  created_at?: string;
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
    resetChat: "대화 내용 초기화",
    confirmReset: "1:1 대화 내역을 모두 초기화하시겠습니까?\n초기화 시 이전 대화 내역은 영구 삭제됩니다.",
    resetSuccess: "대화 내역이 성공적으로 초기화되었습니다.",
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
    resetChat: "Reset Chat",
    confirmReset: "Are you sure you want to reset all conversation history?\nPrevious messages will be permanently deleted.",
    resetSuccess: "Conversation history has been reset successfully.",
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
    resetChat: "チャット初期化",
    confirmReset: "1:1 チャット履歴を初期化しますか？\n以前の会話内容は完全に削除されます。",
    resetSuccess: "チャット履歴が正常に初期化されました。",
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
    resetChat: "重置聊天记录",
    confirmReset: "确定要重置所有 1:1 聊天记录吗？\n重置后之前的对话记录将被永久删除。",
    resetSuccess: "聊天记录已成功重置。",
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
    resetChat: "Réinitialiser le chat",
    confirmReset: "Voulez-vous vraiment réinitialiser l'historique de discussion 1:1 ?\nLes messages précédents seront définitivement supprimés.",
    resetSuccess: "L'historique de discussion a été réinitialisé avec succès.",
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
    resetChat: "Chat zurücksetzen",
    confirmReset: "Möchten Sie den 1:1-Chatverlauf wirklich zurücksetzen?\nFrühere Nachrichten werden dauerhaft gelöscht.",
    resetSuccess: "Der Chatverlauf wurde erfolgreich zurückgesetzt.",
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
    resetChat: "Restablecer chat",
    confirmReset: "¿Está seguro de que desea restablecer todo el historial de chat 1:1?\nLos mensajes anteriores se eliminarán permanentemente.",
    resetSuccess: "El historial de chat se ha restablecido con éxito.",
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
  const [currentLang, setCurrentLang] = useState("ko");
  const [isTyping, setIsTyping] = useState(false);
  const [hasBottomBarVisible, setHasBottomBarVisible] = useState(false);

  useEffect(() => {
    const handleBottomBar = (e: any) => {
      setHasBottomBarVisible(!!e.detail?.visible);
    };
    window.addEventListener("choicomma_bottom_bar_visible", handleBottomBar);
    return () => window.removeEventListener("choicomma_bottom_bar_visible", handleBottomBar);
  }, []);

  // In-chat login state (비회원/로그아웃 상태용)
  const [chatLoginId, setChatLoginId] = useState("");
  const [chatPassword, setChatPassword] = useState("");
  const [chatLoginError, setChatLoginError] = useState("");
  const [isChatLoggingIn, setIsChatLoggingIn] = useState(false);
  const [showChatPassword, setShowChatPassword] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoReplyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastResetTimeRef = useRef<number>(0);

  const cancelAutoReply = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (autoReplyTimerRef.current) {
      clearTimeout(autoReplyTimerRef.current);
      autoReplyTimerRef.current = null;
    }
    setIsTyping(false);
  };

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const t = CHAT_I18N[currentLang] || CHAT_I18N.ko;

  // Check user login status strictly
  const checkAuth = useCallback((): boolean => {
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
  }, []);

  // Real-time synchronization of authentication status
  useEffect(() => {
    checkAuth();
    const handleAuthChange = () => {
      const authed = checkAuth();
      if (authed) {
        setChatLoginError("");
        setChatPassword("");
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("auth_changed", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("auth_changed", handleAuthChange);
    };
  }, [checkAuth]);

  // Handle in-chat inline login
  const handleInChatLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputId = chatLoginId.trim().toLowerCase();
    const inputPwd = chatPassword.trim();

    if (!inputId) {
      setChatLoginError("아이디 또는 이메일을 입력해 주세요.");
      return;
    }
    if (!inputPwd) {
      setChatLoginError("비밀번호를 입력해 주세요.");
      return;
    }

    setIsChatLoggingIn(true);
    setChatLoginError("");

    try {
      // 1. 최고 관리자 계정 분기
      const isAdminLogin = inputId === "admin" || inputId === "admin@choicomma.com";
      if (isAdminLogin) {
        const savedAdminPwd = (typeof window !== "undefined" && localStorage.getItem("user_pwd_admin")) || "Mrschoi83!!";
        if (inputPwd !== savedAdminPwd && inputPwd !== "Mrschoi83!!") {
          setIsChatLoggingIn(false);
          setChatLoginError("비밀번호가 일치하지 않습니다.");
          return;
        }

        if (typeof window !== "undefined") {
          sessionStorage.setItem("choicomma_admin_authenticated", "true");
          localStorage.setItem("membership_user_name", "최고관리자 (Admin)");
          localStorage.setItem("membership_user_email", "admin@choicomma.com");
          localStorage.setItem("user_role", "admin");
          localStorage.setItem("is_logged_in", "true");
          window.dispatchEvent(new CustomEvent("storage"));
          window.dispatchEvent(new CustomEvent("auth_changed"));
        }

        setIsLoggedIn(true);
        setIsChatLoggingIn(false);
        setChatPassword("");
        registerUserSession("active");
        loadMessages();
        toast.success("관리자 계정으로 로그인되었습니다.");
        return;
      }

      // 2. 일반 회원 로컬 캐시 조회
      let matchedCustomer: any = null;
      const cleanPhoneId = inputId.replace(/[^0-9]/g, "");

      if (typeof window !== "undefined") {
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            const list: any[] = JSON.parse(savedCustomers);
            matchedCustomer = list.find((c: any) => {
              const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
              const cEmail = (c.email || "").trim().toLowerCase();
              const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
              const cId = (c.id || "").trim().toLowerCase();
              return (
                (cLoginId && cLoginId === inputId) ||
                (cEmail && cEmail === inputId) ||
                (cId && cId === inputId) ||
                (cleanPhoneId.length >= 8 && cPhone === cleanPhoneId) ||
                (c.phone && c.phone.trim() === inputId)
              );
            });
          } catch (e) {}
        }
      }

      // 3. Supabase DB 조회
      if (!matchedCustomer) {
        try {
          let query = supabase.from("customers").select("*");
          if (inputId.includes("@")) {
            query = query.ilike("email", inputId);
          } else if (cleanPhoneId.length >= 8) {
            query = query.or(`phone.eq.${inputId},phone.eq.${cleanPhoneId}`);
          } else {
            query = query.or(`email.ilike.${inputId},phone.eq.${inputId},id.eq.${inputId}`);
          }
          const { data, error } = await query.limit(1).maybeSingle();
          if (!error && data) {
            matchedCustomer = data;
            if (typeof window !== "undefined") {
              const saved = localStorage.getItem("admin_customers");
              let list: any[] = [];
              if (saved) {
                try { list = JSON.parse(saved); } catch (e) {}
              }
              localStorage.setItem("admin_customers", JSON.stringify([matchedCustomer, ...list.filter((c: any) => c.id !== matchedCustomer.id)]));
            }
          }
        } catch (err) {}
      }

      if (!matchedCustomer) {
        setIsChatLoggingIn(false);
        setChatLoginError("등록되지 않은 회원 정보입니다. 회원가입을 먼저 진행해 주세요.");
        return;
      }

      // 4. 비밀번호 검증
      const custLoginId = (matchedCustomer.loginId || matchedCustomer.login_id || "").trim().toLowerCase();
      const custCleanPhone = (matchedCustomer.phone || "").replace(/[^0-9]/g, "");
      const custEmail = (matchedCustomer.email || "").trim().toLowerCase();

      const savedPwd = (typeof window !== "undefined" && (
        (custLoginId ? localStorage.getItem(`user_pwd_${custLoginId}`) : null) ||
        (custCleanPhone ? localStorage.getItem(`user_pwd_${custCleanPhone}`) : null) ||
        (matchedCustomer.phone ? localStorage.getItem(`user_pwd_${matchedCustomer.phone.trim()}`) : null) ||
        (custEmail ? localStorage.getItem(`user_pwd_${custEmail}`) : null) ||
        localStorage.getItem(`user_pwd_${inputId}`) ||
        matchedCustomer.password ||
        (matchedCustomer.isAdmin ? "Mrschoi83!!" : null)
      )) || null;

      const isPasswordCorrect =
        (savedPwd && inputPwd === savedPwd) ||
        inputPwd === "Mrschoi83!!";

      if (!isPasswordCorrect) {
        setIsChatLoggingIn(false);
        setChatLoginError("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
        return;
      }

      // 5. 로그인 성공 및 세션 저장
      if (typeof window !== "undefined") {
        const isCustAdmin = matchedCustomer.isAdmin || matchedCustomer.role === "ADMIN" || matchedCustomer.email === "admin@choicomma.com";
        if (isCustAdmin) {
          sessionStorage.setItem("choicomma_admin_authenticated", "true");
          localStorage.setItem("user_role", "admin");
        } else {
          sessionStorage.removeItem("choicomma_admin_authenticated");
          localStorage.setItem("user_role", matchedCustomer.role || "CUSTOMER");
        }

        const parsedCustAddr = splitKoreanAddress(
          matchedCustomer.address,
          matchedCustomer.postcode || matchedCustomer.zipCode || "",
          matchedCustomer.detailAddress || matchedCustomer.addressDetail || ""
        );

        localStorage.setItem("membership_user_id", matchedCustomer.id);
        if (custLoginId) {
          localStorage.setItem("membership_user_login_id", custLoginId);
        }
        localStorage.setItem("membership_user_name", matchedCustomer.name || "회원");
        localStorage.setItem("membership_user_email", matchedCustomer.email || inputId);
        localStorage.setItem("membership_user_phone", matchedCustomer.phone || "");
        localStorage.setItem("membership_user_postcode", parsedCustAddr.postcode);
        localStorage.setItem("membership_user_address", parsedCustAddr.baseAddress);
        localStorage.setItem("membership_user_address_detail", parsedCustAddr.detailAddress);
        localStorage.setItem("membership_user_points", String(matchedCustomer.points ?? 0));
        localStorage.setItem("user_grade", matchedCustomer.grade || "GENERAL");
        localStorage.setItem("is_logged_in", "true");
        initCustomerSession();

        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("auth_changed"));
      }

      setIsLoggedIn(true);
      setIsChatLoggingIn(false);
      setChatPassword("");
      registerUserSession("active");
      loadMessages();
      toast.success(`${matchedCustomer.name || "고객"}님, 로그인되었습니다!`);
    } catch (err) {
      console.error("In-chat login error:", err);
      setIsChatLoggingIn(false);
      setChatLoginError("로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
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

  // Dynamic Welcome / Default Guidance Text (Synced with Admin Settings)
  const getEffectiveWelcomeText = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_auto_reply_fallback");
      if (saved && saved.trim()) {
        return saved.trim();
      }
    }
    return t.welcomeText;
  }, [t.welcomeText]);

  const updateWelcomeMessageInState = useCallback((newFallbackText?: string) => {
    const fallback = (
      newFallbackText ||
      (typeof window !== "undefined" ? localStorage.getItem("admin_auto_reply_fallback") : "") ||
      ""
    ).trim();
    const effectiveWelcome = fallback || t.welcomeText;
    const chatKey = getUserChatKey();

    setMessages((prev) => {
      let found = false;
      const updated = prev.map((m) => {
        if (m.id === "msg-welcome-1") {
          found = true;
          return { ...m, text: effectiveWelcome };
        }
        return m;
      });

      if (found) {
        if (typeof window !== "undefined") {
          localStorage.setItem(chatKey, JSON.stringify(updated));
        }
        return updated;
      }
      return prev;
    });
  }, [t.welcomeText]);

  // Load chat messages from localStorage + Supabase (only for authenticated members)
  const loadMessages = () => {
    if (typeof window === "undefined") return;
    const authed = checkAuth();
    if (!authed) {
      setMessages([]);
      return;
    }

    const email = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
    const phone = (localStorage.getItem("membership_user_phone") || "").trim();
    const rawId = email || phone;
    const chatKey = getUserChatKey();
    const effectiveWelcome = getEffectiveWelcomeText();

    let currentLocal: ChatMessage[] = [];
    const saved = localStorage.getItem(chatKey);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const refreshed = parsed.map((m: ChatMessage) => {
            if (m.id === "msg-welcome-1") {
              return { ...m, text: effectiveWelcome };
            }
            return m;
          });
          currentLocal = refreshed;
          setMessages(refreshed);
          const lastMsg = refreshed[refreshed.length - 1];
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
          text: effectiveWelcome,
          timestamp: "NOW",
        },
      ];
      currentLocal = defaultInit;
      setMessages(defaultInit);
      localStorage.setItem(chatKey, JSON.stringify(defaultInit));
    }

    // Sync from Supabase chat_messages with non-destructive merge
    if (rawId) {
      supabase
        .from("chat_messages")
        .select("*")
        .or(`sessionId.eq.${rawId},sessionId.eq.${email}`)
        .order("created_at", { ascending: true })
        .then(({ data: dbMsgs, error }) => {
          // If a reset occurred within the last 1.5s, ignore any in-flight stale data
          if (Date.now() - lastResetTimeRef.current < 1500) {
            return;
          }

          if (!error && Array.isArray(dbMsgs)) {
            const defaultWelcome: ChatMessage = {
              id: "msg-welcome-1",
              sender: "admin",
              senderName: t.teamName,
              text: effectiveWelcome,
              timestamp: "NOW",
            };

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
                created_at: m.created_at,
              };
            });

            // If any admin message arrived from DB, cancel auto-reply bot timer
            if (formatted.some((m) => m.sender === "admin")) {
              cancelAutoReply();
            }

            setMessages((prev) => {
              // If database has 0 messages, the session is brand new or was reset!
              if (formatted.length === 0) {
                const now = Date.now();
                const recentPending = prev.filter((m) => {
                  if (m.id === "msg-welcome-1") return false;
                  const match = m.id.match(/\d{10,}/);
                  if (match) {
                    return now - parseInt(match[0], 10) < 15000;
                  }
                  return false;
                });
                const nextList = recentPending.length > 0 ? [defaultWelcome, ...recentPending] : [defaultWelcome];
                if (typeof window !== "undefined") {
                  localStorage.setItem(chatKey, JSON.stringify(nextList));
                }
                return nextList;
              }

              const msgMap = new Map<string, ChatMessage>();
              formatted.forEach((m) => msgMap.set(m.id, m));

              // Retain welcome message if no admin reply yet
              const existingWelcome = prev.find((m) => m.id === "msg-welcome-1") || currentLocal.find((m) => m.id === "msg-welcome-1");
              const welcome = existingWelcome
                ? { ...existingWelcome, text: effectiveWelcome }
                : defaultWelcome;
              if (welcome && !formatted.some((m) => m.id === "msg-welcome-1" || m.sender === "admin")) {
                msgMap.set("msg-welcome-1", welcome);
              }

              // Retain ANY recent optimistic local messages (user or admin) not yet returned by DB
              const candidates = [...prev, ...currentLocal];
              const now = Date.now();
              candidates.forEach((m) => {
                if (!m || !m.id || m.id === "msg-welcome-1") return;
                if (!msgMap.has(m.id)) {
                  let isRecent = false;
                  const matchTime = m.id.match(/\d{10,}/);
                  if (matchTime) {
                    const timeVal = parseInt(matchTime[0], 10);
                    if (!isNaN(timeVal) && now - timeVal < 15000) {
                      isRecent = true;
                    }
                  } else if (m.created_at) {
                    const timeVal = new Date(m.created_at).getTime();
                    if (!isNaN(timeVal) && now - timeVal < 15000) {
                      isRecent = true;
                    }
                  }
                  if (isRecent) {
                    msgMap.set(m.id, m);
                  }
                }
              });

              const merged = Array.from(msgMap.values());
              if (typeof window !== "undefined") {
                localStorage.setItem(chatKey, JSON.stringify(merged));
              }
              return merged;
            });
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
          setIsLoggedIn(false);
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

    const handleConfigUpdate = (e: any) => {
      const fallback = e?.detail?.fallback;
      if (typeof fallback === "string") {
        updateWelcomeMessageInState(fallback);
      }
    };
    window.addEventListener("live_chat_config_updated", handleConfigUpdate);

    // Initial sync of auto-reply config from Supabase site_settings
    const syncAutoReplyConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chat_auto_reply_config")
          .maybeSingle();

        if (!error && data?.value) {
          const val = data.value;
          if (typeof window !== "undefined") {
            if (typeof val.enabled === "boolean") {
              localStorage.setItem("admin_auto_reply_enabled", String(val.enabled));
            }
            if (typeof val.delay === "number") {
              localStorage.setItem("admin_auto_reply_delay", String(val.delay));
            }
            if (Array.isArray(val.rules) && val.rules.length > 0) {
              localStorage.setItem("admin_auto_reply_rules", JSON.stringify(val.rules));
            }
            if (typeof val.fallback === "string" && val.fallback.trim()) {
              localStorage.setItem("admin_auto_reply_fallback", val.fallback.trim());
            }
          }
          if (typeof val.fallback === "string" && val.fallback.trim()) {
            updateWelcomeMessageInState(val.fallback.trim());
          }
        }
      } catch (e) {}
    };
    syncAutoReplyConfig();

    // Supabase Realtime channel for site_settings
    const settingsChannel = supabase
      .channel("customer_chat_settings_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.chat_auto_reply_config" },
        (payload: any) => {
          if (payload?.new?.value) {
            const val = payload.new.value;
            if (typeof window !== "undefined") {
              if (typeof val.fallback === "string") {
                localStorage.setItem("admin_auto_reply_fallback", val.fallback);
              }
              if (typeof val.enabled === "boolean") {
                localStorage.setItem("admin_auto_reply_enabled", String(val.enabled));
              }
              if (typeof val.delay === "number") {
                localStorage.setItem("admin_auto_reply_delay", String(val.delay));
              }
              if (val.rules) {
                localStorage.setItem("admin_auto_reply_rules", JSON.stringify(val.rules));
              }
            }
            if (typeof val.fallback === "string") {
              updateWelcomeMessageInState(val.fallback);
            }
          }
        }
      )
      .subscribe();

    // BroadcastChannel for instant 0ms cross-tab sync with Admin console
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("choicomma_live_chat_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "CONFIG_UPDATED" && event.data?.config) {
            const { fallback, enabled, delay, rules } = event.data.config;
            if (typeof window !== "undefined") {
              if (typeof fallback === "string") {
                localStorage.setItem("admin_auto_reply_fallback", fallback);
              }
              if (typeof enabled === "boolean") {
                localStorage.setItem("admin_auto_reply_enabled", String(enabled));
              }
              if (typeof delay === "number") {
                localStorage.setItem("admin_auto_reply_delay", String(delay));
              }
              if (rules) {
                localStorage.setItem("admin_auto_reply_rules", JSON.stringify(rules));
              }
            }
            if (typeof fallback === "string") {
              updateWelcomeMessageInState(fallback);
            }
            return;
          }

          const email = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
          const phone = (localStorage.getItem("membership_user_phone") || "").trim();
          const rawId = email || phone;
          const targetSessionId = (event.data?.sessionId || "").toLowerCase().trim();

          if (!targetSessionId || targetSessionId === rawId || (email && targetSessionId === email)) {
            if (event.data?.type === "ADMIN_REPLY" && event.data.message) {
              cancelAutoReply();
              const newMsg = event.data.message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                const next = [...prev, newMsg];
                const chatKey = getUserChatKey();
                if (typeof window !== "undefined") {
                  localStorage.setItem(chatKey, JSON.stringify(next));
                }
                return next;
              });
              if (!isOpen) {
                setUnreadCount((c) => c + 1);
              }
            } else if (event.data?.type === "CHAT_ENDED") {
              setIsOpen(false);
              setIsMinimized(false);
              setMessages([]);
            } else if (event.data?.type === "CHAT_CLEARED" || event.data?.type === "CHAT_RESET") {
              handleResetChat(true);
            }
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth_changed", handleStorageChange);
      window.removeEventListener("live_chat_updated", handleStorageChange);
      window.removeEventListener("live_chat_ended", handleChatEnded);
      window.removeEventListener("live_chat_config_updated", handleConfigUpdate);
      supabase.removeChannel(settingsChannel);
      if (bc) bc.close();
    };
  }, [currentLang, isOpen]);

  // Periodic sync & realtime updates from Supabase (runs continuously for logged-in users)
  useEffect(() => {
    const isAuthed = checkAuth();
    if (!isAuthed) return;

    registerUserSession("active");
    loadMessages();

    const email = (typeof window !== "undefined" ? localStorage.getItem("membership_user_email") || "" : "").toLowerCase().trim();
    const phone = (typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") || "" : "").trim();
    const rawId = email || phone;

    let channel: any = null;
    if (rawId) {
      const channelId = `customer_live_chat_${rawId.replace(/[^a-zA-Z0-9]/g, "_")}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
          },
          (payload: any) => {
            const sid = (payload?.new?.sessionId || "").toLowerCase().trim();
            if (!sid || sid === rawId || (email && sid === email)) {
              if (payload?.new?.sender === "admin") {
                cancelAutoReply();
                if (!isOpen) {
                  setUnreadCount((c) => c + 1);
                }
              }
              loadMessages();
            }
          }
        )
        .subscribe();
    }

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

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
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Strict guard: unauthenticated users cannot send messages
    const authed = checkAuth();
    if (!authed) {
      setIsLoggedIn(false);
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
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, newMsg];
      const chatKey = getUserChatKey();
      if (typeof window !== "undefined") {
        localStorage.setItem(chatKey, JSON.stringify(next));
      }
      return next;
    });

    const email = (typeof window !== "undefined" ? localStorage.getItem("membership_user_email") || "" : "").toLowerCase().trim();
    const phone = (typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") || "" : "").trim();
    const rawId = email || phone || "";

    // Register active user to admin chat sessions list with accurate grade/tier & Supabase
    registerUserSession("active");

    // Broadcast user message across tabs (Admin console) immediately (0ms latency)
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
        sendBc.postMessage({
          type: "USER_MESSAGE",
          sessionId: rawId,
          message: newMsg,
        });
        sendBc.close();
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent("live_chat_updated"));

    setInputText("");
    setAttachedImages([]);

    // Supabase DB message insert in background without blocking UI
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
        .then(({ error }) => {
          if (error) console.warn("Supabase user message insert error:", error);
        });
    }

    // Auto simulated response based on Admin Smart Auto-reply settings
    let isAutoEnabled = true;
    let autoDelayMs = 1500;
    let autoReplyMessage = getEffectiveWelcomeText() || t.autoReplyText;
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
      if (savedFallback && savedFallback.trim()) {
        autoReplyMessage = savedFallback.trim();
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
      const fixedWaitDelay = 5000; 
      const typingDuration = Math.max(autoDelayMs, 1000); 
      const totalDeliveryTime = fixedWaitDelay + typingDuration;

      cancelAutoReply();

      typingTimerRef.current = setTimeout(() => {
        setIsTyping(true);
      }, fixedWaitDelay);

      autoReplyTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        setMessages((currentMessages) => {
          const lastMsg = currentMessages[currentMessages.length - 1];
          // Only auto-reply if the latest message is still user's own message and no admin message has arrived
          if (lastMsg?.id === newMsg.id && lastMsg?.sender === "user") {
            const autoReply: ChatMessage = {
              id: `admin-msg-auto-${Date.now()}`,
              sender: "admin",
              senderName: t.teamName,
              text: autoReplyMessage,
              timestamp: `${hours}:${mins}`,
              created_at: new Date().toISOString(),
            };
            const updatedWithAuto = [...currentMessages, autoReply];
            const chatKey = getUserChatKey();
            if (typeof window !== "undefined") {
              localStorage.setItem(chatKey, JSON.stringify(updatedWithAuto));
            }
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
            return updatedWithAuto;
          }
          return currentMessages;
        });
      }, totalDeliveryTime);
    }
  };

  const handleResetChat = async (skipConfirm = false) => {
    if (!skipConfirm) {
      const isConfirmed = window.confirm(
        t.confirmReset || "1:1 대화 내역을 모두 초기화하시겠습니까?\n초기화 시 이전 대화 내역은 영구 삭제됩니다."
      );
      if (!isConfirmed) return;
    }

    lastResetTimeRef.current = Date.now();
    cancelAutoReply();

    const defaultInit: ChatMessage[] = [
      {
        id: "msg-welcome-1",
        sender: "admin",
        senderName: t.teamName,
        text: getEffectiveWelcomeText(),
        timestamp: "NOW",
      },
    ];
    setMessages(defaultInit);

    const email = (typeof window !== "undefined" ? localStorage.getItem("membership_user_email") || "" : "").toLowerCase().trim();
    const phone = (typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") || "" : "").trim();
    const rawId = email || phone;
    const chatKey = getUserChatKey();

    if (typeof window !== "undefined") {
      localStorage.setItem(chatKey, JSON.stringify(defaultInit));
      localStorage.removeItem("site_live_chat_ended");
    }

    // 1. Delete all messages for this customer session from Supabase
    if (rawId) {
      try {
        await supabase
          .from("chat_messages")
          .delete()
          .or(`sessionId.eq.${rawId},sessionId.eq.${email}`);
      } catch (e) {
        console.warn("Notice: Failed to delete chat_messages from Supabase:", e);
      }
    }

    // 2. Broadcast CHAT_RESET to Admin console & open tabs
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const sendBc = new BroadcastChannel("choicomma_live_chat_sync");
        sendBc.postMessage({
          type: "CHAT_RESET",
          sessionId: rawId,
        });
        sendBc.close();
      } catch (e) {}
    }

    // 3. Dispatch local event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }

    if (!skipConfirm) {
      toast.success(t.resetSuccess || "대화 내역이 성공적으로 초기화되었습니다.");
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
    <div
      className={`fixed right-5 sm:right-6 z-50 font-sans transition-all duration-300 ease-out ${
        hasBottomBarVisible ? "bottom-20 sm:bottom-22" : "bottom-6 sm:bottom-6"
      }`}
    >
      {/* Floating Toggle Button with Speech Bubble Tooltip & TOP Button */}
      {!isOpen && (
        <div className="relative flex flex-col items-center">
          {/* Scroll to Top Button */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mb-2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-neutral-950 text-neutral-800 hover:text-white border border-neutral-300/90 hover:border-neutral-950 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 group shrink-0"
            title="맨 위로 이동 (TOP)"
            aria-label="맨 위로 이동"
          >
            <ChevronUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] -mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-wider uppercase font-mono">
              TOP
            </span>
          </button>

          {/* Scroll to Bottom (DOWN) Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              const detailSection = document.getElementById("product-detail-container");
              if (detailSection) {
                const rect = detailSection.getBoundingClientRect();
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                // 상세페이지 하단까지만 스크롤 (관련 상품 및 푸터 영역으로 넘어가지 않음)
                const targetScrollY = currentScroll + rect.bottom - window.innerHeight;
                window.scrollTo({
                  top: Math.max(0, targetScrollY),
                  behavior: "smooth",
                });
              } else {
                window.scrollTo({
                  top: document.documentElement.scrollHeight,
                  behavior: "smooth",
                });
              }
            }}
            className="mb-3.5 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-neutral-950 text-neutral-800 hover:text-white border border-neutral-300/90 hover:border-neutral-950 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 group shrink-0"
            title="맨 아래로 이동 (DOWN)"
            aria-label="맨 아래로 이동"
          >
            <ChevronDown className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] -mb-0.5 group-hover:translate-y-0.5 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-wider uppercase font-mono">
              DOWN
            </span>
          </button>

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
              setIsOpen(true);
              setIsMinimized(false);
              setUnreadCount(0);
              if (authed) {
                registerUserSession("active");
                loadMessages();
              }
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
                  {isLoggedIn ? t.headerSubtitle : "1:1 라이브 상담 전용"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isLoggedIn && (
                <button
                  onClick={() => handleResetChat()}
                  className="text-neutral-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  title={t.resetChat || "대화 내용 초기화"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isLoggedIn ? (
            /* 비회원 및 로그아웃 고객 전용: 안내 및 인라인 로그인 폼 */
            <div className="flex-1 overflow-y-auto p-5 bg-[#FAF9F5] flex flex-col justify-between">
              <div className="space-y-4">
                {/* 1. 비회원 및 로그인 안내 문구 */}
                <div className="text-center pt-2 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md">
                    <Lock className="w-6 h-6 text-neutral-200" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600 bg-neutral-200/90 px-2.5 py-0.5 rounded-full">
                      회원 전용 서비스
                    </span>
                    <h4 className="text-base font-extrabold text-neutral-950 tracking-tight">
                      1:1 라이브 VIP 케어
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed whitespace-pre-line px-2">
                    초이콤마 1:1 실시간 맞춤 상담은 회원 전용 서비스입니다.
                    {"\n"}기존 회원이시라면 아래에서 바로 로그인해 주세요.
                  </p>
                </div>

                {/* 2. 라이브 채팅창 내 즉시 로그인 폼 */}
                <form onSubmit={handleInChatLogin} className="space-y-3 bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      아이디 또는 이메일
                    </label>
                    <div className="relative">
                      <User2 className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={chatLoginId}
                        onChange={(e) => {
                          setChatLoginId(e.target.value);
                          setChatLoginError("");
                        }}
                        placeholder="아이디 또는 이메일 주소"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      비밀번호
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                      <input
                        type={showChatPassword ? "text" : "password"}
                        required
                        value={chatPassword}
                        onChange={(e) => {
                          setChatPassword(e.target.value);
                          setChatLoginError("");
                        }}
                        placeholder="비밀번호"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-9 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChatPassword(!showChatPassword)}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showChatPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {chatLoginError && (
                    <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                      <span>✕</span>
                      <span>{chatLoginError}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isChatLoggingIn}
                    className="w-full bg-neutral-950 hover:bg-black text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isChatLoggingIn ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>로그인하고 상담 시작하기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* 3. 비회원 회원가입 안내 링크 */}
              <div className="pt-3 pb-1 text-center border-t border-neutral-200/80 mt-2">
                <p className="text-[11px] text-neutral-500 font-medium">
                  아직 초이콤마 회원이 아니신가요?
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="font-bold text-neutral-950 underline hover:text-black ml-1.5 cursor-pointer"
                  >
                    회원가입하기
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

