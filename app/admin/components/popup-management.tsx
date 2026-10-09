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

  // Load from remote API / Supabase on mount
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
    if (config.isActive && !config.imageUrl) {
      triggerToast("팝업을 활성화하려면 먼저 팝업 이미지를 등록해 주세요.");
      return;
    }

    setIsSaving(true);
    // 1. Local Storage 즉시 저장
    saveLocalPopupConfig(config);

    // 2. Server API & Supabase 원격 DB 저장
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
        triggerToast("로컬에 저장되었습니다. (원격 DB 동기화 오류)");
      }
    } catch (e) {
      triggerToast("로컬에 즉시 저장되었습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("팝업 설정을 초기화하시겠습니까? 현재 등록된 팝업 이미지가 삭제됩니다.")) {
      const resetConfig: PopupConfig = {
        ...DEFAULT_POPUP_CONFIG,
        imageUrl: "",
        isActive: false,
      };
      setConfig(resetConfig);
      saveLocalPopupConfig(resetConfig);
      fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetConfig),
      }).catch(() => {});
      setImageFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      triggerToast("팝업 설정이 초기화되었습니다.");
    }
  };

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
                config.isActive && config.imageUrl
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-neutral-100 text-neutral-500 border border-neutral-200"
              }`}
            >
              {config.isActive && config.imageUrl ? "● 실시간 노출 중" : "○ 비활성화 상태"}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            홈화면 진입 시 노출되는 <strong>정중앙 팝업 모달</strong>과 멤버십 페이지 <strong>시크릿 세일 상단 고정 배너</strong>를 설정합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
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
        {/* Left Column: Form Controls (7 Cols) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          {/* 1. Status Toggle Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-extrabold text-sm text-neutral-950">팝업 노출 활성화</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  스위치를 켜면 등록된 이미지가 홈화면 및 멤버십 페이지에 노출됩니다.
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

            {/* Target Display Positions */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-700 block">노출 대상 위치 선택</label>
              
              <div
                onClick={() => setConfig((prev) => ({ ...prev, showOnHome: !prev.showOnHome }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  config.showOnHome
                    ? "border-neutral-950 bg-neutral-50/70"
                    : "border-neutral-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.showOnHome ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300"}`}>
                    {config.showOnHome && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-950">1. 홈화면 정중앙 팝업 모달</p>
                    <p className="text-[11px] text-neutral-500">방문자가 사이트 메인에 접속하자마자 정중앙에 팝업으로 등장</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-neutral-400">Modal Popup</span>
              </div>

              <div
                onClick={() => setConfig((prev) => ({ ...prev, showOnMembership: !prev.showOnMembership }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  config.showOnMembership
                    ? "border-neutral-950 bg-neutral-50/70"
                    : "border-neutral-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.showOnMembership ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300"}`}>
                    {config.showOnMembership && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-950">2. 멤버십 페이지 시크릿 세일 상단 고정 배너</p>
                    <p className="text-[11px] text-neutral-500">로그인 고객 마이페이지의 시크릿 타임세일 바로 위에 항상 고정 노출</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-neutral-400">Fixed Banner</span>
              </div>
            </div>
          </div>

          {/* 2. Image Upload Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-neutral-900" />
                <span>팝업 이미지 등록 *</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                팝업으로 띄울 이미지 파일을 직접 업로드하거나 웹 이미지 URL을 입력하세요.
              </p>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-6 text-center cursor-pointer transition-all bg-neutral-50/60 hover:bg-neutral-100/50 flex flex-col items-center justify-center space-y-2.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-center text-neutral-600 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5 text-neutral-900" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-neutral-900">
                  클릭하여 이미지 파일 선택 또는 드래그 앤 드롭
                </p>
                <p className="text-[11px] text-neutral-400">
                  권장 해상도: <strong>600 × 750px</strong> 또는 <strong>800 × 800px</strong> (PNG, JPG, WEBP 최대 5MB)
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
                      isActive: Boolean(val),
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

          {/* 3. Link & Additional Details */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-950">상세 링크 및 옵션</h3>

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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">공지 핵심 문구 (텍스트 공지 모드)</label>
              <textarea
                rows={2}
                value={config.noticeMessage || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, noticeMessage: e.target.value }))}
                placeholder="초이콤마 글로벌 몰 공식 런칭 준비로 현재 서비스 이용을 하실 수 없습니다. 신속히 정상화할 수 있도록 하겠습니다."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">정상화 완료 목표 기한</label>
              <input
                type="text"
                value={config.noticePeriod || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, noticePeriod: e.target.value }))}
                placeholder="2026.10.12일까지"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">
                팝업 클릭 시 이동할 링크 URL (선택)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.linkUrl}
                  onChange={(e) => setConfig((prev) => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="예: /shop 또는 /product/item-01"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-950 font-mono focus:outline-none focus:border-neutral-950"
                />
                <ExternalLink className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-neutral-400">
                입력하지 않으면 단순 이미지/공지 팝업으로 표시되며 클릭 시 아무 링크로도 이동하지 않습니다.
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
                  2. 멤버십 시크릿 세일 상단 배너
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Eye className="w-3.5 h-3.5 text-neutral-600" />
                <span className="font-semibold text-neutral-700">실시간 미리보기</span>
              </div>
            </div>

            {/* Preview Display Stage */}
            <div className="min-h-[460px] bg-neutral-100/90 rounded-2xl p-4 sm:p-6 flex items-center justify-center border border-neutral-200 relative overflow-hidden">
              {/* When notice mode or no image uploaded yet */}
              {previewTab === "home" && (config.popupType === "NOTICE" || (!config.imageUrl && (config.noticeMessage || config.title))) ? (
                /* TAB 1: Home Notice Modal Preview */
                <div className="relative w-full max-w-[440px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col text-left">
                  <div className="h-1.5 w-full bg-gradient-to-r from-neutral-950 via-amber-600 to-neutral-900" />
                  <div className="p-5 sm:p-6 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        서비스 일시 중단 안내
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">CHOICOMMA</span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-neutral-950 leading-snug break-keep">
                      {config.title || "초이콤마 글로벌 몰 오픈 준비에 따른 서비스 일시 이용 불가 안내"}
                    </h4>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-2">
                      <p className="text-xs font-black text-neutral-900 leading-relaxed break-keep">
                        "{config.noticeMessage || "초이콤마 글로벌 몰 공식 런칭 준비로 현재 서비스 이용을 하실 수 없습니다. 신속히 정상화할 수 있도록 하겠습니다."}"
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-300/40 text-[11px] font-bold">
                        <span className="text-amber-950">정상화 완료 목표 기한:</span>
                        <span className="text-rose-600 font-black">{config.noticePeriod || "2026.10.12(월)까지"}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-700 leading-relaxed break-keep">
                      <p className="font-bold text-neutral-900">
                        초이콤마를 찾아주신 고객 여러분께 감사드립니다.
                      </p>
                      <p className="font-semibold text-rose-600">
                        작업 기간 동안 쇼핑몰 서비스 이용 및 접속을 하실 수 없습니다.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-[11px] text-neutral-600 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>기존 주문건 배송 업무는 정상 진행됩니다.</span>
                    </div>

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
              ) : previewTab === "home" ? (
                /* TAB 1: Home Modal Preview */
                <div className="relative w-full max-w-[360px] sm:max-w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                  {/* Top Floating Close Button (상단에 엑스만 남김) */}
                  <div
                    title="팝업 닫기 (상단 X)"
                    className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </div>

                  {/* Image Display */}
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

                </div>
              ) : (
                /* TAB 2: Membership Fixed Banner Preview */
                <div className="w-full max-w-[560px] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-bold px-1">
                    <span>📍 멤버십 페이지 시크릿 세일 바로 위 고정 배너 위치</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      배너 노출 상태
                    </span>
                  </div>

                  {/* The Banner */}
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
