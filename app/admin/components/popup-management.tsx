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
} from "lucide-react";
import {
  PopupConfig,
  DEFAULT_POPUP_CONFIG,
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
  const [imageFileName, setImageFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from remote API / data file on mount
  useEffect(() => {
    fetch("/api/admin/popup")
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

  // 공식 기본 공지 복원
  const handleRestoreDefault = () => {
    if (confirm("공식 기본 공지사항(글로벌 몰 오픈 준비 안내)으로 복원하시겠습니까?")) {
      setConfig(DEFAULT_POPUP_CONFIG);
      saveLocalPopupConfig(DEFAULT_POPUP_CONFIG);
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_POPUP_CONFIG),
      }).catch(() => {});
      setImageFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      triggerToast("기본 공지사항 설정으로 복원되었습니다.");
    }
  };

  // 팝업 완전 비활성화 및 초기화
  const handleClear = () => {
    if (confirm("팝업을 끄고 설정을 초기화하시겠습니까?")) {
      const clearedConfig: PopupConfig = {
        ...DEFAULT_POPUP_CONFIG,
        title: "",
        subtitle: "",
        noticeMessage: "",
        noticePeriod: "",
        description: "",
        imageUrl: "",
        linkUrl: "",
        isActive: false,
      };
      setConfig(clearedConfig);
      saveLocalPopupConfig(clearedConfig);
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clearedConfig),
      }).catch(() => {});
      setImageFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      triggerToast("팝업이 비활성화되었습니다.");
    }
  };

  const isNoticeType = (config.popupType || "NOTICE") === "NOTICE";
  const isEffectivelyActive = config.isActive && (
    isNoticeType
      ? Boolean(config.title || config.noticeMessage)
      : Boolean(config.imageUrl)
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
            onClick={handleRestoreDefault}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="기본 공지사항 설정으로 복원"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            <span>기본 공지 복원</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="팝업 끄기 및 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>팝업 끄기</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
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
                <label className="text-xs font-bold text-neutral-700 block">공지 제목 *</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 초이콤마 글로벌 몰 오픈 준비에 따른 서비스 일시 이용 불가 안내"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block">영문 보조 부제목 (선택)</label>
                <input
                  type="text"
                  value={config.subtitle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="예: GLOBAL STORE LAUNCH & TEMPORARY SERVICE PAUSE"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-700 font-mono focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>핵심 요약 안내 문구 (강조 박스)</span>
                  <span className="text-[10px] text-amber-600 font-semibold">노란 강조 박스에 노출</span>
                </label>
                <textarea
                  rows={2}
                  value={config.noticeMessage || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, noticeMessage: e.target.value }))}
                  placeholder="초이콤마 글로벌 몰 공식 런칭 준비로 현재 서비스 이용을 하실 수 없습니다. 신속히 정상화할 수 있도록 하겠습니다."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>정상화 완료 목표 기한</span>
                  <span className="text-[10px] text-rose-600 font-bold">빨간색 강조 뱃지</span>
                </label>
                <input
                  type="text"
                  value={config.noticePeriod || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, noticePeriod: e.target.value }))}
                  placeholder="2026.10.12(월)까지"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center justify-between">
                  <span>고객 안내 상세 본문 (줄바꿈 지원)</span>
                  <span className="text-[10px] text-neutral-400">미입력 시 기본 정중한 안내문 표시</span>
                </label>
                <textarea
                  rows={4}
                  value={config.description || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="현재 해외 글로벌 고객님들과 함께하기 위한 초이콤마 글로벌 몰 공식 런칭 작업이 진행되고 있습니다. 작업 기간 동안 일시적으로 사이트 접속을 하실 수 없습니다."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none font-medium"
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

            {/* Dropzone */}
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

            {/* Preview Display Stage */}
            <div className="min-h-[480px] bg-neutral-100/90 rounded-2xl p-4 sm:p-6 flex items-center justify-center border border-neutral-200 relative overflow-hidden">
              {/* TAB 1: Home Popup Preview */}
              {previewTab === "home" ? (
                isNoticeType || (!config.imageUrl && Boolean(config.noticeMessage || config.title)) ? (
                  /* ── Notice Modal Preview (정돈된 공지 팝업) ── */
                  <div className="relative w-full max-w-[440px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col text-left">
                    <div className="h-1.5 w-full bg-gradient-to-r from-neutral-950 via-amber-600 to-neutral-900" />
                    <div className="p-5 sm:p-6 space-y-3.5">
                      {/* Badge Header */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          공지 및 안내
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400">CHOICOMMA</span>
                      </div>

                      {/* Attached Image if present */}
                      {config.imageUrl && (
                        <div className="relative w-full rounded-2xl overflow-hidden border border-neutral-200/80 aspect-16/7 bg-neutral-100">
                          <img
                            src={config.imageUrl}
                            alt={config.title || "공지 이미지"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Title & Subtitle */}
                      <div className="space-y-0.5">
                        <h4 className="text-sm sm:text-base font-black text-neutral-950 leading-snug break-keep">
                          {config.title || "초이콤마 글로벌 몰 오픈 준비에 따른 서비스 일시 이용 불가 안내"}
                        </h4>
                        {config.subtitle && (
                          <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                            {config.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Core Highlight Box */}
                      {(config.noticeMessage || config.noticePeriod) && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-2">
                          {config.noticeMessage && (
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-xs font-black text-neutral-900 leading-relaxed break-keep">
                                "{config.noticeMessage}"
                              </p>
                            </div>
                          )}
                          {config.noticePeriod && (
                            <div className="flex items-center justify-between pt-1 border-t border-amber-300/40 text-[11px] font-bold">
                              <span className="text-amber-950">정상화 완료 목표 기한:</span>
                              <span className="text-rose-600 font-black">{config.noticePeriod}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer Care Body */}
                      <div className="space-y-1.5 text-xs text-neutral-700 leading-relaxed break-keep">
                        {config.description ? (
                          <p className="whitespace-pre-line text-neutral-800 font-medium">
                            {config.description}
                          </p>
                        ) : (
                          <>
                            <p className="font-bold text-neutral-900">
                              초이콤마를 찾아주신 고객 여러분께 감사드립니다.
                            </p>
                            <p className="font-semibold text-rose-600">
                              작업 기간 동안 쇼핑몰 서비스 이용 및 사이트 접속을 하실 수 없습니다.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Safe Delivery Guarantee */}
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-[11px] text-neutral-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>기존 주문건 배송 업무는 정상 진행됩니다.</span>
                      </div>

                      {/* Link Button Preview */}
                      {config.linkUrl && (
                        <div className="pt-0.5">
                          <div className="w-full py-2 px-3 rounded-xl bg-neutral-100 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1.5">
                            <span>관련 안내 페이지로 이동</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-bold">
                        <span>☑ 오늘 하루 동안 열지 않기</span>
                        <span className="px-3 py-1 bg-neutral-950 text-white rounded-lg font-black text-[11px]">확인 및 닫기</span>
                      </div>
                    </div>
                  </div>
                ) : !config.imageUrl ? (
                  <div className="text-center p-8 space-y-3 max-w-sm">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-200/70 mx-auto flex items-center justify-center text-neutral-400">
                      <ImageIcon className="w-7 h-7 stroke-1" />
                    </div>
                    <h4 className="font-bold text-sm text-neutral-800">등록된 팝업 이미지가 없습니다</h4>
                    <p className="text-xs text-neutral-500">
                      왼쪽 패널에서 팝업 이미지 파일을 업로드하시면 실제 방문자 화면에 표시될 팝업을 여기서 실시간으로 확인하실 수 있습니다.
                    </p>
                  </div>
                ) : (
                  /* ── Image Modal Preview ── */
                  <div className="relative w-full max-w-[360px] sm:max-w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
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
                    <div className="p-3 bg-white border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-bold">
                      <span>☑ 오늘 하루 열지 않기</span>
                      <span className="px-3 py-1 bg-neutral-950 text-white rounded-lg font-black text-[11px]">닫기</span>
                    </div>
                  </div>
                )
              ) : (
                /* TAB 2: Membership Banner Preview */
                <div className="w-full max-w-[560px] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-bold px-1">
                    <span>📍 멤버십 페이지 시크릿 세일 바로 위 고정 배너 위치</span>
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
                          <h4 className="text-sm font-black text-white">
                            {config.title || "초이콤마 공지사항"}
                          </h4>
                          {config.noticeMessage && (
                            <p className="text-xs text-neutral-300 leading-relaxed max-w-lg">
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
                    ▼ [시크릿 타임 세일 섹션] (이 배너 바로 아래에 배치됩니다)
                  </div>
                </div>
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
