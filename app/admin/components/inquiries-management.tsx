"use client";

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
} from "lucide-react";

interface TemplateItem {
  id: string;
  label: string;
  ko: string;
}

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

  // New Template Inputs
  const [newLabel, setNewLabel] = useState("");
  const [newKo, setNewKo] = useState("");

  // Confirmation Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_quick_reply_templates");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTemplates(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed to parse templates", e);
        }
      }
    }
    setTemplates(DEFAULT_TEMPLATES);
  }, []);

  // Pending Edit State for '수정하시겠습니까?' Confirm Dialog
  const [pendingEdit, setPendingEdit] = useState<{ id: string; field: "label" | "ko"; value: string; oldText?: string } | null>(null);

  const saveTemplates = (newItems: TemplateItem[]) => {
    setTemplates(newItems);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_quick_reply_templates", JSON.stringify(newItems));
    }
  };

  // Trigger '수정하시겠습니까?' Prompt when input finishes (onBlur or Enter)
  const handleRequestEditConfirm = (id: string, field: "label" | "ko", value: string, oldText: string) => {
    if (value.trim() === oldText.trim()) return; // No change
    setPendingEdit({ id, field, value, oldText });
  };

  // Apply Pending Edit when user clicks '네, 수정합니다'
  const handleConfirmEdit = () => {
    if (!pendingEdit) return;
    const { id, field, value } = pendingEdit;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            1:1 VIP 실시간 라이브 채팅 케어 (Live Chat)
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            쇼핑몰 라이브 채팅 문의를 실시간 처리합니다. 하단 원클릭 답장 템플릿은 입력 즉시 변경됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer border border-neutral-800"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>✏️ 실시간 템플릿 수정/편집</span>
          </button>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-900">
              실시간 연동 중 ({adminLiveChatMessages.length}개 메시지)
            </span>
          </div>
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
                        <Crown className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400 fill-amber-400" : "text-amber-600"}`} />
                        <span className="text-xs font-black">{session.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${session.badgeColor}`}>
                          {session.tier}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isEnded
                          ? "bg-neutral-200 text-neutral-600"
                          : "bg-emerald-500 text-neutral-950"
                      }`}>
                        {isEnded ? "종료됨" : "ONLINE"}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F5]/70 rounded-2xl border border-neutral-200/60">
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

            <div className="flex justify-end pt-2 border-t border-neutral-100">
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
                입력하신 빠른 답장 템플릿 문구로 반영하시겠습니까?
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
    </div>
  );
}
