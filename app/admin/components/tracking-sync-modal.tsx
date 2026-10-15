"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Calendar,
  Sparkles,
  Check,
  Package,
} from "lucide-react";

export interface SyncItem {
  shipmentId: string;
  orderId: string;
  recipient: string;
  trackingNumber: string;
  carrier: string;
  currentStatus: string;
  newStatus: string;
  stateId: string;
  stateText: string;
  isDelivered: boolean;
  deliveredAt: string | null;
  location: string;
  description: string;
  shippedDate?: string;
  itemsSummary?: string;
}

interface TrackingSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentsList: any[];
  onApplySync: (deliveredShipmentIds: string[]) => Promise<void>;
  triggerToast?: (msg: string) => void;
}

export function TrackingSyncModal({
  isOpen,
  onClose,
  shipmentsList,
  onApplySync,
  triggerToast,
}: TrackingSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "delivered" | "in_transit">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  // 현재 배송 중(In Transit / Partially Shipped) 대상 선별
  const targetShipments = useMemo(() => {
    return shipmentsList.filter((s) => {
      const hasTracking =
        s.trackingNumber &&
        s.trackingNumber !== "-" &&
        s.trackingNumber.replace(/[^0-9]/g, "").length >= 8;
      return hasTracking && (s.status === "In Transit" || s.status === "Partially Shipped");
    });
  }, [shipmentsList]);

  // 실시간 택배사 전산 조회 함수
  const runSync = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shipping/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onlyInTransit: true,
          maxItems: 150,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        // 병합: 기존 shipment 정보와 결합
        const shipMap = new Map(shipmentsList.map((s) => [String(s.id), s]));
        const merged: SyncItem[] = data.results.map((r: any) => {
          const original = shipMap.get(String(r.shipmentId));
          return {
            ...r,
            shippedDate: original?.shippedDate || original?.orderDate || "",
            itemsSummary: original?.items || "",
          };
        });

        setSyncItems(merged);
        setHasScanned(true);

        // 배송완료로 감지된 항목들 자동 체크
        const autoDeliveredIds = new Set(
          merged.filter((m) => m.isDelivered).map((m) => m.shipmentId)
        );
        setSelectedIds(autoDeliveredIds);

        if (triggerToast) {
          triggerToast(
            `택배사 조회 완료: 배송완료 ${data.deliveredCount}건 / 이동중 ${data.inTransitCount}건`
          );
        }
      } else {
        alert(data.error || "배송 조회에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Tracking sync error:", err);
      alert("배송현황 조회 중 통신 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 자동 조회 시작
  useEffect(() => {
    if (isOpen) {
      setHasScanned(false);
      setSearchQuery("");
      setActiveTab("all");
      runSync();
    }
  }, [isOpen]);

  // 통계 계산
  const deliveredCount = useMemo(
    () => syncItems.filter((i) => i.isDelivered).length,
    [syncItems]
  );
  const inTransitCount = useMemo(
    () => syncItems.filter((i) => !i.isDelivered).length,
    [syncItems]
  );

  // 탭 및 검색어 필터링
  const filteredItems = useMemo(() => {
    return syncItems.filter((item) => {
      if (activeTab === "delivered" && !item.isDelivered) return false;
      if (activeTab === "in_transit" && item.isDelivered) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.recipient.toLowerCase().includes(q) ||
        item.trackingNumber.includes(q) ||
        item.orderId.toLowerCase().includes(q) ||
        (item.itemsSummary && item.itemsSummary.toLowerCase().includes(q))
      );
    });
  }, [syncItems, activeTab, searchQuery]);

  // 전체 선택 / 해제 토글
  const handleToggleSelectAll = () => {
    if (filteredItems.every((item) => selectedIds.has(item.shipmentId))) {
      // 모두 선택되어 있으면 현재 필터 항목들 해제
      const next = new Set(selectedIds);
      filteredItems.forEach((i) => next.delete(i.shipmentId));
      setSelectedIds(next);
    } else {
      // 현재 필터 항목들 모두 선택
      const next = new Set(selectedIds);
      filteredItems.forEach((i) => next.add(i.shipmentId));
      setSelectedIds(next);
    }
  };

  // 3일 이상 경과된 주문 일괄 선택
  const handleSelectOlderThan3Days = () => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const next = new Set(selectedIds);
    let addedCount = 0;

    syncItems.forEach((item) => {
      if (item.shippedDate) {
        const shippedTime = new Date(item.shippedDate).getTime();
        if (now - shippedTime >= threeDaysMs) {
          next.add(item.shipmentId);
          addedCount++;
        }
      }
    });

    setSelectedIds(next);
    if (triggerToast) {
      triggerToast(`출고 3일 이상 경과된 주문 ${addedCount}건이 선택되었습니다.`);
    }
  };

  // 배송완료 적용 실행
  const handleApply = async () => {
    if (selectedIds.size === 0) {
      alert("배송완료로 변경할 주문을 최소 1건 이상 선택해 주세요.");
      return;
    }

    if (
      !window.confirm(
        `선택하신 ${selectedIds.size}건의 주문 상태를 '배송 완료'로 일괄 변경하시겠습니까?\n\n변경 후 고객 주문조회 화면에도 즉시 '배송 완료'로 노출됩니다.`
      )
    ) {
      return;
    }

    setIsApplying(true);
    try {
      await onApplySync(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error("Apply sync error:", err);
      alert("배송 상태 반영 중 오류가 발생했습니다.");
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-gradient-to-r from-neutral-50 via-indigo-50/30 to-blue-50/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-950 tracking-tight">
                  배송현황 실시간 동기화
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 font-mono">
                  CJ대한통운 LIVE
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                현재 배송 중인 주문 건들의 택배사 배송 상태를 실시간으로 조회하여 배송완료 건을 일괄 갱신합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY STATS & RE-SCAN BUTTON */}
        <div className="px-6 py-4 bg-white border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
              <span className="text-neutral-500 font-medium">전체 배송중:</span>
              <strong className="text-neutral-900 font-mono font-black">{targetShipments.length}건</strong>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">배송 완료 감지:</span>
              <strong className="font-mono font-black">{deliveredCount}건</strong>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">배송 진행중:</span>
              <strong className="font-mono font-black">{inTransitCount}건</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectOlderThan3Days}
              className="text-[11px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              title="출고일 기준 3일 이상 지난 주문을 모두 선택합니다"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>3일 이상 경과건 선택</span>
            </button>

            <button
              type="button"
              onClick={runSync}
              disabled={isLoading}
              className="bg-white hover:bg-neutral-50 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
              <span>{isLoading ? "실시간 조회 중..." : "다시 조회"}</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER TABS */}
        <div className="px-6 py-3 bg-neutral-50/60 border-b border-neutral-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              전체 ({syncItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("delivered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "delivered"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
              }`}
            >
              <Check className="w-3 h-3" />
              <span>배송완료 감지 ({deliveredCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("in_transit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "in_transit"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              배송 진행중 ({inTransitCount})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="수령인, 운송장번호 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto min-h-[280px]">
          {isLoading && !hasScanned ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-extrabold text-neutral-900">
                CJ대한통운 택배사 전산 실시간 조회 중...
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                배송 중인 주문들의 실시간 배달완료 스캔 데이터를 수집하고 있습니다.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-neutral-400">
              <Package className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-bold text-neutral-600">조회된 배송 건이 없습니다</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {searchQuery ? "검색 조건에 맞는 주문이 없습니다." : "현재 배송 중인 주문이 없습니다."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-100/70 text-neutral-500 font-bold sticky top-0 z-10 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedIds.has(i.shipmentId))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">주문번호 / 수령인</th>
                  <th className="py-2.5 px-3">운송장번호</th>
                  <th className="py-2.5 px-3">택배사 배송상태</th>
                  <th className="py-2.5 px-3">최종 스캔 위치 / 완료시간</th>
                  <th className="py-2.5 px-4 text-center">상태 변경 예정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.shipmentId);
                  return (
                    <tr
                      key={item.shipmentId}
                      className={`hover:bg-neutral-50/80 transition-colors cursor-pointer ${
                        isChecked ? "bg-indigo-50/30" : ""
                      }`}
                      onClick={() => {
                        const next = new Set(selectedIds);
                        if (isChecked) next.delete(item.shipmentId);
                        else next.add(item.shipmentId);
                        setSelectedIds(next);
                      }}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(item.shipmentId);
                            else next.delete(item.shipmentId);
                            setSelectedIds(next);
                          }}
                          className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900 font-mono">{item.orderId}</div>
                        <div className="text-[11px] text-neutral-500 font-medium">{item.recipient}</div>
                      </td>

                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${item.trackingNumber.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-neutral-800 hover:text-indigo-600 underline flex items-center gap-1 group"
                          title="CJ대한통운 공식 배송조회 페이지 열기"
                        >
                          <span>{item.trackingNumber}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>

                      <td className="py-3 px-3">
                        {item.isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>배송 완료 (감지)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{item.stateText || "배송 진행중"}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[11px] text-neutral-800 font-medium">
                          {item.location ? `[${item.location}]` : ""} {item.description || "-"}
                        </div>
                        {item.deliveredAt && (
                          <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                            배달시간: {new Date(item.deliveredAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isChecked ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs">
                            배송완료 반영
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium">
                            변경 안 함
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-600">
            <span>선택된 배송완료 반영 건수: </span>
            <strong className="text-indigo-600 font-mono text-sm font-black">{selectedIds.size}</strong>
            <span className="text-neutral-500"> / {syncItems.length}건</span>
            {selectedIds.size > 0 && (
              <span className="text-neutral-400 ml-2 text-[11px]">
                (적용 시 '배송 완료' 상태로 일괄 변경 및 저장됩니다)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              닫기
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || selectedIds.size === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>선택한 {selectedIds.size}건 '배송 완료'로 일괄 변경</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
