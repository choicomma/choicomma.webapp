"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, Package, Check, ArrowRight, ShieldCheck, AlertCircle, CreditCard, Zap, ArrowRightLeft, Sparkles } from "lucide-react";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import {
  explodeOrderToSingleItems,
  checkExchangeEligibility,
  resolveProductExchangeOptions,
  filterOrdersForCustomer,
  type ExplodedExchangeItem,
} from "@/lib/shipping/exchange-item-helper";
import { requestTossExchangePayment, type ExchangePaymentMethod } from "./exchange-payment-service";

interface ExchangeFormBubbleProps {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  isAdminView?: boolean;
  onCompleteExchange: (exchangeData: {
    orderId: string;
    orderNumber: string;
    items: string;
    targetSize?: string;
    targetColor?: string;
    targetOption?: string;
    image?: string;
    reason: string;
    details: string;
    fee: number;
    paymentMethod: string;
    paymentKey: string;
  }) => void;
}

export function ExchangeFormBubble({
  customerEmail,
  customerName,
  customerPhone,
  isAdminView,
  onCompleteExchange,
}: ExchangeFormBubbleProps) {
  const [orders, setOrders] = useState<ExplodedExchangeItem[]>([]);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string | null>(null);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string | null>(null);
  const [manualOrderNumber, setManualOrderNumber] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("사이즈/색상 교환");
  const [targetSize, setTargetSize] = useState<string>("");
  const [targetColor, setTargetColor] = useState<string>("");
  const [detailedReason, setDetailedReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ExchangePaymentMethod>("CARD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load customer orders from localStorage / API with 2-week delivery completion filter
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
                  status: o.shippingStatus || (o.paymentStatus === "PAID" ? "배송완료" : (o.status || "주문완료")),
                  orderDate: o.created_at || o.orderDate,
                  deliveredDate: o.deliveredDate || o.delivered_at,
                  image: o.image || "",
                });
              }
            });
          }
        } catch (e) {}
      }

      // 1. 고객 본인의 주문만 엄격 매칭 (비로그인은 빈 배열, 관리자는 본인 테스트 주문만)
      const normEmail = (customerEmail || "").toLowerCase().trim();
      const isTargetAdmin = normEmail === "admin@choicomma.com" || (customerName || "").includes("최고관리자");
      let userOrders = filterOrdersForCustomer(list, {
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        isAdmin: isTargetAdmin,
      });

      // 관리자 화면이거나 매칭 주문이 없을 때 최근 등록된 주문이 있으면 기본 표시
      if (userOrders.length === 0 && (isAdminView || isTargetAdmin) && list.length > 0) {
        userOrders = list.slice(0, 5);
      }

      // 2. 배송완료 상태 및 14일 이내 교환 가능 주문건 추출
      const eligibleList = userOrders.filter((s: any) => {
        const eligibility = checkExchangeEligibility(s);
        return eligibility.isEligible;
      }).map((s: any) => {
        const eligibility = checkExchangeEligibility(s);
        return {
          id: s.id,
          orderNumber: s.orderId || s.orderNumber || s.id,
          items: typeof s.items === "string" ? s.items : (Array.isArray(s.items) ? s.items.map((i: any) => i.name).join(", ") : "주문 상품"),
          amount: s.totalAmount ? `${Number(s.totalAmount).toLocaleString()}원` : (s.price ? `${Number(s.price).toLocaleString()}원` : ""),
          status: s.status || "배송완료",
          orderDate: s.orderDate || s.created_at || "",
          deliveredDate: s.deliveredDate || s.delivered_at,
          deliveredDateStr: eligibility.deliveredDateStr,
          daysAgo: eligibility.diffDays,
          daysLeft: eligibility.daysLeft,
          trackingNumber: s.trackingNumber || "-",
          image: s.image || s.productImage || s.packages?.[0]?.image || "",
        };
      });

      if (eligibleList.length > 0) {
        const exploded = explodeOrderToSingleItems(eligibleList);
        setOrders(exploded);
        setSelectedUniqueId(exploded[0]?.uniqueSelectId || null);
        setSelectedOrderNum(exploded[0]?.orderNumber || null);
      } else {
        // Fallback fetch API: 본인 식별 파라미터 전달 및 엄격 필터링
        const currentEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
        const currentPhone = (localStorage.getItem("membership_user_phone") || "").replace(/[^0-9]/g, "");
        const currentName = (localStorage.getItem("membership_user_name") || "").trim();
        const isAdmin = localStorage.getItem("user_role") === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

        // 비로그인 상태인 경우 타인의 주문을 조회하지 않음
        if (!isAdmin && !currentEmail && (!currentPhone || currentPhone.length < 8) && !currentName) {
          setOrders([]);
          return;
        }

        const queryParams = new URLSearchParams({
          forCustomer: "true",
          email: currentEmail,
          phone: currentPhone,
          name: currentName,
          isAdmin: isAdmin ? "true" : "false",
        });

        fetch(`/api/admin/shipments?${queryParams.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            const apiList = Array.isArray(data) ? data : (Array.isArray(data?.shipments) ? data.shipments : []);
            if (apiList.length > 0) {
              const userApiOrders = filterOrdersForCustomer(apiList, {
                email: currentEmail,
                phone: currentPhone,
                name: currentName,
                isAdmin,
              });

              const eligibleApi = userApiOrders.filter((s: any) => {
                const eligibility = checkExchangeEligibility(s);
                return eligibility.isEligible;
              });

              if (eligibleApi.length > 0) {
                const mapped = eligibleApi.map((s: any) => {
                  const eligibility = checkExchangeEligibility(s);
                  return {
                    id: s.id,
                    orderNumber: s.orderId || s.orderNumber || s.id,
                    items: typeof s.items === "string" ? s.items : (Array.isArray(s.items) ? s.items.map((i: any) => i.name).join(", ") : "주문 상품"),
                    amount: s.totalAmount ? `${Number(s.totalAmount).toLocaleString()}원` : (s.price ? `${Number(s.price).toLocaleString()}원` : ""),
                    status: s.status || "배송완료",
                    orderDate: s.orderDate || s.created_at || "",
                    deliveredDate: s.deliveredDate || s.delivered_at,
                    deliveredDateStr: eligibility.deliveredDateStr,
                    daysAgo: eligibility.diffDays,
                    daysLeft: eligibility.daysLeft,
                    trackingNumber: s.trackingNumber || "-",
                    image: s.image || "",
                  };
                });
                const exploded = explodeOrderToSingleItems(mapped);
                setOrders(exploded);
                if (exploded.length > 0) {
                  setSelectedUniqueId(exploded[0]?.uniqueSelectId || null);
                  setSelectedOrderNum(exploded[0]?.orderNumber || null);
                }
              } else {
                setOrders([]);
              }
            } else {
              setOrders([]);
            }
          })
          .catch(() => {
            setOrders([]);
          });
      }
    }
  }, [customerEmail, customerName, customerPhone, isAdminView]);

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

  // 주문 선택 변경 시 희망 옵션 초기화
  useEffect(() => {
    setTargetSize("");
    setTargetColor("");
  }, [selectedUniqueId, selectedOrderNum]);

  const hasMatchedOrder = orders.length > 0 && Boolean(orders.find((o) => (selectedUniqueId ? o.uniqueSelectId === selectedUniqueId : o.orderNumber === selectedOrderNum)));

  // 선택된 상품의 연동 사이즈 및 색상 옵션 추출
  const productOptions = useMemo(() => {
    if (!hasMatchedOrder) {
      return {
        matchedTitle: "",
        currentSize: "",
        currentColor: "",
        sizes: [],
        colors: [],
        colorImageMap: {},
        colorHexMap: {},
        hasOptions: false,
      };
    }
    if (activeOrder.availableSizes && activeOrder.availableSizes.length > 0) {
      return {
        matchedTitle: activeOrder.itemName || activeOrder.items,
        currentSize: activeOrder.currentSize || "",
        currentColor: activeOrder.currentColor || "",
        sizes: activeOrder.availableSizes,
        colors: activeOrder.availableColors || [],
        colorImageMap: activeOrder.colorImageMap || {},
        colorHexMap: activeOrder.colorHexMap || {},
        hasOptions: true,
      };
    }
    return resolveProductExchangeOptions(activeOrder.items || activeOrder.itemName);
  }, [activeOrder, hasMatchedOrder]);

  const showExchangeOptions = hasMatchedOrder && (productOptions.sizes.length > 0 || productOptions.colors.length > 0);

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

    // 사이즈/색상 교환 선택 시 연동 옵션 검증
    if (selectedReason === "사이즈/색상 교환") {
      if (showExchangeOptions) {
        if (!targetSize && !targetColor && !detailedReason.trim()) {
          alert("교환을 원하시는 희망 사이즈 또는 색상을 선택해 주세요.");
          return;
        }
      } else {
        if (!detailedReason.trim()) {
          alert("교환을 원하시는 희망 옵션(사이즈/색상) 또는 사유를 상세 내용에 입력해 주세요.");
          return;
        }
      }
    }

    const targetOptionParts: string[] = [];
    if (targetSize) targetOptionParts.push(`사이즈: ${targetSize}`);
    if (targetColor) targetOptionParts.push(`색상: ${targetColor}`);
    const targetOptionStr = targetOptionParts.join(" / ");

    const detailSections: string[] = [];
    if (targetOptionStr) {
      detailSections.push(`[변경 희망 옵션] ${targetOptionStr}`);
    }
    if (detailedReason.trim()) {
      detailSections.push(`[상세 내용] ${detailedReason.trim()}`);
    }
    const finalDetails = detailSections.join("\n") || (targetOptionStr ? `[변경 희망 옵션] ${targetOptionStr}` : "교환 요청");

    if (isFree) {
      // Free exchange for defective items
      setIsSubmitted(true);
      onCompleteExchange({
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        items: activeOrder.items,
        targetSize: targetSize || undefined,
        targetColor: targetColor || undefined,
        targetOption: targetOptionStr || undefined,
        image: activeOrder.image || getProductThumbnail(activeOrder.items),
        reason: selectedReason,
        details: finalDetails,
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
          details: finalDetails,
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
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black text-neutral-900 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-neutral-900" />
            <span>1. 교환할 주문건 선택</span>
          </label>
          {orders.length > 0 ? (
            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              배송완료 2주 이내 ({orders.length}건)
            </span>
          ) : (
            <span className="text-[9px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
              직접 입력
            </span>
          )}
        </div>
        <p className="text-[10px] text-neutral-500 font-medium px-0.5">
          ※ 배송 완료일로부터 14일(2주) 이내 주문건만 신청 가능합니다.
        </p>

        {orders.length === 0 ? (
          <div className="p-3 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {typeof window !== "undefined" &&
                !Boolean(
                  localStorage.getItem("membership_user_email") ||
                  localStorage.getItem("membership_user_phone") ||
                  localStorage.getItem("membership_user_name") ||
                  localStorage.getItem("user_role") === "admin"
                )
                  ? "로그인된 계정의 주문 내역이 없습니다"
                  : "2주(14일) 이내 교환 가능한 주문이 없습니다"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
              {typeof window !== "undefined" &&
              !Boolean(
                localStorage.getItem("membership_user_email") ||
                localStorage.getItem("membership_user_phone") ||
                localStorage.getItem("membership_user_name") ||
                localStorage.getItem("user_role") === "admin"
              )
                ? "고객님의 주문 정보 보호를 위해 본인 확인이 필요합니다. 로그인 후 이용하시거나 아래에 주문번호를 직접 입력해 주세요."
                : "교환은 상품 수령(배송완료)일로부터 2주 이내의 본인 주문건만 신청하실 수 있습니다. 특별한 사유나 교환 문의가 있으신 경우 주문번호를 직접 입력해 주세요."}
            </p>
            <input
              type="text"
              value={manualOrderNumber}
              onChange={(e) => {
                setManualOrderNumber(e.target.value);
                setSelectedOrderNum(e.target.value);
              }}
              placeholder="주문번호를 직접 입력하세요 (예: 202610135266882)"
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 placeholder:font-normal placeholder:text-neutral-400"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5 max-h-[185px] overflow-y-auto pr-1">
              {orders.map((ord) => {
                const isSelected = selectedUniqueId ? ord.uniqueSelectId === selectedUniqueId : selectedOrderNum === ord.orderNumber;
                const thumb = ord.image || getProductThumbnail(ord.items);
                return (
                  <div
                    key={ord.uniqueSelectId || ord.id}
                    onClick={() => {
                      setSelectedUniqueId(ord.uniqueSelectId);
                      setSelectedOrderNum(ord.orderNumber);
                      setManualOrderNumber("");
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
                        <div className="flex items-center gap-1 shrink-0">
                          {ord.daysLeft !== undefined && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isSelected
                                  ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                  : ord.daysLeft <= 3
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {ord.daysLeft === 0 ? "오늘 마감 (D-0)" : `D-${ord.daysLeft}일 남음`}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-black text-white bg-blue-600 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> 선택됨
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs font-bold line-clamp-1 leading-snug ${isSelected ? "text-white" : "text-neutral-900"}`}>
                        {ord.items}
                      </p>
                      <div className={`flex items-center justify-between text-[10px] mt-0.5 ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>수량: {ord.quantity || 1}개</span>
                          {ord.amount && <span>• {ord.amount}</span>}
                        </div>
                        {ord.deliveredDateStr && (
                          <span className={`text-[9px] font-medium ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                            배송완료: {ord.deliveredDateStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 underline transition-colors cursor-pointer"
              >
                {showManualInput ? "▲ 주문 목록에서 선택하기" : "+ 다른 주문번호 직접 입력하기"}
              </button>
              {showManualInput && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={manualOrderNumber}
                    onChange={(e) => {
                      setManualOrderNumber(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedUniqueId(null);
                        setSelectedOrderNum(e.target.value.trim());
                      }
                    }}
                    placeholder="주문번호를 직접 입력하세요 (예: 202610135266882)"
                    className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 placeholder:font-normal placeholder:text-neutral-400"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 2. 교환 사유 선택 및 상세 사유 (제품 사이즈/색상 옵션 연동) */}
      <div className="space-y-2 pt-1 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black text-neutral-900 block">
            {showExchangeOptions ? "2. 교환 사유 선택 및 희망 옵션" : "2. 교환 사유 선택"}
          </label>
          {showExchangeOptions && productOptions.hasOptions && (
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-blue-600" /> 제품 옵션 연동됨
            </span>
          )}
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {["사이즈/색상 교환", "단순 변심", "불량/오배송", "기타"].map((reason) => {
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

        {/* 연동된 사이즈 / 색상 옵션 선택 박스 - 최근 주문건이 있고 실제 선택 가능한 옵션이 있을 때만 노출 */}
        {showExchangeOptions && (
          <div className="p-3 bg-neutral-50/90 border border-neutral-200/90 rounded-xl space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-neutral-200/60 pb-1.5">
            <span className="text-[10px] font-black text-neutral-800 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-neutral-700" />
              <span>교환 희망 옵션 선택</span>
            </span>
            {(productOptions.currentSize || productOptions.currentColor) && (
              <span className="text-[9px] font-medium text-neutral-500 font-mono truncate max-w-[150px]">
                기존: {[productOptions.currentColor, productOptions.currentSize].filter(Boolean).join(" / ")}
              </span>
            )}
          </div>

          {/* 사이즈 선택 섹션 */}
          {productOptions.sizes && productOptions.sizes.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-bold ${selectedReason === "사이즈/색상 교환" ? "text-blue-600 font-black" : "text-neutral-700"}`}>
                  희망 사이즈 {selectedReason === "사이즈/색상 교환" && <span className="text-neutral-400 font-medium">(선택)</span>}
                </span>
                {targetSize && (
                  <span className="text-[9px] font-black text-blue-600">
                    선택: {targetSize}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {productOptions.sizes.map((sz) => {
                  const isTarget = targetSize === sz;
                  const isCurrent = Boolean(productOptions.currentSize && productOptions.currentSize.includes(sz));
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTargetSize(isTarget ? "" : sz)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isTarget
                          ? "bg-neutral-950 border-neutral-950 text-white shadow-2xs"
                          : isCurrent
                          ? "bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400"
                          : "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-950"
                      }`}
                    >
                      {isTarget && <Check className="w-2.5 h-2.5 text-white" />}
                      <span>{sz}</span>
                      {isCurrent && <span className="text-[8px] font-normal text-neutral-400">(현재)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 색상 / 타입 선택 섹션 (썸네일 비주얼 선택) */}
          {productOptions.colors && productOptions.colors.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-200/60">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-bold ${selectedReason === "사이즈/색상 교환" ? "text-blue-600 font-black" : "text-neutral-700"}`}>
                  희망 색상/타입 {selectedReason === "사이즈/색상 교환" && <span className="text-neutral-400 font-medium">(선택)</span>}
                </span>
                {targetColor && (
                  <span className="text-[9px] font-black text-blue-600">
                    선택: {targetColor}
                  </span>
                )}
              </div>

              {/* 썸네일 색상 버튼 목록 (4열 그리드) */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {productOptions.colors.map((col) => {
                  const isTarget = targetColor === col;
                  const isCurrent = Boolean(productOptions.currentColor && productOptions.currentColor.includes(col));
                  const thumbImg =
                    productOptions.colorImageMap?.[col] ||
                    activeOrder.image ||
                    getProductThumbnail(activeOrder.items) ||
                    "/product_1.webp";

                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTargetColor(isTarget ? "" : col)}
                      title={col}
                      className={`p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 group relative text-center select-none ${
                        isTarget
                          ? "bg-neutral-950 border-neutral-950 text-white shadow-xs ring-2 ring-neutral-950/20"
                          : isCurrent
                          ? "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400"
                          : "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400"
                      }`}
                    >
                      {/* Thumbnail Image Container */}
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/80 relative shrink-0">
                        <img
                          src={thumbImg}
                          alt={col}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = activeOrder.image || "/product_1.webp";
                          }}
                        />
                        {/* Selected Checkmark Badge */}
                        {isTarget && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </div>
                        )}
                        {/* Current Option Badge */}
                        {isCurrent && !isTarget && (
                          <span className="absolute bottom-0 inset-x-0 text-center text-[7.5px] font-bold bg-neutral-950/70 text-white py-0.2">
                            현재
                          </span>
                        )}
                      </div>

                      {/* Color Name */}
                      <span className={`text-[9px] font-bold truncate max-w-full leading-tight px-0.5 ${
                        isTarget ? "text-white font-black" : "text-neutral-800"
                      }`}>
                        {col}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선택 완료 피드백 바 */}
          {(targetSize || targetColor) && (
            <div className="bg-white border border-neutral-300/80 rounded-lg p-2 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 font-bold text-neutral-800 truncate">
                <span className="text-blue-600 font-black shrink-0">변경 희망:</span>
                <span className="truncate">
                  {[targetSize && `사이즈 [${targetSize}]`, targetColor && `색상 [${targetColor}]`].filter(Boolean).join(" / ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setTargetSize(""); setTargetColor(""); }}
                className="text-[9px] font-bold text-neutral-400 hover:text-neutral-700 underline shrink-0 cursor-pointer"
              >
                초기화
              </button>
            </div>
          )}
        </div>
      )}

        {/* 상세 사유 텍스트 영역 */}
        <textarea
          value={detailedReason}
          onChange={(e) => setDetailedReason(e.target.value)}
          rows={2}
          placeholder={
            !showExchangeOptions && selectedReason === "사이즈/색상 교환"
              ? "희망하시는 변경 사이즈나 색상, 상세 교환 사유를 입력해 주세요"
              : "추가 요청사항이나 상세 사유가 있으시면 입력해 주세요 (선택사항)"
          }
          className="w-full text-xs font-medium p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 resize-none placeholder:text-neutral-400"
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
