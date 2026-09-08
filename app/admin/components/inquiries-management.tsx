import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Crown,
  LogOut,
  Trash2,
  Send,
  Edit3,
  Plus,
  X,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Check,
  Bot,
  Sliders,
  Clock,
  Zap,
  Tag,
} from "lucide-react";

interface TemplateItem {
  id: string;
  label: string;
  ko: string;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string; // e.g. "배송, 택배, 송장, 도착"
  replyText: string;
  enabled: boolean;
}

export const DEFAULT_AUTO_RULES: AutoReplyRule[] = [
  {
    id: "auto-1",
    name: "배송 및 출고 문의",
    keywords: "배송, 택배, 출고, 언제, 송장, 도착, 배송비",
    replyText: "평일 14:00 이전 결제 완료 건은 당일 출고되며, CJ대한통운으로 1~2일 내 안전하게 배송됩니다. 🚚",
    enabled: true,
  },
  {
    id: "auto-2",
    name: "사이즈 및 실측 문의",
    keywords: "사이즈, 실측, 치수, 총장, 어깨, 가슴, 허리, 길이",
    replyText: "상품 상세 페이지 하단의 [실측 사이즈 가이드]를 통해 치수를 확인하실 수 있습니다. 추가 문의는 전담 스타일리스트가 곧 상세히 안내해 드리겠습니다. 📏",
    enabled: true,
  },
  {
    id: "auto-3",
    name: "회원 등급 및 할인 혜택",
    keywords: "VIP, 등급, 혜택, 할인, 적립금, 포인트, 쿠폰, 멤버십",
    replyText: "초이콤마 회원님께는 등급별 최대 10% 추가할인 및 전 상품 무료배송 혜택이 상시 적용됩니다. 마이페이지에서 상세 혜택을 확인해 보세요! ✨",
    enabled: true,
  },
  {
    id: "auto-4",
    name: "교환 및 반품 안내",
    keywords: "교환, 반품, 환불, 취소, 수선",
    replyText: "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
    enabled: true,
  },
];

const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: "tmpl-1",
    label: "인사 및 안내",
    ko: "안녕하세요! 초이콤마 VIP 전담 케어팀입니다. 무엇을 도와드릴까요? 💫",
  },
  {
    id: "tmpl-2",
    label: "배송 확인 중",
    ko: "주문하신 상품 및 배송 정보를 확인 중입니다. 잠시만 기다려 주세요!",
  },
  {
    id: "tmpl-3",
    label: "옵션 반영 완료",
    ko: "요청하신 커스텀 사이즈/옵션 지정이 반영 완료되었습니다. 🛍️",
  },
  {
    id: "tmpl-4",
    label: "추가 문의 안내",
    ko: "추가로 도움이 필요하신 사항이 있으시면 언제든 편하게 말씀해 주세요!",
  },
];

interface InquiriesManagementProps {
  adminLiveChatMessages: any[];
  chatSessionsList: any[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  isLiveChatSessionEnded: boolean;
  activeSessionMessages: any[];
  adminLiveInput: string;
  setAdminLiveInput: (val: string) => void;
  handleAdminSendLiveChat: (text?: string) => void;
  handleAdminEndLiveChat: (sessionId: string) => void;
  handleAdminClearLiveChat: () => void;
}

export function InquiriesManagement({
  adminLiveChatMessages,
  chatSessionsList,
  activeSessionId,
  setActiveSessionId,
  isLiveChatSessionEnded,
  activeSessionMessages,
  adminLiveInput,
  setAdminLiveInput,
  handleAdminSendLiveChat,
  handleAdminEndLiveChat,
  handleAdminClearLiveChat,
}: InquiriesManagementProps) {
  // Custom Editable Templates State
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Auto Reply (Chatbot) State
  const [isAutoReplyModalOpen, setIsAutoReplyModalOpen] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyDelay, setAutoReplyDelay] = useState(5.0); // seconds
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_auto_reply_rules");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasReturnRule = parsed.some((r: any) =>
              r.keywords?.includes("반품") || r.name?.includes("반품")
            );
            if (!hasReturnRule) {
              const returnRule: AutoReplyRule = {
                id: "auto-4",
                name: "교환 및 반품 안내",
                keywords: "교환, 반품, 환불, 취소, 수선",
                replyText:
                  "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
                enabled: true,
              };
              const merged = [...parsed, returnRule];
              localStorage.setItem("admin_auto_reply_rules", JSON.stringify(merged));
              return merged;
            }
            return parsed;
          }
        } catch (e) {}
      }
    }
    return DEFAULT_AUTO_RULES;
  });
  const [autoReplyFallback, setAutoReplyFallback] = useState(
    "문의해주신 내용을 전달되었습니다. 담당자 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕"
  );

  // New Rule Inputs
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleKeywords, setNewRuleKeywords] = useState("");
  const [newRuleReply, setNewRuleReply] = useState("");

  // New Template Inputs
  const [newLabel, setNewLabel] = useState("");
  const [newKo, setNewKo] = useState("");

  // Confirmation Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  // Auto-scroll to bottom of conversation
  const adminMessagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    // Instant scroll directly to bottom without jumpy animation
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeSessionMessages, activeSessionId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Load Quick Reply Templates
      const saved = localStorage.getItem("admin_quick_reply_templates");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTemplates(parsed);
          } else {
            setTemplates(DEFAULT_TEMPLATES);
          }
        } catch (e) {
          setTemplates(DEFAULT_TEMPLATES);
        }
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }

      // 2. Load Auto Reply Config
      const savedAutoEnabled = localStorage.getItem("admin_auto_reply_enabled");
      if (savedAutoEnabled !== null) {
        setAutoReplyEnabled(savedAutoEnabled === "true");
      }

      const savedAutoDelay = localStorage.getItem("admin_auto_reply_delay");
      if (savedAutoDelay !== null) {
        const num = parseFloat(savedAutoDelay);
        if (!isNaN(num)) setAutoReplyDelay(num);
      }

      const savedAutoRules = localStorage.getItem("admin_auto_reply_rules");
      if (savedAutoRules) {
        try {
          const parsed = JSON.parse(savedAutoRules);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if return/exchange rule exists, if not, restore it
            const hasReturnRule = parsed.some((r: any) =>
              r.keywords?.includes("반품") || r.name?.includes("반품")
            );
            if (!hasReturnRule) {
              const returnRule: AutoReplyRule = {
                id: "auto-4",
                name: "교환 및 반품 안내",
                keywords: "교환, 반품, 환불, 취소, 수선",
                replyText:
                  "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
                enabled: true,
              };
              const merged = [...parsed, returnRule];
              setAutoReplyRules(merged);
              localStorage.setItem("admin_auto_reply_rules", JSON.stringify(merged));
            } else {
              setAutoReplyRules(parsed);
            }
          } else {
            setAutoReplyRules(DEFAULT_AUTO_RULES);
          }
        } catch (e) {
          setAutoReplyRules(DEFAULT_AUTO_RULES);
        }
      } else {
        setAutoReplyRules(DEFAULT_AUTO_RULES);
      }

      const savedFallback = localStorage.getItem("admin_auto_reply_fallback");
      if (savedFallback) {
        setAutoReplyFallback(savedFallback);
      }
    }
  }, []);

  const saveAutoReplyConfig = (
    enabled: boolean,
    delay: number,
    rules: AutoReplyRule[],
    fallback: string
  ) => {
    setAutoReplyEnabled(enabled);
    setAutoReplyDelay(delay);
    setAutoReplyRules(rules);
    setAutoReplyFallback(fallback);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_auto_reply_enabled", String(enabled));
      localStorage.setItem("admin_auto_reply_delay", String(delay));
      localStorage.setItem("admin_auto_reply_rules", JSON.stringify(rules));
      localStorage.setItem("admin_auto_reply_fallback", fallback);
      window.dispatchEvent(new CustomEvent("live_chat_config_updated"));
    }
  };

  const handleAddAutoRule = () => {
    if (!newRuleKeywords.trim() || !newRuleReply.trim()) {
      alert("키워드와 자동 응답 문구를 모두 입력해 주세요.");
      return;
    }
    const newRule: AutoReplyRule = {
      id: `auto-${Date.now()}`,
      name: newRuleName.trim() || "맞춤 키워드 규칙",
      keywords: newRuleKeywords.trim(),
      replyText: newRuleReply.trim(),
      enabled: true,
    };
    const updated = [...autoReplyRules, newRule];
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
    setNewRuleName("");
    setNewRuleKeywords("");
    setNewRuleReply("");
    setConfirmDialog("새로운 키워드 자동 응답 규칙이 등록되었습니다!");
  };

  // Pending Delete State for '삭제하시겠습니까?' Confirm Dialog
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteAutoRule = (id: string) => {
    const target = autoReplyRules.find((r) => r.id === id);
    setPendingDelete({ id, name: target?.name || "선택한 키워드 규칙" });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const updated = autoReplyRules.filter((r) => r.id !== pendingDelete.id);
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
    setPendingDelete(null);
    setConfirmDialog("키워드 자동 답변 규칙이 삭제되었습니다.");
  };

  const handleToggleAutoRule = (id: string) => {
    const updated = autoReplyRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
  };

  const handleResetAutoRules = () => {
    saveAutoReplyConfig(true, 1.5, DEFAULT_AUTO_RULES, "문의해주신 내용을 전달되었습니다. 담당자 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕");
    setConfirmDialog("자동 응답 설정이 기본값으로 초기화되었습니다.");
  };

  // Pending Edit State for '수정하시겠습니까?' Confirm Dialog (Supports Quick Reply & Auto-Reply Rules)
  const [pendingEdit, setPendingEdit] = useState<{
    id: string;
    type?: "quick" | "auto";
    field: string;
    value: string;
    oldText?: string;
  } | null>(null);

  const saveTemplates = (newItems: TemplateItem[]) => {
    setTemplates(newItems);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_quick_reply_templates", JSON.stringify(newItems));
    }
  };

  // Trigger '수정하시겠습니까?' Prompt when input finishes (onBlur or Enter)
  const handleRequestEditConfirm = (
    id: string,
    field: "label" | "ko",
    value: string,
    oldText: string
  ) => {
    if (value.trim() === oldText.trim()) return; // No change
    setPendingEdit({ id, type: "quick", field, value, oldText });
  };

  // Update a specific rule immediately or with confirmation
  const handleUpdateAutoRuleField = (id: string, field: keyof AutoReplyRule, value: any) => {
    const updated = autoReplyRules.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
  };

  // Apply Pending Edit when user clicks '네, 수정합니다'
  const handleConfirmEdit = () => {
    if (!pendingEdit) return;
    const { id, type, field, value } = pendingEdit;

    if (type === "auto") {
      const updated = autoReplyRules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      );
      saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
      setConfirmDialog("자동 답변 규칙이 성공적으로 수정되었습니다.");
    } else {
      const updated = templates.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            [field]: value,
          };
        }
        return t;
      });
      saveTemplates(updated);
      setConfirmDialog("빠른 답장 템플릿이 성공적으로 수정되었습니다.");
    }
    setPendingEdit(null);
  };

  const handleAddTemplate = () => {
    if (!newKo.trim()) return;
    const newItem: TemplateItem = {
      id: `tmpl-${Date.now()}`,
      label: newLabel.trim() || "맞춤 답변",
      ko: newKo.trim(),
    };
    const updated = [...templates, newItem];
    saveTemplates(updated);
    setNewLabel("");
    setNewKo("");
    setConfirmDialog("새로운 빠른 답장 템플릿이 등록되었습니다!");
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setConfirmDialog("선택한 템플릿이 삭제되었습니다.");
  };

  const handleResetDefaults = () => {
    saveTemplates(DEFAULT_TEMPLATES);
    setConfirmDialog("기본 템플릿 복원이 완료되었습니다.");
  };

  // Helper to dynamically get the customer's real grade/tier badge
  const getSessionBadgeInfo = (session: any) => {
    const isAdm =
      session.email === "admin" ||
      session.email === "admin@choicomma.com" ||
      session.id === "admin" ||
      session.name?.includes("관리자");
    if (isAdm) {
      return { tier: "관리자", color: "bg-rose-600 text-white font-black" };
    }
    if (session.id === "guest" || session.email === "guest@choicomma.com" || session.name === "실시간 방문 고객") {
      return { tier: "비회원", color: "bg-neutral-200 text-neutral-700 font-bold" };
    }

    if (typeof window !== "undefined") {
      const adminCustomers = localStorage.getItem("admin_customers");
      if (adminCustomers) {
        try {
          const list = JSON.parse(adminCustomers);
          const found = list.find((c: any) =>
            (c.email && session.email && c.email.toLowerCase() === session.email.toLowerCase()) ||
            (c.name && session.name && session.name.includes(c.name))
          );
          if (found && (found.grade || found.tier)) {
            const g = String(found.grade || found.tier).toUpperCase();
            if (g.includes("VVIP") || g.includes("BLACK")) {
              return { tier: "VVIP", color: "bg-neutral-950 text-amber-400 font-black border border-amber-400/50" };
            }
            if (g.includes("PLATINUM") || g.includes("플래티넘")) {
              return { tier: "PLATINUM", color: "bg-purple-100 text-purple-800 font-black border border-purple-300" };
            }
            if (g.includes("GOLD") || g.includes("골드")) {
              return { tier: "GOLD", color: "bg-amber-100 text-amber-900 font-black border border-amber-300" };
            }
            if (g.includes("SILVER") || g.includes("실버")) {
              return { tier: "SILVER", color: "bg-slate-200 text-slate-800 font-black border border-slate-300" };
            }
            if (g.includes("VIP")) {
              return { tier: "VIP", color: "bg-amber-400 text-neutral-950 font-black" };
            }
            return { tier: found.grade || found.tier || "일반회원", color: "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300" };
          }
        } catch (e) {}
      }
    }

    // If session.tier is hardcoded VIP without matched database VIP grade, normalize to 일반회원
    if (session.tier === "VIP" && !session.name?.includes("VIP")) {
      return { tier: "일반회원", color: "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300" };
    }

    return {
      tier: session.tier || "일반회원",
      color: session.badgeColor || "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300",
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-neutral-900" />
            1:1 실시간 라이브 채팅 상담
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            쇼핑몰 라이브 채팅 문의를 실시간으로 확인하고 응대합니다. 하단 원클릭 답장 템플릿은 입력 즉시 변경됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoReplyModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer border border-amber-400"
          >
            <Sliders className="w-4 h-4 text-neutral-950" />
            <span>자동 답변 설정</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${autoReplyEnabled ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-700"}`}>
              {autoReplyEnabled ? `${autoReplyDelay}초` : "꺼짐"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer border border-neutral-800"
          >
            <Edit3 className="w-4 h-4 text-white" />
            <span>실시간 템플릿 수정/편집</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Session Card List */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <span className="text-xs font-black text-neutral-950 uppercase tracking-wider">
              라이브 대화 세션 목록 ({chatSessionsList.length}개 온라인)
            </span>
            <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
              실시간 세션
            </span>
          </div>

          {/* Customer Sessions Stack */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {chatSessionsList.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-200/60">
                현재 활성화된 1:1 라이브 채팅 세션이 없습니다.
              </div>
            ) : (
              chatSessionsList.map((session) => {
                const isSelected = activeSessionId === session.id;
                const isEnded = session.status === "ended" || (session.id === "vip@choicomma.com" && isLiveChatSessionEnded);
                const badgeInfo = getSessionBadgeInfo(session);
                return (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-neutral-950 text-white border-neutral-900 shadow-md"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black">{session.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${badgeInfo.color}`}>
                          {badgeInfo.tier}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isEnded
                          ? "bg-neutral-200 text-neutral-600"
                          : "bg-emerald-500 text-neutral-950"
                      }`}>
                        {isEnded ? "상담종료" : "접속중"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={isSelected ? "text-neutral-400 font-mono" : "text-neutral-500 font-mono"}>
                        {session.email}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdminEndLiveChat(session.id);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        🔒 상담 종료
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Preset Reply Quick Chips */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-neutral-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>원클릭 빠른 답장 템플릿 ({templates.length}개)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-md transition-colors cursor-pointer notranslate"
                translate="no"
              >
                ⚡ 실시간 수정하기
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleAdminSendLiveChat(tmpl.ko)}
                  className="w-full text-left bg-neutral-50 hover:bg-amber-50/80 hover:border-amber-300 border border-neutral-200/90 p-3 rounded-2xl transition-all cursor-pointer space-y-1 group"
                >
                  {/* 상단 한글 원문 (구글 번역 보호: notranslate) */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-md notranslate inline-block" translate="no">
                      🇰🇷 [한글]: {tmpl.ko}
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded notranslate" translate="no">
                      {tmpl.label}
                    </span>
                  </div>
                  {/* 하단 템플릿 메시지 본문 */}
                  <div className="text-[11px] font-bold text-neutral-800 group-hover:text-amber-950 pt-0.5 leading-relaxed">
                    {tmpl.ko}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Chat History & Input Area */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-neutral-950">
                실시간 대화 내역 ({chatSessionsList.find((s) => s.id === activeSessionId)?.name || "선택된 고객"})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdminEndLiveChat(activeSessionId)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                title="선택한 고객과의 1:1 라이브 상담을 종료합니다"
              >
                <LogOut className="w-3.5 h-3.5" />
                상담 종료
              </button>
              <button
                type="button"
                onClick={handleAdminClearLiveChat}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                title="라이브 채팅 대화 기록을 전체 초기화합니다"
              >
                <Trash2 className="w-3.5 h-3.5" />
                대화 내역 초기화
              </button>
            </div>
          </div>

          {/* Conversation Bubbles Container */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F5]/70 rounded-2xl border border-neutral-200/60">
            {activeSessionMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <MessageSquare className="w-10 h-10 text-neutral-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-neutral-600">상담이 종료되었거나 대화 내역이 없습니다.</p>
                <p className="text-[11px] text-neutral-400 mt-1">좌측 세션 목록에서 고객을 선택하거나 새로운 라이브 문의를 기다려주세요.</p>
              </div>
            ) : (
              activeSessionMessages.map((msg: any) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} space-y-1`}
                  >
                    <span className="text-[10px] font-extrabold text-neutral-400 px-1">
                      {msg.senderName} • {msg.timestamp}
                    </span>
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                        isAdmin
                          ? "bg-amber-500 text-neutral-950 font-black rounded-tr-xs"
                          : "bg-white text-neutral-900 border border-neutral-200 font-bold rounded-tl-xs"
                      }`}
                    >
                      {msg.text}

                      {Array.isArray(msg.images) && msg.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-neutral-200/40">
                          {msg.images.map((img: string, i: number) => (
                            <img
                              key={i}
                              src={img}
                              alt="첨부 이미지"
                              className="w-full aspect-square object-cover rounded-xl border border-neutral-300 bg-neutral-100"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={adminMessagesEndRef} />
          </div>

          {/* Admin Reply Input Bar */}
          <div className="pt-2 shrink-0 flex gap-2">
            <input
              type="text"
              value={adminLiveInput}
              onChange={(e) => setAdminLiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdminSendLiveChat();
                }
              }}
              placeholder="고객에게 전달할 답변 메세지를 입력하세요..."
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
            <button
              type="button"
              onClick={() => handleAdminSendLiveChat()}
              disabled={!adminLiveInput.trim()}
              className="bg-neutral-950 hover:bg-black text-white px-5 py-3 rounded-xl font-black text-xs transition-all cursor-pointer disabled:opacity-40 shrink-0 shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              답변 전송
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADMIN REAL-TIME TEMPLATE EDITING MODAL (실시간 타이핑 즉시 반영) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-200 notranslate" translate="no">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-neutral-950">
                      실시간 템플릿 수정 (입력 즉시 반영)
                    </h3>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ⚡ 저장 버튼 없음 (입력 완료 시 확인 창)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    별도의 저장 버튼 없이 **입력하는 즉시 실시간 변경**됩니다. 입력이 끝나면 확인 알림이 나타납니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Template Form */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>신규 템플릿 등록</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="🇰🇷 라벨 (예: 사이즈 안내)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
                <input
                  type="text"
                  placeholder="🇰🇷 한글 원문 빠른 답장 문구 입력..."
                  value={newKo}
                  onChange={(e) => setNewKo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTemplate();
                    }
                  }}
                  className="sm:col-span-2 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  disabled={!newKo.trim()}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                >
                  + 템플릿 등록
                </button>
              </div>
            </div>

            {/* Existing Templates Real-Time Inline Editable List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 pb-1">
                <span>등록된 템플릿 수정 ({templates.length}개)</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-neutral-500 hover:text-neutral-950 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본 템플릿으로 복원
                </button>
              </div>

              {templates.map((tmpl) => (
                <div
                  key={`${tmpl.id}-${tmpl.label}-${tmpl.ko}`}
                  className="p-3.5 bg-neutral-50 border border-neutral-200/90 rounded-2xl space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[10px] font-extrabold bg-neutral-900 text-white px-2 py-1 rounded-md shrink-0">
                        라벨
                      </span>
                      <input
                        type="text"
                        defaultValue={tmpl.label}
                        onBlur={(e) => handleRequestEditConfirm(tmpl.id, "label", e.target.value, tmpl.label)}
                        onKeyDown={(e: any) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleRequestEditConfirm(tmpl.id, "label", e.target.value, tmpl.label);
                          }
                        }}
                        className="bg-white border border-neutral-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-amber-500 flex-1"
                        placeholder="라벨 입력 후 입력 완료시 '수정하시겠습니까?' 팝업"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="템플릿 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      defaultValue={tmpl.ko}
                      onBlur={(e) => handleRequestEditConfirm(tmpl.id, "ko", e.target.value, tmpl.ko)}
                      onKeyDown={(e: any) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRequestEditConfirm(tmpl.id, "ko", e.target.value, tmpl.ko);
                        }
                      }}
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                      placeholder="한글 답장 문구 입력 후 입력 완료시 '수정하시겠습니까?' 팝업"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                창 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTO-REPLY SETTINGS MODAL: "자동 답변 설정" */}
      {/* ========================================================================= */}
      {isAutoReplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 text-left space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-950">
                    실시간 채팅 자동 답변 설정
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    고객이 입력한 키워드에 맞춰 지정된 답변을 실시간 채팅창에 자동으로 전송합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoReplyModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {/* 1. ON/OFF & Response Speed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* On/Off Toggle */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      스마트 자동 응답 기능 활성화
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {autoReplyEnabled ? "현재 고객 문의시 챗봇이 자동 응답 중" : "비활성화 시 관리자 직접 수동 응답만 가능"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveAutoReplyConfig(
                        !autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      autoReplyEnabled ? "bg-amber-500" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoReplyEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Delay Speed Selector */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col justify-center">
                  <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-600" />
                    자동 답변 응답 지연 속도
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 3.0, label: "3초 (빠름)" },
                      { val: 5.0, label: "5초 (권장)" },
                      { val: 7.0, label: "7초 (자연스러움)" },
                      { val: 10.0, label: "10초 (여유)" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() =>
                          saveAutoReplyConfig(
                            autoReplyEnabled,
                            item.val,
                            autoReplyRules,
                            autoReplyFallback
                          )
                        }
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer text-center ${
                          autoReplyDelay === item.val
                            ? "bg-neutral-950 text-white shadow-xs"
                            : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Fallback Message */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                  일치하는 키워드가 없을 때 기본 안내 문구 (Fallback)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={autoReplyFallback}
                    onChange={(e) => setAutoReplyFallback(e.target.value)}
                    onBlur={() =>
                      saveAutoReplyConfig(
                        autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      )
                    }
                    placeholder="지정된 키워드가 없을 때 기본으로 나갈 답변을 입력하세요."
                    className="flex-1 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveAutoReplyConfig(
                        autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      );
                      setConfirmDialog("기본 안내 문구가 저장되었습니다.");
                    }}
                    className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
                  >
                    저장
                  </button>
                </div>
              </div>

              {/* 3. Keyword Rules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                    <span>⚡ 키워드별 자동 응답 규칙 ({autoReplyRules.length}개)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAutoRules}
                    className="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                  >
                    기본 규칙으로 초기화
                  </button>
                </div>

                <div className="space-y-3">
                  {autoReplyRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        rule.enabled
                          ? "bg-white border-neutral-200 shadow-xs"
                          : "bg-neutral-50/70 border-neutral-200 opacity-60"
                      }`}
                    >
                      {/* Top Bar: Active Toggle & Name & Delete */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleAutoRule(rule.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer shrink-0 ${
                              rule.enabled
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {rule.enabled ? "활성 ON" : "비활성 OFF"}
                          </button>
                          <input
                            type="text"
                            defaultValue={rule.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== rule.name) {
                                setPendingEdit({
                                  id: rule.id,
                                  type: "auto",
                                  field: "name",
                                  value: e.target.value.trim(),
                                  oldText: rule.name,
                                });
                              }
                            }}
                            className="bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs font-extrabold text-neutral-950 flex-1 focus:outline-none"
                            placeholder="규칙 제목 입력"
                            title="클릭하여 규칙 제목 수정"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoRule(rule.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="규칙 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Keywords Edit Field */}
                      <div className="mb-2.5">
                        <label className="text-[11px] font-bold text-neutral-600 mb-1 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-500" />
                          감지 키워드 (쉼표로 구분하여 여러 개 등록 가능)
                        </label>
                        <input
                          type="text"
                          defaultValue={rule.keywords}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== rule.keywords) {
                              setPendingEdit({
                                id: rule.id,
                                type: "auto",
                                field: "keywords",
                                value: e.target.value.trim(),
                                oldText: rule.keywords,
                              });
                            }
                          }}
                          className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none"
                          placeholder="예: 배송, 언제, 도착, 출고"
                        />
                      </div>

                      {/* Reply Text input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-neutral-600 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-blue-500" />
                            자동 응답 답변 문구 (템플릿 내용)
                          </label>
                          <span className="text-[10px] text-neutral-400">내용 수정 후 다른 곳 클릭 시 확인창 노출</span>
                        </div>
                        <textarea
                          id={`textarea-rule-${rule.id}`}
                          defaultValue={rule.replyText}
                          rows={3}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== rule.replyText) {
                              setPendingEdit({
                                id: rule.id,
                                type: "auto",
                                field: "replyText",
                                value: e.target.value.trim(),
                                oldText: rule.replyText,
                              });
                            }
                          }}
                          className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none leading-relaxed"
                          placeholder="고객에게 자동으로 전송될 답변 내용을 입력하세요."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Add New Rule Form */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  새 자동 답변 키워드 규칙 등록
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="규칙 이름 (예: 매장 위치 안내)"
                    className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={newRuleKeywords}
                    onChange={(e) => setNewRuleKeywords(e.target.value)}
                    placeholder="감지 키워드 (쉼표 구분: 위치, 쇼룸, 매장, 찾아오는길)"
                    className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <textarea
                  value={newRuleReply}
                  onChange={(e) => setNewRuleReply(e.target.value)}
                  rows={2}
                  placeholder="고객이 위 키워드 중 하나라도 포함하여 메시지를 보냈을 때 전송할 자동 답변 문구를 작성하세요."
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddAutoRule}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> 키워드 규칙 추가하기
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoReplyModalOpen(false)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                설정 완료 및 창 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION PROMPT DIALOG: "수정하시겠습니까?" 확인 창 팝업 */}
      {/* ========================================================================= */}
      {pendingEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-950">수정하시겠습니까?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                {pendingEdit.type === "auto"
                  ? "입력하신 자동 답변(챗봇) 템플릿 설정 내용으로 반영하시겠습니까?"
                  : "입력하신 빠른 답장 템플릿 문구로 반영하시겠습니까?"}
              </p>
              <div className="mt-2.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-950 text-left font-mono truncate">
                "{pendingEdit.value}"
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingEdit(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all border border-neutral-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all shadow-md"
              >
                네, 수정합니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION PROMPT DIALOG: "삭제하시겠습니까?" 확인 창 팝업 */}
      {/* ========================================================================= */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-950">답변 규칙을 삭제하시겠습니까?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                삭제된 키워드 자동 응답 규칙은 복구할 수 없습니다.
              </p>
              <div className="mt-2.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-950 text-center truncate">
                "{pendingDelete.name}"
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all border border-neutral-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all shadow-md"
              >
                확인 (삭제)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
