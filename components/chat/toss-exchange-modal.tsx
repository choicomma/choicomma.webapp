"use client";

import React, { useState } from "react";
import { X, CreditCard, ShieldCheck, Lock, CheckCircle2, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";

interface TossExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    items: string;
    image?: string;
  };
  reason: string;
  details?: string;
  fee: number;
  onSuccess: (paymentInfo: {
    paymentKey: string;
    amount: number;
    method: string;
    paidAt: string;
  }) => void;
}

export function TossExchangeModal({
  isOpen,
  onClose,
  order,
  reason,
  details,
  fee = 6000,
  onSuccess,
}: TossExchangeModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"CARD" | "TOSS_PAY" | "EASY_PAY">("CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
      setTimeout(() => {
        onSuccess({
          paymentKey: `toss_exc_${Date.now()}`,
          amount: fee,
          method:
            selectedMethod === "CARD"
              ? "신용·체크카드"
              : selectedMethod === "TOSS_PAY"
              ? "토스페이 간편결제"
              : "간편결제 (카카오/네이버)",
          paidAt: new Date().toISOString(),
        });
        setIsDone(false);
        onClose();
      }, 700);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans notranslate" translate="no">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 bg-neutral-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0064FF] text-white flex items-center justify-center font-black text-sm shadow-xs">
              토스
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <span>토스페이먼츠 교환 배송비 결제</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-mono">PG</span>
              </h3>
              <p className="text-[10px] text-neutral-400 font-medium">안전 전자결제 모듈 • 왕복 배송비</p>
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
          {/* Order Summary */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-500">
              <span>주문번호</span>
              <span className="text-neutral-900 font-black">{order.orderNumber}</span>
            </div>
            <div className="flex items-center gap-3">
              {order.image && (
                <img
                  src={order.image}
                  alt={order.items}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200 bg-white shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 line-clamp-1">{order.items}</p>
                <p className="text-[11px] text-blue-600 font-extrabold mt-0.5">
                  사유: {reason} {details ? `(${details})` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-neutral-600 block">교환 왕복 배송비</span>
              <span className="text-[10px] text-neutral-400 block">CJ대한통운 왕복 수거 및 재배송비</span>
            </div>
            <span className="text-lg font-black text-blue-600 font-mono">
              {formatPrice(fee)}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-800">결제 수단 선택</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("CARD")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer space-y-1 ${
                  selectedMethod === "CARD"
                    ? "bg-[#0064FF]/10 border-[#0064FF] text-[#0064FF] font-black shadow-xs ring-1 ring-[#0064FF]/30"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700 font-bold"
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto" />
                <span className="text-[11px] block">신용/체크카드</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("TOSS_PAY")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer space-y-1 ${
                  selectedMethod === "TOSS_PAY"
                    ? "bg-[#0064FF]/10 border-[#0064FF] text-[#0064FF] font-black shadow-xs ring-1 ring-[#0064FF]/30"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700 font-bold"
                }`}
              >
                <div className="w-4 h-4 mx-auto font-black text-xs text-[#0064FF] leading-none flex items-center justify-center">
                  ⚡
                </div>
                <span className="text-[11px] block">토스페이</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("EASY_PAY")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer space-y-1 ${
                  selectedMethod === "EASY_PAY"
                    ? "bg-[#0064FF]/10 border-[#0064FF] text-[#0064FF] font-black shadow-xs ring-1 ring-[#0064FF]/30"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700 font-bold"
                }`}
              >
                <div className="w-4 h-4 mx-auto font-black text-xs text-neutral-900 leading-none flex items-center justify-center">
                  K
                </div>
                <span className="text-[11px] block">간편결제</span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>토스페이먼츠(Toss Payments) 실시간 안전 전자결제로 처리됩니다.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isDone
                ? "bg-neutral-900 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white active:scale-98"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                토스페이먼츠 안전 결제 승인 중...
              </span>
            ) : isDone ? (
              <span className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-4 h-4" />
                결제 승인 완료!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-200" />
                {formatPrice(fee)} 안전 결제 승인하기
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
