"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  CheckCircle2,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  AlertCircle,
  Settings,
  FileText,
  Printer,
} from "lucide-react";
import * as XLSX from "xlsx";

interface OrdersManagementProps {
  shipmentsList: any[];
  setShipmentsList: React.Dispatch<React.SetStateAction<any[]>>;
  shipmentSearchQuery: string;
  setShipmentSearchQuery: (val: string) => void;
  shipmentStatusFilter: string;
  setShipmentStatusFilter: (val: string) => void;
  shipmentCarrierFilter: string;
  setShipmentCarrierFilter: (val: string) => void;
  cjClientCode: string;
  cjContractNo: string;
  setIsAddShipmentModalOpen: (val: boolean) => void;
  setIsCjConfigModalOpen: (val: boolean) => void;
  handleIssueCjLogisticsTracking?: () => void;
  handleExportCjExcel: () => void;
  handleOpenEditShipment: (shipment: any) => void;
  handleDeleteShipment: (id: string) => void;
}

export function OrdersManagement({
  shipmentsList,
  setShipmentsList,
  shipmentSearchQuery,
  setShipmentSearchQuery,
  shipmentStatusFilter,
  setShipmentStatusFilter,
  shipmentCarrierFilter,
  setShipmentCarrierFilter,
  cjClientCode,
  cjContractNo,
  setIsAddShipmentModalOpen,
  setIsCjConfigModalOpen,
  handleExportCjExcel,
  handleOpenEditShipment,
  handleDeleteShipment,
}: OrdersManagementProps) {
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENTS_PER_PAGE = 15;

  // 주문서(거래명세서) 인쇄 모달 상태
  const [isOrderSheetModalOpen, setIsOrderSheetModalOpen] = useState(false);
  const [selectedOrderSheetShipment, setSelectedOrderSheetShipment] = useState<any | null>(null);

  const handleOpenOrderSheet = (ship: any) => {
    setSelectedOrderSheetShipment(ship);
    setIsOrderSheetModalOpen(true);
  };

  // 분할배송(다박스) 모달 상태
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitTargetShipment, setSplitTargetShipment] = useState<any | null>(null);
  const [splitItemRows, setSplitItemRows] = useState<Array<{ name: string; maxQty: number; splitQty: number; selected: boolean }>>([]);

  // 분할배송 모달 열기 — 이미 분할된 패키지가 있으면 박스 1 기준으로 파싱
  const handleOpenSplitModal = (ship: any) => {
    setSplitTargetShipment(ship);

    // 박스 1의 items 기준 파싱 (ship.items는 전체 합산이라 분할 후 재분할 시 틀릴 수 있음)
    const pkg1 = (ship.packages && ship.packages.length > 0) ? ship.packages[0] : null;
    const itemsRaw = pkg1 ? (pkg1.items || "") : (ship.items || "");
    const parsedRows: Array<{ name: string; maxQty: number; splitQty: number; selected: boolean }> = [];

    itemsRaw.split(/,\s*/).filter((t: string) => t.trim()).forEach((token: string) => {
      const trimmed = token.trim();
      if (!trimmed) return;
      const qtyMatch = trimmed.match(/(\d+)\s*개/) || trimmed.match(/x\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const cleanName = trimmed.replace(/\s*\d+\s*개$/, "").replace(/\s*x\s*\d+$/i, "").trim();
      parsedRows.push({ name: cleanName || trimmed, maxQty: qty || 1, splitQty: 1, selected: false });
    });

    if (parsedRows.length === 0) {
      parsedRows.push({
        name: itemsRaw || "주문 상품 1",
        maxQty: pkg1 ? (Number(pkg1.quantity) || 1) : (Number(ship.quantity) || 1),
        splitQty: 1,
        selected: false,
      });
    }

    setSplitItemRows(parsedRows);
    setIsSplitModalOpen(true);
  };

  // 분할배송 확정 — 수량 유효성 검사 후 패키지 분할 저장
  const handleConfirmSplitPackage = () => {
    if (!splitTargetShipment) return;

    const selectedToMove = splitItemRows.filter((r) => r.selected && r.splitQty > 0);
    if (selectedToMove.length === 0) {
      alert("2번 박스(새 패키지)로 분리하여 보낼 품목을 1개 이상 선택해 주세요.");
      return;
    }

    // 수량 유효성: splitQty >= maxQty 이면 박스 1이 빈 패키지가 됨
    const invalidRows = splitItemRows.filter((r) => r.selected && r.splitQty >= r.maxQty);
    if (invalidRows.length > 0) {
      const names = invalidRows.map((r) => `"${r.name}" (전체 ${r.maxQty}개 중 ${r.splitQty}개 분할)`).join("\n");
      alert(`❌ 분할 수량 오류:\n아래 품목은 2번 박스 수량이 전체 수량과 같거나 초과하여, 1번 박스에 남을 수량이 0개가 됩니다.\n\n${names}\n\n최소 1개는 1번 박스에 남겨야 합니다.`);
      return;
    }

    const pkg1Items: string[] = [];
    let pkg1TotalQty = 0;
    const pkg2Items: string[] = [];
    let pkg2TotalQty = 0;

    splitItemRows.forEach((r) => {
      const moveQty = r.selected ? Math.min(r.splitQty, r.maxQty - 1) : 0;
      const remainQty = r.maxQty - moveQty;
      if (remainQty > 0) { pkg1Items.push(`${r.name} ${remainQty}개`); pkg1TotalQty += remainQty; }
      if (moveQty > 0) { pkg2Items.push(`${r.name} ${moveQty}개`); pkg2TotalQty += moveQty; }
    });

    if (pkg1Items.length === 0) {
      alert("모든 상품을 2번 박스로 보낼 수 없습니다. 적어도 1개 이상의 상품은 1번 박스에 남아있어야 합니다.");
      return;
    }

    const currentPkgs = (splitTargetShipment.packages && splitTargetShipment.packages.length > 0)
      ? splitTargetShipment.packages
      : [{
          id: `PKG-${String(Date.now()).slice(-4)}-1`,
          pkgIndex: 1,
          items: splitTargetShipment.items,
          quantity: splitTargetShipment.quantity || 1,
          carrier: splitTargetShipment.carrier || "CJ대한통운",
          trackingNumber: splitTargetShipment.trackingNumber || "-",
          status: splitTargetShipment.status || "Pending",
        }];

    const nextPkgIndex = currentPkgs.length + 1;
    const newPackage1 = { ...currentPkgs[0], items: pkg1Items.join(", "), quantity: pkg1TotalQty || 1 };
    const newPackage2 = {
      id: `PKG-${String(Date.now()).slice(-4)}-${nextPkgIndex}`,
      pkgIndex: nextPkgIndex,
      items: pkg2Items.join(", "),
      quantity: pkg2TotalQty || 1,
      carrier: splitTargetShipment.carrier || "CJ대한통운",
      trackingNumber: "-",
      status: "Pending",
    };

    const newPackagesList = [newPackage1, newPackage2, ...currentPkgs.slice(1)];

    // 패키지 상태 기반 주문 전체 상태 재계산
    const anyTransit = newPackagesList.some((p) => (p.trackingNumber && p.trackingNumber !== "-") || p.status === "In Transit");
    const allTransitWithTracking = newPackagesList.every((p) => p.trackingNumber && p.trackingNumber !== "-");
    let newOrderStatus = "Pending";
    if (newPackagesList.every((p) => p.status === "Delivered")) newOrderStatus = "Delivered";
    else if (allTransitWithTracking) newOrderStatus = "In Transit";
    else if (anyTransit) newOrderStatus = "Partially Shipped";

    const updatedShipments = shipmentsList.map((s) =>
      s.id === splitTargetShipment.id ? { ...s, packages: newPackagesList, status: newOrderStatus } : s
    );

    setShipmentsList(updatedShipments);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_shipments", JSON.stringify(updatedShipments));
      window.dispatchEvent(new CustomEvent("storage"));
    }

    setIsSplitModalOpen(false);
    setSplitTargetShipment(null);
    alert(`📦 [${splitTargetShipment.orderId}] 배송 건이 ${newPackagesList.length}개의 박스(패키지)로 분리되었습니다.`);
  };



  // CJ LoIS Invoice Excel Upload Handler (CJ대한통운 건별 출력데이터 상세 및 표준 엑셀 완벽 지원)
  const handleUploadInvoiceExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert("엑셀 파일에 데이터가 비어있습니다.");
          return;
        }

        // 엑셀 행 데이터 정규화 (주문번호, 운송장번호, 수령인)
        const parsedRows = rows.map((row) => {
          let orderNo = "";
          let trackingNo = "";
          let recipientName = "";
          let phoneNo = "";

          for (const [k, v] of Object.entries(row)) {
            const kc = String(k || "").replace(/\s+/g, "");
            const vs = String(v ?? "").trim();
            if (!vs) continue;

            // 1. 주문번호 식별 (우선순위: 고객주문번호 > 주문번호 > 기타)
            if (kc.includes("고객주문번호") || kc === "주문번호" || kc.includes("주문번호") || kc.includes("주문ID") || kc.toLowerCase().includes("orderid") || kc.toLowerCase().includes("order_id")) {
              if (!orderNo || kc.includes("고객주문번호") || kc === "주문번호") {
                orderNo = vs;
              }
            }

            // 2. 운송장번호 식별 (전화번호, 우편번호, 주문번호 열 제외)
            if (
              !kc.includes("전화번호") &&
              !kc.includes("연락처") &&
              !kc.includes("우편번호") &&
              !kc.includes("주문번호") &&
              !kc.includes("고객주문") &&
              !kc.includes("일자")
            ) {
              if (
                kc.includes("운송장") ||
                kc.includes("송장") ||
                kc.toLowerCase().includes("tracking") ||
                kc.includes("원송장") ||
                kc.includes("등기번호") ||
                kc.includes("배송번호")
              ) {
                const digits = vs.replace(/[^0-9]/g, "");
                if (digits.length >= 8) {
                  trackingNo = vs; // 하이픈 유지 (예: 6002-2271-0913)
                }
              }
            }

            // 3. 수령인 식별
            if (kc === "받는분" || kc.includes("받는분성명") || kc.includes("수령인") || kc.includes("수하인")) {
              recipientName = vs;
            } else if (!recipientName && (kc.includes("받는분") || kc === "고객명" || kc.includes("성명"))) {
              recipientName = vs;
            }

            // 4. 연락처 식별
            if (kc.includes("받는분전화") || kc.includes("받는분연락처") || kc.includes("휴대폰") || kc.includes("전화번호")) {
              phoneNo = vs.replace(/[^0-9]/g, "");
            }
          }

          return {
            orderNo: orderNo.trim(),
            trackingNo: trackingNo.trim(),
            recipientName: recipientName.trim(),
            phoneNo,
            raw: row,
          };
        }).filter((r) => r.trackingNo && r.trackingNo.replace(/[^0-9]/g, "").length >= 8);

        if (parsedRows.length === 0) {
          alert("⚠️ 엑셀 파일에서 유효한 '운송장번호'(8자리 이상)를 찾을 수 없습니다.\n\nCJ대한통운 LoIS의 '건별 출력데이터 상세' 파일 또는 운송장번호가 포함된 엑셀인지 확인해 주세요.");
          return;
        }

        let updatedPackageCount = 0;
        const updatedList = shipmentsList.map((ship) => {
          const currentPkgs = (ship.packages && ship.packages.length > 0)
            ? [...ship.packages]
            : [
                {
                  id: `${ship.id}-1`,
                  pkgIndex: 1,
                  items: ship.items,
                  quantity: ship.quantity || 1,
                  carrier: ship.carrier || "CJ대한통운",
                  trackingNumber: ship.trackingNumber || "-",
                  status: ship.status || "Pending",
                },
              ];

          let isShipmentModified = false;

          const updatedPackages = currentPkgs.map((pkg: any) => {
            const shipOrder = String(ship.orderId || "").trim();
            const shipId = String(ship.id || "").trim();
            const shipRecip = String(ship.recipient || "").trim();
            const shipPhone = String(ship.phone || "").replace(/[^0-9]/g, "");

            // 패키지별 접미사 패턴 (-1, _S1, _1)
            const sfx1 = `-${pkg.pkgIndex}`;
            const sfx2 = `_S${pkg.pkgIndex}`;
            const sfx3 = `_${pkg.pkgIndex}`;

            // 파싱된 행 중 가장 일치하는 항목 찾기
            const matchedRow = parsedRows.find((row) => {
              if (row.orderNo) {
                // 1. 접미사 포함 정확 매칭 (분할 배송 패키지)
                if (
                  row.orderNo === `${shipOrder}${sfx1}` ||
                  row.orderNo === `${shipOrder}${sfx2}` ||
                  row.orderNo === `${shipOrder}${sfx3}` ||
                  row.orderNo === `${shipId}${sfx1}` ||
                  row.orderNo === `${shipId}${sfx2}`
                ) {
                  return true;
                }
                // 2. 단일 패키지이거나 첫 번째 박스인 경우 베이스 주문번호 매칭
                if (row.orderNo === shipOrder || row.orderNo === shipId) {
                  if (currentPkgs.length === 1 || pkg.pkgIndex === 1) return true;
                }
              }

              // 3. 수령인 + 연락처 폴백 매칭 (단일 박스 주문에 한함)
              if (currentPkgs.length === 1 && row.recipientName && shipRecip && (row.recipientName === shipRecip || shipRecip.includes(row.recipientName))) {
                if (!row.phoneNo || !shipPhone || row.phoneNo === shipPhone || shipPhone.includes(row.phoneNo)) {
                  return true;
                }
              }

              return false;
            });

            if (matchedRow && matchedRow.trackingNo) {
              isShipmentModified = true;
              updatedPackageCount++;
              return {
                ...pkg,
                carrier: "CJ대한통운",
                trackingNumber: matchedRow.trackingNo,
                status: "In Transit" as const,
              };
            }

            return pkg;
          });

          if (isShipmentModified) {
            const totalPkgs = updatedPackages.length;
            const validPkgs = updatedPackages.filter((p: any) => p.trackingNumber && p.trackingNumber !== "-" && p.trackingNumber.replace(/[^0-9]/g, "").length >= 8);
            const allDelivered = updatedPackages.every((p: any) => p.status === "Delivered");

            let orderStatus = "Pending";
            if (allDelivered) orderStatus = "Delivered";
            else if (validPkgs.length === totalPkgs) orderStatus = "In Transit";
            else if (validPkgs.length > 0) orderStatus = "Partially Shipped";

            return {
              ...ship,
              carrier: "CJ대한통운",
              trackingNumber: validPkgs.map((p: any) => p.trackingNumber).join(", ") || "-",
              status: orderStatus,
              packages: updatedPackages,
              shippedDate: new Date().toISOString().split("T")[0],
              estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
            };
          }

          return ship;
        });

        setShipmentsList(updatedList);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_shipments", JSON.stringify(updatedList));
          window.dispatchEvent(new CustomEvent("storage"));
        }

        if (updatedPackageCount > 0) {
          alert(`✅ 운송장 번호 일괄 등록 성공!\n\n총 ${updatedPackageCount}개 박스(패키지)에 운송장 번호가 등록되었으며, 주문 상태가 [배송중] 또는 [부분배송중]으로 자동 갱신되었습니다.`);
        } else {
          alert("⚠️ 업로드된 파일의 주문번호/수령인 정보와 일치하는 배송 대기 주문을 찾지 못했습니다.\n\n주문번호(-1, -2 접미사 포함)가 관리자 주문 목록과 일치하는지 확인해 주세요.");
        }

      } catch (err) {
        console.error("Failed to parse invoice excel:", err);
        alert("엑셀 파일 분석 중 오류가 발생했습니다. 정상적인 엑셀(.xlsx/.xls) 파일인지 확인해 주세요.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredShipments = React.useMemo(() => {
    return shipmentsList.filter((s) => {
      const q = shipmentSearchQuery.toLowerCase();
      const matchesSearch =
        s.recipient?.toLowerCase().includes(q) ||
        s.orderId?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.trackingNumber?.includes(q) ||
        s.address?.toLowerCase().includes(q);
      const matchesStatus = shipmentStatusFilter === "all" || s.status === shipmentStatusFilter;
      const matchesCarrier = shipmentCarrierFilter === "all" || s.carrier === shipmentCarrierFilter;
      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [shipmentsList, shipmentSearchQuery, shipmentStatusFilter, shipmentCarrierFilter]);

  const totalShipmentPages = Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE) || 1;
  const paginatedShipments = React.useMemo(() => {
    const start = (shipmentPage - 1) * SHIPMENTS_PER_PAGE;
    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);
  }, [filteredShipments, shipmentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for Invoice Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadInvoiceExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-neutral-900" />
            주문 및 배송 통합 관리
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            고객 주문 내역 수집, CJ대한통운 엑셀 연동, 운송장 일괄 등록 및 배송 현황 통합 관리
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddShipmentModalOpen(true)}
          className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>수동등록</span>
        </button>
      </div>

      {/* CNPlus Official Integration Banner */}
      <div className="bg-neutral-950 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-neutral-800">
        {/* Left: Action Buttons for Parcel Workflow */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 접수 엑셀 다운로드 */}
          <button
            type="button"
            onClick={handleExportCjExcel}
            className="bg-white hover:bg-neutral-100 text-neutral-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-neutral-200"
          >
            <Download className="w-4 h-4 text-neutral-950" />
            <span>택배사 접수용 다운로드</span>
          </button>

          {/* 송장 엑셀 일괄 업로드 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-neutral-600"
          >
            <Upload className="w-4 h-4 text-white" />
            <span>송장 엑셀 일괄 등록</span>
          </button>

          {/* 배송 설정 */}
          <button
            type="button"
            onClick={() => setIsCjConfigModalOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white p-2.5 rounded-xl text-xs border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
            title="배송 및 환경설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Step Guide */}
        <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>① 배송준비 주문건을 <strong>CJ대한통운 접수용 엑셀로 다운로드</strong></span>
          <span>② CJ대한통운에서 송장 출력 후 <strong>'송장 엑셀 업로드'</strong>로 번호 일괄 반영</span>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>전체 주문/배송 건수</span>
            <ShoppingBag className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2" suppressHydrationWarning>
            {shipmentsList.length.toLocaleString()} 건
          </p>
          <p className="text-xs text-neutral-500 mt-1">스토어 전체 주문 통합 관리</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 대기 / 발송 준비</span>
            <Package className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "Pending").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-neutral-600 font-bold mt-1">접수 대기 목록</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 중 (In Transit)</span>
            <TrendingUp className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "In Transit").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-neutral-600 font-bold mt-1">송장 등록 및 배송 진행 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 완료 (Delivered)</span>
            <CheckCircle2 className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "Delivered").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-neutral-600 font-bold mt-1">고객 인수 완료</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="수령인, 주문번호, 운송장번호, 배송지 주소 검색..."
              value={shipmentSearchQuery}
              onChange={(e) => setShipmentSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
          </div>

          {(shipmentSearchQuery || shipmentStatusFilter !== "all" || shipmentCarrierFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setShipmentSearchQuery("");
                setShipmentStatusFilter("all");
                setShipmentCarrierFilter("all");
              }}
              className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
          <span className="text-xs font-bold text-neutral-500 mr-1">진행 상태:</span>
          {[
            { id: "all", label: "전체 상태" },
            { id: "Pending", label: "배송 준비 중" },
            { id: "Partially Shipped", label: "부분배송중" },
            { id: "In Transit", label: "배송 중" },
            { id: "Delivered", label: "배송 완료" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setShipmentStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${shipmentStatusFilter === st.id
                ? "bg-neutral-950 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
                }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integrated Orders & Shipments Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4 min-w-[110px] whitespace-nowrap">주문/배송번호</th>
                <th className="py-3.5 px-4 min-w-[180px]">수령인 / 배송지 주소</th>
                <th className="py-3.5 px-4 min-w-[120px]">주문 상품</th>
                <th className="py-3.5 px-4 min-w-[140px]">택배사 / 운송장 번호</th>
                <th className="py-3.5 px-4 min-w-[100px] whitespace-nowrap">진행 상태</th>
                <th className="py-3.5 px-4 text-right min-w-[80px] whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    검색 조건에 해당되는 주문/배송 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((ship) => (
                  <tr key={ship.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div>
                        <p className="font-extrabold text-neutral-950 text-xs font-mono">
                          {ship.orderId}
                        </p>
                        <span className="text-[10px] text-neutral-600 font-mono">
                          {ship.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-neutral-950 text-xs">
                          {ship.recipient}
                          <span className="ml-1.5 font-normal text-neutral-600 text-[11px] font-mono">
                            ({ship.phone})
                          </span>
                        </p>
                        <p className="text-xs text-neutral-600 truncate max-w-[220px] mt-0.5" title={ship.address}>
                          {ship.address}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-xs text-neutral-800 line-clamp-1">
                        {ship.items}
                      </p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">{ship.carrier}</span>
                        {/* 분리배송 패키지별 운송장 표시 */}
                        {(ship.packages && ship.packages.length > 1) ? (
                          <div className="space-y-1 mt-0.5">
                            {ship.packages.map((pkg: any, pi: number) => (
                              <div key={pi} className="flex items-center gap-1">
                                <span className="text-[10px] font-mono font-bold text-neutral-500">박스{pkg.pkgIndex || (pi+1)}:</span>
                                {pkg.trackingNumber && pkg.trackingNumber !== "-" ? (
                                  <a href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${pkg.trackingNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-sky-600 hover:underline font-bold inline-flex items-center gap-0.5">
                                    {pkg.trackingNumber}<ExternalLink className="w-2.5 h-2.5 text-sky-500" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-mono text-amber-600 font-bold">미등록</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          ship.trackingNumber && ship.trackingNumber !== "-" ? (
                            <a href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${ship.trackingNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-sky-600 hover:underline font-bold inline-flex items-center gap-1 mt-0.5" title="CJ대한통운 공식 실시간 배송추적 열기">
                              {ship.trackingNumber}<ExternalLink className="w-3 h-3 text-sky-500" />
                            </a>
                          ) : (
                            <span className="text-xs font-mono text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              미등록 (로이스 파셀 접수 대기)
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          ship.status === "Delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ship.status === "In Transit"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : ship.status === "Partially Shipped"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ship.status === "Delivered"
                              ? "bg-emerald-500"
                              : ship.status === "In Transit"
                                ? "bg-sky-500"
                                : ship.status === "Partially Shipped"
                                  ? "bg-orange-500"
                                  : "bg-amber-500"
                          }`}
                        />
                        {ship.status === "Delivered"
                          ? "배송 완료"
                          : ship.status === "In Transit"
                            ? "배송 중"
                            : ship.status === "Partially Shipped"
                              ? "부분배송중"
                              : "배송 준비 중"}
                      </span>
                      {ship.packages && ship.packages.length > 1 && (
                        <span className="block text-[10px] text-purple-600 font-bold mt-0.5">
                          📦 {ship.packages.length}개 박스 분리배송
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* 주문서 출력 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleOpenOrderSheet(ship)}
                          className="p-1.5 rounded-xl text-sky-700 hover:bg-sky-50 border border-sky-200 transition-colors cursor-pointer shrink-0"
                          title="주문서 (거래명세서 / 출고지시서) 인쇄"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {/* 배송 분할 (다박스) 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleOpenSplitModal(ship)}
                          disabled={ship.status === "Delivered"}
                          className="p-1.5 rounded-xl text-purple-700 hover:bg-purple-50 border border-purple-200 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="배송 분할 (다박스 출고 설정)"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditShipment(ship)}
                          className="p-1.5 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer shrink-0"
                          title="운송장 번호 직접 입력 / 배송 상태 변경"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(ship.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
                          title="배송/주문 건 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            총 {filteredShipments.length.toLocaleString()}건 중 {filteredShipments.length > 0 ? ((shipmentPage - 1) * SHIPMENTS_PER_PAGE + 1).toLocaleString() : 0} - {Math.min(shipmentPage * SHIPMENTS_PER_PAGE, filteredShipments.length).toLocaleString()}건 표시 중
          </span>
          {totalShipmentPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={shipmentPage === 1}
                onClick={() => setShipmentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                이전
              </button>
              <span className="font-extrabold text-neutral-950 px-2 font-mono">
                {shipmentPage} / {totalShipmentPages} 페이지
              </span>
              <button
                type="button"
                disabled={shipmentPage >= totalShipmentPages}
                onClick={() => setShipmentPage((prev) => Math.min(totalShipmentPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PACKAGE SPLIT MODAL (배송 분할 모달) */}
      {isSplitModalOpen && splitTargetShipment && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950">배송 분할 (다박스 출고 설정)</h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    주문: {splitTargetShipment.orderId} ({splitTargetShipment.recipient}님)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsSplitModalOpen(false); setSplitTargetShipment(null); }}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-neutral-600 leading-relaxed bg-purple-50/70 p-3.5 rounded-2xl border border-purple-100 font-medium">
                💡 <strong>새로운 2번 박스(패키지)</strong>로 분리하여 따로 출고할 품목과 수량을 체크/입력해 주세요. 분할 완료 시 LoIS 접수 엑셀에 <code>{splitTargetShipment.orderId}-1</code>, <code>{splitTargetShipment.orderId}-2</code>로 1행씩 고유 분리 추출됩니다.
              </p>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                <label className="font-extrabold text-neutral-900 block">주문 품목 분할 선택</label>
                {splitItemRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      row.selected ? "bg-purple-50/50 border-purple-300 shadow-2xs" : "bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => {
                          const updated = [...splitItemRows];
                          updated[idx] = { ...updated[idx], selected: e.target.checked };
                          setSplitItemRows(updated);
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-neutral-300 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-neutral-950 text-xs">{row.name}</p>
                        <p className="text-[11px] text-neutral-500">주문 총 수량: {row.maxQty}개 (최대 {row.maxQty - 1}개 분할 가능)</p>
                      </div>
                    </label>

                    {row.selected && (
                      <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-neutral-200">
                        <span className="text-[11px] font-bold text-neutral-600">2번 박스 수량:</span>
                        <input
                          type="number"
                          min="1"
                          max={row.maxQty - 1}
                          value={row.splitQty}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(row.maxQty - 1, parseInt(e.target.value) || 1));
                            const updated = [...splitItemRows];
                            updated[idx] = { ...updated[idx], splitQty: val };
                            setSplitItemRows(updated);
                          }}
                          className="w-12 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-neutral-950 focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-[11px] font-bold text-neutral-500">개</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => { setIsSplitModalOpen(false); setSplitTargetShipment(null); }}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmSplitPackage}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Package className="w-4 h-4 text-white" />
                <span>2개 박스로 배송 분할 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER SHEET MODAL (주문서 / 거래명세서 출력 모달) */}
      {isOrderSheetModalOpen && selectedOrderSheetShipment && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Top Action Bar (화면 전용 컨트롤) */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-neutral-800 rounded-xl">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">주문서 / 거래명세표 출력</h3>
                  <p className="text-xs text-neutral-400 font-mono">주문번호: {selectedOrderSheetShipment.orderId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContent = document.getElementById("printable-order-sheet");
                    if (!printContent) {
                      window.print();
                      return;
                    }

                    // 숨겨진 iframe을 생성하여 주문서 영역만 깨끗하게 단독 인쇄
                    const iframe = document.createElement("iframe");
                    iframe.style.position = "fixed";
                    iframe.style.right = "0";
                    iframe.style.bottom = "0";
                    iframe.style.width = "0";
                    iframe.style.height = "0";
                    iframe.style.border = "0";
                    document.body.appendChild(iframe);

                    const doc = iframe.contentWindow?.document;
                    if (!doc) {
                      window.print();
                      return;
                    }

                    // 현재 페이지의 모든 스타일시트 복사
                    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
                      .map((el) => el.outerHTML)
                      .join("\n");

                    doc.open();
                    doc.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>주문확인서_${selectedOrderSheetShipment.orderId}</title>
                          ${styles}
                          <style>
                            @page {
                              size: A4 portrait;
                              margin: 12mm 15mm;
                            }
                            html, body {
                              margin: 0 !important;
                              padding: 0 !important;
                              height: 100% !important;
                              background: white !important;
                              color: #111 !important;
                              -webkit-print-color-adjust: exact !important;
                              print-color-adjust: exact !important;
                            }
                            #printable-order-sheet {
                              padding: 0 !important;
                              margin: 0 !important;
                              width: 100% !important;
                              max-width: 100% !important;
                              min-height: calc(297mm - 24mm) !important;
                              display: flex !important;
                              flex-direction: column !important;
                              justify-content: space-between !important;
                              box-sizing: border-box !important;
                            }
                          </style>
                        </head>
                        <body>
                          <div id="printable-order-sheet">
                            ${printContent.innerHTML}
                          </div>
                        </body>
                      </html>
                    `);
                    doc.close();

                    setTimeout(() => {
                      iframe.contentWindow?.focus();
                      iframe.contentWindow?.print();
                      setTimeout(() => {
                        document.body.removeChild(iframe);
                      }, 1000);
                    }, 250);
                  }}
                  className="bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ 인쇄하기 (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOrderSheetModalOpen(false); setSelectedOrderSheetShipment(null); }}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Order Sheet Document Area */}
            <div className="p-6 md:p-8 overflow-y-auto bg-white flex-1 text-neutral-900 flex flex-col justify-between min-h-[750px] print:min-h-[265mm]" id="printable-order-sheet">
              {/* TOP CONTENT WRAPPER */}
              <div className="space-y-4">
                {/* Document Header - Large CHOICOMMA Text in Arial Medium */}
                <div className="border-b-2 border-neutral-950 pb-4">
                  {/* Full-width Large CHOICOMMA Text Header */}
                  <div className="text-center py-2.5 mb-3 border-b border-neutral-200">
                    <span
                      style={{
                        fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
                        fontWeight: 500,
                        letterSpacing: "0.22em",
                      }}
                      className="block text-4xl sm:text-5xl uppercase text-neutral-950 leading-none"
                    >
                      CHOICOMMA
                    </span>
                    <p className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase mt-1.5 font-mono">
                      PREMIUM SIGNATURE COLLECTION
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-neutral-500">주문번호:</span>
                      <span className="font-mono font-black text-neutral-950 text-base">{selectedOrderSheetShipment.orderId}</span>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg sm:text-xl font-black text-neutral-950 tracking-tight border-b-2 border-neutral-950 pb-0.5 inline-block">
                        주 문 확 인 서
                      </h2>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                        (ORDER CONFIRMATION & PACKING LIST)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer & Shipping Information */}
                <div className="border border-neutral-300 rounded-2xl p-4 bg-neutral-50/60 text-xs shadow-2xs">
                  <h4 className="font-black text-neutral-950 border-b border-neutral-200 pb-1.5 mb-2.5 flex items-center justify-between text-xs">
                    <span>주문자 / 받는 분 정보 (Buyer & Shipping Information)</span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                      {selectedOrderSheetShipment.status === "Delivered" ? "배송완료" : selectedOrderSheetShipment.status === "In Transit" ? "배송중" : selectedOrderSheetShipment.status === "Partially Shipped" ? "부분배송중" : "배송준비"}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                    <p><strong className="text-neutral-600">받는분 성명:</strong> <strong className="text-neutral-950 font-extrabold text-sm">{selectedOrderSheetShipment.recipient}</strong> 고객님</p>
                    <p><strong className="text-neutral-600">연락처:</strong> <span className="font-mono font-bold text-neutral-900">{selectedOrderSheetShipment.phone || "010-0000-0000"}</span> {selectedOrderSheetShipment.altPhone ? `(비상: ${selectedOrderSheetShipment.altPhone})` : ""}</p>
                    <p className="sm:col-span-2"><strong className="text-neutral-600">배송지 주소:</strong> <span className="text-neutral-900">{selectedOrderSheetShipment.address} {selectedOrderSheetShipment.detailAddress || ""}</span></p>
                    <p className="sm:col-span-2"><strong className="text-neutral-600">배송 요청사항:</strong> <span className="text-neutral-900">{selectedOrderSheetShipment.shippingMemo || "부재시 문앞에 놓아주세요."}</span></p>
                  </div>
                </div>

                {/* Shipping & Box Status (출고 및 택배 배송 현황) */}
                <div className="border border-neutral-300 rounded-2xl p-4 bg-white text-xs shadow-2xs">
                  <h4 className="font-black text-neutral-950 mb-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-purple-600" />
                      <span>출고 및 택배 배송 현황</span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {(selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 1)
                        ? `총 ${selectedOrderSheetShipment.packages.length}개 분할 박스 출고`
                        : "단일 1박스 출고"}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {(selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 0
                      ? selectedOrderSheetShipment.packages
                      : [{
                          pkgIndex: 1,
                          items: selectedOrderSheetShipment.items,
                          quantity: selectedOrderSheetShipment.quantity || 1,
                          carrier: selectedOrderSheetShipment.carrier || "CJ대한통운",
                          trackingNumber: selectedOrderSheetShipment.trackingNumber || "-",
                          status: selectedOrderSheetShipment.status,
                        }]
                    ).map((pkg: any, idx: number) => {
                      const boxNum = pkg.pkgIndex || idx + 1;
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200 gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white font-black text-xs font-mono shrink-0 shadow-2xs">
                              박스 {boxNum}번
                            </span>
                            <span className="font-bold text-neutral-900 text-xs sm:text-sm">{pkg.items}</span>
                          </div>
                          <div className="flex items-center gap-3 text-right shrink-0 text-xs sm:text-sm">
                            <span className="font-bold text-neutral-600">{pkg.carrier || "CJ대한통운"}</span>
                            <span className="font-mono font-bold text-neutral-950">
                              {pkg.trackingNumber && pkg.trackingNumber !== "-" ? pkg.trackingNumber : "순차 발송"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items Table with Product Thumbnails */}
                <div className="overflow-hidden rounded-2xl border border-neutral-300 text-xs shadow-2xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-white font-bold text-xs">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">No.</th>
                        <th className="py-3 px-4">주문 상품명 / 옵션</th>
                        <th className="py-3 px-3.5 text-center w-16">수량</th>
                        <th className="py-3 px-3.5 text-center w-24">배송 구분</th>
                        <th className="py-3 px-3.5 text-right w-20">검수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {String(selectedOrderSheetShipment.items || "")
                        .split(/,\s*/)
                        .filter((t) => t.trim())
                        .map((itemToken, i) => {
                          const qtyMatch = itemToken.match(/(\d+)\s*개/) || itemToken.match(/x\s*(\d+)/i);
                          const qty = qtyMatch ? qtyMatch[1] : "1";
                          const cleanName = itemToken.replace(/\s*\d+\s*개$/, "").replace(/\s*x\s*\d+$/i, "").trim();

                          // 상품별 맞춤 썸네일 이미지 매핑
                          const getThumb = (name: string) => {
                            const n = name.toLowerCase();
                            if (n.includes("재킷") || n.includes("자켓") || n.includes("jacket")) return "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("블라우스") || n.includes("blouse")) return "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("셔츠") || n.includes("shirt")) return "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("슬랙스") || n.includes("팬츠") || n.includes("바지") || n.includes("slacks")) return "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("스커트") || n.includes("skirt")) return "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("원피스") || n.includes("드레스") || n.includes("dress")) return "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("코트") || n.includes("coat")) return "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("니트") || n.includes("knit") || n.includes("스웨터")) return "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("스카프") || n.includes("머플러") || n.includes("벨트")) return "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=160&auto=format&fit=crop&q=80";
                            return "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=160&auto=format&fit=crop&q=80";
                          };

                          const thumbUrl = getThumb(cleanName || itemToken);

                          // 어떤 박스에 포함되어 있는지 확인
                          let assignedBoxText = "기본출고";
                          if (selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 1) {
                            const matchedPkg = selectedOrderSheetShipment.packages.find((p: any) =>
                              String(p.items || "").includes(cleanName) || cleanName.includes(String(p.items || ""))
                            );
                            if (matchedPkg) {
                              assignedBoxText = `박스 ${matchedPkg.pkgIndex}번`;
                            } else {
                              assignedBoxText = "분리출고";
                            }
                          }

                          return (
                            <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="py-3 px-3.5 text-center font-mono text-neutral-500 font-bold">{i + 1}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 shadow-2xs">
                                    <img
                                      src={thumbUrl}
                                      alt={cleanName}
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-neutral-950 text-xs sm:text-sm leading-tight">{cleanName || itemToken}</p>
                                    <span className="text-[10px] text-neutral-500 font-mono">단품코드: CHOI-ITEM-{String(i + 1).padStart(3, "0")}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-bold text-neutral-950 text-sm">{qty}개</td>
                              <td className="py-3 px-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${assignedBoxText.includes("박스") ? "bg-purple-100 text-purple-800" : "bg-neutral-100 text-neutral-700"}`}>
                                  {assignedBoxText}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <span className="inline-block w-4 h-4 border border-neutral-400 rounded-xs"></span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM FOOTER SECTION */}
              <div className="pt-4 mt-2">
                {/* Notice & Footer */}
                <div className="border-t border-neutral-200 pt-3 text-[10px] text-neutral-500 space-y-1">
                  <p>• 초이콤마(choicomma)를 이용해 주셔서 진심으로 감사드립니다.</p>
                  <p>• 상품 수령 후 7일 이내 교환/반품 접수가 가능하며, 포장 개봉 및 상품 훼손 시 교환/반품이 제한될 수 있습니다.</p>
                  <p>• 분리배송(다박스) 건의 경우 부피 또는 물류 상황에 따라 박스별 배송 도착 시간에 차이가 발생할 수 있습니다.</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-neutral-500">💡 [🖨️ 인쇄하기] 버튼을 누르면 인쇄 미리보기 창이 열립니다.</span>
              <button
                type="button"
                onClick={() => { setIsOrderSheetModalOpen(false); setSelectedOrderSheetShipment(null); }}
                className="px-5 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Isolation for Order Sheet */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        @media print {
          html, body {
            background: white !important;
            height: 100% !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-order-sheet,
          #printable-order-sheet * {
            visibility: visible !important;
          }
          #printable-order-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
