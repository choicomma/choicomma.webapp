"use client";

import React, { useState } from "react";
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
  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENTS_PER_PAGE = 15;

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
            onClick={handleIssueCjLogisticsTracking}
            className="bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span>🚀 CJ대한통운 운송장 일괄 자동 발급</span>
          </button>
          <button
            type="button"
            onClick={handleExportCjExcel}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
          >
            <span>📥 e-Flex 엑셀 다운로드</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCjConfigModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-bold p-2 rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
            title="CJ대한통운 API 설정"
          >
            <Settings className="w-4 h-4 text-sky-200" />
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
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{shipmentsList.length.toLocaleString()} 건</p>
          <p className="text-xs text-neutral-500 mt-1">스토어 전체 주문 통합 관리</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 대기 / 발송 준비</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            {shipmentsList.filter((s) => s.status === "Pending").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-amber-700 font-bold mt-1">운송장 등록 대기 목록</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 중 (In Transit)</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-sky-600 mt-2">
            {shipmentsList.filter((s) => s.status === "In Transit").length.toLocaleString()} 건
          </p>
          <p className="text-xs text-sky-700 font-bold mt-1">실시간 배송 진행 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>배송 완료 (Delivered)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
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
                <th className="py-3.5 px-5">주문/배송번호</th>
                <th className="py-3.5 px-5">수령인 / 배송지 주소</th>
                <th className="py-3.5 px-5">주문 상품</th>
                <th className="py-3.5 px-5">택배사 / 운송장 번호</th>
                <th className="py-3.5 px-5">발송일 / 배송예정일</th>
                <th className="py-3.5 px-5">진행 상태</th>
                <th className="py-3.5 px-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    검색 조건에 해당되는 주문/배송 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((ship) => (
                  <tr key={ship.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-extrabold text-neutral-950 text-xs font-mono">
                          {ship.orderId}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{ship.id}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                          {ship.recipient}
                          <span className="text-xs text-neutral-500 font-normal font-mono">({ship.phone})</span>
                        </p>
                        <p className="text-[11px] text-neutral-500 font-sans mt-0.5 truncate max-w-[240px]" title={ship.address}>
                          {ship.address}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-neutral-800 font-medium max-w-[200px] truncate" title={ship.items}>
                      {ship.items}
                    </td>
                    <td className="py-4 px-5">
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
                    <td className="py-4 px-5 text-xs text-neutral-500 font-mono">
                      <p>발송: {ship.shippedDate}</p>
                      <p className="text-[11px] text-neutral-400">예정: {ship.estimatedDelivery}</p>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
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
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditShipment(ship)}
                          className="p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                          title="운송장 번호 / 택배사 / 배송 상태 변경"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(ship.id)}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
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
    </div>
  );
}
