"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Package, Check, ArrowRight, ShieldCheck, AlertCircle, CreditCard, Zap, ArrowRightLeft } from "lucide-react";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import { explodeOrderToSingleItems, type ExplodedExchangeItem } from "@/lib/shipping/exchange-item-helper";
import { requestTossExchangePayment, type ExchangePaymentMethod } from "./exchange-payment-service";

interface ExchangeFormBubbleProps {
  onCompleteExchange: (exchangeData: {
    orderId: string;
    orderNumber: string;
    items: string;
    image?: string;
    reason: string;
    details: string;
    fee: number;
    paymentMethod: string;
    paymentKey: string;
  }) => void;
}

export function ExchangeFormBubble({ onCompleteExchange }: ExchangeFormBubbleProps) {
  const [orders, setOrders] = useState<ExplodedExchangeItem[]>([]);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string | null>(null);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string | null>(null);
  const [manualOrderNumber, setManualOrderNumber] = useState("");
  const [selectedReason, setSelectedReason] = useState<string>("사이즈 교환");
  const [detailedReason, setDetailedReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ExchangePaymentMethod>("CARD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load customer orders from localStorage / API
  useEffect(() => {
    let list: any[] = [];
    if (typeof window !== "undefined") {
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
                  recipient: o.customerName,
                  recipientEmail: o.customerEmail,
                  phone: o.customerPhone,
                  items: Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} (${it.quantity}개)`).join(", ") : (o.items || "주문 상품"),
                  totalAmount: o.totalAmount,
                  status: o.paymentStatus === "PAID" ? (o.shippingStatus || "결제완료") : (o.status || "주문완료"),
                  orderDate: o.created_at || o.orderDate,
                  image: o.image || "",
                });
              }
            });
          }
        } catch (e) {}
      }

      const currentEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const currentPhone = (localStorage.getItem("membership_user_phone") || "").replace(/[^0-9]/g, "");
      const currentName = (localStorage.getItem("membership_user_name") || "").toLowerCase().trim();
      const normalize = (v: any) => String(v || "").toLowerCase().trim();

      const filtered = list.filter((s: any) => {
        if (localStorage.getItem("user_role") === "admin") return true;
        const sEmail = (s.recipientEmail || s.customerEmail || s.email || "").toLowerCase().trim();
        const sPhone = (s.phone || s.customerPhone || "").replace(/[^0-9]/g, "");
        const sAltPhone = (s.altPhone || "").replace(/[^0-9]/g, "");
        const sRecipient = normalize(s.recipient || s.customerName);
        const sOrderer = normalize(s.ordererName);

        if (currentEmail && sEmail && currentEmail === sEmail) return true;
        if (currentPhone && currentPhone.length >= 8) {
          const phoneTail = currentPhone.slice(-8);
          if (sPhone.endsWith(phoneTail) || sAltPhone.endsWith(phoneTail)) return true;
        }
        if (currentName && (sRecipient.includes(currentName) || sOrderer.includes(currentName))) return true;
        return false;
      }).map((s: any) => ({
        id: s.id,
        orderNumber: s.orderId || s.orderNumber || s.id,
        items: typeof s.items === "string" ? s.items : (Array.isArray(s.items) ? s.items.map((i: any) => i.name).join(", ") : "주문 상품"),
        amount: s.totalAmount ? `${Number(s.totalAmount).toLocaleString()}원` : (s.price ? `${Number(s.price).toLocaleString()}원` : ""),
        status: s.status || "결제완료",
        orderDate: s.orderDate || s.created_at || "",
        trackingNumber: s.trackingNumber || "-",
        image: s.image || s.productImage || s.packages?.[0]?.image || "",
      }));

      if (filtered.length > 0) {
        const exploded = explodeOrderToSingleItems(filtered);
        setOrders(exploded);
        setSelectedUniqueId(exploded[0]?.uniqueSelectId || null);
        setSelectedOrderNum(exploded[0]?.orderNumber || null);
      } else {
        // Fallback fetch API
        fetch("/api/admin/shipments")
          .then((res) => res.json())
          .then((data) => {
            const apiList = Array.isArray(data) ? data : (Array.isArray(data?.shipments) ? data.shipments : []);
            if (apiList.length > 0) {
              const mapped = apiList.slice(0, 5).map((s: any) => ({
                id: s.id,
                orderNumber: s.orderId || s.orderNumber || s.id,
                items: typeof s.items === "string" ? s.items : (Array.isArray(s.items) ? s.items.map((i: any) => i.name).join(", ") : "주문 상품"),
                amount: s.totalAmount ? `${Number(s.totalAmount).toLocaleString()}원` : (s.price ? `${Number(s.price).toLocaleString()}원` : ""),
                status: s.status || "결제완료",
                orderDate: s.orderDate || s.created_at || "",
                trackingNumber: s.trackingNumber || "-",
                image: s.image || "",
              }));
              const exploded = explodeOrderToSingleItems(mapped);
              setOrders(exploded);
              if (exploded.length > 0) {
                setSelectedUniqueId(exploded[0]?.uniqueSelectId || null);
                setSelectedOrderNum(exploded[0]?.orderNumber || null);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const activeOrder = orders.find((o) => (selectedUniqueId ? o.uniqueSelectId === selectedUniqueId : o.orderNumber === selectedOrderNum)) || {
    id: `MANUAL-${Date.now()}`,
    uniqueSelectId: `MANUAL-${Date.now()}`,
    orderId: manualOrderNumber || "직접입력주문",
    orderNumber: manualOrderNumber || "직접입력주문",
    items: "교환 요청 상품",
    itemName: "교환 요청 상품",
    quantity: 1,
    image: "",
    amount: "",
  };

  const isFree = selectedReason === "불량/오배송";
  const exchangeFee = isFree ? 0 : 16000;

  const handleStartSubmit = async () => {
    if (!selectedOrderNum && !manualOrderNumber.trim()) {
      alert("교환을 원하시는 주문건을 선택하거나 주문번호를 입력해 주세요.");
      return;
    }
    if (!selectedReason) {
      alert("교환 접수 사유를 선택해 주세요.");
      return;
    }

    if (isFree) {
      // Free exchange for defective items
      setIsSubmitted(true);
      onCompleteExchange({
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        items: activeOrder.items,
        image: activeOrder.image || getProductThumbnail(activeOrder.items),
        reason: selectedReason,
        details: detailedReason,
        fee: 0,
        paymentMethod: "무료교환 (불량/오배송)",
        paymentKey: `free_exc_${Date.now()}`,
      });
    } else {
      // Launch official Toss Payments PG payment window (16,000 KRW)
      try {
        setIsSubmitting(true);
        await requestTossExchangePayment({
          orderNumber: activeOrder.orderNumber,
          items: activeOrder.items,
          amount: exchangeFee, // 16,000 KRW
          reason: selectedReason,
          details: detailedReason,
          paymentMethod: paymentMethod,
        });
      } catch (err) {
        console.error("Toss payment launch error:", err);
        alert("토스페이먼츠 결제창을 실행하지 못했습니다. 다시 시도해 주세요.");
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full max-w-[340px] bg-white border border-neutral-200 rounded-2xl p-4 shadow-lg space-y-3.5 notranslate text-neutral-900" translate="no">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-neutral-100">
        <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-neutral-950 flex items-center gap-1.5">
            <span>교환 접수 신청서</span>
            <span className="text-[10px] bg-neutral-100 text-neutral-700 border border-neutral-300 font-bold px-1.5 py-0.2 rounded-full">
              1:1 케어
            </span>
          </h4>
          <p className="text-[10px] text-neutral-500 font-medium">교환할 주문건과 사유를 입력해 주세요.</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 반품 불가 안내 (Top Notice) */}
      {/* ========================================================================= */}
      <div className="p-3 bg-neutral-50 border border-neutral-200/90 rounded-2xl space-y-1.5 text-left">
        <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
          <AlertCircle className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
          <span>반품 불가 안내</span>
        </div>
        <p className="text-[11px] font-bold text-neutral-800 leading-snug">
          다음과 같은 내용은 불량 사유가 아니오니 구입 전 확인해 주시기 바랍니다.
        </p>
        <ul className="text-[10px] text-neutral-600 space-y-1 pl-0.5 font-medium leading-relaxed pt-1.5 border-t border-neutral-200/60">
          <li>• 불량 사유 제외 사유 안내</li>
          <li>• 모니터 해상도에 따른 컬러 차이</li>
          <li>• 배송 시 생긴 구김 또는 실밥 미정리, 바느질선 대칭 차이</li>
          <li>• 상품 제작 과정의 초크 자국</li>
          <li>• 원단 특유의 냄새</li>
          <li>• 측정 방식에 따른 1~3cm 사이즈 오차</li>
          <li>• 제품의 버튼 및 기타 부자재가 헐겁게 부착된 경우 (초이 콤마는 내부 검수 팀을 통해 제품에 대한 검수 작업을 진행하고 있습니다.)</li>
          <li>• 수제화/가방 등 제작상품의 경우, 제작과정에서 발생되는 미세한 본드 자국 및 펴질 수 있는 주름</li>
        </ul>
      </div>

      {/* 1. 주문건 선택 섹션 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-neutral-800 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-neutral-900" />
            <span>1. 교환할 주문건 선택</span>
          </span>
          <span className="text-[10px] text-neutral-400 font-bold">
            {orders.length > 0 ? `${orders.length}건 확인됨` : "직접 입력"}
          </span>
        </label>

        {orders.length === 0 ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={manualOrderNumber}
              onChange={(e) => setManualOrderNumber(e.target.value)}
              placeholder="주문번호를 직접 입력하세요 (예: CH20260930-001)"
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
            {orders.map((ord) => {
              const isSelected = selectedUniqueId ? ord.uniqueSelectId === selectedUniqueId : selectedOrderNum === ord.orderNumber;
              const thumb = ord.image || getProductThumbnail(ord.items);
              return (
                <div
                  key={ord.uniqueSelectId || ord.id}
                  onClick={() => {
                    setSelectedUniqueId(ord.uniqueSelectId);
                    setSelectedOrderNum(ord.orderNumber);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? "bg-neutral-950 border-neutral-950 text-white shadow-2xs"
                      : "bg-neutral-50/80 hover:bg-neutral-100/70 border-neutral-200/80 text-neutral-900"
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-neutral-200 shrink-0">
                    <img
                      src={thumb}
                      alt={ord.items}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-mono font-bold truncate ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                        주문: {ord.orderNumber}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-black text-white bg-blue-600 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5" /> 선택됨
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold line-clamp-1 leading-snug ${isSelected ? "text-white" : "text-neutral-900"}`}>
                      {ord.items}
                    </p>
                    <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                      <span>수량: {ord.quantity || 1}개</span>
                      {ord.amount && <span>• {ord.amount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 교환 접수 이유 입력칸 */}
      <div className="space-y-1.5 pt-1 border-t border-neutral-100">
        <label className="text-[11px] font-black text-neutral-800 block">
          2. 교환 사유 선택 및 상세 사유
        </label>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {["사이즈 교환", "색상 교환", "단순 변심", "불량/오배송", "기타"].map((reason) => {
            const isReasonSelected = selectedReason === reason;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isReasonSelected
                    ? "bg-neutral-950 text-white shadow-2xs"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                {reason}
              </button>
            );
          })}
        </div>

        <textarea
          value={detailedReason}
          onChange={(e) => setDetailedReason(e.target.value)}
          rows={2}
          placeholder="상세 사유 또는 변경을 원하시는 옵션(예: L사이즈로 변경 희망)을 적어주세요."
          className="w-full text-xs font-medium p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 resize-none"
        />
      </div>

      {/* 3. 교환 왕복 배송비 안내 */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-neutral-600">교환 왕복 배송비</span>
          <span className="font-black font-mono text-neutral-950">
            {isFree ? "0원 (쇼핑몰 사유 무료)" : "16,000원 (토스페이먼츠)"}
          </span>
        </div>
        <p className="text-[10px] text-neutral-400">
          {isFree
            ? "상품 불량 및 오배송 시 왕복 배송비는 전액 당사에서 부담합니다."
            : "CJ대한통운 영업소 왕복 수거 및 맞교환 재배송비(16,000원)가 포함되어 있습니다."}
        </p>
      </div>

      {/* 4. 유상 교환 시 결제 수단 선택 (주문서와 동일한 3가지 결제 방법) */}
      {!isFree && (
        <div className="space-y-1.5 text-left pt-1">
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
              className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMethod === "CARD"
                  ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                  : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
              }`}
            >
              <CreditCard className={`w-3.5 h-3.5 ${paymentMethod === "CARD" ? "text-white" : "text-neutral-700"}`} />
              <span className="font-bold text-[10px] leading-tight">신용·체크</span>
              <span className={`text-[8px] leading-none ${paymentMethod === "CARD" ? "text-neutral-300" : "text-neutral-400"}`}>모든 카드사</span>
            </button>

            {/* 2. 간편결제 */}
            <button
              type="button"
              onClick={() => setPaymentMethod("EASY_PAY")}
              className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMethod === "EASY_PAY"
                  ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                  : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${paymentMethod === "EASY_PAY" ? "text-white" : "text-neutral-700"}`} />
              <span className="font-bold text-[10px] leading-tight">간편결제</span>
              <span className={`text-[8px] leading-none ${paymentMethod === "EASY_PAY" ? "text-neutral-300" : "text-neutral-400"}`}>토스/카카오/네이버</span>
            </button>

            {/* 3. 실시간 계좌이체 */}
            <button
              type="button"
              onClick={() => setPaymentMethod("TRANSFER")}
              className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMethod === "TRANSFER"
                  ? "border-neutral-950 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950"
                  : "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800"
              }`}
            >
              <ArrowRightLeft className={`w-3.5 h-3.5 ${paymentMethod === "TRANSFER" ? "text-white" : "text-neutral-700"}`} />
              <span className="font-bold text-[10px] leading-tight">계좌이체</span>
              <span className={`text-[8px] leading-none ${paymentMethod === "TRANSFER" ? "text-neutral-300" : "text-neutral-400"}`}>실시간 즉시이체</span>
            </button>
          </div>

          <div className="p-2 bg-neutral-50 border border-neutral-200/80 rounded-xl text-[10px] text-neutral-600 flex items-center gap-1.5 leading-snug">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>
              {paymentMethod === "CARD" && "국내외 모든 신용카드 및 체크카드로 안전하게 결제하실 수 있습니다."}
              {paymentMethod === "EASY_PAY" && "토스페이, 카카오페이, 네이버페이 등 등록된 간편결제 수단으로 결제합니다."}
              {paymentMethod === "TRANSFER" && "금융결제원 연동을 통해 고객님의 은행 계좌에서 실시간으로 이체 결제됩니다."}
            </span>
          </div>
        </div>
      )}

      {/* 5. 교환 접수 및 결제 버튼 (특별한 기능: Blue CTA) */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isSubmitting || isSubmitted}
          onClick={handleStartSubmit}
          className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
            isSubmitted
              ? "bg-neutral-900 text-white cursor-default"
              : "bg-blue-600 hover:bg-blue-500 text-white active:scale-98 disabled:opacity-50"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              토스페이먼츠 결제창 실행 중...
            </span>
          ) : isSubmitted ? (
            <span>✓ 교환 접수 완료</span>
          ) : isFree ? (
            <span>교환 접수 완료하기 (배송비 0원)</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>
                {paymentMethod === "CARD" && "신용·체크카드로 16,000원 결제하고 교환 접수"}
                {paymentMethod === "EASY_PAY" && "간편결제로 16,000원 결제하고 교환 접수"}
                {paymentMethod === "TRANSFER" && "실시간 계좌이체로 16,000원 결제하고 교환 접수"}
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
