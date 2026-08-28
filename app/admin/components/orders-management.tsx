"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Truck,
  Settings,
  Package,
  TrendingUp,
  CheckCircle2,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  Printer,
  X,
} from "lucide-react";

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
  handleIssueCjLogisticsTracking: () => void;
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
  handleIssueCjLogisticsTracking,
  handleExportCjExcel,
  handleOpenEditShipment,
  handleDeleteShipment,
}: OrdersManagementProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [shipmentPage, setShipmentPage] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printShipments, setPrintShipments] = useState<any[]>([]);
  const SHIPMENTS_PER_PAGE = 15;

  const handleOpenSinglePrint = (shipment: any) => {
    setPrintShipments([shipment]);
    setIsPrintModalOpen(true);
  };

  const handleIssueSingleCjTracking = async (shipment: any) => {
    try {
      const res = await fetch("/api/admin/shipping/cj-logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_tracking", shipments: [shipment] }),
      });
      const data = await res.json();
      if (data.success && data.shipments && data.shipments.length > 0) {
        const issued = data.shipments[0];
        setShipmentsList((prev) =>
          prev.map((s) => (s.id === issued.id ? issued : s))
        );
      } else {
        alert(data.message || "CJ대한통운 연동 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("CJ대한통운 API 통신 오류가 발생했습니다.");
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-sky-600" />
            주문 및 배송 통합 관리
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            고객 주문 내역, CJ대한통운 API 연동, 운송장 발급 및 배송 상태(발송준비/배송중/배송완료) 통합 관리
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddShipmentModalOpen(true)}
          className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>+ 신규 주문/배송건 등록</span>
        </button>
      </div>

      {/* CJ Logistics Integration Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">CJ대한통운 (CJ Logistics) API 실시간 연동 시스템</h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ● API 연동 정상 (Active)
              </span>
            </div>
            <p className="text-xs text-sky-200/80 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
              <span>고객사코드: <strong className="text-white">{cjClientCode}</strong></span>
              <span>계약고객번호: <strong className="text-white">{cjContractNo}</strong></span>
              <span>출고물류센터: <strong className="text-white">choicomma 남대문센터</strong></span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCjConfigModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            title="CJ대한통운 API 설정"
          >
            <Settings className="w-4 h-4 text-sky-200" />
            <span>⚙️ CJ대한통운 API 연동 설정</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>전체 주문/배송 건수</span>
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2" suppressHydrationWarning>
            {shipmentsList.length.toLocaleString()} 건
          </p>
          <p className="text-xs text-neutral-500 mt-1">스토어 전체 주문 통합 관리</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 대기 / 발송 준비</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "Pending").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-amber-700 font-bold mt-1">운송장 등록 대기 목록</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 중 (In Transit)</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-sky-600 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "In Transit").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-sky-700 font-bold mt-1">실시간 배송 진행 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 완료 (Delivered)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2" suppressHydrationWarning>
            {shipmentsList.filter((s) => s.status === "Delivered").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-emerald-700 font-bold mt-1">고객 인수 완료</p>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                shipmentStatusFilter === st.id
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
                <th className="py-3.5 px-4 text-center min-w-[120px] whitespace-nowrap">운송장 발급</th>
                <th className="py-3.5 px-4 text-center min-w-[110px] whitespace-nowrap">송장 인쇄</th>
                <th className="py-3.5 px-4 text-right min-w-[80px] whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
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
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{ship.id}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                          {ship.recipient}
                          <span className="text-xs text-neutral-500 font-normal font-mono">({ship.phone})</span>
                        </p>
                        <p className="text-[11px] text-neutral-500 font-sans mt-0.5 truncate max-w-[220px]" title={ship.address}>
                          {ship.address}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-neutral-800 font-medium max-w-[180px] truncate" title={ship.items}>
                      {ship.items}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">{ship.carrier}</span>
                        {ship.carrier === "CJ대한통운" || ship.trackingNumber?.startsWith("68") ? (
                          <a
                            href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${ship.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-sky-600 hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                            title="CJ대한통운 공식 실시간 배송추적 열기"
                          >
                            {ship.trackingNumber}
                            <ExternalLink className="w-3 h-3 text-sky-500" />
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-neutral-600 font-semibold">{ship.trackingNumber}</span>
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
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ship.status === "Delivered"
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
                        onClick={() => handleIssueSingleCjTracking(ship)}
                        className="bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="이 주문건의 CJ대한통운 운송장 번호 발급"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>운송장 발급</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenSinglePrint(ship)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
                          title="운송장 번호 / 택배사 / 배송 상태 변경"
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
                  const trackingNo = ship.trackingNumber || `68${Math.floor(1000000000 + Math.random() * 9000000000)}`;
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
                            {trackingNo.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 preprinted-frame-element">
                          <span className="font-black text-blue-900 text-xs tracking-tighter">CJ대한통운</span>
                          <span className="font-mono font-bold text-xs text-blue-900">1588-1255</span>
                        </div>
                      </div>

                      {/* Destination Terminal Classification Box */}
                      <div className="bg-neutral-100/90 border border-neutral-300 rounded p-2 flex items-center justify-between preprinted-box">
                        <div>
                          <div className="text-[9px] text-neutral-500 font-bold preprinted-frame-element">도착지 터미널 / 분류코드</div>
                          <div className="text-lg font-black text-neutral-950 font-mono tracking-tight preprinted-data-element">
                            서울종로 A-02 [3B]
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-blue-950 text-white text-[10px] font-black px-2 py-0.5 rounded preprinted-frame-element">
                            타권역일반
                          </span>
                        </div>
                      </div>

                      {/* Recipient & Sender Vertical Tab Table Section */}
                      <div className="border border-neutral-300 rounded overflow-hidden preprinted-box">
                        {/* Recipient Row */}
                        <div className="flex border-b border-neutral-300 min-h-[64px] preprinted-border-bottom">
                          <div className="bg-blue-900 text-white font-black text-[11px] w-6 flex items-center justify-center text-center p-1 leading-tight shrink-0 preprinted-frame-element">
                            받는분
                          </div>
                          <div className="p-2 flex-1 space-y-0.5 bg-yellow-50/40 preprinted-bg">
                            <p className="font-black text-sm text-neutral-950 leading-snug break-keep preprinted-data-element">
                              {ship.address || "서울 종로구 청계천로 123 choicomma 물류센터"}
                            </p>
                            <p className="font-bold text-xs text-neutral-800 flex items-center justify-between pt-0.5 preprinted-data-element">
                              <span>성명: <strong>{ship.recipient || "고객님"}</strong></span>
                              <span className="font-mono text-[11px]">TEL: {ship.phone || "010-0000-0000"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Sender Row */}
                        <div className="flex">
                          <div className="bg-blue-900 text-white font-black text-[11px] w-6 flex items-center justify-center text-center p-1 leading-tight shrink-0 preprinted-frame-element">
                            보내는분
                          </div>
                          <div className="p-2 flex-1 space-y-1 bg-white preprinted-bg">
                            <div className="flex items-center justify-between text-[10px] preprinted-data-element">
                              <span className="font-bold text-neutral-900">주식회사 초이콤마 (고객사: {cjClientCode})</span>
                              <span className="font-mono">TEL: 02-1588-0000</span>
                            </div>
                            <p className="text-[10px] text-neutral-600 truncate preprinted-data-element">
                              서울 중구 남대문로 81 choicomma 물류센터 (계약번호: {cjContractNo})
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-1 border-t border-neutral-200 text-[10px] preprinted-border-top">
                              <span className="bg-blue-900 text-white px-1.5 py-0.2 font-bold rounded-xs preprinted-frame-element">수량: 1</span>
                              <span className="bg-blue-900 text-white px-1.5 py-0.2 font-bold rounded-xs preprinted-frame-element">운임: 신용</span>
                              <span className="bg-blue-900 text-white px-1.5 py-0.2 font-bold rounded-xs preprinted-frame-element">정산: 선불</span>
                            </div>
                          </div>
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

                        {/* Barcode graphic */}
                        <div className="pt-2 text-center preprinted-data-element">
                          <div className="flex items-center justify-center gap-0.5 h-9 px-2">
                            {[2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1].map((w, i) => (
                              <div
                                key={i}
                                className="bg-neutral-950 h-full"
                                style={{ width: `${w * 1.8}px` }}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[10px] text-neutral-600 font-bold block mt-0.5">
                            *{trackingNo}*
                          </span>
                        </div>
                      </div>

                      {/* Bottom Footer Banner (Matching physical O-NE sticker) */}
                      <div className="border-t border-neutral-300 pt-1.5 flex items-center justify-between text-[9px] text-neutral-600 preprinted-frame-element">
                        <div className="flex items-center gap-1 max-w-[280px] leading-tight">
                          <span className="font-bold text-blue-900 shrink-0">🌿 Eco-Friendly</span>
                          <span>고객님(받는 분)의 소중한 상품을 안전하게 배송하겠습니다. 운송장은 폐기바랍니다.</span>
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 font-bold text-xs text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-black text-xs text-neutral-950 transition-colors cursor-pointer shadow-md"
                >
                  🖨️ 인쇄 실행
                </button>
              </div>
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
          .shipping-label-card {
            page-break-after: always;
            break-after: page;
            margin: 0 auto;
            border: none !important;
            box-shadow: none !important;
          }
          /* Preprinted mode CSS rule: Hide preprinted frame background/text elements when printing on pre-printed sticker paper */
          .print-mode-preprinted .preprinted-frame-element {
            visibility: hidden !important;
            opacity: 0 !important;
            border-color: transparent !important;
            background: transparent !important;
          }
          .print-mode-preprinted .preprinted-bg {
            background: transparent !important;
          }
          .print-mode-preprinted .preprinted-box {
            border-color: transparent !important;
          }
          .print-mode-preprinted .preprinted-border-bottom {
            border-bottom-color: transparent !important;
          }
          .print-mode-preprinted .preprinted-border-top {
            border-top-color: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
