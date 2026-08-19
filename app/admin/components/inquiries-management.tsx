"use client";

import React from "react";
import { MessageSquare, Crown, LogOut, Trash2, Send } from "lucide-react";

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
            쇼핑몰 우측 하단 둥근 라이브 채팅 팝업으로 고객이 전송한 메시지를 실시간 확인하고 관리자 전담 답변을 즉시 전송합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-900">
              실시간 연동 중 ({adminLiveChatMessages.length}개 메시지 수신됨)
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
              라이브 대화 세션 목록 ({chatSessionsList.filter((s) => s.status !== "ended").length}개 온라인)
            </span>
            <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
              실시간 분리 세션
            </span>
          </div>

          {/* Customer Sessions Stack */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {chatSessionsList.map((session) => {
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
            })}
          </div>

          {/* Preset Reply Quick Chips */}
          <div className="space-y-2 pt-2 border-t border-neutral-200">
            <label className="text-[11px] font-black text-neutral-700 block">
              ⚡ 원클릭 간편 빠른 답장 템플릿
            </label>
            <div className="space-y-1.5">
              {[
                "안녕하세요! 초이콤마 VIP 전담 케어팀입니다. 무엇을 도와드릴까요? 💫",
                "주문하신 상품 및 배송 정보를 확인 중입니다. 잠시만 기다려 주세요!",
                "요청하신 커스텀 사이즈/옵션 지정이 반영 완료되었습니다. 🛍️",
                "추가로 도움이 필요하신 사항이 있으시면 언제든 편하게 말씀해 주세요!",
              ].map((tmpl, tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => handleAdminSendLiveChat(tmpl)}
                  className="w-full text-left bg-neutral-50 hover:bg-amber-50 hover:border-amber-300 border border-neutral-200 p-2.5 rounded-xl text-[11px] font-bold text-neutral-800 transition-all cursor-pointer leading-snug"
                >
                  {tmpl}
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
            {activeSessionMessages.map((msg: any) => {
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
            })}
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
    </div>
  );
}
