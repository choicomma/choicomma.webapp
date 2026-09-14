"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Barcode from "react-barcode";

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
  const printTriggered = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (!printTriggered.current) {
      printTriggered.current = true;
      const timer = setTimeout(() => {
        printViaIframe();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

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
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 123mm !important;
      background: #ffffff !important;
      font-family: 'Noto Sans KR', 'Malgun Gothic', -apple-system, sans-serif !important;
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

  return (
    <>
      {/* 1. 화면 전용 미리보기 모달 UI */}
      <div className="fixed inset-0 z-[9999] bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center print:hidden p-4">
        <div className="bg-neutral-100 rounded-2xl shadow-2xl flex flex-col items-center max-h-[96vh] w-full max-w-4xl overflow-hidden border border-neutral-300">
          {/* Header Bar */}
          <div className="flex flex-wrap justify-between w-full items-center px-6 py-3 bg-white border-b border-neutral-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <h2 className="text-base font-bold text-neutral-900">
                  CJ대한통운 1.5인치 표준운송장 출력 ({printList.length}건)
                </h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                  가로 123mm × 세로 100mm (가로형)
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                CJ표준운송장 공식 가이드 도면 치수(가로 123mm × 세로 100mm) 100% 일치
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Paper Mode Toggle */}
              <div className="flex items-center bg-neutral-100 rounded-lg p-1 border border-neutral-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPaperMode("preprinted")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperMode === "preprinted"
                      ? "bg-white shadow text-neutral-900 font-bold"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  title="배경 서식을 제외하고 데이터만 출력 (CJ 전용 사전인쇄 롤용지용)"
                >
                  전용용지 모드
                </button>
                <button
                  type="button"
                  onClick={() => setPaperMode("blank")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperMode === "blank"
                      ? "bg-white shadow text-neutral-900 font-bold"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  title="서식 테두리와 로고를 모두 출력 (무지 라벨지/A4/PDF용)"
                >
                  무지용지 모드
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

              <button
                type="button"
                onClick={printViaIframe}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>인쇄하기</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>

          {/* Label Preview Scroll Area */}
          <div className="w-full flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6 bg-neutral-200/60">
            {printList.map((item, idx) => (
              <div
                key={idx}
                className="transition-transform duration-200 shadow-xl rounded-lg bg-white overflow-hidden border border-neutral-300"
                style={{
                  width: `${123 * zoom}mm`,
                  height: `${100 * zoom}mm`,
                  transformOrigin: "top center",
                }}
              >
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    width: "123mm",
                    height: "100mm",
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
        backgroundColor: "#ffffff",
        overflow: "hidden",
        fontFamily:
          "'Noto Sans KR', 'Malgun Gothic', -apple-system, sans-serif",
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
          backgroundColor: "#ffffff",
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
          backgroundColor: "#ffffff",
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
          backgroundColor: "#ffffff",
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
          backgroundColor: "#ffffff",
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
          backgroundColor: "#ffffff",
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
          backgroundColor: "#ffffff",
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
        fontFamily="sans-serif"
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