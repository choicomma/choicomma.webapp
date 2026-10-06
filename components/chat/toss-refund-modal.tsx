"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, RotateCcw, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import type { ExplodedExchangeItem } from "@/lib/shipping/exchange-item-helper";

interface TossRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerOrders: ExplodedExchangeItem[];
  initialOrder?: ExplodedExchangeItem | null;
  onSuccess: (result: {
    orderNumber: string;
    items: string;
    image?: string;
    refundAmount: number;
    paymentMethod: string;
    cancelReason: string;
    canceledAt: string;
  }) => void;
}

export function TossRefundModal({
  isOpen,
  onClose,
  customerOrders,
  initialOrder,
  onSuccess,
}: TossRefundModalProps) {
  const [selectedOrderUniqueId, setSelectedOrderUniqueId] = useState<string>("");
  const [refundType, setRefundType] = useState<"FULL" | "PARTIAL">("FULL");
  const [customRefundAmount, setCustomRefundAmount] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("고객 요청에 의한 환불 (CS 라이브 채팅)");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (initialOrder?.uniqueSelectId) {
      setSelectedOrderUniqueId(initialOrder.uniqueSelectId);
    } else if (customerOrders.length > 0) {
      setSelectedOrderUniqueId(customerOrders[0].uniqueSelectId);
    }
  }, [initialOrder, customerOrders, isOpen]);

  const activeOrder = customerOrders.find((o) => o.uniqueSelectId === selectedOrderUniqueId) || customerOrders[0] || null;

  // Calculate order price as number
  const rawOrderPrice = activeOrder?.amount
    ? parseInt(String(activeOrder.amount).replace(/[^0-9]/g, ""), 10) || 0
    : 0;

  useEffect(() => {
    if (rawOrderPrice > 0) {
      setCustomRefundAmount(String(rawOrderPrice));
    }
  }, [rawOrderPrice, selectedOrderUniqueId]);

  if (!isOpen) return null;

  const effectiveRefundAmount = refundType === "FULL" ? rawOrderPrice : (parseInt(customRefundAmount, 10) || 0);

  const handleExecuteRefund = async () => {
    if (!activeOrder) {
      alert("환불할 주문을 선택해 주세요.");
      return;
    }

    if (effectiveRefundAmount <= 0) {
      alert("환불 금액을 0원 이상 입력해 주세요.");
      return;
    }

    if (effectiveRefundAmount > rawOrderPrice && rawOrderPrice > 0) {
      alert("환불 금액이 원래 결제 금액보다 클 수 없습니다.");
      return;
    }

    const confirmMsg = `[토스페이먼츠 PG 실결제 취소/환불 안내]\n\n` +
      `• 주문번호: ${activeOrder.orderNumber}\n` +
      `• 환불 대상: ${activeOrder.itemName || activeOrder.items}\n` +
      `• 환불 금액: ₩${effectiveRefundAmount.toLocaleString()}원 (${refundType === "FULL" ? "전액 환불" : "부분 환불"})\n` +
      `• 사유: ${cancelReason}\n\n` +
      `실제 토스페이먼츠 결제 취소 및 환불을 진행하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    try {
      setIsProcessing(true);

      const res = await fetch("/api/payment/toss/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.orderNumber,
          cancelReason: cancelReason.trim(),
          cancelAmount: refundType === "PARTIAL" ? effectiveRefundAmount : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "토스 결제 취소에 실패했습니다.");
      }

      setIsDone(true);
      toast.success("✓ 토스페이먼츠 결제 취소 및 환불이 정상 완료되었습니다!");

      setTimeout(() => {
        onSuccess({
          orderNumber: activeOrder.orderNumber,
          items: activeOrder.itemName || activeOrder.items,
          image: activeOrder.image || getProductThumbnail(activeOrder.items),
          refundAmount: effectiveRefundAmount,
          paymentMethod: (activeOrder as any).paymentMethod || "신용·체크카드 / 간편결제 (토스)",
          cancelReason: cancelReason.trim(),
          canceledAt: new Date().toISOString(),
        });
        setIsDone(false);
        setIsProcessing(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Toss Refund Error:", err);
      alert(`환불 처리 중 오류가 발생했습니다: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const thumb = activeOrder ? getProductThumbnail(activeOrder.itemName || activeOrder.items, activeOrder.image) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans notranslate" translate="no">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 bg-neutral-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0064FF] text-white flex items-center justify-center font-black text-xs shadow-xs">
              토스
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <span>토스페이먼츠 결제 취소 및 환불</span>
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono">PG 환불</span>
              </h3>
              <p className="text-[10px] text-neutral-400 font-medium">
                구매금액 실시간 승인 취소 • 원 결제수단 즉시 환불
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. 주문건 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-neutral-900 flex items-center justify-between">
              <span>환불 대상 주문건 선택</span>
              {customerOrders.length > 0 && (
                <span className="text-[11px] text-neutral-400 font-normal">
                  총 {customerOrders.length}개 주문
                </span>
              )}
            </label>

            {customerOrders.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5 no-scrollbar">
                {customerOrders.map((ord) => {
                  const isSelected = selectedOrderUniqueId === ord.uniqueSelectId;
                  const itemThumb = getProductThumbnail(ord.itemName || ord.items, ord.image);
                  return (
                    <button
                      key={ord.uniqueSelectId}
                      type="button"
                      onClick={() => setSelectedOrderUniqueId(ord.uniqueSelectId)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white shadow-2xs"
                          : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/60 shrink-0">
                        <img src={itemThumb} alt={ord.items} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-mono leading-tight mb-0.5">
                          <span className={isSelected ? "text-neutral-300 font-bold" : "text-neutral-500 font-bold"}>
                            {ord.orderNumber}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                            isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate leading-snug">
                          {ord.itemName || ord.items}
                        </div>
                        {ord.amount && (
                          <div className={`text-[10px] font-mono font-bold mt-0.5 ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                            결제금액: {ord.amount}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 rounded-xl text-neutral-400 text-xs text-center">
                연결된 고객 주문건이 없습니다.
              </div>
            )}
          </div>

          {/* 2. 환불 구분 (전액 / 부분) */}
          {activeOrder && (
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>환불 방식 선택</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-200 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setRefundType("FULL")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      refundType === "FULL"
                        ? "bg-neutral-950 text-white shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    전액 환불
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundType("PARTIAL")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      refundType === "PARTIAL"
                        ? "bg-neutral-950 text-white shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    부분 환불
                  </button>
                </div>
              </div>

              {/* 금액 표시 */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-black text-neutral-900">최종 취소(환불) 금액</span>
                {refundType === "FULL" ? (
                  <span className="text-lg font-black text-neutral-950 font-mono">
                    ₩{rawOrderPrice.toLocaleString()}원
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-neutral-500 font-mono">₩</span>
                    <input
                      type="number"
                      value={customRefundAmount}
                      onChange={(e) => setCustomRefundAmount(e.target.value)}
                      placeholder="금액 입력"
                      className="w-28 text-right font-mono font-black text-neutral-950 border border-neutral-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-neutral-950"
                    />
                    <span className="text-xs font-bold text-neutral-700">원</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. 환불 사유 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-neutral-900 block">
              토스 결제 취소 사유
            </label>
            <div className="grid grid-cols-2 gap-1 mb-1.5">
              {[
                "고객 단순 변심",
                "사이즈/옵션 불만족",
                "상품 불량 및 하자",
                "배송 지연에 의한 취소",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className={`text-[11px] py-1.5 px-2 rounded-lg border font-bold transition-all text-left truncate cursor-pointer ${
                    cancelReason === reason
                      ? "border-neutral-950 bg-neutral-950 text-white font-extrabold shadow-2xs"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유 직접 입력"
              className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-950 font-medium"
            />
          </div>

          {/* Guide Notice */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start gap-2 text-neutral-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-extrabold block mb-0.5 text-neutral-900">토스페이먼츠 공식 PG 연동</span>
              신용/체크카드 및 간편결제는 승인 취소 전표가 즉시 발행되며, 실시간 계좌이체는 고객이 결제했던 원래 계좌로 자동 환불 입금됩니다.
            </div>
          </div>
        </div>

        {/* Footer Action (특별한 기능: Blue Button) */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-200/60 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isProcessing || !activeOrder}
            onClick={handleExecuteRefund}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-300 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>토스 PG 취소 처리 중...</span>
              </>
            ) : isDone ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>취소 완료!</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>💳 토스 결제 취소/환불 실행</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
