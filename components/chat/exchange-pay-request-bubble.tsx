"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Package, ArrowRight, ShieldCheck, Zap, ArrowRightLeft } from "lucide-react";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import { explodeOrderToSingleItems, type ExplodedExchangeItem } from "@/lib/shipping/exchange-item-helper";
import { requestTossExchangePayment, type ExchangePaymentMethod } from "./exchange-payment-service";

interface ExchangePayRequestBubbleProps {
  orderInfo?: {
    orderNumber?: string;
    items?: string;
    image?: string;
  };
}

export function ExchangePayRequestBubble({ orderInfo }: ExchangePayRequestBubbleProps) {
  const [orders, setOrders] = useState<ExplodedExchangeItem[]>([]);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string | null>(null);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string | null>(orderInfo?.orderNumber || null);
  const [paymentMethod, setPaymentMethod] = useState<ExchangePaymentMethod>("CARD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let list: any[] = [];
      const savedShipments = localStorage.getItem("admin_shipments");
      if (savedShipments) {
        try {
          const parsed = JSON.parse(savedShipments);
          if (Array.isArray(parsed)) list = [...list, ...parsed];
        } catch (e) {}
      }
      const savedOrders = localStorage.getItem("admin_orders");
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            parsed.forEach((o: any) => {
              if (!list.some((s) => s.id === o.id || s.orderId === o.orderNumber)) {
                list.push({
                  id: o.id || o.orderNumber,
                  orderId: o.orderNumber || o.id,
                  items: Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} (${it.quantity}개)`).join(", ") : (o.items || "주문 상품"),
                  image: o.image || "",
                });
              }
            });
          }
        } catch (e) {}
      }

      if (list.length > 0) {
        const mapped = list.slice(0, 5).map((s: any) => ({
          id: s.id,
          orderNumber: s.orderId || s.orderNumber || s.id,
          items: typeof s.items === "string" ? s.items : (Array.isArray(s.items) ? s.items.map((i: any) => i.name).join(", ") : "주문 상품"),
          image: s.image || s.productImage || s.packages?.[0]?.image || "",
        }));
        const exploded = explodeOrderToSingleItems(mapped);
        setOrders(exploded);
        if (exploded.length > 0) {
          if (!selectedUniqueId) {
            setSelectedUniqueId(exploded[0].uniqueSelectId);
            setSelectedOrderNum(exploded[0].orderNumber);
          }
        }
      }
    }
  }, [selectedOrderNum, selectedUniqueId]);

  const activeOrder = orders.find((o) => (selectedUniqueId ? o.uniqueSelectId === selectedUniqueId : o.orderNumber === selectedOrderNum)) || {
    id: "EXC-TEMP",
    uniqueSelectId: "EXC-TEMP",
    orderNumber: selectedOrderNum || "교환주문",
    orderId: selectedOrderNum || "교환주문",
    items: "교환 요청 상품",
    itemName: "교환 요청 상품",
    quantity: 1,
    image: "",
  };

  const handlePay = async () => {
    try {
      setIsSubmitting(true);
      await requestTossExchangePayment({
        orderNumber: activeOrder.orderNumber,
        items: activeOrder.items,
        amount: 16000,
        reason: "교환 왕복 배송비",
        paymentMethod: paymentMethod,
      });
    } catch (e) {
      console.error("Toss exchange payment error:", e);
      alert("토스페이먼츠 결제창을 실행하지 못했습니다. 다시 시도해 주세요.");
      setIsSubmitting(false);
    }
  };

  const thumb = getProductThumbnail(activeOrder.items, activeOrder.image);

  return (
    <div className="w-full max-w-[340px] bg-white border border-neutral-200 rounded-2xl p-4 shadow-lg space-y-3.5 notranslate text-neutral-900" translate="no">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-neutral-100">
        <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-neutral-950 flex items-center gap-1.5">
            <span>교환 왕복 배송비 결제 요청</span>
            <span className="text-[10px] bg-neutral-100 text-neutral-700 border border-neutral-300 font-bold px-1.5 py-0.2 rounded-full">
              토스페이먼츠
            </span>
          </h4>
          <p className="text-[10px] text-neutral-500 font-medium">원하시는 결제 수단을 선택 후 배송비를 결제해 주세요.</p>
        </div>
      </div>

      {/* Target Order Preview */}
      <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-500">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-neutral-900" />
            <span>교환 대상 주문</span>
          </span>
          <span className="text-neutral-900 font-black">{activeOrder.orderNumber}</span>
        </div>
        {orders.length > 1 && (
          <select
            value={selectedUniqueId || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedUniqueId(val);
              const matched = orders.find((o) => o.uniqueSelectId === val);
              if (matched) setSelectedOrderNum(matched.orderNumber);
            }}
            className="w-full text-[11px] font-bold py-1.5 px-2 bg-white border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-950"
          >
            {orders.map((o) => (
              <option key={o.uniqueSelectId} value={o.uniqueSelectId}>
                {o.items} (주문: {o.orderNumber})
              </option>
            ))}
          </select>
        )}
        <div className="flex items-start gap-2.5">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-neutral-200 shrink-0">
            <img
              src={thumb}
              alt={activeOrder.items}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">{activeOrder.items}</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
              수량: {activeOrder.quantity || 1}개 {activeOrder.amount ? `• ${activeOrder.amount}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Box */}
      <div className="p-3.5 bg-neutral-950 text-white rounded-2xl border border-neutral-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-neutral-300 block">교환 왕복 배송비</span>
          <span className="text-[10px] text-neutral-400 block">CJ대한통운 왕복 수거 및 재배송비</span>
        </div>
        <span className="text-base font-black text-white font-mono">
          16,000원
        </span>
      </div>

      {/* Payment Method Selector (주문서와 동일한 3가지 결제 방법) */}
      <div className="space-y-1.5 text-left">
        <label className="text-[11px] font-black text-neutral-800 flex items-center justify-between">
          <span>결제 방법 선택</span>
          <span className="text-[10px] text-blue-600 font-bold">
            {paymentMethod === "CARD" && "신용·체크카드"}
            {paymentMethod === "EASY_PAY" && "간편결제 (카카오/네이버/토스)"}
            {paymentMethod === "TRANSFER" && "실시간 계좌이체"}
          </span>
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {/* 1. 신용·체크카드 */}
          <button
            type="button"
            onClick={() => setPaymentMethod("CARD")}
            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              paymentMethod === "CARD"
                ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
            }`}
          >
            <CreditCard className={`w-4 h-4 ${paymentMethod === "CARD" ? "text-white" : "text-neutral-700"}`} />
            <span className="font-bold text-[10px] leading-tight">신용·체크</span>
            <span className={`text-[8px] leading-none ${paymentMethod === "CARD" ? "text-neutral-300" : "text-neutral-400"}`}>모든 카드사</span>
          </button>

          {/* 2. 간편결제 */}
          <button
            type="button"
            onClick={() => setPaymentMethod("EASY_PAY")}
            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              paymentMethod === "EASY_PAY"
                ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
            }`}
          >
            <Zap className={`w-4 h-4 ${paymentMethod === "EASY_PAY" ? "text-white" : "text-neutral-700"}`} />
            <span className="font-bold text-[10px] leading-tight">간편결제</span>
            <span className={`text-[8px] leading-none ${paymentMethod === "EASY_PAY" ? "text-neutral-300" : "text-neutral-400"}`}>토스/카카오/네이버</span>
          </button>

          {/* 3. 실시간 계좌이체 */}
          <button
            type="button"
            onClick={() => setPaymentMethod("TRANSFER")}
            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              paymentMethod === "TRANSFER"
                ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
            }`}
          >
            <ArrowRightLeft className={`w-4 h-4 ${paymentMethod === "TRANSFER" ? "text-white" : "text-neutral-700"}`} />
            <span className="font-bold text-[10px] leading-tight">계좌이체</span>
            <span className={`text-[8px] leading-none ${paymentMethod === "TRANSFER" ? "text-neutral-300" : "text-neutral-400"}`}>실시간 즉시이체</span>
          </button>
        </div>

        {/* Selected method description */}
        <div className="p-2 bg-neutral-50 border border-neutral-200/80 rounded-xl text-[10px] text-neutral-600 flex items-center gap-1.5 leading-snug">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span>
            {paymentMethod === "CARD" && "국내외 모든 신용카드 및 체크카드로 안전하게 결제하실 수 있습니다."}
            {paymentMethod === "EASY_PAY" && "토스페이, 카카오페이, 네이버페이 등 등록된 간편결제 수단으로 결제합니다."}
            {paymentMethod === "TRANSFER" && "금융결제원 연동을 통해 고객님의 은행 계좌에서 실시간으로 이체 결제됩니다."}
          </span>
        </div>
      </div>

      {/* Action Button (특별한 기능: Blue CTA) */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handlePay}
          className="w-full py-3.5 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white active:scale-98 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              토스페이먼츠 결제창 실행 중...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>
                {paymentMethod === "CARD" && "신용·체크카드로 16,000원 결제하기"}
                {paymentMethod === "EASY_PAY" && "간편결제로 16,000원 결제하기"}
                {paymentMethod === "TRANSFER" && "실시간 계좌이체로 16,000원 결제하기"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-white/80" />
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 justify-center">
        <ShieldCheck className="w-3 h-3 text-neutral-400" />
        <span>실제 토스페이먼츠 안전 결제창이 호출됩니다.</span>
      </div>
    </div>
  );
}
