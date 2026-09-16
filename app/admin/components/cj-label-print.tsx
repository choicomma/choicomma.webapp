"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Barcode from "react-barcode";
import { Printer, CheckCircle2, HelpCircle, X, RefreshCw, Settings, Wifi, Laptop, AlertCircle, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, Layers, Sliders, Check } from "lucide-react";
import { toast } from "sonner";

export interface PrintData {
  orderId: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  items: string;
  shippingMemo: string;
  trackingNumber: string;
  clsfCd: string;
  subClsfCd: string;
  clldlvempNickNm: string;
  clsfAddr?: string;
  clldlvBranNm?: string;
  p2pCd?: string;
  reprintYn?: string;
}

export function CjLabelPrint({
  data,
  onClose,
}: {
  data: PrintData | PrintData[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState<number>(0.85);
  const [paperMode, setPaperMode] = useState<"blank" | "preprinted">("preprinted");
  const [printerInfo, setPrinterInfo] = useState<{
    detected: boolean;
    name: string;
    isDefault: boolean;
  }>({
    detected: true,
    name: "Xprinter XP-DT108B LABEL",
    isDefault: true,
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [showKioskGuide, setShowKioskGuide] = useState(false);

  // 인쇄 방향 (회전 각도: 0, 90, 180, 270도) - 기본값 90도 (Xprinter 표준 정렬)
  const [printRotation, setPrintRotation] = useState<number>(90);
  // 위치 미세조정 오프셋 (mm 단위: -20 ~ +20)
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  // 미리보기 모드: "roll_template" (실제 롤용지 맞춤 대조 뷰) | "printer_feed" (프린터 헤드 출력 뷰)
  const [previewMode, setPreviewMode] = useState<"roll_template" | "printer_feed">("roll_template");
  // 인쇄 설정 툴바 펼침/접힘
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);

  // 로컬/원격 다이렉트 프린트 브릿지 (ChoicommaPrintBridge) 연결 상태
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [bridgePrinterName, setBridgePrinterName] = useState<string>("Xprinter XP-DT108B LABEL");
  const [bridgeHost, setBridgeHost] = useState<string>("localhost");
  const [machineName, setMachineName] = useState<string>("");
  const [detectedIps, setDetectedIps] = useState<string[]>([]);
  const [isHostModalOpen, setIsHostModalOpen] = useState<boolean>(false);
  const [tempHost, setTempHost] = useState<string>("");
  const [testingHost, setTestingHost] = useState<boolean>(false);
  const [testError, setTestError] = useState<string | null>(null);

  const checkBridgeStatus = useCallback(async (targetHost?: string) => {
    const host = (targetHost !== undefined ? targetHost : (bridgeHost || "localhost")).trim();
    setBridgeStatus("checking");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${host || "localhost"}:18080/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("HTTP error");
      const json = await res.json();
      if (json?.status === "ok" && (json?.xprinterDetected || json?.found)) {
        setBridgeStatus("connected");
        if (json.xprinterName || json.printer) setBridgePrinterName(json.xprinterName || json.printer);
        if (json.machineName) setMachineName(json.machineName);
        if (Array.isArray(json.localIps)) setDetectedIps(json.localIps);
        return true;
      }
      setBridgeStatus("disconnected");
      return false;
    } catch {
      setBridgeStatus("disconnected");
      return false;
    }
  }, [bridgeHost]);

  const handleSaveHost = async (hostToTest?: string) => {
    const target = (hostToTest || tempHost || "localhost").trim();
    if (hostToTest) setTempHost(hostToTest);
    setTestingHost(true);
    setTestError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`http://${target}:18080/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (json?.status === "ok" && (json?.xprinterDetected || json?.found)) {
        setBridgeHost(target);
        if (json.xprinterName || json.printer) setBridgePrinterName(json.xprinterName || json.printer);
        if (json.machineName) setMachineName(json.machineName);
        if (Array.isArray(json.localIps)) setDetectedIps(json.localIps);
        setBridgeStatus("connected");
        try {
          localStorage.setItem("choicomma_printer_host", target);
        } catch {}
        toast.success(`프린터 PC (${target}) 연결에 성공했습니다!`);
        setIsHostModalOpen(false);
      } else {
        setTestError("프린터 브릿지는 응답하였으나 Xprinter 라벨 프린터가 감지되지 않았습니다.");
      }
    } catch {
      setTestError(`IP '${target}' (포트 18080)에 연결할 수 없습니다. IP 주소와 프린터 PC의 브릿지 실행 여부, 방화벽을 확인해주세요.`);
    } finally {
      setTestingHost(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    let initialHost = "localhost";
    try {
      const saved = localStorage.getItem("choicomma_printer_host");
      if (saved && saved.trim()) {
        initialHost = saved.trim();
        setBridgeHost(initialHost);
        setTempHost(initialHost);
      } else {
        setTempHost("localhost");
      }

      // 라벨 보정 및 회전 설정 로드
      const savedRot = localStorage.getItem("choicomma_label_rotation");
      if (savedRot !== null) setPrintRotation(parseInt(savedRot, 10));
      const savedX = localStorage.getItem("choicomma_label_offset_x");
      if (savedX !== null) setOffsetX(parseFloat(savedX));
      const savedY = localStorage.getItem("choicomma_label_offset_y");
      if (savedY !== null) setOffsetY(parseFloat(savedY));
      const savedMode = localStorage.getItem("choicomma_label_preview_mode");
      if (savedMode === "roll_template" || savedMode === "printer_feed") setPreviewMode(savedMode as any);
      const savedPaper = localStorage.getItem("choicomma_label_paper_mode");
      if (savedPaper === "preprinted" || savedPaper === "blank") setPaperMode(savedPaper as any);
    } catch {
      setTempHost("localhost");
    }

    checkBridgeStatus(initialHost);

    // 서버 기본 프린터 설정 상태 조회
    fetch("/api/admin/print/printer-config")
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) {
          setPrinterInfo({
            detected: res.xprinterDetected,
            name: res.xprinterName || "Xprinter XP-DT108B LABEL",
            isDefault: res.isXprinterDefault,
          });
        }
      })
      .catch(() => {});
  }, [checkBridgeStatus]);

  const updateRotation = (rot: number) => {
    setPrintRotation(rot);
    try {
      localStorage.setItem("choicomma_label_rotation", String(rot));
    } catch {}
  };

  const updateOffsetX = (val: number) => {
    const clamped = Math.round(Math.min(20, Math.max(-20, val)) * 10) / 10;
    setOffsetX(clamped);
    try {
      localStorage.setItem("choicomma_label_offset_x", String(clamped));
    } catch {}
  };

  const updateOffsetY = (val: number) => {
    const clamped = Math.round(Math.min(20, Math.max(-20, val)) * 10) / 10;
    setOffsetY(clamped);
    try {
      localStorage.setItem("choicomma_label_offset_y", String(clamped));
    } catch {}
  };

  const updatePreviewMode = (mode: "roll_template" | "printer_feed") => {
    setPreviewMode(mode);
    try {
      localStorage.setItem("choicomma_label_preview_mode", mode);
    } catch {}
  };

  const updatePaperMode = (mode: "preprinted" | "blank") => {
    setPaperMode(mode);
    try {
      localStorage.setItem("choicomma_label_paper_mode", mode);
    } catch {}
  };

  const resetOffsets = () => {
    setOffsetX(0);
    setOffsetY(0);
    try {
      localStorage.setItem("choicomma_label_offset_x", "0");
      localStorage.setItem("choicomma_label_offset_y", "0");
    } catch {}
    toast.success("인쇄 위치가 (0.0mm, 0.0mm) 기준점으로 초기화되었습니다.");
  };

  const senderName = "주식회사 초이콤마";
  const senderPhone = "02-579-1171";
  const senderAddr = "서울특별시 강남구 개포동 개포로22길 12, 6층(개포동)";

  const printList = Array.isArray(data) ? data : [data];

  // 국토교통부 및 CJ대한통운 운송장 마스킹 규정
  const maskName = (name: string) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (trimmed.length <= 1) return trimmed;
    if (trimmed.length === 2) return trimmed[0] + "*";
    return trimmed[0] + "*" + trimmed.substring(2);
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/[^0-9-]/g, "");
    return cleaned.replace(/(\d{4})$/, "****");
  };

  const today = new Date()
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");

  const printViaIframe = () => {
    const rootEl = document.getElementById("cj-print-root");
    if (!rootEl) {
      window.print();
      return;
    }

    const sheets = rootEl.querySelectorAll(".cj-label-sheet");
    if (!sheets || sheets.length === 0) {
      window.print();
      return;
    }

    let combinedHtml = "";
    sheets.forEach((sheet) => {
      combinedHtml += sheet.outerHTML;
    });

    let iframe = document.getElementById("cj-print-iframe") as HTMLIFrameElement;
    if (iframe) {
      try {
        iframe.remove();
      } catch (e) {}
    }

    iframe = document.createElement("iframe");
    iframe.id = "cj-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "-99999px";
    iframe.style.width = "123mm";
    iframe.style.height = "100mm";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>CJ대한통운 1.5인치 표준운송장 출력</title>
  <style>
    @page {
      size: 123mm 100mm landscape;
      margin: 0 !important;
    }
    @font-face {
      font-family: 'Pretendard';
      src: url('/font/Pretendard-Regular.otf') format('opentype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Pretendard';
      src: url('/font/Pretendard-Medium.otf') format('opentype');
      font-weight: 500;
      font-style: normal;
    }
    @font-face {
      font-family: 'Pretendard';
      src: url('/font/Pretendard-Bold.otf') format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Pretendard';
      src: url('/font/Pretendard-ExtraBold.otf') format('opentype');
      font-weight: 800;
      font-style: normal;
    }
    @font-face {
      font-family: 'Pretendard';
      src: url('/font/Pretendard-Black.otf') format('opentype');
      font-weight: 900;
      font-style: normal;
    }
    * {
      box-sizing: border-box !important;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 123mm !important;
      background: #ffffff !important;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cj-label-sheet {
      width: 123mm !important;
      height: 100mm !important;
      max-width: 123mm !important;
      max-height: 100mm !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: #ffffff !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .cj-label-sheet-last {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  </style>
</head>
<body>
  ${combinedHtml}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print fallback:", err);
        window.print();
      }
    }, 500);
  };

  const handlePrintToXprinter = async () => {
    setIsPrinting(true);

    // 1. 초이콤마 다이렉트 프린트 브릿지 (ChoicommaPrintBridge) 연결 시: 라벨 캡처 후 18080 포트로 직접 전송
    if (bridgeStatus === "connected") {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const images: string[] = [];

        for (let i = 0; i < printList.length; i++) {
          const el = document.getElementById(`capture-label-sheet-${i}`);
          if (el) {
            const canvas = await html2canvas(el, {
              scale: 2.11, // 203 DPI 열전사 라벨 규격 (123mm x 100mm = 983px x 800px)
              backgroundColor: "#ffffff",
              logging: false,
              useCORS: true,
            });
            images.push(canvas.toDataURL("image/png"));
          }
        }

        if (images.length > 0) {
          const host = (bridgeHost || "localhost").trim();
          const res = await fetch(`http://${host}:18080/print`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              printerName: bridgePrinterName || "Xprinter XP-DT108B LABEL",
              images,
              rotation: printRotation,
              offsetX: 0, // 이미 캡처에서 translate 오프셋이 정확히 반영됨
              offsetY: 0,
            }),
          });

          const json = await res.json();
          if (json?.success) {
            toast.success(`Xprinter로 송장 ${json.count}건 출력이 정상 전송되었습니다. (회전: ${printRotation}°, 위치: X ${offsetX}mm, Y ${offsetY}mm)`);
            setIsPrinting(false);
            onClose();
            return;
          }
        }
      } catch (bridgeErr) {
        console.warn("Direct bridge print failed, falling back to browser print:", bridgeErr);
        toast.info("다이렉트 출력 연결 실패로 일반 브라우저 인쇄 모드로 전환합니다.");
      }
    }

    // 2. 브릿지 미연결 또는 실패 시: 일반 브라우저 iframe 인쇄 모드로 폴백
    try {
      await fetch("/api/admin/print/printer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName: printerInfo.name }),
      });
    } catch (e) {
      console.warn("Set default printer failed, continuing with print:", e);
    }
    printViaIframe();
    setIsPrinting(false);
  };

  return (
    <>
      {/* 1. 화면 전용 미리보기 모달 UI */}
      <div className="fixed inset-0 z-[9999] bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center print:hidden p-4">
        <div className="bg-neutral-100 rounded-2xl shadow-2xl flex flex-col items-center max-h-[96vh] w-full max-w-4xl overflow-hidden border border-neutral-300">
          {/* Header Bar */}
          <div className="flex flex-wrap justify-between w-full items-center px-6 py-3 bg-white border-b border-neutral-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600 shrink-0" />
                <h2 className="text-base font-bold text-neutral-900">
                  CJ대한통운 1.5인치 표준운송장 출력 ({printList.length}건)
                </h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                  가로 123mm × 세로 100mm
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                CJ표준운송장 공식 가이드 도면 치수(가로 123mm × 세로 100mm) 100% 일치
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Bridge Connection Status Badge */}
              <div className="flex items-center gap-1.5">
                {bridgeStatus === "connected" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTempHost(bridgeHost);
                      setTestError(null);
                      setIsHostModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors"
                    title="초이콤마 다이렉트 프린트 브릿지 연결됨 - 클릭하여 프린터 IP 설정 변경"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>다이렉트 출력 준비완료</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded font-mono font-normal">
                      {bridgeHost === "localhost" || bridgeHost === "127.0.0.1" ? "이 컴퓨터" : bridgeHost}
                    </span>
                  </button>
                ) : bridgeStatus === "checking" ? (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-medium rounded-lg"
                    title="다이렉트 프린트 브릿지 연결 상태 확인 중"
                  >
                    <span className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse shrink-0" />
                    <span>연결 확인 중...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempHost(bridgeHost);
                      setTestError(null);
                      setIsHostModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                    title="원격 프린터 PC 연결 또는 로컬 브릿지 설정"
                  >
                    <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                    <span>일반 인쇄 모드</span>
                    <span className="text-[10px] text-blue-600 font-semibold underline underline-offset-2 ml-1">
                      IP 연결
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTempHost(bridgeHost);
                    setTestError(null);
                    setIsHostModalOpen(true);
                  }}
                  title="프린터 컴퓨터 IP 네트워크 설정"
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
                  aria-label="프린터 네트워크 설정"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => checkBridgeStatus()}
                  title="브릿지 연결 상태 다시 확인"
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
                  aria-label="브릿지 재연결 확인"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${bridgeStatus === "checking" ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Paper Mode Toggle */}
              <div className="flex items-center bg-neutral-100 rounded-lg p-1 border border-neutral-200 text-xs">
                <button
                  type="button"
                  onClick={() => updatePaperMode("preprinted")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperMode === "preprinted"
                      ? "bg-white shadow text-neutral-900 font-bold"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  title="배경 서식을 제외하고 데이터만 출력 (CJ 전용 사전인쇄 롤용지용)"
                >
                  CJ 전용용지
                </button>
                <button
                  type="button"
                  onClick={() => updatePaperMode("blank")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperMode === "blank"
                      ? "bg-white shadow text-neutral-900 font-bold"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  title="서식 테두리와 로고를 모두 출력 (무지 라벨지/A4/PDF용)"
                >
                  무지용지
                </button>
              </div>

              {/* Zoom Buttons */}
              <div className="hidden sm:flex items-center bg-neutral-100 rounded-lg p-1 border border-neutral-200 text-xs">
                <button
                  type="button"
                  onClick={() => setZoom(0.7)}
                  className={`px-2 py-1 rounded ${zoom === 0.7 ? "bg-white font-bold shadow" : "text-neutral-600"}`}
                >
                  70%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(0.85)}
                  className={`px-2 py-1 rounded ${zoom === 0.85 ? "bg-white font-bold shadow" : "text-neutral-600"}`}
                >
                  85%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  className={`px-2 py-1 rounded ${zoom === 1.0 ? "bg-white font-bold shadow" : "text-neutral-600"}`}
                >
                  100%
                </button>
              </div>

              {/* Kiosk Mode Tip Guide Trigger */}
              <button
                type="button"
                onClick={() => setShowKioskGuide(true)}
                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-neutral-200 text-xs transition-colors cursor-pointer"
                title="출력 가이드 안내"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handlePrintToXprinter}
                disabled={isPrinting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isPrinting
                    ? "출력 중..."
                    : bridgeStatus === "connected"
                    ? "즉시 인쇄"
                    : "인쇄하기"}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>

          {/* ── Sub-Header: 인쇄 위치(오프셋) & 인쇄 회전 실시간 보정 툴바 ── */}
          <div className="w-full bg-white border-b border-neutral-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            {/* 좌측: 미리보기 뷰 모드 탭 (WYSIWYG 롤용지 대조 뷰 vs 프린터 헤드 배출 뷰) */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-700 flex items-center gap-1 shrink-0">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>미리보기:</span>
              </span>
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                <button
                  type="button"
                  onClick={() => updatePreviewMode("roll_template")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    previewMode === "roll_template"
                      ? "bg-white shadow-xs text-blue-700 border border-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="실제 CJ 롤용지 파란 칸에 글씨가 정확히 들어가는지 1:1 대조 확인"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>실제 롤용지 맞춤 뷰</span>
                </button>
                <button
                  type="button"
                  onClick={() => updatePreviewMode("printer_feed")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    previewMode === "printer_feed"
                      ? "bg-white shadow-xs text-blue-700 border border-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="Xprinter 기계에서 롤이 흘러나오는 실제 회전 방향으로 확인"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>프린터 헤드 출력 뷰 ({printRotation}°)</span>
                </button>
              </div>
            </div>

            {/* 중앙: 인쇄 회전 방향 (0°, 90°, 180°, 270°) */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-700 flex items-center gap-1 shrink-0">
                <RotateCw className="w-3.5 h-3.5 text-neutral-500" />
                <span>방향:</span>
              </span>
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 font-mono">
                <button
                  type="button"
                  onClick={() => updateRotation(90)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printRotation === 90
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="Xprinter XP-DT108B 표준 방향 (시계방향 90도 회전)"
                >
                  90° (기본 권장)
                </button>
                <button
                  type="button"
                  onClick={() => updateRotation(0)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printRotation === 0
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="가로 원본 방향 (0도)"
                >
                  0°
                </button>
                <button
                  type="button"
                  onClick={() => updateRotation(180)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printRotation === 180
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="180도 반전"
                >
                  180°
                </button>
                <button
                  type="button"
                  onClick={() => updateRotation(270)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printRotation === 270
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  title="270도 역회전"
                >
                  270°
                </button>
              </div>
            </div>

            {/* 우측: 상하/좌우 오프셋 컨트롤러 (mm 단위) */}
            <div className="flex items-center gap-2.5">
              {/* 상하 Y 오프셋 */}
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-600 px-1">상/하:</span>
                <button
                  type="button"
                  onClick={() => updateOffsetY(offsetY - 0.5)}
                  className="p-1 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs cursor-pointer active:scale-95"
                  title="0.5mm 위로 이동"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <span className="w-14 text-center font-mono font-bold text-xs bg-white py-0.5 px-1 rounded border border-neutral-200 text-blue-700">
                  {offsetY > 0 ? `+${offsetY.toFixed(1)}` : offsetY.toFixed(1)}mm
                </span>
                <button
                  type="button"
                  onClick={() => updateOffsetY(offsetY + 0.5)}
                  className="p-1 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs cursor-pointer active:scale-95"
                  title="0.5mm 아래로 이동"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 좌우 X 오프셋 */}
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-600 px-1">좌/우:</span>
                <button
                  type="button"
                  onClick={() => updateOffsetX(offsetX - 0.5)}
                  className="p-1 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs cursor-pointer active:scale-95"
                  title="0.5mm 왼쪽으로 이동"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="w-14 text-center font-mono font-bold text-xs bg-white py-0.5 px-1 rounded border border-neutral-200 text-blue-700">
                  {offsetX > 0 ? `+${offsetX.toFixed(1)}` : offsetX.toFixed(1)}mm
                </span>
                <button
                  type="button"
                  onClick={() => updateOffsetX(offsetX + 0.5)}
                  className="p-1 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs cursor-pointer active:scale-95"
                  title="0.5mm 오른쪽으로 이동"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 초기화 버튼 */}
              {(offsetX !== 0 || offsetY !== 0) && (
                <button
                  type="button"
                  onClick={resetOffsets}
                  className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                  title="위치 오프셋을 0.0mm로 초기화"
                >
                  0mm 초기화
                </button>
              )}
            </div>
          </div>

          {/* Label Preview Scroll Area */}
          <div className="w-full flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6 bg-neutral-200/70">
            {printList.map((item, idx) => {
              const isRotatedFeed = previewMode === "printer_feed" && (printRotation === 90 || printRotation === 270);
              const containerWidth = isRotatedFeed ? 100 : 123;
              const containerHeight = isRotatedFeed ? 123 : 100;

              return (
                <div key={idx} className="flex flex-col items-center">
                  {/* 피드 방향 표시 배너 (프린터 헤드 출력 뷰일 때) */}
                  {previewMode === "printer_feed" && (
                    <div className="mb-2 flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full shadow-md animate-pulse">
                      <span>▲ Xprinter 롤용지 배출 방향 (실제 기계 인쇄 모습)</span>
                    </div>
                  )}

                  <div
                    className="relative transition-all duration-200 shadow-2xl rounded-xl bg-white overflow-hidden border-2 border-neutral-300"
                    style={{
                      width: `${containerWidth * zoom}mm`,
                      height: `${containerHeight * zoom}mm`,
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        width: `${containerWidth}mm`,
                        height: `${containerHeight}mm`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* printer_feed 모드인 경우: 전체를 회전시켜서 실제 인쇄 배출 모양을 렌더링 */}
                      {previewMode === "printer_feed" ? (
                        <div
                          style={{
                            width: "123mm",
                            height: "100mm",
                            position: "absolute",
                            left: isRotatedFeed ? "50%" : 0,
                            top: isRotatedFeed ? "50%" : 0,
                            transform: isRotatedFeed
                              ? `translate(-50%, -50%) rotate(${printRotation}deg)`
                              : `rotate(${printRotation}deg)`,
                            transformOrigin: "center center",
                          }}
                        >
                          {/* 종이 배경 (전용용지면 실물 템플릿) */}
                          {paperMode === "preprinted" && <CjPreprintedTemplateBackground />}

                          {/* 인쇄 내용 (오프셋 이동 반영) */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              transform: `translate(${offsetX}mm, ${offsetY}mm)`,
                              transformOrigin: "top left",
                            }}
                          >
                            <StandardCjLabel
                              item={item}
                              today={today}
                              maskName={maskName}
                              maskPhone={maskPhone}
                              senderName={senderName}
                              senderPhone={senderPhone}
                              senderAddr={senderAddr}
                              isPreprinted={paperMode === "preprinted"}
                              pageIndex={idx + 1}
                              totalPages={printList.length}
                            />
                          </div>
                        </div>
                      ) : (
                        /* roll_template 모드 (실제 롤용지 맞춤 대조 뷰) */
                        <div
                          style={{
                            width: "123mm",
                            height: "100mm",
                            position: "relative",
                          }}
                        >
                          {/* 1. 실제 CJ 롤용지 실물 도면 배경 */}
                          {paperMode === "preprinted" && <CjPreprintedTemplateBackground />}

                          {/* 2. 실제 인쇄될 검정 데이터 (오프셋 이동 반영) */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              transform: `translate(${offsetX}mm, ${offsetY}mm)`,
                              transformOrigin: "top left",
                              transition: "transform 0.1s ease-out",
                            }}
                          >
                            <StandardCjLabel
                              item={item}
                              today={today}
                              maskName={maskName}
                              maskPhone={maskPhone}
                              senderName={senderName}
                              senderPhone={senderPhone}
                              senderAddr={senderAddr}
                              isPreprinted={paperMode === "preprinted"}
                              pageIndex={idx + 1}
                              totalPages={printList.length}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 하단 치수 및 상태 배지 */}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-600 font-mono bg-white/80 px-3 py-1 rounded-full border border-neutral-200/80 shadow-2xs">
                    <span>
                      {previewMode === "printer_feed" && isRotatedFeed ? "100mm × 123mm (피드 배출 규격)" : "123mm × 100mm (가로 라벨 규격)"}
                    </span>
                    <span>•</span>
                    <span className={offsetX !== 0 || offsetY !== 0 ? "text-blue-600 font-bold" : "text-neutral-500"}>
                      위치 보정: X {offsetX > 0 ? `+${offsetX.toFixed(1)}` : offsetX.toFixed(1)}mm, Y {offsetY > 0 ? `+${offsetY.toFixed(1)}` : offsetY.toFixed(1)}mm
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">
                      회전: {printRotation}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 실제 인쇄(window.print) 시 브라우저에서 렌더링되는 완전 격리 Portal 영역 */}
      {mounted &&
        createPortal(
          <div id="cj-print-root">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @page {
                  size: 123mm 100mm landscape;
                  margin: 0 !important;
                }
                @media print {
                  html, body {
                    width: 123mm !important;
                    height: 100mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  /* body 직속 자식 중 인쇄 루트를 제외한 모든 요소를 은폐 */
                  body > *:not(#cj-print-root) {
                    display: none !important;
                  }
                  #cj-print-root, #cj-print-root * {
                    visibility: visible !important;
                  }
                  #cj-print-root {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 123mm !important;
                    height: 100mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background-color: #fff !important;
                  }
                  .cj-label-sheet {
                    width: 123mm !important;
                    height: 100mm !important;
                    max-height: 100mm !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                  }
                  .cj-label-sheet-break {
                    page-break-after: always !important;
                    break-after: page !important;
                  }
                  .cj-label-sheet-last {
                    page-break-after: auto !important;
                    break-after: auto !important;
                  }
                }
              `,
              }}
            />
            {printList.map((item, idx) => (
              <div
                key={idx}
                className={`cj-label-sheet ${
                  idx < printList.length - 1
                    ? "cj-label-sheet-break"
                    : "cj-label-sheet-last"
                }`}
              >
                <StandardCjLabel
                  item={item}
                  today={today}
                  maskName={maskName}
                  maskPhone={maskPhone}
                  senderName={senderName}
                  senderPhone={senderPhone}
                  senderAddr={senderAddr}
                  isPreprinted={paperMode === "preprinted"}
                  pageIndex={idx + 1}
                  totalPages={printList.length}
                />
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* 3. 다이렉트 고속 인쇄 캡처 전용 오프스크린 컨테이너 (실제 라벨 123mm x 100mm 100% 규격, translate 오프셋 적용) */}
      <div
        id="cj-direct-print-capture-container"
        aria-hidden="true"
        className="fixed pointer-events-none -z-50 overflow-hidden"
        style={{
          left: "-9999px",
          top: 0,
          width: "123mm",
          height: "100mm",
          backgroundColor: "#ffffff",
        }}
      >
        {printList.map((item, idx) => (
          <div
            key={`capture-${idx}`}
            id={`capture-label-sheet-${idx}`}
            style={{
              width: "123mm",
              height: "100mm",
              overflow: "hidden",
              backgroundColor: "#ffffff",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "123mm",
                height: "100mm",
                transform: `translate(${offsetX}mm, ${offsetY}mm)`,
                transformOrigin: "top left",
              }}
            >
              <StandardCjLabel
                item={item}
                today={today}
                maskName={maskName}
                maskPhone={maskPhone}
                senderName={senderName}
                senderPhone={senderPhone}
                senderAddr={senderAddr}
                isPreprinted={paperMode === "preprinted"}
                pageIndex={idx + 1}
                totalPages={printList.length}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 송장 인쇄 안내 가이드 팝업 */}
      {showKioskGuide && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>CJ 송장 라벨 인쇄 안내</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowKioskGuide(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 text-xs text-neutral-600 space-y-3 leading-relaxed">
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-900 space-y-1.5">
                <div className="font-bold text-sm">초이콤마 다이렉트 프린트 브릿지 (무인쇄창 고속 출력)</div>
                <p className="text-xs text-blue-800 leading-normal">
                  메인 PC에 초이콤마 다이렉트 프린트 브릿지(포트 18080)가 실행 중이면, 브라우저 인쇄 대화상자 없이 <strong>[즉시 인쇄]</strong> 클릭 즉시 <strong>Xprinter(XP-DT108B LABEL)</strong>로 0.5초 만에 직접 출력됩니다.
                </p>
                <div className="text-[11px] text-blue-700 font-medium">
                  • 상태: {bridgeStatus === "connected" ? "다이렉트 출력 연결됨 (정상 작동 중)" : "일반 브라우저 인쇄 모드로 대기 중"}
                </div>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 font-mono text-[11px] text-neutral-700 space-y-2">
                <div className="font-bold text-neutral-900 font-sans">일반 브라우저 인쇄 모드 안내:</div>
                <div>1. 다이렉트 브릿지가 꺼져 있거나 외부 기기(노트북 등)에서는 기본 브라우저 인쇄창이 호출됩니다.</div>
                <div>2. 인쇄창에서 대상을 <strong>Xprinter XP-DT108B LABEL</strong>, 여백을 <strong>없음</strong>으로 선택해 주세요.</div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowKioskGuide(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프린터 네트워크 IP 연결 설정 팝업 */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>라벨 프린터 PC 네트워크(IP) 설정</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHostModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-neutral-600">
              <p className="text-neutral-600 leading-relaxed">
                라벨 프린터(Xprinter)와 <strong>초이콤마 브릿지 프로그램</strong>이 실행 중인 컴퓨터의 IP 주소를 입력하세요. 같은 와이파이나 공유기에 연결되어 있다면 다른 PC에서도 즉시 다이렉트 출력이 가능합니다.
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                  프린터 PC IP 주소 또는 컴퓨터 이름 (포트: 18080)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempHost}
                    onChange={(e) => {
                      setTempHost(e.target.value);
                      setTestError(null);
                    }}
                    placeholder="예: localhost, 192.168.0.15 또는 DESKTOP-XXXX.local"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveHost(tempHost);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveHost(tempHost)}
                    disabled={testingHost || !tempHost.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                  >
                    {testingHost ? "연결 중..." : "연결/저장"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500 leading-normal">
                  💡 <strong>IP 변경 걱정 없는 팁:</strong> 공유기에서 IP가 자꾸 바뀐다면, IP 대신 프린터 PC의 <strong>컴퓨터 이름</strong>(예: <span className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded font-mono font-medium">DESKTOP-XXXX.local</span>)을 입력해두시면 IP가 바뀌어도 자동으로 추적되어 다시 설정할 필요가 없습니다.
                </p>
              </div>

              {/* 빠른 선택 버튼 */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">빠른 선택:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTempHost("localhost");
                      handleSaveHost("localhost");
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer ${
                      bridgeHost === "localhost" || bridgeHost === "127.0.0.1"
                        ? "bg-blue-50 border-blue-300 text-blue-700 font-bold"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    이 컴퓨터 (localhost)
                  </button>
                  {detectedIps.map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => {
                        setTempHost(ip);
                        handleSaveHost(ip);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer ${
                        bridgeHost === ip
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-bold"
                          : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 현재 상태 알림창 */}
              {bridgeStatus === "connected" && !testError && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>연결 성공 ({bridgeHost})</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • 프린터: {bridgePrinterName}
                    {machineName && ` • 컴퓨터: ${machineName}`}
                  </div>
                </div>
              )}

              {testError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] leading-relaxed">
                  <div className="font-bold mb-0.5">연결 실패</div>
                  <div>{testError}</div>
                  <div className="mt-1 text-rose-600 text-[10px]">
                    ※ 다른 컴퓨터에서 접속할 경우 프린터 컴퓨터의 방화벽에서 포트 18080 허용 또는 <code>node-bridge.js</code>가 실행 중인지 확인하세요.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsHostModalOpen(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CJ대한통운 1.5인치 표준운송장 규격 컴포넌트 (가로 123mm × 세로 100mm)
// 19개 가이드 항목 및 mm 단위 치수 100% 일치
// ─────────────────────────────────────────────────────────────────────────────
function StandardCjLabel({
  item,
  today,
  maskName,
  maskPhone,
  senderName,
  senderPhone,
  senderAddr,
  isPreprinted,
  pageIndex,
  totalPages,
}: {
  item: PrintData;
  today: string;
  maskName: (n: string) => string;
  maskPhone: (p: string) => string;
  senderName: string;
  senderPhone: string;
  senderAddr: string;
  isPreprinted: boolean;
  pageIndex: number;
  totalPages: number;
}) {
  let cleanTrack = (item.trackingNumber || "").trim();
  if (cleanTrack.toUpperCase().startsWith("MOCK")) {
    const seed = cleanTrack.replace(/[^0-9]/g, "").padEnd(8, "0").slice(0, 8);
    cleanTrack = `6892${seed}`;
  } else {
    cleanTrack = cleanTrack.replace(/[^0-9]/g, "");
  }
  if (cleanTrack.length < 12) {
    cleanTrack = (cleanTrack + "000000000000").slice(0, 12);
  } else if (cleanTrack.length > 12) {
    cleanTrack = cleanTrack.slice(0, 12);
  }
  const trackingRaw = cleanTrack;
  const trackingFormatted = `${trackingRaw.slice(0, 4)}-${trackingRaw.slice(4, 8)}-${trackingRaw.slice(8, 12)}`;

  // 5번 분류코드 바코드용 값 (CLSFCD + SUBCLSFCD)
  const blueCode =
    ((item.clsfCd || "") + (item.subClsfCd || "")).replace(
      /[^0-9A-Za-z]/g,
      ""
    ) || "00000000";

  // 6번 대분류코드 파싱 (첫 글자 밑줄 + 나머지)
  const clsfCdRaw = item.clsfCd || "4W44";
  const clsfFirstChar = clsfCdRaw.charAt(0);
  const clsfRemaining = clsfCdRaw.slice(1);
  const subClsfCd = item.subClsfCd || "-4g";

  // 10번 주소약칭 (아파트 동/호수 또는 건물명)
  const shortenedAddress =
    item.clsfAddr ||
    item.detailAddress ||
    item.address.split(" ").slice(-2).join(" ");

  // 18번 배달점소 - 별칭
  const deliveryBranch = item.clldlvBranNm || "대한통운";
  const empNickName = item.clldlvempNickNm || "A01-1구역";
  const deliveryBranchFull = `${deliveryBranch} - ${empNickName}`;

  // 19번 특수문자1 (권내배송코드)
  const p2pCode = item.p2pCd || "P1";

  // 테두리 및 배경 스타일 (전용용지 모드 시 테두리/배경 숨김)
  const borderClr = isPreprinted ? "transparent" : "#000000";
  const blueHeaderClr = isPreprinted ? "transparent" : "#0070c0";
  const blueTabBg = isPreprinted ? "transparent" : "#1e60a7";
  const lightBlueTabBg = isPreprinted ? "transparent" : "#5b9bd5";
  const badgeBg = isPreprinted ? "transparent" : "#1e60a7";
  const labelBg = isPreprinted ? "transparent" : "#ffffff";

  return (
    <div
      style={{
        width: "123mm",
        height: "100mm",
        maxWidth: "123mm",
        maxHeight: "100mm",
        boxSizing: "border-box",
        border: `1.5px solid ${borderClr}`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: labelBg,
        overflow: "hidden",
        fontFamily:
          "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#000000",
        margin: 0,
        padding: 0,
        position: "relative",
      }}
    >
      {/* ── ① 상단 헤더 영역 (높이: 10mm, 가로: 123mm) ──────────── */}
      <div
        style={{
          height: "10mm",
          minHeight: "10mm",
          maxHeight: "10mm",
          borderBottom: `1.5px solid ${blueHeaderClr}`,
          display: "flex",
          alignItems: "center",
          padding: "0 2mm",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 항목 1: 운송장번호 라벨 및 번호 (1번 위치 기준 통일: 전용용지는 라벨을 투명 처리하여 공간 유지) */}
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", marginRight: "3mm" }}>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: "900",
              color: isPreprinted ? "transparent" : "#0070c0",
              marginRight: "2mm",
              whiteSpace: "nowrap",
            }}
          >
            운송장번호
          </span>
          <span
            style={{
              fontSize: "12pt",
              fontWeight: "900",
              letterSpacing: "0.5px",
              color: "#000000",
              whiteSpace: "nowrap",
            }}
          >
            {trackingFormatted}
          </span>
        </div>

        {/* 항목 2: 접수일자 */}
        <span
          style={{
            fontSize: "8pt",
            fontWeight: "700",
            marginRight: "4mm",
            color: "#000000",
            whiteSpace: "nowrap",
          }}
        >
          {today}
        </span>

        {/* 항목 3: 출력매수 */}
        <span
          style={{
            fontSize: "8pt",
            fontWeight: "700",
            marginRight: "4mm",
            color: "#000000",
            whiteSpace: "nowrap",
          }}
        >
          {pageIndex}/{totalPages}
        </span>

        {/* 항목 4: 재출력여부 및 고객센터 번호 */}
        <div style={{ display: "flex", alignItems: "center", gap: "2mm", marginLeft: "auto", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "8pt", fontWeight: "700", color: "#000000" }}>
            {item.reprintYn ? `재출력:${item.reprintYn}` : ""}
          </span>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: "900",
              color: isPreprinted ? "transparent" : "#0070c0",
              whiteSpace: "nowrap",
            }}
          >
            CJ대한통운 1588-1255
          </span>
        </div>
      </div>

      {/* ── ② 분류코드 영역 (높이: 15mm, 가로: 123mm) ──────────── */}
      <div
        style={{
          height: "15mm",
          minHeight: "15mm",
          maxHeight: "15mm",
          borderBottom: `1.5px solid ${borderClr}`,
          display: "flex",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 항목 5: 분류코드 바코드 (CODE128A, 높이 15mm, 가로 25mm) */}
        <div
          style={{
            width: "25mm",
            minWidth: "25mm",
            maxWidth: "25mm",
            borderRight: `1px solid ${borderClr}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5mm",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "14mm",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Barcode
              value={blueCode}
              format="CODE128"
              displayValue={false}
              height={40}
              width={1.2}
              margin={0}
              background={isPreprinted ? "transparent" : "#ffffff"}
            />
          </div>
        </div>

        {/* 항목 6: 분류코드 (36pt + 53pt + 36pt, 첫 글자 밑줄) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            padding: "0 3mm",
            boxSizing: "border-box",
            overflow: "hidden",
            gap: "2mm",
            alignSelf: "center",
          }}
        >
          <span
            style={{
              fontSize: "34pt",
              fontWeight: "900",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              lineHeight: 0.9,
              letterSpacing: "-1px",
            }}
          >
            {clsfFirstChar}
          </span>
          <span
            style={{
              fontSize: "48pt",
              fontWeight: "900",
              lineHeight: 0.9,
              letterSpacing: "-1px",
            }}
          >
            {clsfRemaining}
          </span>
          <span
            style={{
              fontSize: "34pt",
              fontWeight: "900",
              lineHeight: 0.9,
              letterSpacing: "-1px",
              paddingBottom: "1mm",
            }}
          >
            {subClsfCd}
          </span>
        </div>

        {/* 항목 19: 특수문자1 (P1~P50, 30pt) & BV 마크 */}
        <div
          style={{
            width: "18mm",
            minWidth: "18mm",
            maxWidth: "18mm",
            borderLeft: `1px solid ${borderClr}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2mm",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: "24pt",
              fontWeight: "900",
              lineHeight: 1,
            }}
          >
            {p2pCode}
          </span>
          {!isPreprinted && <BvDiamondLogo />}
        </div>
      </div>

      {/* ── ③ 받는분 영역 (높이: 20mm, 가로: 123mm) ──────────── */}
      <div
        style={{
          height: "20mm",
          minHeight: "20mm",
          maxHeight: "20mm",
          borderBottom: `1.5px solid ${borderClr}`,
          display: "flex",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 받는분 세로 타이틀 탭 (폭 6mm) */}
        <div
          style={{
            width: "6mm",
            minWidth: "6mm",
            maxWidth: "6mm",
            backgroundColor: blueTabBg,
            color: isPreprinted ? "transparent" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: "7pt",
            fontWeight: "900",
            letterSpacing: "1.5px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          받는분
        </div>

        {/* 정보 영역: 3개 세부 행 (가로 117mm) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "1mm 3mm 0.5mm 3mm",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* 1행: 항목 7 (성명/전화 마스킹) + 항목 8 (운송장 바코드 5mm) */}
          <div
            style={{
              height: "5.5mm",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: "10pt",
                fontWeight: "900",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1,
              }}
            >
              {maskName(item.recipient)} {maskPhone(item.phone)}
            </div>
            {/* 상단 운송장 바코드 (높이 5mm) */}
            <div
              style={{
                width: "42mm",
                height: "5mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              <Barcode
                value={trackingRaw || "000000000000"}
                format="CODE128"
                displayValue={false}
                height={18}
                width={1.15}
                margin={0}
                background={isPreprinted ? "transparent" : "#ffffff"}
              />
            </div>
          </div>

          {/* 2행: 항목 9 (받는분 전체 주소) */}
          <div
            style={{
              fontSize: "9pt",
              fontWeight: "700",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.1,
              color: "#111111",
            }}
          >
            {item.address} {item.detailAddress}
          </div>

          {/* 3행: 항목 10 (주소약칭 24pt Extra Bold) */}
          <div
            style={{
              height: "8.5mm",
              display: "flex",
              alignItems: "flex-end",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: "22pt",
                fontWeight: "900",
                lineHeight: 0.95,
                letterSpacing: "-0.5px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
            >
              {shortenedAddress}
            </span>
          </div>
        </div>
      </div>

      {/* ── ④ 보내는분 영역 (높이: 7mm, 가로: 123mm) ──────────── */}
      <div
        style={{
          height: "7mm",
          minHeight: "7mm",
          maxHeight: "7mm",
          borderBottom: `1.5px solid ${borderClr}`,
          display: "flex",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 보내는분 세로 타이틀 탭 (폭 6mm) */}
        <div
          style={{
            width: "6mm",
            minWidth: "6mm",
            maxWidth: "6mm",
            backgroundColor: lightBlueTabBg,
            color: isPreprinted ? "transparent" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: "4.5pt",
            fontWeight: "900",
            letterSpacing: "1px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          보내는분
        </div>

        {/* 상호 / 전화 / 주소 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 3mm",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* 항목 11: 상호 및 전화번호 */}
          <div
            style={{
              display: "flex",
              gap: "3mm",
              fontSize: "7pt",
              fontWeight: "900",
              whiteSpace: "nowrap",
              overflow: "hidden",
              lineHeight: 1,
            }}
          >
            <span>{senderName}</span>
            <span>{senderPhone}</span>
          </div>
          {/* 항목 15: 보내는분 주소 */}
          <div
            style={{
              fontSize: "6pt",
              fontWeight: "600",
              color: "#333333",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.1,
              marginTop: "0.3mm",
            }}
          >
            {senderAddr}
          </div>
        </div>

        {/* 항목 12, 13, 14: 수량, 운임, 정산 뱃지 */}
        <div
          style={{
            width: "48mm",
            minWidth: "48mm",
            maxWidth: "48mm",
            borderLeft: `1px solid ${borderClr}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2mm",
            boxSizing: "border-box",
            overflow: "hidden",
            fontSize: "7.5pt",
          }}
        >
          {/* 수량 */}
          <div style={{ display: "flex", alignItems: "center", gap: "1mm" }}>
            <span
              style={{
                backgroundColor: badgeBg,
                color: isPreprinted ? "transparent" : "#ffffff",
                fontSize: "6pt",
                fontWeight: "900",
                padding: "0.3mm 1mm",
                borderRadius: "1px",
              }}
            >
              수량
            </span>
            <span style={{ fontWeight: "900", fontSize: "7.5pt" }}>극소 1</span>
          </div>

          {/* 운임 */}
          <div style={{ display: "flex", alignItems: "center", gap: "1mm" }}>
            <span
              style={{
                backgroundColor: badgeBg,
                color: isPreprinted ? "transparent" : "#ffffff",
                fontSize: "6pt",
                fontWeight: "900",
                padding: "0.3mm 1mm",
                borderRadius: "1px",
              }}
            >
              운임
            </span>
            <span style={{ fontWeight: "900", fontSize: "7.5pt" }}>0</span>
          </div>

          {/* 정산 */}
          <div style={{ display: "flex", alignItems: "center", gap: "1mm" }}>
            <span
              style={{
                backgroundColor: badgeBg,
                color: isPreprinted ? "transparent" : "#ffffff",
                fontSize: "6pt",
                fontWeight: "900",
                padding: "0.3mm 1mm",
                borderRadius: "1px",
              }}
            >
              정산
            </span>
            <span style={{ fontWeight: "900", fontSize: "7.5pt" }}>신용</span>
          </div>
        </div>
      </div>

      {/* ── ⑤ 상품 정보 및 하단 로고 영역 (높이: 33mm, 가로: 123mm) ── */}
      <div
        style={{
          height: "33mm",
          minHeight: "33mm",
          maxHeight: "33mm",
          borderBottom: `1.5px solid ${borderClr}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1.5mm 3mm 1mm 3mm",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 항목 16: 상품명 및 수량 */}
        <div
          style={{
            flex: 1,
            fontSize: "8.5pt",
            fontWeight: "700",
            lineHeight: 1.3,
            overflow: "hidden",
            wordBreak: "break-all",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "105mm" }}>
              {item.items || "초이콤마 프리미엄 상품 1개"}
            </span>
            <span style={{ fontWeight: "900", marginLeft: "2mm" }}>1</span>
          </div>
        </div>

        {/* 안내문구 및 브랜드 로고 밴드 */}
        <div
          style={{
            height: "10mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* 친환경 GRP 마크 */}
          <div style={{ display: "flex", alignItems: "center", gap: "2mm", flex: 1, overflow: "hidden" }}>
            {!isPreprinted && <GrpEcoLogo />}
          </div>

          {/* 눈꽃 심볼 + CJ ONE 브랜드 배너 */}
          {!isPreprinted && (
            <div style={{ display: "flex", alignItems: "center", gap: "2.5mm", flexShrink: 0 }}>
              <SnowflakeIcon />
              <CjOneBrandBanner />
            </div>
          )}
        </div>
      </div>

      {/* ── ⑥ 하단 배달점소 및 바코드 영역 (높이: 15mm, 가로: 123mm) ── */}
      <div
        style={{
          height: "15mm",
          minHeight: "15mm",
          maxHeight: "15mm",
          display: "flex",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: labelBg,
        }}
      >
        {/* 좌측 (폭 88mm): 배송메시지 + 배달점소-별칭 */}
        <div
          style={{
            width: "88mm",
            minWidth: "88mm",
            maxWidth: "88mm",
            padding: "1mm 3mm",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* 항목 17: 배송메세지 */}
          <div
            style={{
              fontSize: "8pt",
              fontWeight: "700",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "#111111",
            }}
          >
            {item.shippingMemo || "배송메시지입니다."}
          </div>

          {/* 항목 18: 배달점소 - 별칭 (18pt Extra Bold) */}
          <div
            style={{
              height: "9mm",
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              border: !isPreprinted ? "1px solid #ff4d4f" : "none",
              padding: "0 2mm",
              boxSizing: "border-box",
              borderRadius: "1px",
            }}
          >
            <span
              style={{
                fontSize: "18pt",
                fontWeight: "900",
                lineHeight: 1,
                letterSpacing: "-0.5px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "#000000",
              }}
            >
              {deliveryBranchFull}
            </span>
          </div>
        </div>

        {/* 우측 (폭 35mm): 항목 8 (운송장 바코드) + 숫자 */}
        <div
          style={{
            width: "35mm",
            minWidth: "35mm",
            maxWidth: "35mm",
            borderLeft: `1.5px solid ${borderClr}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5mm 1mm",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "9.5mm",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Barcode
              value={trackingRaw || "000000000000"}
              format="CODE128"
              displayValue={false}
              height={32}
              width={1.25}
              margin={0}
              background={isPreprinted ? "transparent" : "#ffffff"}
            />
          </div>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: "900",
              letterSpacing: "1px",
              lineHeight: 1,
              marginTop: "0.5mm",
              whiteSpace: "nowrap",
            }}
          >
            {trackingRaw || "000000000000"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CJ대한통운 가이드 전용 벡터 SVG 그래픽스
// ─────────────────────────────────────────────────────────────────────────────

// 1. BV (Blue Value) 다이아몬드 로고
function BvDiamondLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 40 40">
      <polygon points="20,2 38,20 20,38 2,20" fill="#0070c0" />
      <polygon points="20,5 35,20 20,35 5,20" fill="#ffffff" />
      <text
        x="20"
        y="25"
        fontSize="14"
        fontWeight="900"
        fontFamily="'Pretendard', -apple-system, sans-serif"
        fill="#0070c0"
        textAnchor="middle"
      >
        BV
      </text>
    </svg>
  );
}

// 2. 친환경 GRP 인증 마크
function GrpEcoLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="23" stroke="#90caf9" strokeWidth="2.5" fill="none" />
      <path
        d="M15 28 C15 18, 25 12, 35 16 C30 22, 28 32, 15 28 Z"
        fill="#a5d6a7"
        opacity="0.9"
      />
      <path
        d="M20 34 C24 30, 30 28, 38 28"
        stroke="#4caf50"
        strokeWidth="2"
        fill="none"
      />
      <text
        x="25"
        y="42"
        fontSize="9"
        fontWeight="bold"
        fill="#555"
        textAnchor="middle"
      >
        GRP
      </text>
    </svg>
  );
}

// 3. 신선/냉장 눈꽃 심볼
function SnowflakeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="23" fill="#fff9c4" stroke="#fbc02d" strokeWidth="1.5" />
      <g stroke="#1e88e5" strokeWidth="2.5" strokeLinecap="round">
        <line x1="25" y1="8" x2="25" y2="42" />
        <line x1="8" y1="25" x2="42" y2="25" />
        <line x1="13" y1="13" x2="37" y2="37" />
        <line x1="13" y1="37" x2="37" y2="13" />
        {/* 브랜치 */}
        <line x1="25" y1="12" x2="21" y2="16" />
        <line x1="25" y1="12" x2="29" y2="16" />
        <line x1="25" y1="38" x2="21" y2="34" />
        <line x1="25" y1="38" x2="29" y2="34" />
      </g>
    </svg>
  );
}

// 4. CJ ONE (오네) 공식 브랜드 배너
function CjOneBrandBanner() {
  return (
    <div
      style={{
        backgroundColor: "#1a5ea5",
        color: "#ffffff",
        padding: "1mm 2mm",
        borderRadius: "2px",
        display: "flex",
        alignItems: "center",
        gap: "1.5mm",
        height: "8mm",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.9 }}>
        <span style={{ fontSize: "7pt", fontWeight: "900", letterSpacing: "0.5px" }}>O·</span>
        <span style={{ fontSize: "7pt", fontWeight: "900", letterSpacing: "0.5px" }}>NE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: 1.1 }}>
        <span style={{ fontSize: "4.5pt", fontWeight: "600", opacity: 0.9 }}>
          모두를 위한 단 하나의 배송,
        </span>
        <span style={{ fontSize: "5.5pt", fontWeight: "900" }}>오네</span>
      </div>
    </div>
  );
}

// 5. 실제 CJ대한통운 전용 롤용지 1:1 실물 도면 배경 템플릿 (WYSIWYG 인쇄 위치 대조용)
export function CjPreprintedTemplateBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{
        width: "123mm",
        height: "100mm",
        backgroundColor: "#fdfbf7",
        fontFamily: "'Pretendard', sans-serif",
        boxSizing: "border-box",
        border: "1.5px solid #1a68b5",
      }}
    >
      {/* ── ① 상단 10mm: 파란 헤더선 & CJ 로고 ──────────── */}
      <div
        style={{
          height: "10mm",
          borderBottom: "1.5px solid #1a68b5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5mm",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
          <span style={{ fontSize: "7.5pt", fontWeight: "900", color: "#1a68b5" }}>
            운송장번호
          </span>
          <div style={{ width: "42mm", height: "5mm", border: "1px dashed #bfdbfe", borderRadius: "2px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
          <div style={{ display: "flex", gap: "1px" }}>
            <span style={{ width: "4px", height: "4px", backgroundColor: "#dc2626", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ width: "4px", height: "4px", backgroundColor: "#2563eb", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ width: "4px", height: "4px", backgroundColor: "#f59e0b", borderRadius: "50%", display: "inline-block" }} />
          </div>
          <span style={{ fontSize: "7.5pt", fontWeight: "900", color: "#1a68b5" }}>
            CJ대한통운 1588-1255
          </span>
        </div>
      </div>

      {/* ── ② 분류코드 15mm: 바코드구역 / 대분류 / 권내코드 ──────────── */}
      <div
        style={{
          height: "15mm",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ width: "25mm", borderRight: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "5pt", color: "#cbd5e1" }}>[바코드 128A]</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "65mm", height: "12mm", border: "1px dashed #f1f5f9", borderRadius: "3px" }} />
        </div>
        <div
          style={{
            width: "18mm",
            borderLeft: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "2mm",
          }}
        >
          <BvDiamondLogo />
        </div>
      </div>

      {/* ── ③ 받는분 20mm: 파란색 세로 탭 & 3단 구역 ──────────── */}
      <div
        style={{
          height: "20mm",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            width: "6mm",
            backgroundColor: "#1e60a7",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: "7pt",
            fontWeight: "900",
            letterSpacing: "1.5px",
            boxSizing: "border-box",
          }}
        >
          받는분
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1mm 3mm" }}>
          <div style={{ height: "5.5mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "6.5pt", color: "#94a3b8" }}>[성명 / 전화번호 영역]</span>
            <div style={{ width: "38mm", height: "4.5mm", border: "1px dashed #e2e8f0", borderRadius: "1px" }} />
          </div>
          <div style={{ height: "4mm", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "6.5pt", color: "#94a3b8" }}>[배송지 주소 영역]</span>
          </div>
          <div style={{ height: "7.5mm", display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: "7.5pt", color: "#3b82f6", fontWeight: "700" }}>[주소약칭 건물/동호수 표시 영역]</span>
          </div>
        </div>
      </div>

      {/* ── ④ 보내는분 7mm: 연파랑 세로 탭 ──────────── */}
      <div
        style={{
          height: "7mm",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            width: "6mm",
            backgroundColor: "#5b9bd5",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: "4.5pt",
            fontWeight: "900",
            letterSpacing: "1px",
            boxSizing: "border-box",
          }}
        >
          보내는분
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 3mm" }}>
          <span style={{ fontSize: "6pt", color: "#94a3b8" }}>주식회사 초이콤마 02-579-1171 (서울특별시 강남구 개포동 개포로22길 12, 6층)</span>
        </div>
      </div>

      {/* ── ⑤ 상품 및 오네 로고 33mm ──────────── */}
      <div
        style={{
          height: "33mm",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          position: "relative",
          backgroundColor: "#ffffff",
        }}
      >
        {/* 상단 탭: 수량, 운임, 정산 */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "1mm 3mm 0 0", gap: "2mm" }}>
          <span style={{ fontSize: "6pt", backgroundColor: "#1e60a7", color: "#fff", padding: "0.5mm 1.5mm", fontWeight: "bold", borderRadius: "1px" }}>
            수량
          </span>
          <span style={{ fontSize: "6pt", backgroundColor: "#1e60a7", color: "#fff", padding: "0.5mm 1.5mm", fontWeight: "bold", borderRadius: "1px" }}>
            운임
          </span>
          <span style={{ fontSize: "6pt", backgroundColor: "#1e60a7", color: "#fff", padding: "0.5mm 1.5mm", fontWeight: "bold", borderRadius: "1px" }}>
            정산
          </span>
          <span style={{ fontSize: "6.5pt", color: "#1e60a7", fontWeight: "bold" }}>신용</span>
        </div>

        {/* 중간 상품 리스트 배경 은은한 줄무늬 (실제 롤용지와 동일) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 4mm" }}>
          <div style={{ height: "7mm", backgroundColor: "#fef9ee", borderBottom: "1px dashed #f6ede0", opacity: 0.85 }} />
          <div style={{ height: "7mm", backgroundColor: "#ffffff" }} />
          <div style={{ height: "7mm", backgroundColor: "#fef9ee", opacity: 0.85 }} />
        </div>

        {/* 하단 친환경 로고 & O-NE 로고 & 배송안내문 */}
        <div
          style={{
            height: "8mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 3mm",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
            <GrpEcoLogo />
            <SnowflakeIcon />
            <span style={{ fontSize: "5pt", color: "#1e60a7", fontWeight: "600", letterSpacing: "-0.2px" }}>
              고객님(받는 분)의 소중한 상품을 안전하게 배송하겠습니다. 개인정보 유출우려가 있으니 운송장은 폐기바랍니다.
            </span>
          </div>
          <CjOneBrandBanner />
        </div>
      </div>

      {/* ── ⑥ 배달점소 15mm: 중구무교 박스 & 대형 바코드 ──────────── */}
      <div
        style={{
          height: "15mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3mm",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            width: "88mm",
            height: "12mm",
            border: "1.5px solid #dc2626",
            borderRadius: "2px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 2mm",
          }}
        >
          <span style={{ fontSize: "5pt", color: "#dc2626", fontWeight: "bold" }}>
            부재 시 문 앞에 놓아주세요. 파손주의
          </span>
          <span style={{ fontSize: "6.5pt", color: "#94a3b8" }}>[배달점소 - 집배원별칭]</span>
        </div>
        <div style={{ width: "35mm", height: "12mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "32mm", height: "9.5mm", border: "1px dashed #cbd5e1", borderRadius: "2px" }} />
        </div>
      </div>
    </div>
  );
}