"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  Crown,
  LogOut,
  Trash2,
  Send,
  Edit3,
  Plus,
  X,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Check,
  Bot,
  Sliders,
  Clock,
  Zap,
  Tag,
  Package,
  RefreshCw,
  CreditCard,
  ChevronUp,
  ChevronDown,
  Truck,
} from "lucide-react";
import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import { explodeOrderToSingleItems, type ExplodedExchangeItem } from "@/lib/shipping/exchange-item-helper";
import { TossRefundModal } from "@/components/chat/toss-refund-modal";
import { restoreCouponByOrder } from "@/lib/membership/coupons";

interface TemplateItem {
  id: string;
  label: string;
  ko: string;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string; // e.g. "배송, 택배, 송장, 도착"
  replyText: string;
  enabled: boolean;
}

export const DEFAULT_AUTO_RULES: AutoReplyRule[] = [
  {
    id: "auto-1",
    name: "배송 및 출고 문의",
    keywords: "배송, 택배, 출고, 언제, 송장, 도착, 배송비",
    replyText: "평일 14:00 이전 결제 완료 건은 당일 출고되며, CJ대한통운으로 1~2일 내 안전하게 배송됩니다. 🚚",
    enabled: true,
  },
  {
    id: "auto-2",
    name: "사이즈 및 실측 문의",
    keywords: "사이즈, 실측, 치수, 총장, 어깨, 가슴, 허리, 길이",
    replyText: "상품 상세 페이지 하단의 [실측 사이즈 가이드]를 통해 치수를 확인하실 수 있습니다. 추가 문의는 상담원이 곧 상세히 안내해 드리겠습니다. 📏",
    enabled: true,
  },
  {
    id: "auto-3",
    name: "회원 등급 및 할인 혜택",
    keywords: "VIP, 등급, 혜택, 할인, 적립금, 포인트, 쿠폰, 멤버십",
    replyText: "초이콤마 회원님께는 1% 포인트 적립 및 등급별 무료배송 혜택이 상시 적용됩니다. 마이페이지에서 상세 혜택을 확인해 보세요! ✨",
    enabled: true,
  },
  {
    id: "auto-4",
    name: "교환 및 반품 안내",
    keywords: "교환, 반품, 환불, 취소, 수선",
    replyText: "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
    enabled: true,
  },
];

const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: "tmpl-1",
    label: "인사 및 안내",
    ko: "안녕하세요! 초이콤마 VIP 전담 케어팀입니다. 무엇을 도와드릴까요? 💫",
  },
  {
    id: "tmpl-2",
    label: "배송 확인 중",
    ko: "주문하신 상품 및 배송 정보를 확인 중입니다. 잠시만 기다려 주세요!",
  },
  {
    id: "tmpl-3",
    label: "옵션 반영 완료",
    ko: "요청하신 커스텀 사이즈/옵션 지정이 반영 완료되었습니다. 🛍️",
  },
  {
    id: "tmpl-4",
    label: "추가 문의 안내",
    ko: "추가로 도움이 필요하신 사항이 있으시면 언제든 편하게 말씀해 주세요!",
  },
];

interface InquiriesManagementProps {
  adminLiveChatMessages: any[];
  chatSessionsList: any[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  isLiveChatSessionEnded: boolean;
  activeSessionMessages: any[];
  adminLiveInput: string;
  setAdminLiveInput: (val: string) => void;
  handleAdminSendLiveChat: (text?: string) => void;
  handleAdminEndLiveChat: (sessionId: string) => void;
  handleAdminClearLiveChat: () => void;
}

export function InquiriesManagement({
  adminLiveChatMessages,
  chatSessionsList,
  activeSessionId,
  setActiveSessionId,
  isLiveChatSessionEnded,
  activeSessionMessages,
  adminLiveInput,
  setAdminLiveInput,
  handleAdminSendLiveChat,
  handleAdminEndLiveChat,
  handleAdminClearLiveChat,
}: InquiriesManagementProps) {
  // Custom Editable Templates State
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Order Selection Request Handler (고객에게 주문 직접 선택 즉시 요청)
  const handleRequestOrderSelection = () => {
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }
    const orderSelectPayload = JSON.stringify({
      type: "ORDER_SELECT_REQUEST",
      title: "문의하실 주문건을 선택해 주세요",
      text: "고객님의 주문 내역 중 상담을 원하시는 주문건을 선택해 주시면 확인 후 신속하게 도와드리겠습니다.",
      requestedAt: new Date().toISOString(),
    });
    handleAdminSendLiveChat(orderSelectPayload);
  };

  // Exchange Popover Menu State
  const [isExchangeMenuOpen, setIsExchangeMenuOpen] = useState(false);

  // 1) 교환접수요청서 전송 핸들러 (반품 불가 안내, 주문건 선택, 사유 입력)
  const handleRequestExchangeForm = () => {
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }
    const exchangePayload = JSON.stringify({
      type: "EXCHANGE_REQUEST",
      title: "교환 접수 안내 및 신청서",
      text: "교환을 원하시는 주문건과 교환 사유를 입력해 주시면, 왕복 배송비(16,000원) 결제 후 교환 접수가 안전하게 완료됩니다.",
      exchangeFee: 16000,
      requestedAt: new Date().toISOString(),
    });
    handleAdminSendLiveChat(exchangePayload);
  };

  // 2) 교환접수비용결제창 전송 핸들러 (토스페이먼츠 16,000원 결제창 전송)
  const handleRequestExchangePayment = () => {
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }
    const exchangePayPayload = JSON.stringify({
      type: "EXCHANGE_PAY_REQUEST",
      title: "교환 왕복 배송비 결제 요청",
      text: "상담원 확인 후 교환 왕복 배송비(16,000원) 결제창이 전송되었습니다. 결제 완료 시 안전하게 교환 수거 및 재출고가 진행됩니다.",
      amount: 16000,
      fee: 16000,
      requestedAt: new Date().toISOString(),
    });
    handleAdminSendLiveChat(exchangePayPayload);
  };

  // Refund Popover Menu & Modal State
  const [isRefundMenuOpen, setIsRefundMenuOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundCustomerOrders, setRefundCustomerOrders] = useState<ExplodedExchangeItem[]>([]);
  const [selectedRefundPrefillOrder, setSelectedRefundPrefillOrder] = useState<ExplodedExchangeItem | null>(null);
  const [pickupBookingType, setPickupBookingType] = useState<"EXCHANGE" | "REFUND">("EXCHANGE");

  // 1) 환불접수요청서 전송 핸들러
  const handleRequestRefundForm = () => {
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }
    const refundPayload = JSON.stringify({
      type: "REFUND_REQUEST",
      title: "환불 접수 안내 및 신청서",
      text: "환불을 원하시는 주문건과 환불 사유를 입력해 주시면, 확인 후 신속하게 결제 취소 및 환불 처리를 도와드리겠습니다.",
      requestedAt: new Date().toISOString(),
    });
    handleAdminSendLiveChat(refundPayload);
  };

  // 2) 토스 환불 모달 열기 핸들러
  const handleOpenRefundModal = () => {
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }

    const currentSession = chatSessionsList.find((s) => s.id === activeSessionId);
    const sessionEmail = (currentSession?.email || "").toLowerCase().trim();
    const sessionName = (currentSession?.name || "").trim();

    let allOrders: any[] = [];
    if (typeof window !== "undefined") {
      try {
        const savedShipments = localStorage.getItem("admin_shipments");
        if (savedShipments) {
          const parsed = JSON.parse(savedShipments);
          if (Array.isArray(parsed)) allOrders.push(...parsed);
        }
      } catch (e) {}

      try {
        const savedOrders = localStorage.getItem("admin_orders");
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            parsed.forEach((ord: any) => {
              if (!allOrders.some((s) => s.id === ord.id || s.orderId === ord.orderNumber)) {
                allOrders.push({
                  id: ord.id || ord.orderNumber,
                  orderId: ord.orderNumber || ord.id,
                  recipient: ord.customerName || ord.recipient,
                  recipientEmail: ord.customerEmail || ord.email,
                  phone: ord.customerPhone || ord.phone,
                  items: Array.isArray(ord.items) ? ord.items.map((it: any) => `${it.name} (${it.quantity}개)`).join(", ") : (ord.items || "주문 상품"),
                  totalAmount: ord.totalAmount,
                  amount: ord.totalAmount ? `₩${Number(ord.totalAmount).toLocaleString()}원` : "",
                  paymentMethod: ord.method || ord.paymentMethod || "신용·체크카드 (토스)",
                  trackingNumber: ord.trackingNumber || "-",
                  image: ord.image || "",
                });
              }
            });
          }
        }
      } catch (e) {}
    }

    let matched = allOrders.filter((ord: any) => {
      const ordRecipient = (ord.recipient || ord.customerName || ord.ordererName || "").trim();
      const ordEmail = (ord.recipientEmail || ord.customerEmail || ord.email || "").toLowerCase().trim();
      if (sessionEmail && ordEmail === sessionEmail) return true;
      if (sessionName && ordRecipient && (ordRecipient.includes(sessionName) || sessionName.includes(ordRecipient))) return true;
      return false;
    });

    if (matched.length === 0 && allOrders.length > 0) {
      matched = allOrders.slice(0, 5);
    }

    const exploded = explodeOrderToSingleItems(matched);
    setRefundCustomerOrders(exploded);
    setIsRefundModalOpen(true);
  };

  // 토스 환불 성공 후 처리 핸들러 (실결제 취소 + 적립금 반환/회수 + 쿠폰 재사용 복원)
  const handleRefundSuccess = (result: any) => {
    let restoredCouponInfo = { restored: false, couponTitle: "", discountAmount: 0 };
    let pointsRestored = 0;
    let pointsRevoked = 0;

    if (typeof window !== "undefined") {
      let matchedOrder: any = null;

      // 1. 주문 상태 업데이트 및 대상 주문 정보 획득
      try {
        const savedOrders = localStorage.getItem("admin_orders");
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          const updated = parsed.map((o: any) => {
            if (o.id === result.orderNumber || o.orderNumber === result.orderNumber) {
              matchedOrder = o;
              return { ...o, status: "환불완료 (토스)", paymentStatus: "REFUNDED" };
            }
            return o;
          });
          localStorage.setItem("admin_orders", JSON.stringify(updated));
        }
      } catch (e) {}

      // 2. 배송 상태 업데이트
      try {
        const savedShipments = localStorage.getItem("admin_shipments");
        if (savedShipments) {
          const parsed = JSON.parse(savedShipments);
          const updated = parsed.map((s: any) => {
            if (s.id === result.orderNumber || s.orderId === result.orderNumber) {
              if (!matchedOrder) matchedOrder = s;
              return { ...s, status: "환불완료" };
            }
            return s;
          });
          localStorage.setItem("admin_shipments", JSON.stringify(updated));
        }
      } catch (e) {}

      // 3. 결제 시 사용했던 쿠폰 재사용 복원 (used_coupon_codes 및 history 복구)
      try {
        const couponRes = restoreCouponByOrder(result.orderNumber, matchedOrder?.couponId);
        restoredCouponInfo = {
          restored: couponRes.restored,
          couponTitle: couponRes.couponTitle || matchedOrder?.couponTitle || "할인 쿠폰",
          discountAmount: couponRes.discountAmount || Number(matchedOrder?.discountAmount || 0),
        };
      } catch (cErr) {
        console.warn("Failed to restore coupon on refund:", cErr);
      }

      // 4. 적립금 처리 (결제 시 사용했던 적립금은 반환, 결제 시 적립되었던 포인트는 회수)
      try {
        let pointsUsed = Number(matchedOrder?.pointsUsed || 0);

        // 4-0) membership_points_history에서 해당 주문의 사용 적립금 내역 교차 검증
        const historyRaw = localStorage.getItem("membership_points_history");
        let historyList: any[] = [];
        if (historyRaw) {
          try { historyList = JSON.parse(historyRaw); } catch (e) {}
        }

        const pointUseEntry = historyList.find(
          (h: any) => h.id === `point-use-${result.orderNumber}` || (h.label && h.label.includes(result.orderNumber) && h.amount < 0)
        );
        if (pointUseEntry && Math.abs(Number(pointUseEntry.amount)) > pointsUsed) {
          pointsUsed = Math.abs(Number(pointUseEntry.amount));
        }

        const pointsEarned = matchedOrder?.pointsEarned !== undefined
          ? Number(matchedOrder.pointsEarned)
          : Math.floor((Number(result.refundAmount) || 0) * 0.01);

        const customerEmail = (matchedOrder?.email || matchedOrder?.customerEmail || "").toLowerCase().trim();
        const customerName = (matchedOrder?.ordererName || matchedOrder?.customer || matchedOrder?.recipient || "").trim();
        const customerPhone = (matchedOrder?.phone || matchedOrder?.customerPhone || "").replace(/[^0-9]/g, "");

        // 4-1) 적립금 내역(membership_points_history) 업데이트
        const newEntries: any[] = [];
        const todayStr = new Date().toISOString().slice(0, 10);

        if (pointsUsed > 0) {
          pointsRestored = pointsUsed;
          newEntries.push({
            id: `point-restore-${result.orderNumber}-${Date.now()}`,
            label: `[주문 환불] 사용 적립금 반환 (주문번호: ${result.orderNumber})`,
            date: todayStr,
            amount: pointsUsed,
          });
        }

        if (pointsEarned > 0) {
          pointsRevoked = pointsEarned;
          newEntries.push({
            id: `point-revoke-${result.orderNumber}-${Date.now()}`,
            label: `[주문 환불] 구매 적립금 회수 (주문번호: ${result.orderNumber})`,
            date: todayStr,
            amount: -pointsEarned,
          });
        }

        if (newEntries.length > 0) {
          historyList = [...newEntries, ...historyList];
          localStorage.setItem("membership_points_history", JSON.stringify(historyList));
        }

        // 4-2) 회원 관리(admin_customers) 및 세션 포인트 잔액 동기화
        const savedCustRaw = localStorage.getItem("admin_customers");
        let custList: any[] = [];
        if (savedCustRaw) {
          try { custList = JSON.parse(savedCustRaw); } catch (e) {}
        }

        const matchedCust = custList.find((c: any) => {
          const cEmail = (c.email || "").toLowerCase().trim();
          const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
          const cName = (c.name || "").trim();
          if (customerEmail && cEmail === customerEmail) return true;
          if (customerPhone && customerPhone.length >= 8 && cPhone === customerPhone) return true;
          if (customerName && cName === customerName) return true;
          return false;
        });

        const netPointsChange = pointsRestored - pointsRevoked;

        // 기준 잔여 적립금 파악 (현재 고객 세션 적립금과 회원 DB 적립금 중 유효 잔여 포인트 기준)
        const currentSessionPts = Number(localStorage.getItem("membership_user_points") || "0");
        const custDbPts = matchedCust && matchedCust.points !== undefined ? Number(matchedCust.points) : 0;
        
        // basePoints: 세션에 남아있는 잔여 포인트가 있으면 우선 적용, 없으면 회원 DB 잔여 포인트
        const basePoints = currentSessionPts > 0 ? currentSessionPts : custDbPts;
        const updatedPts = Math.max(0, basePoints + netPointsChange);

        if (matchedCust) {
          matchedCust.points = updatedPts;
          matchedCust.totalSpent = Math.max(0, (Number(matchedCust.totalSpent) || 0) - Number(result.refundAmount || 0));
          localStorage.setItem("admin_customers", JSON.stringify(custList));

          // Supabase DB 비동기 반영
          try {
            supabase
              .from("customers")
              .update({
                points: updatedPts,
                totalSpent: matchedCust.totalSpent,
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchedCust.id)
              .then(() => {});
          } catch (e) {}
        }

        // 회원 로컬 세션 포인트(membership_user_points)에 기존 잔여 + 환불 가산 포인트를 즉시 저장
        localStorage.setItem("membership_user_points", String(updatedPts));

        window.dispatchEvent(new CustomEvent("membership_points_updated"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
        window.dispatchEvent(new CustomEvent("storage"));
      } catch (ptErr) {
        console.warn("Failed to update points on refund:", ptErr);
      }

      window.dispatchEvent(new CustomEvent("admin_orders_updated"));
      window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
    }

    // 알림 메시지 요약 구성
    let summaryMsg = `✓ 토스 결제 취소(₩${Number(result.refundAmount).toLocaleString()}원)가 완료되었습니다.`;
    if (pointsRestored > 0) summaryMsg += `\n🪙 사용 적립금 +${pointsRestored.toLocaleString()} P가 회원 계정으로 반환되었습니다.`;
    if (restoredCouponInfo.restored) summaryMsg += `\n🎟️ 사용하셨던 쿠폰 [${restoredCouponInfo.couponTitle}]이 다시 사용 가능하도록 복원되었습니다.`;

    toast.success(summaryMsg);

    // 고객 채팅방에 토스 결제 취소 완료 알림 카드 자동 전송
    const refundCompletedPayload = JSON.stringify({
      type: "REFUND_COMPLETED",
      orderNumber: result.orderNumber,
      items: result.items,
      image: result.image,
      refundAmount: result.refundAmount,
      pointsRestored: pointsRestored > 0 ? pointsRestored : undefined,
      couponRestored: restoredCouponInfo.restored ? (restoredCouponInfo.couponTitle || "할인 쿠폰") : undefined,
      paymentMethod: result.paymentMethod,
      cancelReason: result.cancelReason,
      completedAt: result.canceledAt,
    });
    handleAdminSendLiveChat(refundCompletedPayload);
  };

  // 3) CJ대한통운 수거접수 진행 모달 상태 및 데이터 (요구사항 1, 2, 3, 4)
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [pickupCustomerOrders, setPickupCustomerOrders] = useState<any[]>([]);
  const [selectedPickupOrder, setSelectedPickupOrder] = useState<any | null>(null);
  const [pickupReason, setPickupReason] = useState("사이즈 교환");
  const [pickupDetailReason, setPickupDetailReason] = useState("");
  const [pickupRecipient, setPickupRecipient] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupZipCode, setPickupZipCode] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupDetailAddress, setPickupDetailAddress] = useState("");
  const [pickupOriginalInvoice, setPickupOriginalInvoice] = useState("");
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);

  // 수거접수 모달 열기 핸들러 (교환 또는 반품)
  const handleOpenPickupModal = (type: "EXCHANGE" | "REFUND" = "EXCHANGE") => {
    setPickupBookingType(type);
    if (!activeSessionId || chatSessionsList.length === 0) {
      alert("좌측 라이브 세션 목록에서 상담을 진행할 고객을 먼저 선택해 주세요.");
      return;
    }

    const currentSession = chatSessionsList.find((s) => s.id === activeSessionId);
    const sessionEmail = (currentSession?.email || "").toLowerCase().trim();
    const sessionName = (currentSession?.name || "").trim();

    // 1. 고객의 주문 건 목록 수집 (admin_shipments 및 admin_orders)
    let allOrders: any[] = [];
    if (typeof window !== "undefined") {
      try {
        const savedShipments = localStorage.getItem("admin_shipments");
        if (savedShipments) {
          const parsed = JSON.parse(savedShipments);
          if (Array.isArray(parsed)) allOrders.push(...parsed);
        }
      } catch (e) {}

      try {
        const savedOrders = localStorage.getItem("admin_orders");
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            parsed.forEach((ord: any) => {
              if (!allOrders.some((s) => s.id === ord.id || s.orderId === ord.orderNumber)) {
                allOrders.push({
                  id: ord.id || ord.orderNumber,
                  orderId: ord.orderNumber || ord.id,
                  recipient: ord.customerName || ord.recipient,
                  phone: ord.customerPhone || ord.phone,
                  address: ord.address || "",
                  detailAddress: ord.detailAddress || "",
                  zipCode: ord.zipCode || "",
                  items: Array.isArray(ord.items) ? ord.items.map((it: any) => `${it.name} (${it.quantity}개)`).join(", ") : (ord.items || "주문 상품"),
                  trackingNumber: ord.trackingNumber || "-",
                  image: ord.image || "",
                });
              }
            });
          }
        }
      } catch (e) {}
    }

    // 고객 매칭 (이메일 또는 고객명 일치)
    let matched = allOrders.filter((ord: any) => {
      const ordRecipient = (ord.recipient || ord.customerName || ord.ordererName || "").trim();
      const ordEmail = (ord.recipientEmail || ord.customerEmail || ord.email || "").toLowerCase().trim();
      if (sessionEmail && ordEmail === sessionEmail) return true;
      if (sessionName && ordRecipient && (ordRecipient.includes(sessionName) || sessionName.includes(ordRecipient))) return true;
      return false;
    });

    if (matched.length === 0 && allOrders.length > 0) {
      matched = allOrders.slice(0, 5); // 매칭건이 없으면 최근 주문 표시
    }

    // 복수 상품 주문인 경우 개별 제품(1개 상품 단위)으로 낱개 분리하여 리스트업
    const exploded = explodeOrderToSingleItems(matched);
    setPickupCustomerOrders(exploded);

    const initialOrder = exploded[0] || null;
    setSelectedPickupOrder(initialOrder);
    setPickupRecipient(initialOrder?.recipient || sessionName || "고객");
    setPickupPhone(initialOrder?.phone || "");
    setPickupZipCode(initialOrder?.zipCode || "04524");
    setPickupAddress(initialOrder?.address || "서울특별시 중구 세종대로 110");
    setPickupDetailAddress(initialOrder?.detailAddress || "");
    setPickupOriginalInvoice(initialOrder?.trackingNumber && initialOrder.trackingNumber !== "-" ? initialOrder.trackingNumber : "");
    setPickupReason(type === "REFUND" ? "반품 / 환불 수거" : "사이즈 교환");
    setPickupDetailReason("");
    setIsPickupModalOpen(true);
  };

  // CJ대한통운 수거접수 실행 핸들러 (요구사항 1, 2, 3, 4)
  const handleExecutePickupBooking = async () => {
    if (!pickupRecipient.trim() || !pickupPhone.trim()) {
      alert("고객명과 연락처를 입력해 주세요.");
      return;
    }
    if (!pickupAddress.trim()) {
      alert("수거지 주소를 입력해 주세요.");
      return;
    }
    if (!selectedPickupOrder && !pickupOriginalInvoice.trim()) {
      alert("교환 대상 주문을 선택하거나 원 송장번호를 입력해 주세요.");
      return;
    }

    setIsSubmittingPickup(true);
    try {
      const orderNum = selectedPickupOrder?.orderId || selectedPickupOrder?.orderNumber || `EXC-${Date.now()}`;
      const itemsName = selectedPickupOrder?.items || "교환 요청 상품";
      const fullReason = `[교환사유] ${pickupReason}${pickupDetailReason.trim() ? ` - ${pickupDetailReason.trim()}` : ""}`;

      // 1. 실제 CJ대한통운 시스템으로 교환(회수) 접수 요청 (요구사항 1)
      const res = await fetch("/api/shipping/cj/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: `EXC-${orderNum.replace(/^EXC-/, "")}`,
          originalOrderId: orderNum,
          originalInvoiceNo: pickupOriginalInvoice.trim() || (selectedPickupOrder?.trackingNumber !== "-" ? selectedPickupOrder?.trackingNumber : "") || `6892-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: pickupRecipient.trim(),
          customerPhone: pickupPhone.trim(),
          customerZipCode: pickupZipCode.trim() || "04524",
          customerAddress: pickupAddress.trim(),
          customerDetailAddress: pickupDetailAddress.trim(),
          returnReason: fullReason,
          items: itemsName,
          quantity: selectedPickupOrder?.quantity || 1,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "CJ대한통운 수거 접수 실패");
      }

      // 2. 주문 및 배송 관리 주문 리스트(admin_shipments & admin_orders)에 추가 (요구사항 2, 3, 4)
      const isRefundPickup = pickupBookingType === "REFUND";
      const prefix = isRefundPickup ? "REF" : "EXC";
      const newExcOrderId = `${prefix}-${orderNum.replace(/^(EXC|REF)-/, "")}`;
      const newExchangeShipment = {
        id: `${prefix}-${Date.now()}`,
        orderId: newExcOrderId,
        originalOrderId: orderNum,
        ordererName: pickupRecipient.trim(),
        recipient: pickupRecipient.trim(),
        phone: pickupPhone.trim(),
        zipCode: pickupZipCode.trim() || "04524",
        address: pickupAddress.trim(),
        detailAddress: pickupDetailAddress.trim(),
        items: itemsName,
        quantity: selectedPickupOrder?.quantity || 1,
        carrier: "CJ대한통운",
        trackingNumber: data.bookingNumber || `CJ수거-${Date.now().toString().slice(-6)}`,
        status: "Pending", // 수거/배송 준비 중
        isExchangeOrder: !isRefundPickup,
        isRefundOrder: isRefundPickup,
        shippingMemo: fullReason,
        packages: [],
        created_at: new Date().toISOString(),
        orderDate: new Date().toISOString().split("T")[0],
      };

      if (typeof window !== "undefined") {
        // admin_shipments에 추가
        const savedShipments = localStorage.getItem("admin_shipments");
        let shipmentsList = savedShipments ? JSON.parse(savedShipments) : [];
        if (!Array.isArray(shipmentsList)) shipmentsList = [];
        shipmentsList.unshift(newExchangeShipment);
        localStorage.setItem("admin_shipments", JSON.stringify(shipmentsList));

        // admin_orders에 추가
        const savedOrders = localStorage.getItem("admin_orders");
        let ordersList = savedOrders ? JSON.parse(savedOrders) : [];
        if (!Array.isArray(ordersList)) ordersList = [];
        ordersList.unshift({
          ...newExchangeShipment,
          orderNumber: newExcOrderId,
          customerName: pickupRecipient.trim(),
          customerPhone: pickupPhone.trim(),
          totalAmount: 0,
          paymentStatus: "PAID",
          shippingStatus: isRefundPickup ? "반품수거접수완료" : "교환수거접수완료",
        });
        localStorage.setItem("admin_orders", JSON.stringify(ordersList));

        // 주문 및 배송 관리 컴포넌트 실시간 동기화
        window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
        window.dispatchEvent(new CustomEvent("admin_orders_updated"));
      }

      // 3. 라이브 채팅 상담창에 수거접수 완료 알림 버블 자동 전송
      const pickupCompletedPayload = JSON.stringify({
        type: isRefundPickup ? "REFUND_PICKUP_REGISTERED" : "EXCHANGE_PICKUP_REGISTERED",
        title: isRefundPickup ? "CJ대한통운 반품 수거접수 완료" : "CJ대한통운 교환 수거접수 완료",
        orderNumber: newExcOrderId,
        originalOrderId: orderNum,
        items: itemsName,
        reason: pickupReason,
        details: pickupDetailReason.trim(),
        bookingNumber: data.bookingNumber,
        recipient: pickupRecipient.trim(),
        address: `${pickupAddress.trim()} ${pickupDetailAddress.trim()}`.trim(),
        text: `CJ대한통운 전산에 ${isRefundPickup ? "반품" : "교환"} 수거 접수(예약번호: ${data.bookingNumber})가 완료되었습니다. 담당 기사님이 방문하여 상품을 안전하게 회수할 예정입니다.`,
      });
      handleAdminSendLiveChat(pickupCompletedPayload);

      alert(`✅ CJ대한통운 ${isRefundPickup ? "반품" : "교환"} 수거접수가 완료되었습니다!\n\n• 수거주문번호: ${newExcOrderId}\n• CJ예약접수번호: ${data.bookingNumber}\n• 주문 및 배송 관리 리스트에 '${isRefundPickup ? "반품" : "교환"} 수거 건'으로 등록되었습니다.\n• 배송메시지에 사유가 등록되었습니다.`);
      setIsPickupModalOpen(false);
    } catch (err: any) {
      console.error("CJ대한통운 수거 접수 실패:", err);
      const errMsg = err?.message || "알 수 없는 전산 오류가 발생했습니다.";
      alert(
        `🚨 [CJ대한통운 수거 접수 실패]\n\n` +
        `실제 CJ대한통운 전산 접수가 완료되지 않아 주문 등록이 중단되었습니다.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `[실패 사유]\n${errMsg}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `[대처 방법]\n` +
        `1. CJ API 설정(.env.local의 CJ_API_KEY, CJ_CUST_ID, CJ_BIZ_REG_NUM)을 확인하세요.\n` +
        `2. CJ대한통운 방화벽에 쇼핑몰 서버 IP가 등록되어 있는지 대리점에 확인하세요.\n` +
        `3. 고객 수거지 주소와 연락처가 올바른 규격인지 확인하세요.`
      );
      toast.error(`수거 접수 실패: ${errMsg}`);
    } finally {
      setIsSubmittingPickup(false);
    }
  };

  // Auto Reply (Chatbot) State
  const [isAutoReplyModalOpen, setIsAutoReplyModalOpen] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyDelay, setAutoReplyDelay] = useState(5.0); // seconds
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_auto_reply_rules");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasReturnRule = parsed.some((r: any) =>
              r.keywords?.includes("반품") || r.name?.includes("반품")
            );
            if (!hasReturnRule) {
              const returnRule: AutoReplyRule = {
                id: "auto-4",
                name: "교환 및 반품 안내",
                keywords: "교환, 반품, 환불, 취소, 수선",
                replyText:
                  "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
                enabled: true,
              };
              const merged = [...parsed, returnRule];
              localStorage.setItem("admin_auto_reply_rules", JSON.stringify(merged));
              return merged;
            }
            return parsed;
          }
        } catch (e) {}
      }
    }
    return DEFAULT_AUTO_RULES;
  });
  const [autoReplyFallback, setAutoReplyFallback] = useState(
    "문의해주신 내용을 전달되었습니다. 담당자 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕"
  );

  // New Rule Inputs
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleKeywords, setNewRuleKeywords] = useState("");
  const [newRuleReply, setNewRuleReply] = useState("");

  // New Template Inputs
  const [newLabel, setNewLabel] = useState("");
  const [newKo, setNewKo] = useState("");

  // Confirmation Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  // Auto-scroll to bottom of conversation & scroll preservation when reading history
  const adminMessagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const isAtBottomRef = React.useRef<boolean>(true);
  const prevSessionIdRef = React.useRef<string>(activeSessionId);
  const lastSeenMsgIdRef = React.useRef<string | null>(null);
  const [newMsgNotice, setNewMsgNotice] = useState<any | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    if (chatContainerRef.current) {
      if (behavior === "auto") {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setNewMsgNotice(null);
  }, []);

  const handleChatScroll = React.useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isBottom = distanceToBottom < 75;

    isAtBottomRef.current = isBottom;
    setShowScrollBottomBtn(!isBottom);

    if (isBottom) {
      setNewMsgNotice(null);
    }
  }, []);

  // 1. 세션 전환 시: 새 세션의 최하단으로 즉시 스크롤
  useEffect(() => {
    if (prevSessionIdRef.current !== activeSessionId) {
      prevSessionIdRef.current = activeSessionId;
      isAtBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setNewMsgNotice(null);
      lastSeenMsgIdRef.current = null;
      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSessionId, scrollToBottom]);

  // 2. 메시지 수신 및 스크롤 관리 (과거 대화 확인 중 상단 스크롤 시 자동 하단 이동 방지)
  useEffect(() => {
    if (!activeSessionMessages || activeSessionMessages.length === 0) return;

    const latestMsg = activeSessionMessages[activeSessionMessages.length - 1];
    if (!latestMsg) return;

    // 세션 첫 로딩 시 최하단으로 이동
    if (!lastSeenMsgIdRef.current) {
      lastSeenMsgIdRef.current = latestMsg.id;
      scrollToBottom("auto");
      return;
    }

    // 폴링 등으로 동일한 메시지 배열이 갱신된 경우는 스크롤 위치 유지 (화면 강제 당김 방지)
    if (latestMsg.id === lastSeenMsgIdRef.current) {
      return;
    }

    lastSeenMsgIdRef.current = latestMsg.id;

    if (latestMsg.sender === "admin") {
      // 관리자 본인이 보낸 메시지는 항상 최하단으로 즉시 이동
      scrollToBottom("smooth");
      setNewMsgNotice(null);
    } else {
      // 고객 신규 메시지가 도착한 경우
      if (isAtBottomRef.current) {
        // 이미 최하단에 머무르고 있는 경우 최신 대화로 부드럽게 스크롤
        scrollToBottom("smooth");
        setNewMsgNotice(null);
      } else {
        // 과거 대화를 스크롤하여 확인 중인 경우:
        // 강제 이동을 방지하고 자유로운 스크롤 유지, 하단에 신규 메시지 말풍선 버튼 표시
        setNewMsgNotice(latestMsg);
      }
    }
  }, [activeSessionMessages, scrollToBottom]);

  const onSendLiveChat = React.useCallback((text?: string) => {
    handleAdminSendLiveChat(text);
    isAtBottomRef.current = true;
    setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
  }, [handleAdminSendLiveChat, scrollToBottom]);

  const getMessageSnippet = React.useCallback((rawText: string) => {
    if (!rawText) return "새 메시지가 도착했습니다.";
    if (rawText.startsWith('{"type":"EXCHANGE_REQUEST"')) {
      return "🔄 교환 접수 안내 및 신청서";
    }
    if (rawText.startsWith('{"type":"EXCHANGE_PAY_REQUEST"')) {
      return "💳 교환 왕복 배송비(16,000원) 결제 요청";
    }
    if (rawText.startsWith('{"type":"EXCHANGE_COMPLETED"')) {
      return "✓ 교환 접수 및 배송비 결제 완료";
    }
    if (rawText.startsWith('{"type":"EXCHANGE_PICKUP_REGISTERED"')) {
      return "🚚 CJ대한통운 교환 수거접수 완료 안내";
    }
    if (rawText.startsWith('{"type":"REFUND_REQUEST"')) {
      return "↩️ 환불 접수 안내 및 신청서";
    }
    if (rawText.startsWith('{"type":"REFUND_SUBMITTED"')) {
      return "📝 환불 신청 접수 완료";
    }
    if (rawText.startsWith('{"type":"REFUND_COMPLETED"')) {
      return "💳 토스페이먼츠 결제 취소/환불 완료";
    }
    if (rawText.startsWith('{"type":"REFUND_PICKUP_REGISTERED"')) {
      return "🚚 CJ대한통운 반품 수거접수 완료 안내";
    }
    if (rawText.startsWith('{"type":"ORDER_SELECT_REQUEST"')) {
      return "📦 문의하실 주문건 선택 요청";
    }
    if (rawText.startsWith('{"type":"ORDER_SELECTED"')) {
      return "📦 주문건이 선택되었습니다.";
    }
    return rawText;
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Load Quick Reply Templates
      const saved = localStorage.getItem("admin_quick_reply_templates");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTemplates(parsed);
          } else {
            setTemplates(DEFAULT_TEMPLATES);
          }
        } catch (e) {
          setTemplates(DEFAULT_TEMPLATES);
        }
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }

      // 2. Load Auto Reply Config
      const savedAutoEnabled = localStorage.getItem("admin_auto_reply_enabled");
      if (savedAutoEnabled !== null) {
        setAutoReplyEnabled(savedAutoEnabled === "true");
      }

      const savedAutoDelay = localStorage.getItem("admin_auto_reply_delay");
      if (savedAutoDelay !== null) {
        const num = parseFloat(savedAutoDelay);
        if (!isNaN(num)) setAutoReplyDelay(num);
      }

      const savedAutoRules = localStorage.getItem("admin_auto_reply_rules");
      if (savedAutoRules) {
        try {
          const parsed = JSON.parse(savedAutoRules);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if return/exchange rule exists, if not, restore it
            const hasReturnRule = parsed.some((r: any) =>
              r.keywords?.includes("반품") || r.name?.includes("반품")
            );
            if (!hasReturnRule) {
              const returnRule: AutoReplyRule = {
                id: "auto-4",
                name: "교환 및 반품 안내",
                keywords: "교환, 반품, 환불, 취소, 수선",
                replyText:
                  "상품 수령 후 7일 이내 마이페이지 또는 상담을 통해 교환/반품 접수가 가능합니다. 담당자가 신속히 확인하여 도와드리겠습니다. 🔄",
                enabled: true,
              };
              const merged = [...parsed, returnRule];
              setAutoReplyRules(merged);
              localStorage.setItem("admin_auto_reply_rules", JSON.stringify(merged));
            } else {
              setAutoReplyRules(parsed);
            }
          } else {
            setAutoReplyRules(DEFAULT_AUTO_RULES);
          }
        } catch (e) {
          setAutoReplyRules(DEFAULT_AUTO_RULES);
        }
      } else {
        setAutoReplyRules(DEFAULT_AUTO_RULES);
      }

      const savedFallback = localStorage.getItem("admin_auto_reply_fallback");
      if (savedFallback) {
        setAutoReplyFallback(savedFallback);
      }

      // Fetch shared settings from Supabase site_settings (for cross-device/browser sync)
      try {
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chat_auto_reply_config")
          .maybeSingle()
          .then(({ data, error }) => {
            if (!error && data?.value) {
              const val = data.value;
              if (typeof val.enabled === "boolean") {
                setAutoReplyEnabled(val.enabled);
                localStorage.setItem("admin_auto_reply_enabled", String(val.enabled));
              }
              if (typeof val.delay === "number") {
                setAutoReplyDelay(val.delay);
                localStorage.setItem("admin_auto_reply_delay", String(val.delay));
              }
              if (Array.isArray(val.rules) && val.rules.length > 0) {
                setAutoReplyRules(val.rules);
                localStorage.setItem("admin_auto_reply_rules", JSON.stringify(val.rules));
              }
              if (typeof val.fallback === "string" && val.fallback.trim()) {
                setAutoReplyFallback(val.fallback);
                localStorage.setItem("admin_auto_reply_fallback", val.fallback);
              }
            }
          });
      } catch (e) {}
    }
  }, []);

  const saveAutoReplyConfig = (
    enabled: boolean,
    delay: number,
    rules: AutoReplyRule[],
    fallback: string
  ) => {
    setAutoReplyEnabled(enabled);
    setAutoReplyDelay(delay);
    setAutoReplyRules(rules);
    setAutoReplyFallback(fallback);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_auto_reply_enabled", String(enabled));
      localStorage.setItem("admin_auto_reply_delay", String(delay));
      localStorage.setItem("admin_auto_reply_rules", JSON.stringify(rules));
      localStorage.setItem("admin_auto_reply_fallback", fallback);
      window.dispatchEvent(
        new CustomEvent("live_chat_config_updated", {
          detail: { enabled, delay, rules, fallback },
        })
      );

      // Instant 0ms cross-tab broadcast to customer chat widget
      if ("BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("choicomma_live_chat_sync");
          bc.postMessage({
            type: "CONFIG_UPDATED",
            config: { enabled, delay, rules, fallback },
          });
          bc.close();
        } catch (e) {}
      }
    }

    // Persist to Supabase site_settings for cross-browser, cross-device persistence
    try {
      supabase
        .from("site_settings")
        .upsert(
          {
            key: "chat_auto_reply_config",
            value: {
              enabled,
              delay,
              rules,
              fallback,
            },
            description: "실시간 채팅 자동 답변 및 기본 안내 문구 설정",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        )
        .then(({ error }) => {
          if (error) {
            console.warn("Notice: Failed to persist auto-reply config to site_settings:", error);
          }
        });
    } catch (e) {}
  };

  const handleAddAutoRule = () => {
    if (!newRuleKeywords.trim() || !newRuleReply.trim()) {
      alert("키워드와 자동 응답 문구를 모두 입력해 주세요.");
      return;
    }
    const newRule: AutoReplyRule = {
      id: `auto-${Date.now()}`,
      name: newRuleName.trim() || "맞춤 키워드 규칙",
      keywords: newRuleKeywords.trim(),
      replyText: newRuleReply.trim(),
      enabled: true,
    };
    const updated = [...autoReplyRules, newRule];
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
    setNewRuleName("");
    setNewRuleKeywords("");
    setNewRuleReply("");
    setConfirmDialog("새로운 키워드 자동 응답 규칙이 등록되었습니다!");
  };

  // Pending Delete State for '삭제하시겠습니까?' Confirm Dialog
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteAutoRule = (id: string) => {
    const target = autoReplyRules.find((r) => r.id === id);
    setPendingDelete({ id, name: target?.name || "선택한 키워드 규칙" });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const updated = autoReplyRules.filter((r) => r.id !== pendingDelete.id);
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
    setPendingDelete(null);
    setConfirmDialog("키워드 자동 답변 규칙이 삭제되었습니다.");
  };

  const handleToggleAutoRule = (id: string) => {
    const updated = autoReplyRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
  };

  const handleResetAutoRules = () => {
    saveAutoReplyConfig(true, 1.5, DEFAULT_AUTO_RULES, "문의해주신 내용을 전달되었습니다. 담당자 확인 후 곧 답변드리겠습니다. 잠시만 기다려 주세요! ☕");
    setConfirmDialog("자동 응답 설정이 기본값으로 초기화되었습니다.");
  };

  // Pending Edit State for '수정하시겠습니까?' Confirm Dialog (Supports Quick Reply & Auto-Reply Rules)
  const [pendingEdit, setPendingEdit] = useState<{
    id: string;
    type?: "quick" | "auto";
    field: string;
    value: string;
    oldText?: string;
  } | null>(null);

  const saveTemplates = (newItems: TemplateItem[]) => {
    setTemplates(newItems);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_quick_reply_templates", JSON.stringify(newItems));
    }
  };

  // Trigger '수정하시겠습니까?' Prompt when input finishes (onBlur or Enter)
  const handleRequestEditConfirm = (
    id: string,
    field: "label" | "ko",
    value: string,
    oldText: string
  ) => {
    if (value.trim() === oldText.trim()) return; // No change
    setPendingEdit({ id, type: "quick", field, value, oldText });
  };

  // Update a specific rule immediately or with confirmation
  const handleUpdateAutoRuleField = (id: string, field: keyof AutoReplyRule, value: any) => {
    const updated = autoReplyRules.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
  };

  // Apply Pending Edit when user clicks '네, 수정합니다'
  const handleConfirmEdit = () => {
    if (!pendingEdit) return;
    const { id, type, field, value } = pendingEdit;

    if (type === "auto") {
      const updated = autoReplyRules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      );
      saveAutoReplyConfig(autoReplyEnabled, autoReplyDelay, updated, autoReplyFallback);
      setConfirmDialog("자동 답변 규칙이 성공적으로 수정되었습니다.");
    } else {
      const updated = templates.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            [field]: value,
          };
        }
        return t;
      });
      saveTemplates(updated);
      setConfirmDialog("빠른 답장 템플릿이 성공적으로 수정되었습니다.");
    }
    setPendingEdit(null);
  };

  const handleAddTemplate = () => {
    if (!newKo.trim()) return;
    const newItem: TemplateItem = {
      id: `tmpl-${Date.now()}`,
      label: newLabel.trim() || "맞춤 답변",
      ko: newKo.trim(),
    };
    const updated = [...templates, newItem];
    saveTemplates(updated);
    setNewLabel("");
    setNewKo("");
    setConfirmDialog("새로운 빠른 답장 템플릿이 등록되었습니다!");
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setConfirmDialog("선택한 템플릿이 삭제되었습니다.");
  };

  const handleResetDefaults = () => {
    saveTemplates(DEFAULT_TEMPLATES);
    setConfirmDialog("기본 템플릿 복원이 완료되었습니다.");
  };

  // Helper to dynamically get the customer's real grade/tier badge
  const getSessionBadgeInfo = (session: any) => {
    const isAdm =
      session.email === "admin" ||
      session.email === "admin@choicomma.com" ||
      session.id === "admin" ||
      session.name?.includes("관리자");
    if (isAdm) {
      return { tier: "관리자", color: "bg-neutral-900 text-white font-black" };
    }
    if (session.id === "guest" || session.email === "guest@choicomma.com" || session.name === "실시간 방문 고객") {
      return { tier: "비회원", color: "bg-neutral-200 text-neutral-700 font-bold" };
    }

    if (typeof window !== "undefined") {
      const adminCustomers = localStorage.getItem("admin_customers");
      if (adminCustomers) {
        try {
          const list = JSON.parse(adminCustomers);
          const found = list.find((c: any) =>
            (c.email && session.email && c.email.toLowerCase() === session.email.toLowerCase()) ||
            (c.name && session.name && session.name.includes(c.name))
          );
          if (found && (found.grade || found.tier)) {
            const g = String(found.grade || found.tier).toUpperCase();
            if (g.includes("VVIP") || g.includes("BLACK")) {
              return { tier: "VVIP", color: "bg-neutral-950 text-white font-black border border-neutral-700" };
            }
            if (g.includes("PLATINUM") || g.includes("플래티넘")) {
              return { tier: "PLATINUM", color: "bg-neutral-800 text-white font-black border border-neutral-700" };
            }
            if (g.includes("GOLD") || g.includes("골드")) {
              return { tier: "GOLD", color: "bg-neutral-200 text-neutral-900 font-black border border-neutral-300" };
            }
            if (g.includes("SILVER") || g.includes("실버")) {
              return { tier: "SILVER", color: "bg-neutral-100 text-neutral-800 font-black border border-neutral-300" };
            }
            if (g.includes("VIP")) {
              return { tier: "VIP", color: "bg-neutral-900 text-white font-black" };
            }
            return { tier: found.grade || found.tier || "일반회원", color: "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300" };
          }
        } catch (e) {}
      }
    }

    // If session.tier is hardcoded VIP without matched database VIP grade, normalize to 일반회원
    if (session.tier === "VIP" && !session.name?.includes("VIP")) {
      return { tier: "일반회원", color: "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300" };
    }

    return {
      tier: session.tier || "일반회원",
      color: session.badgeColor || "bg-neutral-100 text-neutral-800 font-bold border border-neutral-300",
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-neutral-900" />
            1:1 실시간 라이브 채팅 상담
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            쇼핑몰 라이브 채팅 문의를 실시간으로 확인하고 응대합니다. 하단 원클릭 답장 템플릿은 입력 즉시 변경됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoReplyModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-900 font-black text-xs px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer border border-neutral-300"
          >
            <Sliders className="w-4 h-4 text-neutral-900" />
            <span>자동 답변 설정</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${autoReplyEnabled ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-700"}`}>
              {autoReplyEnabled ? `${autoReplyDelay}초` : "꺼짐"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer border border-neutral-800"
          >
            <Edit3 className="w-4 h-4 text-white" />
            <span>실시간 템플릿 수정/편집</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Session Card List */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <span className="text-xs font-black text-neutral-950 uppercase tracking-wider">
              라이브 대화 세션 목록 ({chatSessionsList.length}개 온라인)
            </span>
            <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
              실시간 세션
            </span>
          </div>

          {/* Customer Sessions Stack */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {chatSessionsList.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-200/60">
                현재 활성화된 1:1 라이브 채팅 세션이 없습니다.
              </div>
            ) : (
              chatSessionsList.map((session) => {
                const isSelected = activeSessionId === session.id;
                const isEnded = session.status === "ended" || (session.id === activeSessionId && isLiveChatSessionEnded);
                const badgeInfo = getSessionBadgeInfo(session);
                return (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-neutral-950 text-white border-neutral-900 shadow-md"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black">{session.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${badgeInfo.color}`}>
                          {badgeInfo.tier}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isEnded
                          ? "bg-neutral-200 text-neutral-600"
                          : "bg-blue-600 text-white"
                      }`}>
                        {isEnded ? "상담종료" : "접속중"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={isSelected ? "text-neutral-400 font-mono" : "text-neutral-500 font-mono"}>
                        {session.email}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdminEndLiveChat(session.id);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
                            : "bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200"
                        }`}
                      >
                        🔒 상담 종료
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Preset Reply Quick Chips */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-neutral-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                <span>원클릭 빠른 답장 템플릿 ({templates.length}개)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-extrabold px-2 py-0.5 rounded-md border border-neutral-300 transition-colors cursor-pointer notranslate"
                translate="no"
              >
                ⚡ 실시간 수정하기
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => onSendLiveChat(tmpl.ko)}
                  className="w-full text-left bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 border border-neutral-200/90 p-3 rounded-2xl transition-all cursor-pointer space-y-1 group"
                >
                  {/* 상단 한글 원문 (구글 번역 보호: notranslate) */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-md notranslate inline-block" translate="no">
                      🇰🇷 [한글]: {tmpl.ko}
                    </span>
                    <span className="text-[9px] font-extrabold text-neutral-800 bg-neutral-200 px-1.5 py-0.2 rounded notranslate" translate="no">
                      {tmpl.label}
                    </span>
                  </div>
                  {/* 하단 템플릿 메시지 본문 */}
                  <div className="text-[11px] font-bold text-neutral-800 group-hover:text-black pt-0.5 leading-relaxed">
                    {tmpl.ko}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Chat History & Input Area */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-neutral-950">
                실시간 대화 내역 ({chatSessionsList.find((s) => s.id === activeSessionId)?.name || "진행 중인 상담 없음"})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!activeSessionId || chatSessionsList.length === 0}
                onClick={() => handleAdminEndLiveChat(activeSessionId)}
                className="bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 border border-neutral-300 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                title="선택한 고객과의 1:1 라이브 상담을 종료합니다"
              >
                <LogOut className="w-3.5 h-3.5" />
                상담 종료
              </button>
              <button
                type="button"
                disabled={!activeSessionId || chatSessionsList.length === 0}
                onClick={handleAdminClearLiveChat}
                className="bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 border border-neutral-300 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                title="라이브 채팅 대화 기록을 전체 초기화합니다"
              >
                <Trash2 className="w-3.5 h-3.5" />
                대화 내역 초기화
              </button>
            </div>
          </div>

          {/* Conversation Bubbles Container */}
          <div className="relative flex-1 flex flex-col min-h-0">
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F5]/70 rounded-2xl border border-neutral-200/60"
            >
            {activeSessionMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <MessageSquare className="w-10 h-10 text-neutral-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-neutral-600">상담이 종료되었거나 대화 내역이 없습니다.</p>
                <p className="text-[11px] text-neutral-400 mt-1">좌측 세션 목록에서 고객을 선택하거나 새로운 라이브 문의를 기다려주세요.</p>
              </div>
            ) : (
              activeSessionMessages.map((msg: any) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} space-y-1`}
                  >
                    <span className="text-[10px] font-extrabold text-neutral-400 px-1">
                      {msg.senderName} • {msg.timestamp}
                    </span>
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                        isAdmin
                          ? "bg-neutral-950 text-white font-bold rounded-tr-xs border border-neutral-800"
                          : "bg-white text-neutral-900 border border-neutral-200 font-bold rounded-tl-xs"
                      }`}
                    >
                      {(() => {
                        let parsed: any = null;
                        if (
                          typeof msg.text === "string" &&
                          (msg.text.startsWith('{"type":"ORDER_') ||
                           msg.text.startsWith('{"type":"EXCHANGE_') ||
                           msg.text.startsWith('{"type":"REFUND_'))
                        ) {
                          try { parsed = JSON.parse(msg.text); } catch (e) {}
                        }
                        if (parsed?.type === "ORDER_SELECT_REQUEST") {
                          return (
                            <div className="space-y-1.5 text-left notranslate" translate="no">
                              <div className="flex items-center gap-1.5 text-white font-black text-xs">
                                <Package className="w-4 h-4 text-blue-400" />
                                <span>주문건 선택 요청 전송됨</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                                {parsed.text || "고객님께 문의하실 주문건을 선택할 수 있는 주문 카드를 전송했습니다."}
                              </p>
                              <div className="text-[10px] text-neutral-400 font-bold pt-0.5">
                                ⏳ 고객이 주문건을 선택하면 해당 상세 정보가 이곳에 바로 표시됩니다.
                              </div>
                            </div>
                          );
                        }
                        if (parsed?.type === "ORDER_SELECTED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <Package className={`w-4 h-4 ${isAdmin ? "text-blue-400" : "text-neutral-800"}`} />
                                  <span>고객 선택 문의 주문건</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  {parsed.status || "주문완료"}
                                </span>
                              </div>

                              {/* Thumbnail on Left, Product Details on Right */}
                              <div className="flex items-start gap-3">
                                <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin
                                    ? "bg-neutral-900 border-neutral-800"
                                    : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "주문 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-500"}`}>
                                    주문번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-2 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  {parsed.amount && (
                                    <div className={`text-xs font-black font-mono ${isAdmin ? "text-white" : "text-neutral-950"}`}>
                                      {parsed.amount}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {parsed.trackingNumber && parsed.trackingNumber !== "-" && (
                                <div className={`text-[11px] flex justify-between pt-1.5 border-t ${
                                  isAdmin ? "text-neutral-300 border-neutral-800" : "text-neutral-600 border-neutral-200"
                                }`}>
                                  <span>운송장:</span>
                                  <span className={`font-mono font-bold ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.trackingNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (parsed?.type === "EXCHANGE_REQUEST") {
                          return (
                            <div className="space-y-1.5 text-left notranslate" translate="no">
                              <div className="flex items-center gap-1.5 text-white font-black text-xs">
                                <RefreshCw className="w-4 h-4 text-blue-400" />
                                <span>교환접수요청서 전송됨</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                                {parsed.text || "고객님께 교환 접수 및 배송비 결제 양식을 전송했습니다."}
                              </p>
                              <div className="text-[10px] text-neutral-400 font-bold pt-0.5">
                                ⏳ 고객이 교환 정보를 입력하고 왕복 배송비(16,000원)를 결제하면 교환 접수 내역이 이곳에 표시됩니다.
                              </div>
                            </div>
                          );
                        }
                        if (parsed?.type === "EXCHANGE_PAY_REQUEST") {
                          return (
                            <div className="space-y-1.5 text-left notranslate" translate="no">
                              <div className="flex items-center gap-1.5 text-white font-black text-xs">
                                <CreditCard className="w-4 h-4 text-blue-400" />
                                <span>교환접수비용결제창 전송됨</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                                {parsed.text || "고객님께 교환 왕복 배송비(16,000원) 결제창을 전송했습니다."}
                              </p>
                              <div className="text-[10px] text-neutral-400 font-bold pt-0.5">
                                💳 고객이 토스페이먼츠(16,000원) 결제를 완료하면 접수 완료 내역이 표시됩니다.
                              </div>
                            </div>
                          );
                        }
                        if (parsed?.type === "EXCHANGE_COMPLETED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <RefreshCw className="w-4 h-4 text-blue-400" />
                                  <span>교환 접수 완료</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  {parsed.fee > 0 ? "배송비 결제완료" : "무료 교환"}
                                </span>
                              </div>

                              {/* Thumbnail on Left, Product Details on Right */}
                              <div className="flex items-start gap-3">
                                <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin
                                    ? "bg-neutral-900 border-neutral-800"
                                    : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "교환 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-700"}`}>
                                    주문번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-2 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  <div className="text-xs font-black font-mono text-blue-400">
                                    {parsed.fee > 0
                                      ? `배송비: ${Number(parsed.fee).toLocaleString()}원 결제완료 (${parsed.paymentMethod || "토스"})`
                                      : "왕복 배송비: 0원 (무료)"}
                                  </div>
                                </div>
                              </div>

                              {/* Reason & Return Guide */}
                              <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                isAdmin ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-50 border border-neutral-200"
                              }`}>
                                <div className="flex items-start gap-1">
                                  <span className="font-bold shrink-0 opacity-70">교환사유:</span>
                                  <span className="font-extrabold">{parsed.reason || "사이즈/색상 교환"}</span>
                                </div>
                                {parsed.details && (
                                  <p className="text-[11px] opacity-80 pl-1 border-l-2 border-neutral-700">
                                    {parsed.details}
                                  </p>
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-400 font-medium pt-0.5">
                                📦 CJ대한통운 영업소로 반품 수거 접수 완료 (1~2일 내 방문)
                              </div>
                            </div>
                          );
                        }
                        if (parsed?.type === "EXCHANGE_PICKUP_REGISTERED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <Truck className="w-4 h-4 text-blue-400" />
                                  <span>CJ대한통운 수거접수 완료</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  교환수거
                                </span>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "교환 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-500"}`}>
                                    교환번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-1 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  {parsed.bookingNumber && (
                                    <div className="text-[10px] font-mono font-bold text-neutral-300">
                                      CJ예약번호: {parsed.bookingNumber}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                isAdmin ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-50 border border-neutral-200"
                              }`}>
                                <div className="flex items-start gap-1">
                                  <span className="font-bold shrink-0 opacity-70">교환사유:</span>
                                  <span className="font-extrabold text-white">
                                    {parsed.reason} {parsed.details ? `(${parsed.details})` : ""}
                                  </span>
                                </div>
                                {parsed.address && (
                                  <div className="text-[10px] opacity-80 pt-0.5 border-t border-neutral-800">
                                    <span className="font-bold">수거지: </span>
                                    <span>{parsed.address}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-400 font-medium pt-0.5">
                                🚚 CJ대한통운 기사님이 1~2영업일 내에 방문 수거할 예정입니다.
                              </div>
                            </div>
                          );
                        }

                        if (parsed?.type === "REFUND_REQUEST") {
                          return (
                            <div className="space-y-1.5 text-left notranslate" translate="no">
                              <div className="flex items-center gap-1.5 text-white font-black text-xs">
                                <RotateCcw className="w-4 h-4 text-blue-400" />
                                <span>환불접수요청서 전송됨</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                                {parsed.text || "고객님께 환불 접수 및 구매금액 취소 신청서 양식을 전송했습니다."}
                              </p>
                              <div className="text-[10px] text-neutral-400 font-bold pt-0.5">
                                ⏳ 고객이 환불 신청서를 제출하면 환불 상품 및 사유가 이곳에 표시되며, 즉시 토스 결제 취소를 진행할 수 있습니다.
                              </div>
                            </div>
                          );
                        }

                        if (parsed?.type === "REFUND_SUBMITTED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <RotateCcw className="w-4 h-4 text-blue-400" />
                                  <span>고객 환불 신청서 접수됨</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  환불신청
                                </span>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "환불 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-700"}`}>
                                    주문번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-2 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  {parsed.amount && (
                                    <div className="text-xs font-black font-mono text-white">
                                      결제금액: {parsed.amount}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                isAdmin ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-50 border border-neutral-200"
                              }`}>
                                <div className="flex items-start gap-1">
                                  <span className="font-bold shrink-0 opacity-70">환불사유:</span>
                                  <span className="font-extrabold text-white">
                                    {parsed.reason || "단순 변심"}
                                  </span>
                                </div>
                                {parsed.details && (
                                  <p className="text-[11px] opacity-90 pl-1 border-l-2 border-neutral-700">
                                    {parsed.details}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRefundPrefillOrder({
                                    id: parsed.orderId || parsed.orderNumber,
                                    orderId: parsed.orderId || parsed.orderNumber,
                                    orderNumber: parsed.orderNumber,
                                    uniqueSelectId: `${parsed.orderNumber}_1`,
                                    items: parsed.items,
                                    itemName: parsed.items,
                                    quantity: 1,
                                    amount: parsed.amount || "",
                                    image: thumb,
                                  });
                                  setIsRefundModalOpen(true);
                                }}
                                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-1 active:scale-98"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>토스 결제 취소 (환불 처리하기)</span>
                              </button>
                            </div>
                          );
                        }

                        if (parsed?.type === "REFUND_COMPLETED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <CreditCard className="w-4 h-4 text-blue-400" />
                                  <span>토스 결제 취소 / 환불 완료</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  PG 승인취소
                                </span>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "환불 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-700"}`}>
                                    주문번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-2 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  <div className="text-xs font-black font-mono text-blue-400">
                                    -₩{Number(parsed.refundAmount || 0).toLocaleString()}원 환불
                                  </div>
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                isAdmin ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-50 border border-neutral-200"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="opacity-70 font-medium">결제수단:</span>
                                  <span className="font-bold">{parsed.paymentMethod || "신용·체크카드 (토스)"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="opacity-70 font-medium">취소사유:</span>
                                  <span className="font-bold">{parsed.cancelReason || "고객 요청"}</span>
                                </div>
                              </div>

                              {(parsed.pointsRestored || parsed.couponRestored) && (
                                <div className={`p-2.5 rounded-xl text-[11px] space-y-1 border ${
                                  isAdmin
                                    ? "bg-neutral-900 border-neutral-800 text-neutral-300"
                                    : "bg-neutral-50 border-neutral-200 text-neutral-800"
                                }`}>
                                  {parsed.pointsRestored && (
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">🪙 사용 적립금 반환</span>
                                      <span className="font-bold font-mono">+{Number(parsed.pointsRestored).toLocaleString()} P</span>
                                    </div>
                                  )}
                                  {parsed.couponRestored && (
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">🎟️ 할인 쿠폰 재사용 복원</span>
                                      <span className="font-bold">[{parsed.couponRestored}] 복원완료</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="text-[10px] text-neutral-400 font-bold pt-0.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>토스페이먼츠 PG 승인 취소가 완료되었습니다.</span>
                              </div>
                            </div>
                          );
                        }

                        if (parsed?.type === "REFUND_PICKUP_REGISTERED") {
                          const thumb = parsed.image || getProductThumbnail(parsed.items);
                          return (
                            <div className={`space-y-2.5 text-left p-3.5 rounded-2xl border notranslate max-w-[340px] ${
                              isAdmin
                                ? "bg-neutral-950 border-neutral-800 text-white shadow-md"
                                : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                            }`} translate="no">
                              <div className={`flex items-center justify-between pb-1.5 border-b ${
                                isAdmin ? "border-neutral-800" : "border-neutral-200"
                              }`}>
                                <span className={`text-xs font-black flex items-center gap-1.5 ${
                                  isAdmin ? "text-white" : "text-neutral-900"
                                }`}>
                                  <Truck className="w-4 h-4 text-blue-400" />
                                  <span>CJ대한통운 반품 수거접수 완료</span>
                                </span>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                  isAdmin
                                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                }`}>
                                  반품수거
                                </span>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border ${
                                  isAdmin ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                                }`}>
                                  <img
                                    src={thumb}
                                    alt={parsed.items || "반품 상품"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "https://cdn.imweb.me/thumbnail/20260923/47af1f42c40a4357.jpg";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className={`text-[11px] font-mono font-black ${isAdmin ? "text-neutral-400" : "text-neutral-500"}`}>
                                    주문번호: {parsed.orderNumber}
                                  </div>
                                  <div className={`text-xs font-bold leading-snug line-clamp-1 ${isAdmin ? "text-white" : "text-neutral-900"}`}>
                                    {parsed.items}
                                  </div>
                                  {parsed.bookingNumber && (
                                    <div className="text-[10px] font-mono font-bold text-neutral-300">
                                      CJ예약번호: {parsed.bookingNumber}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                isAdmin ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-50 border border-neutral-200"
                              }`}>
                                <div className="flex items-start gap-1">
                                  <span className="font-bold shrink-0 opacity-70">반품사유:</span>
                                  <span className="font-extrabold text-white">
                                    {parsed.reason} {parsed.details ? `(${parsed.details})` : ""}
                                  </span>
                                </div>
                                {parsed.address && (
                                  <div className="text-[10px] opacity-80 pt-0.5 border-t border-neutral-800">
                                    <span className="font-bold">수거지: </span>
                                    <span>{parsed.address}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-400 font-medium pt-0.5">
                                🚚 CJ대한통운 기사님이 1~2영업일 내에 방문 수거할 예정입니다.
                              </div>
                            </div>
                          );
                        }

                        return msg.text;
                      })()}

                      {Array.isArray(msg.images) && msg.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-neutral-200/40">
                          {msg.images.map((img: string, i: number) => (
                            <img
                              key={i}
                              src={img}
                              alt="첨부 이미지"
                              className="w-full aspect-square object-cover rounded-xl border border-neutral-300 bg-neutral-100"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={adminMessagesEndRef} />
          </div>

          {/* Floating New Message Notification Bubble (과거 대화 확인 중 신규 메시지 도착 시) */}
          {newMsgNotice && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[90%]">
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="bg-neutral-950/95 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-neutral-800 flex items-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
                title="최신 대화로 이동"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[11px] font-extrabold text-blue-300 shrink-0">새 메시지</span>
                <span className="truncate max-w-[200px] sm:max-w-[280px] text-white">
                  {getMessageSnippet(newMsgNotice.text)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[3] shrink-0 animate-bounce" />
              </button>
            </div>
          )}

          {/* Scroll to Bottom Button (하단에서 벗어났을 때 최하단 이동 원클릭 버튼) */}
          {!newMsgNotice && showScrollBottomBtn && (
            <div className="absolute bottom-3 right-4 z-20 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="bg-white/95 hover:bg-neutral-100 text-neutral-800 hover:text-black w-8 h-8 rounded-full shadow-md border border-neutral-300 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 group"
                title="최신 대화(하단)로 이동"
              >
                <ChevronDown className="w-4 h-4 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

          {/* Action Toolbar directly above Reply Input */}
          <div className="pt-2 pb-0.5 shrink-0 flex items-center justify-between border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRequestOrderSelection()}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="고객에게 직접 문의할 주문건을 선택하도록 요청 카드를 즉시 전송합니다"
              >
                <Package className="w-3.5 h-3.5 text-neutral-800" />
                <span>주문선택 요청</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExchangeMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                    isExchangeMenuOpen
                      ? "bg-blue-600 text-white border border-blue-700 shadow-md"
                      : "bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300"
                  }`}
                  title="교환접수요청서 또는 결제창을 선택하여 전송합니다"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExchangeMenuOpen ? "text-white" : "text-neutral-900"}`} />
                  <span>교환 접수</span>
                  <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isExchangeMenuOpen ? "rotate-180 text-white" : "text-neutral-500"}`} />
                </button>

                {isExchangeMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsExchangeMenuOpen(false)}
                    />
                    <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-neutral-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[10px] font-black text-neutral-400 px-2 py-1 uppercase tracking-wider">
                        교환 전송 옵션 선택
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleRequestExchangeForm();
                            setIsExchangeMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black">
                              교환접수요청서 전송
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              반품 불가 사유 안내, 주문건 선택, 사유 입력 양식
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleRequestExchangePayment();
                            setIsExchangeMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black flex items-center gap-1.5">
                              <span>교환접수비용결제창 전송</span>
                              <span className="text-[10px] font-mono font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                                16,000원
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              토스페이먼츠 왕복 배송비(16,000원) 즉시 결제창
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleOpenPickupModal();
                            setIsExchangeMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer border-t border-neutral-100 pt-2"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black flex items-center gap-1.5">
                              <span>수거접수진행</span>
                              <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded-full">
                                CJ대한통운
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              실제 CJ대한통운 시스템으로 교환접수 및 주문 관리 등록
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 환불 접수 메뉴 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRefundMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                    isRefundMenuOpen
                      ? "bg-blue-600 text-white border border-blue-700 shadow-md"
                      : "bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300"
                  }`}
                  title="환불접수요청서, 토스 결제 취소/환불 또는 수거접수를 선택하여 진행합니다"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefundMenuOpen ? "text-white" : "text-neutral-900"}`} />
                  <span>환불 접수</span>
                  <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isRefundMenuOpen ? "rotate-180 text-white" : "text-neutral-500"}`} />
                </button>

                {isRefundMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsRefundMenuOpen(false)}
                    />
                    <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-neutral-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[10px] font-black text-neutral-400 px-2 py-1 uppercase tracking-wider">
                        환불 전송 옵션 선택
                      </div>
                      <div className="space-y-1">
                        {/* 1. 환불접수요청서 전송 */}
                        <button
                          type="button"
                          onClick={() => {
                            handleRequestRefundForm();
                            setIsRefundMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black">
                              환불접수요청서 전송
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              환불 규정 안내, 주문건 선택, 사유 입력 양식
                            </div>
                          </div>
                        </button>

                        {/* 2. 환불 접수 (토스페이먼츠 구매금액 취소/환불) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenRefundModal();
                            setIsRefundMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black flex items-center gap-1.5">
                              <span>환불 접수</span>
                              <span className="text-[10px] font-mono font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                                토스 결제취소
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              토스페이먼츠 PG를 통한 실제 구매금액 결제 취소/환불
                            </div>
                          </div>
                        </button>

                        {/* 3. 수거 접수 진행 (CJ대한통운 반품 수거) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenPickupModal("REFUND");
                            setIsRefundMenuOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-900 transition-all flex items-start gap-2.5 group cursor-pointer border-t border-neutral-100 pt-2"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900 group-hover:text-black flex items-center gap-1.5">
                              <span>수거접수진행</span>
                              <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded-full">
                                CJ대한통운
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium leading-tight mt-0.5">
                              실제 CJ대한통운 시스템으로 반품 수거 및 회수 예약
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {activeSessionId && (
              <span className="text-[11px] text-neutral-400 font-bold">
                {chatSessionsList.find((s) => s.id === activeSessionId)?.name || "고객"}님 상담 중
              </span>
            )}
          </div>

          {/* Admin Reply Input Bar */}
          <div className="pt-2 shrink-0 flex gap-2">
            <input
              type="text"
              disabled={!activeSessionId || chatSessionsList.length === 0}
              value={adminLiveInput}
              onChange={(e) => setAdminLiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSendLiveChat();
                }
              }}
              placeholder={
                !activeSessionId || chatSessionsList.length === 0
                  ? "진행 중인 라이브 대화 세션이 없습니다..."
                  : "고객에게 전달할 답변 메세지를 입력하세요..."
              }
              className="flex-1 bg-neutral-50 disabled:bg-neutral-100 disabled:cursor-not-allowed border border-neutral-200 rounded-xl px-4 py-3 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
            <button
              type="button"
              onClick={() => onSendLiveChat()}
              disabled={!adminLiveInput.trim() || !activeSessionId || chatSessionsList.length === 0}
              className="bg-neutral-950 hover:bg-black text-white px-5 py-3 rounded-xl font-black text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              답변 전송
            </button>
          </div>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* MODAL: ADMIN REAL-TIME TEMPLATE EDITING MODAL (실시간 타이핑 즉시 반영) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-200 notranslate" translate="no">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-neutral-100 text-neutral-900 rounded-2xl border border-neutral-200">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-neutral-950">
                      실시간 템플릿 수정 (입력 즉시 반영)
                    </h3>
                    <span className="text-xs bg-neutral-100 text-neutral-800 font-extrabold px-2.5 py-0.5 rounded-full border border-neutral-300">
                      ⚡ 저장 버튼 없음 (입력 완료 시 확인 창)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    별도의 저장 버튼 없이 **입력하는 즉시 실시간 변경**됩니다. 입력이 끝나면 확인 알림이 나타납니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Template Form */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-3">
              <span className="text-xs font-black text-neutral-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-neutral-900" />
                <span>신규 템플릿 등록</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="🇰🇷 라벨 (예: 사이즈 안내)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
                <input
                  type="text"
                  placeholder="🇰🇷 한글 원문 빠른 답장 문구 입력..."
                  value={newKo}
                  onChange={(e) => setNewKo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTemplate();
                    }
                  }}
                  className="sm:col-span-2 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  disabled={!newKo.trim()}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                >
                  + 템플릿 등록
                </button>
              </div>
            </div>

            {/* Existing Templates Real-Time Inline Editable List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 pb-1">
                <span>등록된 템플릿 수정 ({templates.length}개)</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-neutral-500 hover:text-neutral-950 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본 템플릿으로 복원
                </button>
              </div>

              {templates.map((tmpl) => (
                <div
                  key={`${tmpl.id}-${tmpl.label}-${tmpl.ko}`}
                  className="p-3.5 bg-neutral-50 border border-neutral-200/90 rounded-2xl space-y-2 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[10px] font-extrabold bg-neutral-900 text-white px-2 py-1 rounded-md shrink-0">
                        라벨
                      </span>
                      <input
                        type="text"
                        defaultValue={tmpl.label}
                        onBlur={(e) => handleRequestEditConfirm(tmpl.id, "label", e.target.value, tmpl.label)}
                        onKeyDown={(e: any) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleRequestEditConfirm(tmpl.id, "label", e.target.value, tmpl.label);
                          }
                        }}
                        className="bg-white border border-neutral-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950 flex-1"
                        placeholder="라벨 입력 후 입력 완료시 '수정하시겠습니까?' 팝업"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="템플릿 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      defaultValue={tmpl.ko}
                      onBlur={(e) => handleRequestEditConfirm(tmpl.id, "ko", e.target.value, tmpl.ko)}
                      onKeyDown={(e: any) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRequestEditConfirm(tmpl.id, "ko", e.target.value, tmpl.ko);
                        }
                      }}
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                      placeholder="한글 답장 문구 입력 후 입력 완료시 '수정하시겠습니까?' 팝업"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                창 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTO-REPLY SETTINGS MODAL: "자동 답변 설정" */}
      {/* ========================================================================= */}
      {isAutoReplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 text-left space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-neutral-900" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-950">
                    실시간 채팅 자동 답변 설정
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    고객이 입력한 키워드에 맞춰 지정된 답변을 실시간 채팅창에 자동으로 전송합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoReplyModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {/* 1. ON/OFF & Response Speed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* On/Off Toggle */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                      스마트 자동 응답 기능 활성화
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {autoReplyEnabled ? "현재 고객 문의시 챗봇이 자동 응답 중" : "비활성화 시 관리자 직접 수동 응답만 가능"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveAutoReplyConfig(
                        !autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      autoReplyEnabled ? "bg-neutral-950" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoReplyEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Delay Speed Selector */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col justify-center">
                  <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-600" />
                    자동 답변 응답 지연 속도
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 3.0, label: "3초 (빠름)" },
                      { val: 5.0, label: "5초 (권장)" },
                      { val: 7.0, label: "7초 (자연스러움)" },
                      { val: 10.0, label: "10초 (여유)" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() =>
                          saveAutoReplyConfig(
                            autoReplyEnabled,
                            item.val,
                            autoReplyRules,
                            autoReplyFallback
                          )
                        }
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer text-center ${
                          autoReplyDelay === item.val
                            ? "bg-neutral-950 text-white shadow-xs"
                            : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Fallback Message */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                  일치하는 키워드가 없을 때 기본 안내 문구 (Fallback)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={autoReplyFallback}
                    onChange={(e) => setAutoReplyFallback(e.target.value)}
                    onBlur={() =>
                      saveAutoReplyConfig(
                        autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      )
                    }
                    placeholder="지정된 키워드가 없을 때 기본으로 나갈 답변을 입력하세요."
                    className="flex-1 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-950"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveAutoReplyConfig(
                        autoReplyEnabled,
                        autoReplyDelay,
                        autoReplyRules,
                        autoReplyFallback
                      );
                      setConfirmDialog("기본 안내 문구가 저장되었습니다.");
                    }}
                    className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
                  >
                    저장
                  </button>
                </div>
              </div>

              {/* 3. Keyword Rules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                    <span>⚡ 키워드별 자동 응답 규칙 ({autoReplyRules.length}개)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAutoRules}
                    className="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                  >
                    기본 규칙으로 초기화
                  </button>
                </div>

                <div className="space-y-3">
                  {autoReplyRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        rule.enabled
                          ? "bg-white border-neutral-200 shadow-xs"
                          : "bg-neutral-50/70 border-neutral-200 opacity-60"
                      }`}
                    >
                      {/* Top Bar: Active Toggle & Name & Delete */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleAutoRule(rule.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer shrink-0 ${
                              rule.enabled
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {rule.enabled ? "활성 ON" : "비활성 OFF"}
                          </button>
                          <input
                            type="text"
                            defaultValue={rule.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== rule.name) {
                                setPendingEdit({
                                  id: rule.id,
                                  type: "auto",
                                  field: "name",
                                  value: e.target.value.trim(),
                                  oldText: rule.name,
                                });
                              }
                            }}
                            className="bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg px-2.5 py-1 text-xs font-extrabold text-neutral-950 flex-1 focus:outline-none"
                            placeholder="규칙 제목 입력"
                            title="클릭하여 규칙 제목 수정"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoRule(rule.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="규칙 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Keywords Edit Field */}
                      <div className="mb-2.5">
                        <label className="text-[11px] font-bold text-neutral-600 mb-1 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-neutral-700" />
                          감지 키워드 (쉼표로 구분하여 여러 개 등록 가능)
                        </label>
                        <input
                          type="text"
                          defaultValue={rule.keywords}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== rule.keywords) {
                              setPendingEdit({
                                id: rule.id,
                                type: "auto",
                                field: "keywords",
                                value: e.target.value.trim(),
                                oldText: rule.keywords,
                              });
                            }
                          }}
                          className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none"
                          placeholder="예: 배송, 언제, 도착, 출고"
                        />
                      </div>

                      {/* Reply Text input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-neutral-600 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-neutral-700" />
                            자동 응답 답변 문구 (템플릿 내용)
                          </label>
                          <span className="text-[10px] text-neutral-400">내용 수정 후 다른 곳 클릭 시 확인창 노출</span>
                        </div>
                        <textarea
                          id={`textarea-rule-${rule.id}`}
                          defaultValue={rule.replyText}
                          rows={3}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== rule.replyText) {
                              setPendingEdit({
                                id: rule.id,
                                type: "auto",
                                field: "replyText",
                                value: e.target.value.trim(),
                                oldText: rule.replyText,
                              });
                            }
                          }}
                          className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none leading-relaxed"
                          placeholder="고객에게 자동으로 전송될 답변 내용을 입력하세요."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Add New Rule Form */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-3">
                <div className="font-extrabold text-xs text-neutral-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-neutral-900" />
                  새 자동 답변 키워드 규칙 등록
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="규칙 이름 (예: 매장 위치 안내)"
                    className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
                  />
                  <input
                    type="text"
                    value={newRuleKeywords}
                    onChange={(e) => setNewRuleKeywords(e.target.value)}
                    placeholder="감지 키워드 (쉼표 구분: 위치, 쇼룸, 매장, 찾아오는길)"
                    className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <textarea
                  value={newRuleReply}
                  onChange={(e) => setNewRuleReply(e.target.value)}
                  rows={2}
                  placeholder="고객이 위 키워드 중 하나라도 포함하여 메시지를 보냈을 때 전송할 자동 답변 문구를 작성하세요."
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={handleAddAutoRule}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> 키워드 규칙 추가하기
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  saveAutoReplyConfig(
                    autoReplyEnabled,
                    autoReplyDelay,
                    autoReplyRules,
                    autoReplyFallback
                  );
                  setIsAutoReplyModalOpen(false);
                }}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                설정 완료 및 창 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION PROMPT DIALOG: "수정하시겠습니까?" 확인 창 팝업 */}
      {/* ========================================================================= */}
      {pendingEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-950">수정하시겠습니까?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                {pendingEdit.type === "auto"
                  ? "입력하신 자동 답변(챗봇) 템플릿 설정 내용으로 반영하시겠습니까?"
                  : "입력하신 빠른 답장 템플릿 문구로 반영하시겠습니까?"}
              </p>
              <div className="mt-2.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-950 text-left font-mono truncate">
                "{pendingEdit.value}"
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingEdit(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all border border-neutral-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all shadow-md"
              >
                네, 수정합니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION PROMPT DIALOG: "삭제하시겠습니까?" 확인 창 팝업 */}
      {/* ========================================================================= */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-950">답변 규칙을 삭제하시겠습니까?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                삭제된 키워드 자동 응답 규칙은 복구할 수 없습니다.
              </p>
              <div className="mt-2.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-950 text-center truncate">
                "{pendingDelete.name}"
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all border border-neutral-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all shadow-md"
              >
                확인 (삭제)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CJ대한통운 수거접수 진행 모달 */}
      {/* ========================================================================= */}
      {isPickupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 text-left space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 notranslate" translate="no">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-950 flex items-center gap-1.5">
                    <span>CJ대한통운 교환 수거접수 진행</span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-800 font-bold px-2 py-0.5 rounded-full border border-neutral-200">
                      실시간 전산연동
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">
                    CJ대한통운 회수 예약 등록 및 [주문 및 배송 관리] 리스트에 교환 건으로 추가합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickupModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. 교환 대상 주문건 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-neutral-800" />
                  <span>1. 교환 대상 주문건 선택</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-bold">
                  {pickupCustomerOrders.length > 0 ? `${pickupCustomerOrders.length}건 검색됨` : "직접 입력"}
                </span>
              </label>

              {pickupCustomerOrders.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {pickupCustomerOrders.map((ord: any) => {
                    const isSelected = (selectedPickupOrder?.uniqueSelectId || selectedPickupOrder?.id) === (ord.uniqueSelectId || ord.id);
                    const thumb = ord.image || getProductThumbnail(ord.items);
                    return (
                      <div
                        key={ord.uniqueSelectId || ord.id}
                        onClick={() => {
                          setSelectedPickupOrder(ord);
                          if (ord.recipient) setPickupRecipient(ord.recipient);
                          if (ord.phone) setPickupPhone(ord.phone);
                          if (ord.zipCode) setPickupZipCode(ord.zipCode);
                          if (ord.address) setPickupAddress(ord.address);
                          if (ord.detailAddress) setPickupDetailAddress(ord.detailAddress);
                          if (ord.trackingNumber && ord.trackingNumber !== "-") setPickupOriginalInvoice(ord.trackingNumber);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? "bg-neutral-950 text-white border-neutral-900 shadow-2xs ring-1 ring-neutral-900"
                            : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 text-neutral-900"
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-neutral-200 shrink-0">
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
                              주문: {ord.orderId || ord.orderNumber}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full">
                                ✓ 교환상품 선택됨
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
              ) : (
                <input
                  type="text"
                  placeholder="주문번호를 입력하세요 (예: CH20260930-001)"
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              )}
            </div>

            {/* 2. 교환 사유 입력 */}
            <div className="space-y-1.5 pt-1 border-t border-neutral-100">
              <label className="text-xs font-black text-neutral-800 flex items-center justify-between">
                <span>2. 교환 사유 입력 (주문서 배송메세지에 자동 등록)</span>
                <span className="text-[10px] text-neutral-600 font-bold">배송메세지 칸 반영</span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {["사이즈 교환", "색상 교환", "단순 변심", "불량/오배송", "기타"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPickupReason(r)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      pickupReason === r
                        ? "bg-neutral-950 text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                value={pickupDetailReason}
                onChange={(e) => setPickupDetailReason(e.target.value)}
                rows={2}
                placeholder="상세 사유 또는 변경 옵션 (예: L사이즈로 변경 희망 / 단추 헐거움 등)"
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 resize-none"
              />
              <p className="text-[10px] text-neutral-500 font-medium">
                ※ 위 교환 사유는 [주문 및 배송 관리] 리스트의 '배송메세지' 칸에 자동으로 저장됩니다.
              </p>
            </div>

            {/* 3. 수거지 정보 (CJ 기사님 수거 방문지) */}
            <div className="space-y-2 pt-1 border-t border-neutral-100">
              <label className="text-xs font-black text-neutral-800 block">
                3. 수거지 정보 (CJ대한통운 기사님 방문 주소)
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 block mb-0.5">고객명</span>
                  <input
                    type="text"
                    value={pickupRecipient}
                    onChange={(e) => setPickupRecipient(e.target.value)}
                    placeholder="수거 고객 성명"
                    className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 block mb-0.5">연락처</span>
                  <input
                    type="text"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-500 block mb-0.5">원 출고 운송장번호</span>
                <input
                  type="text"
                  value={pickupOriginalInvoice}
                  onChange={(e) => setPickupOriginalInvoice(e.target.value)}
                  placeholder="원 배송 운송장번호 (숫자만, 미입력 시 자동 생성)"
                  className="w-full text-xs font-mono font-bold px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-500 block mb-0.5">수거 주소</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={pickupZipCode}
                    onChange={(e) => setPickupZipCode(e.target.value)}
                    placeholder="우편번호"
                    className="w-24 text-xs font-mono font-bold px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950 shrink-0"
                  />
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="기본 주소"
                    className="flex-1 text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <input
                  type="text"
                  value={pickupDetailAddress}
                  onChange={(e) => setPickupDetailAddress(e.target.value)}
                  placeholder="상세 주소 (동/호수)"
                  className="w-full text-xs font-medium px-2.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            {/* Guide Info */}
            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-[11px] text-neutral-800 leading-relaxed font-medium">
              ✓ CJ대한통운 API로 회수 예약(RegBook)이 접수됩니다.<br />
              ✓ [주문 및 배송 관리] 리스트에 <strong className="text-neutral-950">{pickupBookingType === "REFUND" ? "반품수거 건 뱃지" : "교환주문 건 뱃지"}</strong>가 부착되어 즉시 등록됩니다.<br />
              ✓ 등록된 {pickupBookingType === "REFUND" ? "반품사유" : "교환사유"}는 <strong className="text-neutral-950">배송메세지 칸</strong>에 노출됩니다.
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingPickup}
                onClick={() => setIsPickupModalOpen(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3.5 rounded-xl cursor-pointer transition-all border border-neutral-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmittingPickup}
                onClick={handleExecutePickupBooking}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3.5 rounded-xl cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingPickup ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    CJ대한통운 수거접수 진행 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    <span>CJ대한통운 {pickupBookingType === "REFUND" ? "반품" : "교환"} 수거접수 및 주문등록</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스페이먼츠 결제 취소 및 환불 모달 */}
      <TossRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setSelectedRefundPrefillOrder(null);
        }}
        customerOrders={refundCustomerOrders}
        initialOrder={selectedRefundPrefillOrder}
        onSuccess={handleRefundSuccess}
      />
    </div>
  );
}
