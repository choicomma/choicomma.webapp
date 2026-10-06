"use client";

import React, { useState, useEffect } from "react";
import { RotateCcw, Package, Check, AlertCircle, FileText } from "lucide-react";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import { explodeOrderToSingleItems, type ExplodedExchangeItem } from "@/lib/shipping/exchange-item-helper";

interface RefundFormBubbleProps {
  onSubmitRefund: (refundData: {
    orderId: string;
    orderNumber: string;
    items: string;
    image?: string;
    amount?: string | number;
    reason: string;
    details: string;
  }) => void;
}

export function RefundFormBubble({ onSubmitRefund }: RefundFormBubbleProps) {
  const [orders, setOrders] = useState<ExplodedExchangeItem[]>([]);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string | null>(null);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string | null>(null);
  const [manualOrderNumber, setManualOrderNumber] = useState("");
  const [selectedReason, setSelectedReason] = useState<string>("단순 변심");
  const [detailedReason, setDetailedReason] = useState("");
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

      const exploded = explodeOrderToSingleItems(filtered);
      setOrders(exploded);

      if (exploded.length > 0) {
        setSelectedUniqueId(exploded[0].uniqueSelectId);
        setSelectedOrderNum(exploded[0].orderNumber);
      }
    }
  }, []);

  const selectedOrder = orders.find((o) => o.uniqueSelectId === selectedUniqueId);
  const activeOrder = selectedOrder || {
    id: manualOrderNumber || "MANUAL_ORDER",
    orderNumber: manualOrderNumber || "직접입력주문",
    items: "환불 요청 상품",
    itemName: "환불 요청 상품",
    quantity: 1,
    image: "",
    amount: "",
  };

  const handleStartSubmit = () => {
    if (!selectedOrderNum && !manualOrderNumber.trim()) {
      alert("환불을 원하시는 주문건을 선택하거나 주문번호를 입력해 주세요.");
      return;
    }
    if (!selectedReason) {
      alert("환불 접수 사유를 선택해 주세요.");
      return;
    }
    if (!detailedReason.trim()) {
      alert("환불 상세 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitted(true);
    onSubmitRefund({
      orderId: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      items: activeOrder.items,
      image: activeOrder.image || getProductThumbnail(activeOrder.items),
      amount: activeOrder.amount,
      reason: selectedReason,
      details: detailedReason.trim(),
    });
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-[340px] p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-white space-y-2 text-center shadow-md animate-in fade-in">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xs">
          <Check className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="text-xs font-black">환불 접수 신청서가 전송되었습니다</div>
        <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
          상담원이 주문 내역 및 환불 사유를 확인한 후, 신속하게 토스페이먼츠 결제 취소/환불을 진행해 드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[340px] bg-white border border-neutral-200 rounded-2xl shadow-lg p-3.5 space-y-3.5 text-neutral-900 notranslate select-none" translate="no">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
        <div className="w-7 h-7 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-200">
          <RotateCcw className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-black text-neutral-950 flex items-center gap-1.5">
            <span>환불 접수 안내 및 신청서</span>
            <span className="text-[9px] font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-300">
              구매금액 취소
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-medium">
            환불하실 주문건과 사유를 선택해 주세요.
          </div>
        </div>
      </div>

      {/* Top Notice */}
      <div className="p-3 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-1.5 text-left">
        <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
          <AlertCircle className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
          <span>환불 처리 안내</span>
        </div>
        <ul className="text-[10px] text-neutral-600 space-y-1 pl-0.5 font-medium leading-relaxed pt-1 border-t border-neutral-200/60">
          <li>• 상품 수령 후 7일 이내에 환불(반품) 신청이 가능합니다.</li>
          <li>• 신용카드, 체크카드, 간편결제 및 실시간 계좌이체는 승인 취소 시 원 결제수단으로 자동 환불됩니다.</li>
          <li>• 착용 흔적, 향수/화장품 오염, 택(Tag) 훼손 시 반품이 제한될 수 있습니다.</li>
        </ul>
      </div>

      {/* 1. 주문건 선택 섹션 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-neutral-800 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-neutral-900" />
            <span>환불할 상품 / 주문건 선택</span>
          </span>
          {orders.length > 0 && (
            <span className="text-[10px] text-neutral-400 font-normal">
              총 {orders.length}개 상품
            </span>
          )}
        </label>

        {orders.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
            {orders.map((ord) => {
              const isSelected = selectedUniqueId === ord.uniqueSelectId;
              const thumb = getProductThumbnail(ord.itemName || ord.items, ord.image);

              return (
                <button
                  key={ord.uniqueSelectId}
                  type="button"
                  onClick={() => {
                    setSelectedUniqueId(ord.uniqueSelectId);
                    setSelectedOrderNum(ord.orderNumber);
                  }}
                  className={`w-full p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-2xs"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800"
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/60 shrink-0">
                    <img src={thumb} alt={ord.items} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-mono leading-tight mb-0.5">
                      <span className={isSelected ? "text-neutral-300" : "text-neutral-500 font-bold"}>
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
                      <div className={`text-[10px] font-mono font-bold mt-0.5 ${isSelected ? "text-white" : "text-neutral-900"}`}>
                        결제금액: {ord.amount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              type="text"
              value={manualOrderNumber}
              onChange={(e) => setManualOrderNumber(e.target.value)}
              placeholder="주문번호 입력 (예: ORD-20261001-XXXX)"
              className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
            />
            <p className="text-[10px] text-neutral-400">
              * 최근 주문 목록이 없는 경우 주문번호를 직접 입력해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* 2. 환불 사유 선택 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-neutral-800 block">
          환불 사유 선택
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            "단순 변심",
            "사이즈/색상 불만족",
            "상품 불량 / 하자",
            "오배송 / 누락",
            "배송 지연",
            "기타 사유",
          ].map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSelectedReason(reason)}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer border ${
                selectedReason === reason
                  ? "border-neutral-950 bg-neutral-950 text-white font-extrabold shadow-2xs"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {reason}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 상세 사유 입력 */}
      <div className="space-y-1">
        <label className="text-[11px] font-black text-neutral-800 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>상세 내용 입력</span>
            <span className="text-neutral-950 font-bold">*</span>
          </span>
          <span className="text-[9px] font-extrabold text-neutral-800 bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 rounded">
            필수
          </span>
        </label>
        <textarea
          value={detailedReason}
          onChange={(e) => setDetailedReason(e.target.value)}
          placeholder="환불과 관련된 구체적인 사유나 요청사항을 입력해 주세요. (필수 입력)"
          rows={2}
          className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 resize-none leading-relaxed placeholder:text-neutral-400"
        />
      </div>

      {/* Submit Button (Special Action: Blue) */}
      <button
        type="button"
        onClick={handleStartSubmit}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>환불 접수 신청서 제출하기</span>
      </button>
    </div>
  );
}
