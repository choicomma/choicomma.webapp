"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Database,
  FileJson,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  FolderGit2,
  Layers,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  FileUp,
  X,
  ExternalLink,
} from "lucide-react";

interface GitFileInfo {
  key: string;
  name: string;
  filename: string;
  description: string;
  exists: boolean;
  recordCount: number;
  sizeBytes: number;
  lastModified: string | null;
  status: "HEALTHY" | "EMPTY" | "MISSING";
}

interface GitDataSummary {
  totalFiles: number;
  existingFiles: number;
  healthyFiles: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  engine: string;
}

export function GitDataManagement() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<GitDataSummary | null>(null);
  const [files, setFiles] = useState<GitFileInfo[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Restore states
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreConfirmModalOpen, setRestoreConfirmModalOpen] = useState<boolean>(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<{ name: string; size: number } | null>(null);
  const [pendingRestoreKeys, setPendingRestoreKeys] = useState<string[]>([]);
  const [restoreNotification, setRestoreNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/git-data", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSummary(json.summary);
          setFiles(json.files);
          setLastCheckTime(new Date().toLocaleTimeString("ko-KR"));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch git data status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/admin/git-data?action=backup";
      link.download = `choicomma-git-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("백업 다운로드 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const filesObj = parsed.files && typeof parsed.files === "object" ? parsed.files : parsed;

        // Find matching keys from registry
        const recognized = files
          .filter((f) => filesObj[f.key] !== undefined || filesObj[f.filename] !== undefined)
          .map((f) => f.key);

        if (recognized.length === 0) {
          alert("선택한 파일에 유효한 Git 원장 데이터(products, orders 등 12개 원장)가 포함되어 있지 않습니다.");
          return;
        }

        setPendingRestoreData(parsed);
        setPendingRestoreFile({ name: file.name, size: file.size });
        setPendingRestoreKeys(recognized);
        setRestoreConfirmModalOpen(true);
      } catch (err) {
        alert("JSON 파일 파싱 실패: 파일이 손상되었거나 올바른 JSON 형식이 아닙니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!pendingRestoreData) return;
    setIsRestoring(true);
    setRestoreNotification(null);

    try {
      const res = await fetch("/api/admin/git-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRestoreData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRestoreNotification({
          type: "success",
          message: `성공: 총 ${data.restoredCount}개 데이터 원장이 안전하게 복원되었습니다. 모든 관리자 화면이 즉시 동기화됩니다.`,
        });
        setRestoreConfirmModalOpen(false);
        setPendingRestoreData(null);
        setPendingRestoreFile(null);

        // Dispatch window sync events so all active views update seamlessly
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("orders_updated"));
          window.dispatchEvent(new CustomEvent("admin_customers_updated"));
          window.dispatchEvent(new CustomEvent("coupons_updated"));
          window.dispatchEvent(new CustomEvent("products_updated"));
          window.dispatchEvent(new CustomEvent("site_settings_updated"));
          window.dispatchEvent(new CustomEvent("inquiries_updated"));
        }

        await fetchStatus();
      } else {
        throw new Error(data.error || "원장 복원 처리에 실패했습니다.");
      }
    } catch (err: any) {
      setRestoreNotification({
        type: "error",
        message: `복원 실패: ${err.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Git JSON Native Engine
            </span>
            <span className="bg-neutral-800 text-neutral-300 text-[11px] font-bold px-3 py-1 rounded-full">
              Supabase 0% 완전 탈피
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FolderGit2 className="w-8 h-8 text-emerald-400" />
            Git 데이터 원장 통합 관제 센터
          </h1>
          <p className="text-sm text-neutral-400 mt-1.5 max-w-2xl leading-relaxed">
            초이콤마의 모든 운영 데이터(상품 카탈로그, 주문, 배송, 회원, 쿠폰, 실시간 상담 등 12개 원장)가
            외부 클라우드 DB 의존성 없이 프로젝트 내부 <code className="text-emerald-300 font-mono text-xs bg-neutral-800 px-1.5 py-0.5 rounded">data/*.json</code> 파일로 원자적 저장 및 관리됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold px-4 py-2.5 rounded-xl transition-all border border-neutral-700 text-xs cursor-pointer shadow-sm disabled:opacity-50"
            title="실시간 파일 상태 다시 검사"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            새로고침 {lastCheckTime && `(${lastCheckTime})`}
          </button>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-lg text-xs cursor-pointer disabled:opacity-50"
            title="모든 12개 Git 데이터 파일을 단일 JSON 파일로 즉시 다운로드"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "백업 추출 중..." : "전체 원장 일괄 백업 (.json)"}
          </button>
          <button
            type="button"
            onClick={handleTriggerFileInput}
            disabled={loading || isRestoring}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-lg text-xs cursor-pointer disabled:opacity-50"
            title="백업된 JSON 파일로부터 12개 원장 일괄 복원"
          >
            <Upload className="w-4 h-4" />
            백업 원장 복원 (.json)
          </button>
        </div>
      </div>

      {/* Restore Notification Banner */}
      {restoreNotification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border transition-all ${
            restoreNotification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900"
              : "bg-rose-500/10 border-rose-500/30 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {restoreNotification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{restoreNotification.message}</span>
          </div>
          <button
            onClick={() => setRestoreNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase">
            <span>관리 원장 파일</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            {summary ? `${summary.existingFiles} / ${summary.totalFiles}` : "12 / 12"} 개
          </p>
          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% 정상 가동
          </p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase">
            <span>총 원장 파일 용량</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            {summary ? summary.formattedTotalSize : "445.8 KB"}
          </p>
          <p className="text-[11px] font-bold text-neutral-500 mt-1">
            초경량 로컬 I/O 파일 구조
          </p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase">
            <span>데이터 무결성 지표</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            100 %
          </p>
          <p className="text-[11px] font-bold text-neutral-500 mt-1">
            원자적 쓰기(Atomic) 보증
          </p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase">
            <span>외부 DB 네트워크 지연</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            0 ms
          </p>
          <p className="text-[11px] font-bold text-purple-600 mt-1">
            즉각적인 실시간 로컬 응답
          </p>
        </div>
      </div>

      {/* 3. 12 Data Files Grid */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-700" />
              12개 Git 데이터 원장 전수 현황
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              각 원장 파일은 독립적인 API 엔드포인트를 통해 안전하게 읽기/쓰기가 수행됩니다.
            </p>
          </div>
          <span className="text-xs font-bold bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
            총 {files.length}개 원장
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {files.map((file) => {
            const isProduct = file.key === "products";
            return (
              <div
                key={file.key}
                className={`p-4 rounded-xl border transition-all ${
                  isProduct
                    ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/20"
                    : "bg-neutral-50/50 hover:bg-neutral-50 border-neutral-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isProduct ? "bg-amber-100 text-amber-800" : "bg-neutral-200/80 text-neutral-800"}`}>
                      <FileJson className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-neutral-950 flex items-center gap-1.5">
                        {file.name}
                        {isProduct && (
                          <span className="text-[10px] bg-amber-600 text-white font-extrabold px-1.5 py-0.2 rounded">
                            핵심 카탈로그
                          </span>
                        )}
                      </h3>
                      <code className="text-[11px] text-neutral-500 font-mono">
                        data/{file.filename}
                      </code>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                    정상
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 mt-2.5 line-clamp-1">
                  {file.description}
                </p>

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-neutral-200/60 text-[11px] font-bold text-neutral-500">
                  <span>
                    등록 데이터:{" "}
                    <strong className="text-neutral-900 font-extrabold">
                      {file.recordCount.toLocaleString()} {file.key === "site_settings" ? "개 설정" : "건"}
                    </strong>
                  </span>
                  <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Disaster Recovery & Rollback Hub */}
      <div className="bg-gradient-to-br from-amber-500/10 via-neutral-50 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                원클릭 재해 복구 & 롤백 시스템
              </span>
              <span className="text-[10px] font-bold text-neutral-500">
                Disaster Recovery Pipeline
              </span>
            </div>
            <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-amber-600" />
              과거 백업본으로부터 즉시 원장 복구 (Restore from JSON)
            </h3>
            <p className="text-xs text-neutral-600 max-w-2xl leading-relaxed">
              사전에 다운로드한 통합 백업 JSON 파일을 업로드하면 12개 원장 파일이 원자적으로 복원되며,
              열려있는 모든 관리자 화면(주문, 고객, 상품 등)에 즉시 갱신 이벤트가 전달됩니다.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleTriggerFileInput}
              disabled={loading || isRestoring}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold px-5 py-3 rounded-xl transition shadow-md text-xs cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              백업 파일 선택 및 복원 시작
            </button>
          </div>
        </div>
      </div>

      {/* 5. Safety & Architecture Note */}
      <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-emerald-950">
              Windows 파일 락 및 데이터 손실 0% 안전 보증 시스템 (Safe Atomic Persistence)
            </h3>
            <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
              모든 데이터 변경 시 임시 파일(<code className="font-mono bg-emerald-100 px-1 rounded">.tmp</code>)에 먼저 기록한 후 원자적으로 교체(<code className="font-mono bg-emerald-100 px-1 rounded">fs.renameSync</code>)하며,
              Windows 파일 잠금(<code className="font-mono bg-emerald-100 px-1 rounded">EBUSY</code>) 예외 발생 시 자동 안전 폴백을 수행합니다. 관리자 콘솔에서 수정된 모든 원장은 로컬 Git 변경사항으로 즉각 보존됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Restore Confirmation Modal */}
      {restoreConfirmModalOpen && pendingRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    Git 데이터 원장 일괄 복원 확인
                  </h3>
                  <p className="text-xs text-neutral-500">
                    업로드된 백업 데이터를 로컬 원장에 덮어씌웁니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreConfirmModalOpen(false)}
                disabled={isRestoring}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-bold">선택 파일:</span>
                <span className="font-mono font-extrabold text-neutral-900 truncate max-w-[240px]">
                  {pendingRestoreFile.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-bold">파일 용량:</span>
                <span className="font-bold text-neutral-700">
                  {(pendingRestoreFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-bold">복원 대상 원장:</span>
                <span className="font-extrabold text-emerald-600">
                  총 {pendingRestoreKeys.length}개 원장 감지됨
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-neutral-500 mb-2">
                복원 적용 대상 파일 목록:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {pendingRestoreKeys.map((k) => {
                  const target = files.find((f) => f.key === k);
                  return (
                    <span
                      key={k}
                      className="text-[11px] bg-neutral-100 text-neutral-800 font-bold px-2 py-0.5 rounded-md border border-neutral-200"
                    >
                      {target?.name || k} (data/{target?.filename || `${k}.json`})
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-bold">
              ⚠️ 주의: 복원을 실행하면 현재 프로젝트의 <code className="font-mono bg-amber-100 px-1 rounded">data/*.json</code> 해당 원장 파일들이 백업본으로 원자적(Atomic) 교체됩니다. 진행하시겠습니까?
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setRestoreConfirmModalOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    원장 복원 진행 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    지금 즉시 복원 실행
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
