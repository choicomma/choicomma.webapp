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
  Printer,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  Settings,
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printShipments, setPrintShipments] = useState<any[]>([]);
  const SHIPMENTS_PER_PAGE = 15;

  // Single label print
  const handleOpenSinglePrint = (shipment: any) => {
    setPrintShipments([shipment]);
    setIsPrintModalOpen(true);
  };

  // CNPlus Invoice Excel Upload Handler
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

        let updatedCount = 0;
        const updatedList = shipmentsList.map((ship) => {
          // Look for matching row by order ID / customer name / phone
          const matched = rows.find((row) => {
            const rowOrderNo = String(
              row["주문번호"] ||
              row["고객주문번호"] ||
              row["주문ID"] ||
              row["orderId"] ||
              row["id"] ||
              ""
            ).trim();

            const rowRecipient = String(
              row["받는분성명"] ||
              row["받는분"] ||
              row["수령인"] ||
              row["recipient"] ||
              ""
            ).trim();

            if (rowOrderNo && ship.orderId && String(ship.orderId).trim() === rowOrderNo) {
              return true;
            }
            if (rowOrderNo && ship.id && String(ship.id).trim() === rowOrderNo) {
              return true;
            }
            if (rowRecipient && ship.recipient && ship.recipient.trim() === rowRecipient) {
              return true;
            }
            return false;
          });

          if (matched) {
            const rawTracking = String(
              matched["운송장번호"] ||
              matched["송장번호"] ||
              matched["운송장"] ||
              matched["trackingNumber"] ||
              matched["운송장 번호"] ||
              ""
            ).replace(/[^0-9]/g, "");

            if (rawTracking && rawTracking.length >= 8) {
              updatedCount++;
              return {
                ...ship,
                carrier: "CJ대한통운",
                trackingNumber: rawTracking,
                status: "In Transit",
                shippedDate: new Date().toISOString().split("T")[0],
                estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
              };
            }
          }
          return ship;
        });

        setShipmentsList(updatedList);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_shipments", JSON.stringify(updatedList));
        }

        if (updatedCount > 0) {
          alert(`✅ CJ대한통운 로이스 파셀(LoIS Parcel) 송장 엑셀 업로드 완료!\n\n총 ${updatedCount}건의 주문에 운송장 번호가 등록되고 [배송 중]으로 자동 업데이트되었습니다.`);
        } else {
          alert("⚠️ 업로드된 엑셀에서 일치하는 주문번호 또는 운송장번호 열을 찾지 못했습니다.\n\n엑셀에 '주문번호'와 '운송장번호' 열이 포함되어 있는지 확인해 주세요.");
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
          className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ 수동 주문/배송 등록</span>
        </button>
      </div>

      {/* CNPlus Official Integration Banner */}
      <div className="bg-neutral-950 text-white rounded-2xl p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">표준 엑셀 연동 모드</h2>
            </div>
            <p className="text-xs text-neutral-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>① 배송준비 주문건을 <strong>CJ대한통운 접수용 엑셀로 다운로드</strong></span>
              <span>② CJ대한통운에서 송장 출력 후 <strong>'송장 엑셀 업로드'</strong>로 번호 일괄 반영</span>
            </p>
          </div>
        </div>

        {/* Action Buttons for Parcel Workflow */}
        <div className="flex items-center gap-2">
          {/* 접수 엑셀 다운로드 */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleExportCjExcel}
              className="bg-white hover:bg-neutral-100 text-neutral-950 p-2.5 rounded-xl text-xs flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border border-neutral-200"
              aria-label="접수 엑셀 다운로드"
            >
              <Download className="w-4 h-4 text-neutral-950" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
              <span className="relative z-10 p-2 text-[11px] font-bold leading-none text-white whitespace-nowrap bg-neutral-900 shadow-xl rounded-lg border border-neutral-700">
                접수 엑셀 다운로드
              </span>
              <div className="w-2 h-2 -mt-1 rotate-45 bg-neutral-900 border-r border-b border-neutral-700"></div>
            </div>
          </div>

          {/* 송장 엑셀 일괄 업로드 */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-neutral-850 hover:bg-neutral-800 text-white p-2.5 rounded-xl text-xs flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border border-neutral-700"
              aria-label="송장 엑셀 일괄 업로드"
            >
              <Upload className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
              <span className="relative z-10 p-2 text-[11px] font-bold leading-none text-white whitespace-nowrap bg-neutral-900 shadow-xl rounded-lg border border-neutral-700">
                송장 엑셀 일괄 업로드
              </span>
              <div className="w-2 h-2 -mt-1 rotate-45 bg-neutral-900 border-r border-b border-neutral-700"></div>
            </div>
          </div>

          {/* 웹 라벨 인쇄 */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                const target = filteredShipments.length > 0 ? filteredShipments : shipmentsList;
                setPrintShipments(target);
                setIsPrintModalOpen(true);
              }}
              className="bg-neutral-900 hover:bg-neutral-800 text-white p-2.5 rounded-xl text-xs border border-neutral-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95"
              aria-label="웹 라벨 인쇄"
            >
              <Printer className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
              <span className="relative z-10 p-2 text-[11px] font-bold leading-none text-white whitespace-nowrap bg-neutral-900 shadow-xl rounded-lg border border-neutral-700">
                웹 라벨 인쇄
              </span>
              <div className="w-2 h-2 -mt-1 rotate-45 bg-neutral-900 border-r border-b border-neutral-700"></div>
            </div>
          </div>

          {/* 배송 설정 */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsCjConfigModalOpen(true)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white p-2.5 rounded-xl text-xs border border-neutral-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95"
              aria-label="배송 및 택배사 환경설정"
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
              <span className="relative z-10 p-2 text-[11px] font-bold leading-none text-white whitespace-nowrap bg-neutral-900 shadow-xl rounded-lg border border-neutral-700">
                배송 및 환경설정
              </span>
              <div className="w-2 h-2 -mt-1 rotate-45 bg-neutral-900 border-r border-b border-neutral-700"></div>
            </div>
          </div>
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
                <th className="py-3.5 px-4 text-center min-w-[100px] whitespace-nowrap">송장 인쇄</th>
                <th className="py-3.5 px-4 text-right min-w-[80px] whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
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
                        {ship.trackingNumber && ship.trackingNumber !== "-" ? (
                          <a
                            href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${ship.trackingNumber.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-sky-600 hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                            title="CJ대한통운 공식 실시간 배송추적 열기"
                          >
                            {ship.trackingNumber}
                            <ExternalLink className="w-3 h-3 text-sky-500" />
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            미등록 (로이스 파셀 접수 대기)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${ship.status === "Delivered"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : ship.status === "In Transit"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${ship.status === "Delivered"
                            ? "bg-emerald-500"
                            : ship.status === "In Transit"
                              ? "bg-sky-500"
                              : "bg-amber-500"
                            }`}
                        />
                        {ship.status === "Delivered"
                          ? "배송 완료"
                          : ship.status === "In Transit"
                            ? "배송 중"
                            : "배송 준비 중"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenSinglePrint(ship)}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-300"
                        title="이 주문건의 택배 운송장 인쇄"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>송장 인쇄</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
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

      {/* CJ Logistics Shipping Label Print Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8 text-white max-h-[90vh] flex flex-col">
            {/* Modal Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-neutral-950 rounded-2xl shadow-sm">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">CJ대한통운 택배 운송장 인쇄</h3>
                  <p className="text-xs text-neutral-400">
                    선택된 총 <strong className="text-emerald-400 font-mono">{printShipments.length}</strong>건의 택배 운송장 미리보기
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ 인쇄 실행</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Label Scroll Container (Screen Preview) */}
            <div className="flex-1 overflow-y-auto space-y-6 p-2 bg-neutral-950/60 rounded-2xl border border-neutral-800/80">
              <div
                id="printable-shipping-labels"
                className="space-y-6 print-mode-preprinted"
              >
                {printShipments.map((ship, idx) => {
                  const trackingNo = ship.trackingNumber && ship.trackingNumber !== "-" ? ship.trackingNumber : "운송장 미부여";
                  return (
                    <div
                      key={ship.id || idx}
                      className="shipping-label-card bg-white text-neutral-950 p-4 rounded-xl border-2 border-blue-900 shadow-md font-sans text-xs max-w-[480px] mx-auto print:max-w-none print:w-[100mm] print:h-[150mm] print:m-0 print:p-3 print:border-none print:shadow-none print:break-after-page space-y-2 relative"
                    >
                      {/* Top Header Bar */}
                      <div className="border-b-2 border-blue-900 pb-1.5 flex items-center justify-between preprinted-border-bottom">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-900 text-white font-black text-xs px-2 py-0.5 rounded-sm preprinted-frame-element">
                            운송장번호
                          </span>
                          <span className="font-mono font-black text-sm text-neutral-950 tracking-wider preprinted-data-element">
                            {trackingNo}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-blue-900 text-sm preprinted-frame-element">CJ대한통운</span>
                          <span className="block text-[9px] text-neutral-500 font-mono preprinted-data-element">신용(계약)</span>
                        </div>
                      </div>

                      {/* Recipient & Sender Boxes Grid */}
                      <div className="grid grid-cols-1 gap-2">
                        {/* Receiver (To) */}
                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/70 preprinted-box">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-neutral-900 text-xs flex items-center gap-1 preprinted-frame-element">
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                              받는 분 (To)
                            </span>
                            <span className="text-[11px] font-bold text-neutral-800 font-mono preprinted-data-element">
                              {ship.phone || "010-0000-0000"}
                            </span>
                          </div>
                          <div className="text-sm font-black text-neutral-950 mb-0.5 preprinted-data-element">
                            {ship.recipient} <span className="text-xs font-normal text-neutral-500">고객님</span>
                          </div>
                          <div className="text-xs text-neutral-800 font-medium leading-tight preprinted-data-element">
                            {ship.address}
                          </div>
                        </div>

                        {/* Sender (From) */}
                        <div className="border border-neutral-200 rounded p-2 bg-white text-[11px] preprinted-box">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-neutral-700 preprinted-frame-element">보내는 분 (From)</span>
                            <span className="font-mono text-neutral-500 text-[10px] preprinted-data-element">TEL: 02-1588-0000</span>
                          </div>
                          <div className="font-bold text-neutral-900 preprinted-data-element">
                            주식회사 초이콤마 (choicomma)
                          </div>
                          <p className="text-[10px] text-neutral-600 truncate preprinted-data-element">
                            {typeof window !== "undefined" ? (localStorage.getItem("cj_sender_address") || "") : ""}
                          </p>
                        </div>
                      </div>

                      {/* Order Details & Delivery Message Section */}
                      <div className="border border-neutral-300 rounded p-2.5 space-y-1.5 bg-white preprinted-box">
                        <div className="flex items-center justify-between text-[10px] border-b border-neutral-200 pb-1 preprinted-border-bottom preprinted-data-element">
                          <span className="font-bold text-neutral-800 font-mono">주문번호: {ship.orderId || ship.id}</span>
                          <span className="text-neutral-500 font-mono">발송일: {ship.shippedDate || new Date().toISOString().split("T")[0]}</span>
                        </div>
                        <div className="font-bold text-xs text-neutral-900 preprinted-data-element">
                          📦 상품명: {ship.items || "choicomma 대표 상품"}
                        </div>
                        <div className="text-[10px] text-neutral-600 font-medium preprinted-data-element">
                          배송메시지: 부재 시 문 앞에 놓아주세요. (파손주의 / 안전배송)
                        </div>
                      </div>

                      {/* Bottom Footer Banner */}
                      <div className="border-t border-neutral-300 pt-1.5 flex items-center justify-between text-[9px] text-neutral-600 preprinted-frame-element">
                        <div className="flex items-center gap-1 max-w-[280px] leading-tight">
                          <span className="font-bold text-blue-900 shrink-0">🌿 Eco-Friendly</span>
                          <span>고객님(받는 분)의 소중한 상품을 안전하게 배송하겠습니다.</span>
                        </div>
                        <div className="bg-blue-950 text-white p-1 rounded font-black text-right shrink-0">
                          <div className="text-[10px] leading-none">O-NE</div>
                          <div className="text-[7px] font-normal leading-none mt-0.5">오네</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs text-neutral-400 shrink-0">
              <span>💡 팁: 라벨 프린터(100x150mm) 인쇄 설정 시 '여백 없음'을 선택해 주세요.</span>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Isolation Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-shipping-labels,
          #printable-shipping-labels * {
            visibility: visible;
          }
          #printable-shipping-labels {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
