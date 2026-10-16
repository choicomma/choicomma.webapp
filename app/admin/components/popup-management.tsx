"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  LayoutTemplate,
  X,
  Link as LinkIcon,
  ShieldCheck,
  Megaphone,
  FileText,
  Calendar,
  AlertTriangle,
  RefreshCw,
  EyeOff,
} from "lucide-react";
import {
  PopupConfig,
  DEFAULT_POPUP_CONFIG,
  EMPTY_POPUP_CONFIG,
  getLocalPopupConfig,
  saveLocalPopupConfig,
  POPUP_UPDATED_EVENT,
} from "@/lib/popup/types";

export function PopupManagement({
  triggerToast,
}: {
  triggerToast: (msg: string) => void;
}) {
  const [config, setConfig] = useState<PopupConfig>(() => getLocalPopupConfig());
  const [previewTab, setPreviewTab] = useState<"home" | "membership">("home");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageFileName, setImageFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from remote API / data file on mount
  useEffect(() => {
    fetch("/api/admin/popup", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setConfig(data.config);
          saveLocalPopupConfig(data.config);
        }
      })
      .catch(() => {});

    const handleUpdated = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      }
    };

    window.addEventListener(POPUP_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(POPUP_UPDATED_EVENT, handleUpdated);
  }, []);

  // Handle Image File Upload (Convert to Base64 Data URL)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("이미지 파일(PNG, JPG, WEBP, GIF)만 업로드할 수 있습니다.");
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("이미지 용량은 최대 5MB까지 업로드 가능합니다.");
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setConfig((prev) => ({
          ...prev,
          imageUrl: base64,
          isActive: true, // 이미지 등록 시 기본 활성화
        }));
        triggerToast(`'${file.name}' 이미지가 성공적으로 로드되었습니다. [설정 저장] 버튼을 눌러 적용하세요.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setConfig((prev) => ({
          ...prev,
          imageUrl: base64,
          isActive: true,
        }));
        triggerToast(`'${file.name}' 이미지가 성공적으로 로드되었습니다.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const effectiveType = config.popupType || "NOTICE";
    if (config.isActive) {
      if (effectiveType === "IMAGE" && !config.imageUrl) {
        triggerToast("이미지 팝업을 활성화하려면 먼저 팝업 이미지를 등록해 주세요.");
        return;
      }
      if (effectiveType === "NOTICE" && !config.title && !config.noticeMessage) {
        triggerToast("공지 팝업을 활성화하려면 안내 제목 또는 핵심 문구를 입력해 주세요.");
        return;
      }
    }

    setIsSaving(true);
    // 1. Local Storage 즉시 저장
    saveLocalPopupConfig(config);

    // 2. Server API & Git data file 저장
    try {
      const res = await fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) {
        triggerToast("🎉 팝업 설정이 실시간으로 스토어에 영구 반영되었습니다!");
      } else {
        triggerToast("로컬에 저장되었습니다. (원격 저장소 동기화 재시도 필요)");
      }
    } catch (e) {
      triggerToast("로컬에 즉시 저장되었습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 팝업 내용 입력 초기화 (완전 비우기)
  const handleResetInputs = () => {
    if (confirm("작성 중인 팝업 입력 내용을 모두 비우시겠습니까?")) {
      setConfig(EMPTY_POPUP_CONFIG);
      saveLocalPopupConfig(EMPTY_POPUP_CONFIG);
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EMPTY_POPUP_CONFIG),
      }).catch(() => {});
      setImageFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      triggerToast("팝업 내용이 모두 비워졌습니다.");
    }
  };

  // 팝업 완전 비활성화 및 초기화
  const handleClear = () => {
    if (confirm("팝업 노출을 끄고 비활성화하시겠습니까?")) {
      const clearedConfig: PopupConfig = {
        ...config,
        isActive: false,
        showOnHome: false,
        showOnMembership: false,
      };
      setConfig(clearedConfig);
      saveLocalPopupConfig(clearedConfig);
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clearedConfig),
      }).catch(() => {});
      triggerToast("팝업이 비활성화되었습니다.");
    }
  };

  // 팝업 데이터 및 이미지 완전 삭제
  const handleDelete = async () => {
    if (
      !confirm(
        "현재 설정된 팝업을 완전히 삭제하시겠습니까?\n\n삭제 시 작성된 제목, 본문, 이미지 및 링크가 모두 비워지고 즉시 비활성화됩니다."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const emptyConfig: PopupConfig = {
      ...EMPTY_POPUP_CONFIG,
      updatedAt: new Date().toISOString(),
    };

    setConfig(emptyConfig);
    saveLocalPopupConfig(emptyConfig);
    setImageFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch("/api/admin/popup", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("🗑️ 팝업이 완전히 삭제되었습니다.");
      } else {
        triggerToast("로컬에서 팝업이 삭제되었습니다.");
      }
    } catch (e) {
      // Fallback
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptyConfig),
      }).catch(() => {});
      triggerToast("🗑️ 팝업이 완전히 삭제되었습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isNoticeType = (config.popupType || "NOTICE") === "NOTICE";
  const hasAnyContent = Boolean(
    config.title?.trim() ||
    config.noticeMessage?.trim() ||
    config.description?.trim() ||
    config.imageUrl?.trim()
  );
  const isEffectivelyActive = config.isActive && (
    isNoticeType
      ? Boolean(config.title?.trim() || config.noticeMessage?.trim())
      : Boolean(config.imageUrl?.trim())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-neutral-950 text-white shadow-xs">
              <LayoutTemplate className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-neutral-950 tracking-tight">팝업 관리</h2>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isEffectivelyActive
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-neutral-100 text-neutral-500 border border-neutral-200"
              }`}
            >
              {isEffectivelyActive
                ? `● 실시간 노출 중 (${isNoticeType ? "텍스트 공지형" : "이미지 배너형"})`
                : "○ 비활성화 상태"}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            홈화면 진입 시 노출되는 <strong>정중앙 팝업 모달</strong>과 멤버십 페이지 <strong>상단 고정 배너</strong>를 설정합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetInputs}
            disabled={isSaving || isDeleting}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="팝업 입력 내용 비우기"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            <span>입력 초기화</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving || isDeleting}
            className="px-3 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="팝업 끄기"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>팝업 끄기</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="팝업 내용 및 이미지 완전 삭제"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isDeleting ? "삭제 중..." : "팝업 삭제"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{isSaving ? "저장 중..." : "설정 저장 및 배포"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (5 Cols) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          {/* 1. Status & Mode Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-extrabold text-sm text-neutral-950">팝업 노출 활성화</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  스위치를 켜면 설정된 팝업이 스토어에 실시간 노출됩니다.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => setConfig((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-950"></div>
              </label>
            </div>

            {/* Popup Type Selector (공지형 vs 이미지 배너형) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">팝업 유형 선택</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, popupType: "NOTICE" }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    (config.popupType || "NOTICE") === "NOTICE"
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-xs"
                      : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100/70 text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <Megaphone className={`w-3.5 h-3.5 ${(config.popupType || "NOTICE") === "NOTICE" ? "text-amber-400" : "text-neutral-500"}`} />
                    <span>📢 텍스트 공지형</span>
                  </div>
                  <span className={`text-[10px] leading-tight ${(config.popupType || "NOTICE") === "NOTICE" ? "text-neutral-300" : "text-neutral-400"}`}>
                    점검 안내, 런칭 공지, 긴급 알림
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, popupType: "IMAGE" }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    config.popupType === "IMAGE"
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-xs"
                      : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100/70 text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <ImageIcon className={`w-3.5 h-3.5 ${config.popupType === "IMAGE" ? "text-emerald-400" : "text-neutral-500"}`} />
                    <span>🖼️ 이미지 배너형</span>
                  </div>
                  <span className={`text-[10px] leading-tight ${config.popupType === "IMAGE" ? "text-neutral-300" : "text-neutral-400"}`}>
                    프로모션 룩북, 기획전 배너
                  </span>
                </button>
              </div>
            </div>

            {/* Target Display Positions */}
            <div className="space-y-2 pt-1 border-t border-neutral-100">
              <label className="text-xs font-bold text-neutral-700 block">노출 대상 위치 선택</label>
              
              <div
                onClick={() => setConfig((prev) => ({ ...prev, showOnHome: !prev.showOnHome }))}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  config.showOnHome
                    ? "border-neutral-950 bg-neutral-50/70"
                    : "border-neutral-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.showOnHome ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300"}`}>
                    {config.showOnHome && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-950">1. 홈화면 정중앙 팝업 모달</p>
                    <p className="text-[10px] text-neutral-500">방문자가 사이트 접속 시 화면 중앙에 모달 팝업으로 노출</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-neutral-400">Home Modal</span>
              </div>

              <div
                onClick={() => setConfig((prev) => ({ ...prev, showOnMembership: !prev.showOnMembership }))}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  config.showOnMembership
                    ? "border-neutral-950 bg-neutral-50/70"
                    : "border-neutral-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.showOnMembership ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300"}`}>
                    {config.showOnMembership && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-950">2. 멤버십 페이지 상단 고정 배너</p>
                    <p className="text-[10px] text-neutral-500">마이페이지 시크릿 세일 상단에 상시 고정 배너로 노출</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-neutral-400">Top Banner</span>
              </div>
            </div>
          </div>

          {/* 2. Notice Content Card (공지형일 때 노출) */}
          {isNoticeType && (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-900" />
                <h3 className="font-extrabold text-sm text-neutral-950">공지사항 문구 상세 설정</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>공지 제목 *</span>
                  <span className="text-[10px] text-neutral-400">Enter로 줄바꿈 지원</span>
                </label>
                <textarea
                  rows={2}
                  value={config.title}
                  onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 초이콤마 시즌 오프 세일 안내 (Enter로 줄바꿈 가능)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block">영문 보조 부제목 (선택)</label>
                <input
                  type="text"
                  value={config.subtitle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="예: SEASON OFF SALE & SPECIAL PROMOTION"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-700 font-mono focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>핵심 요약 안내 문구 (강조 박스)</span>
                  <span className="text-[10px] text-amber-600 font-semibold">Enter로 줄바꿈 지원</span>
                </label>
                <textarea
                  rows={3}
                  value={config.noticeMessage || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, noticeMessage: e.target.value }))}
                  placeholder="예: 초이콤마의 기존 회원은 회원 가입을 하실 필요가 없습니다.&#10;가입당시에 사용한 이메일주소 / 휴대폰 뒤 4자리로 로그인 가능합니다."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 resize-y font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>안내 기한 (선택)</span>
                  <span className="text-[10px] text-rose-600 font-bold">빨간색 강조 뱃지</span>
                </label>
                <input
                  type="text"
                  value={config.noticePeriod || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, noticePeriod: e.target.value }))}
                  placeholder="예: 2026.10.31(토)까지"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>고객 안내 상세 본문 (줄바꿈 지원)</span>
                  <span className="text-[10px] text-neutral-400">Enter로 줄바꿈 및 문단 구분 가능</span>
                </label>
                <textarea
                  rows={5}
                  value={config.description || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="예: 초이콤마를 찾아주신 고객 여러분께 감사드립니다.&#10;&#10;상세한 공지 내용 및 혜택 안내를 자유롭게 입력해 주세요."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 resize-y font-medium"
                />
              </div>
            </div>
          )}

          {/* 3. Image Upload Card (이미지형일 땐 필수, 공지형일 땐 선택적 첨부) */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-neutral-900" />
                <span>{isNoticeType ? "공지 첨부 이미지 (선택 사항)" : "팝업 이미지 등록 *"}</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {isNoticeType
                  ? "공지 상단에 함께 띄울 이미지가 있는 경우 등록하세요."
                  : "팝업으로 띄울 이미지 파일을 직접 업로드하거나 이미지 URL을 입력하세요."}
              </p>
            </div>

            {/* Dropzone or Registered Image Preview */}
            {config.imageUrl ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl border border-neutral-200 overflow-hidden bg-white shrink-0 relative flex items-center justify-center shadow-xs">
                    <img
                      src={config.imageUrl}
                      alt="등록된 팝업 이미지"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-neutral-900 truncate">
                      {imageFileName || "등록된 팝업 이미지"}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>이미지 등록 완료</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-white text-[11px] font-bold transition-all cursor-pointer"
                  >
                    변경
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, imageUrl: "" }));
                      setImageFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      triggerToast("팝업 이미지가 삭제되었습니다.");
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="이미지 삭제"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>이미지 삭제</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-5 text-center cursor-pointer transition-all bg-neutral-50/60 hover:bg-neutral-100/50 flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-center text-neutral-600 group-hover:scale-105 transition-transform">
                  <Upload className="w-4 h-4 text-neutral-900" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold text-neutral-900">
                    클릭하여 이미지 파일 선택 또는 드래그 앤 드롭
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    권장 해상도: 600×750px 또는 800×800px (PNG, JPG, WEBP 최대 5MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Alternative: Image URL direct input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
                <span>또는 이미지 직접 URL 입력</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://example.com/popup-banner.jpg"
                  value={config.imageUrl.startsWith("data:") ? "(직접 업로드된 이미지 파일)" : config.imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfig((prev) => ({
                      ...prev,
                      imageUrl: val,
                    }));
                  }}
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 font-mono focus:outline-none focus:border-neutral-950"
                />
                {config.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, imageUrl: "" }));
                      setImageFileName("");
                    }}
                    className="p-2.5 text-neutral-400 hover:text-rose-600 border border-neutral-200 rounded-xl hover:bg-rose-50 transition-colors"
                    title="이미지 제거"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4. Link & Additional Details */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-950">이동 링크 및 옵션</h3>

            {!isNoticeType && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block">팝업 내부 관리용 제목</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 2026 가을 정기 프로모션 단독 팝업"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">
                팝업 클릭 시 이동할 링크 URL (선택)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.linkUrl}
                  onChange={(e) => setConfig((prev) => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="예: /shop 또는 /membership"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-950 font-mono focus:outline-none focus:border-neutral-950"
                />
                <ExternalLink className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-neutral-400">
                입력하지 않으면 단순 안내 팝업으로 동작하며 클릭 시 링크 이동을 하지 않습니다.
              </p>
            </div>
          </div>

          {/* 5. Bottom Action Bar */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-neutral-950">팝업 관리 액션</p>
              <p className="text-[11px] text-neutral-500">
                변경 사항을 스토어에 배포하거나 팝업을 완전히 삭제합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isDeleting ? "삭제 중..." : "팝업 삭제"}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
                className="px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? "저장 중..." : "설정 저장 및 배포"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview (7 Cols) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4 sticky top-6">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            {/* Preview Tab Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewTab("home")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "home" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500 hover:text-neutral-950"
                  }`}
                >
                  1. 홈화면 정중앙 팝업 모달
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("membership")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "membership" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-500 hover:text-neutral-950"
                  }`}
                >
                  2. 멤버십 상단 고정 배너
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Eye className="w-3.5 h-3.5 text-neutral-600" />
                <span className="font-semibold text-neutral-700">실시간 미리보기</span>
              </div>
            </div>

            {/* Preview Display Stage (실제 홈화면과 1:1 동일한 비율 및 오버레이 연출) */}
            <div className="min-h-[620px] bg-neutral-900/80 backdrop-blur-xs rounded-2xl p-4 sm:p-8 flex items-center justify-center border border-neutral-800 relative overflow-hidden shadow-inner">
              {/* TAB 1: Home Popup Preview */}
              {previewTab === "home" ? (
                !hasAnyContent ? (
                  <div className="text-center p-8 space-y-3 max-w-sm bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white/60">
                      <EyeOff className="w-7 h-7 stroke-1" />
                    </div>
                    <h4 className="font-bold text-sm text-white">등록된 팝업이 없습니다</h4>
                    <p className="text-xs text-neutral-400">
                      현재 등록되거나 활성화된 팝업이 없습니다. 왼쪽 패널에서 공지 내용 또는 이미지를 입력하시면 실시간 미리보기가 표시됩니다.
                    </p>
                  </div>
                ) : isNoticeType || (!config.imageUrl && Boolean(config.noticeMessage || config.title)) ? (
                  /* ── Notice Modal Preview (실제 홈화면과 100% 동일한 비율/크기/폰트) ── */
                  <div className="relative w-full max-w-[520px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/90 animate-in zoom-in-95 duration-200 flex flex-col text-center">
                    {/* Floating Close Button Preview */}
                    <div
                      title="팝업 닫기 (미리보기)"
                      className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    >
                      <X className="w-4 h-4" />
                    </div>

                    {/* Top Gradient Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-neutral-950 via-amber-600 to-neutral-900" />
                    <div className="p-7 sm:p-8 space-y-5 sm:space-y-6 text-center">
                      {/* 1. Official Header Badge & Brand Label */}
                      <div className="flex flex-col items-center justify-center gap-2 py-0.5 text-center">
                        <span className="text-[11px] sm:text-xs font-extrabold text-neutral-400 tracking-widest uppercase">
                          CHOICOMMA OFFICIAL
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          공지 및 안내
                        </span>
                      </div>

                      {/* Optional Header Image for Notice Mode */}
                      {config.imageUrl && (
                        <div className="relative w-full rounded-2xl overflow-hidden border border-neutral-200/80 aspect-16/7 bg-neutral-100 my-1 mx-auto">
                          <img
                            src={config.imageUrl}
                            alt={config.title || "공지 이미지"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* 2. Main Large Headline (홈화면과 동일한 크기 및 여백) */}
                      <div className="space-y-2 pt-1 pb-2.5 sm:pb-3.5 mb-1 text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight leading-snug break-keep text-center whitespace-pre-wrap">
                          {config.title || "초이콤마 공지사항"}
                        </h2>
                        {config.subtitle && (
                          <p className="text-xs sm:text-sm font-bold text-neutral-400 tracking-wider uppercase text-center whitespace-pre-wrap">
                            {config.subtitle}
                          </p>
                        )}
                      </div>

                      {/* 3. Core Highlight Box (홈화면과 동일한 크기 및 패딩) */}
                      {(config.noticeMessage || config.noticePeriod) && (
                        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 space-y-3.5 text-center flex flex-col items-center justify-center">
                          {config.noticeMessage && (
                            <div className="flex flex-col items-center justify-center gap-2.5 py-0.5 text-center w-full">
                              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                              <p className="text-sm sm:text-base font-black text-neutral-950 leading-relaxed break-keep text-center whitespace-pre-wrap">
                                {config.noticeMessage}
                              </p>
                            </div>
                          )}
                          {config.noticePeriod && (
                            <div className="flex items-center justify-center flex-wrap gap-2 pt-3 border-t border-amber-300/60 text-xs sm:text-sm font-bold text-neutral-800 text-center w-full">
                              <div className="flex items-center gap-1.5 text-amber-950">
                                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>안내 기한:</span>
                              </div>
                              <span className="px-3.5 py-1 rounded-xl bg-white border border-amber-300 font-black text-rose-600 text-xs sm:text-sm shadow-2xs whitespace-pre-wrap">
                                {config.noticePeriod}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Customer Care Body (홈화면과 동일한 줄간격 및 여백) */}
                      {config.description && (
                        <div className="py-2 text-sm sm:text-base text-neutral-700 leading-relaxed break-keep text-center">
                          <div className="whitespace-pre-wrap text-neutral-800 font-medium leading-relaxed text-center">
                            {config.description}
                          </div>
                        </div>
                      )}

                      {/* 5. Link Button Preview */}
                      {config.linkUrl && (
                        <div className="pt-1.5 flex justify-center">
                          <div className="w-full py-3.5 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors text-center cursor-pointer">
                            <span>관련 안내 페이지로 이동</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* 6. Footer Controls (홈화면과 동일한 전폭 버튼 & 중앙 체크박스) */}
                      <div className="pt-5 pb-1 border-t border-neutral-100 flex flex-col items-center justify-center gap-3.5 w-full">
                        <span className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs sm:text-sm font-black transition-all shadow-md text-center flex items-center justify-center cursor-pointer">
                          확인 및 닫기
                        </span>
                        <span className="flex items-center justify-center gap-2.5 select-none text-xs sm:text-sm font-bold text-neutral-500 py-0.5">
                          <span className="w-4 h-4 rounded border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-900">☑</span>
                          <span>오늘 하루 동안 열지 않기</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : !config.imageUrl ? (
                  <div className="text-center p-8 space-y-3 max-w-sm bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white/60">
                      <ImageIcon className="w-7 h-7 stroke-1" />
                    </div>
                    <h4 className="font-bold text-sm text-white">등록된 팝업 이미지가 없습니다</h4>
                    <p className="text-xs text-neutral-400">
                      왼쪽 패널에서 팝업 이미지 파일을 업로드하시면 실제 방문자 화면에 표시될 팝업을 여기서 실시간으로 확인하실 수 있습니다.
                    </p>
                  </div>
                ) : (
                  /* ── Image Modal Preview (홈화면과 동일한 max-w-[520px]) ── */
                  <div className="relative w-full max-w-[520px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                    <div
                      title="팝업 닫기 (상단 X)"
                      className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </div>

                    <div className="relative aspect-3/4 w-full bg-neutral-100 overflow-hidden cursor-pointer group">
                      <img
                        src={config.imageUrl}
                        alt={config.title || "홈 팝업 미리보기"}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      {config.linkUrl && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <span>클릭 시 연결: {config.linkUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Bar for Image Preview */}
                    <div className="p-4 bg-white border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 font-bold gap-3">
                      <span>☑ 오늘 하루 동안 열지 않기</span>
                      <span className="px-5 py-2.5 bg-neutral-950 text-white rounded-xl font-black text-xs shadow-sm cursor-pointer">
                        확인 및 닫기
                      </span>
                    </div>
                  </div>
                )
              ) : (
                /* TAB 2: Membership Banner Preview */
                !hasAnyContent ? (
                  <div className="text-center p-8 space-y-3 max-w-sm">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-200/70 mx-auto flex items-center justify-center text-neutral-400">
                      <EyeOff className="w-7 h-7 stroke-1" />
                    </div>
                    <h4 className="font-bold text-sm text-neutral-800">등록된 멤버십 배너가 없습니다</h4>
                    <p className="text-xs text-neutral-500">
                      현재 등록된 팝업 배너 또는 공지가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-[560px] space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-bold px-1">
                      <span>📍 멤버십 페이지 상단 (아이디/비밀번호 설정 안내 바로 위 위치)</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {config.showOnMembership ? "배너 노출 활성" : "배너 미노출 설정"}
                      </span>
                    </div>

                    {config.imageUrl ? (
                      <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-neutral-200/80 bg-white group cursor-pointer">
                        <div className="relative w-full aspect-21/9 sm:aspect-16/6 overflow-hidden bg-neutral-100">
                          <img
                            src={config.imageUrl}
                            alt={config.title || "멤버십 팝업 배너 미리보기"}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/30 text-white">
                                MEMBERSHIP SPECIAL
                              </span>
                              <span className="text-[10px] font-bold text-neutral-300">
                                {config.title || "초이콤마 스페셜 이벤트"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full rounded-2xl border border-neutral-900 bg-neutral-950 text-white p-5 shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                공지사항
                              </span>
                              <span className="text-xs font-bold text-neutral-400">CHOICOMMA MEMBERSHIP</span>
                            </div>
                            <h4 className="text-sm font-black text-white whitespace-pre-wrap break-keep">
                              {config.title || "초이콤마 공지사항"}
                            </h4>
                            {config.noticeMessage && (
                              <p className="text-xs text-neutral-300 leading-relaxed max-w-lg whitespace-pre-wrap break-keep">
                                {config.noticeMessage}
                              </p>
                            )}
                          </div>
                          {config.linkUrl && (
                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white">
                              <span>자세히 보기</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mock of what is underneath in membership */}
                    <div className="p-4 rounded-2xl bg-white/60 border border-neutral-200/60 opacity-60 text-center text-xs text-neutral-400">
                      ▼ [아이디 및 비밀번호 설정 안내 섹션] (이 공지 배너 바로 아래에 배치됩니다)
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-[11px] text-neutral-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>저장 시 메인 화면 및 멤버십 페이지에 0초 지연 실시간 반영됩니다.</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">Sync: Git JSON + LocalStorage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
