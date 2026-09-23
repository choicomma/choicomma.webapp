"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/sfcc/utils";
import { supabase } from "@/lib/supabase/client";

function OrderSuccessParamsHandler({ onParamsLoaded }: { onParamsLoaded: (p: { paymentKey: string | null; orderId: string | null; amount: string | null }) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onParamsLoaded({
      paymentKey: searchParams.get("paymentKey"),
      orderId: searchParams.get("orderId"),
      amount: searchParams.get("amount"),
    });
  }, [searchParams, onParamsLoaded]);
  return null;
}

function OrderSuccessContentInner({ params }: { params: { paymentKey: string | null; orderId: string | null; amount: string | null } | null }) {
  const router = useRouter();

  const paymentKey = params?.paymentKey || null;
  const orderId = params?.orderId || null;
  const amount = params?.amount || null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [earnedPointsInfo, setEarnedPointsInfo] = useState<{
    earnedPoints: number;
    pointRate: number;
    userGrade: string;
  } | null>(null);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>("신용·체크카드");

  useEffect(() => {
    async function confirmPayment() {
      // 1. 주문 번호가 없는 경우 (직접 URL 접속 등)
      if (!orderId) {
        setIsLoading(false);
        setIsSuccess(true);
        return;
      }

      // 2. 0원 결제 (전액 적립금 또는 전액 쿠폰 결제)인지 확인
      const isZeroPayment = Number(amount) === 0 || !paymentKey || paymentKey === "FREE";

      let paymentResultData: any = null;

      if (!isZeroPayment) {
        try {
          const res = await fetch("/api/payment/toss/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentKey, orderId, amount }),
          });

          const json = await res.json();
          if (res.ok && json.success) {
            paymentResultData = json.data;
            setPaymentData(json.data);
          } else {
            setErrorMessage(json.message || "결제 승인 과정에서 오류가 발생했습니다.");
            setIsLoading(false);
            return;
          }
        } catch (err: any) {
          setErrorMessage(err.message || "네트워크 통신 오류가 발생했습니다.");
          setIsLoading(false);
          return;
        }
      }

      setIsSuccess(true);

          // Save live order into localStorage for Admin live order tracking
          if (typeof window !== "undefined") {
            const savedOrders = localStorage.getItem("admin_orders");
            let ordersList: any[] = [];
            if (savedOrders) {
              try { ordersList = JSON.parse(savedOrders); } catch (e) {}
            }

            // Read pending checkout order form data (배송지, 우편번호, 수령인)
            let pendingOrder: any = null;
            try {
              const rawPending = sessionStorage.getItem(`pending_order_${orderId}`);
              if (rawPending) pendingOrder = JSON.parse(rawPending);
            } catch (e) {}

            const finalMethod = isZeroPayment
              ? (pendingOrder?.appliedPoints > 0 ? "전액 적립금 결제" : "전액 할인 쿠폰 결제")
              : (paymentResultData?.method ||
                  (pendingOrder?.formData?.paymentMethod === "TRANSFER"
                    ? "실시간 계좌이체"
                    : pendingOrder?.formData?.paymentMethod === "EASY_PAY"
                    ? "간편결제 (카카오/네이버/토스)"
                    : "신용·체크카드 (토스)"));

            const newOrder = {
              id: orderId,
              orderId: orderId,
              customer: paymentResultData?.customerName || pendingOrder?.formData?.ordererName || pendingOrder?.formData?.recipientName || "VIP 고객님",
              ordererName: pendingOrder?.formData?.ordererName || paymentResultData?.customerName || pendingOrder?.formData?.recipientName || "VIP 고객님",
              email: paymentResultData?.customerEmail || pendingOrder?.formData?.ordererEmail || "customer@choicomma.com",
              recipient: pendingOrder?.formData?.recipientName || paymentResultData?.customerName || "고객님",
              phone: pendingOrder?.formData?.recipientPhone || "010-0000-0000",
              altPhone: pendingOrder?.formData?.recipientAltPhone || "",
              zipCode: pendingOrder?.formData?.postcode || "",
              address: pendingOrder?.formData?.address || "",
              detailAddress: pendingOrder?.formData?.addressDetail || "",
              shippingMemo:
                pendingOrder?.formData?.deliveryMemo === "직접 입력"
                  ? (pendingOrder?.formData?.customDeliveryMemo?.trim() || "직접 입력")
                  : (pendingOrder?.formData?.deliveryMemo || ""),
              items: pendingOrder?.cart?.lines?.map((l: any) => `${l.merchandise?.product?.title || l.title || "상품"} (${l.quantity}개)`).join(", ") || "초이콤마 오리지널 패션 컬렉션",
              quantity: pendingOrder?.cart?.totalQuantity || 1,
              date: new Date().toISOString().slice(0, 10),
              totalAmount: isZeroPayment ? 0 : Number(amount),
              shippingFee: pendingOrder?.shippingFee || 0,
              discountAmount: pendingOrder?.appliedDiscount || 0,
              pointsUsed: Number(pendingOrder?.appliedPoints || 0),
              status: isZeroPayment ? "결제완료 (전액적립금)" : "결제완료 (토스)",
              method: finalMethod,
            };

            setOrderPaymentMethod(newOrder.method);
            if (isZeroPayment) {
              setPaymentData({ method: newOrder.method });
            }

            const alreadyExists = ordersList.some((o: any) => o.id === orderId || o.orderId === orderId);
            if (!alreadyExists) {
              const updated = [newOrder, ...ordersList];
              localStorage.setItem("admin_orders", JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent("admin_orders_updated"));

            // admin_shipments (관리자 배송 주문 관리 및 마이페이지 주문조회) 실시간 동기화
            const newShipment = {
              id: orderId,
              orderId: orderId,
              ordererName: newOrder.ordererName,
              recipient: newOrder.recipient,
              phone: newOrder.phone,
              altPhone: newOrder.altPhone,
              zipCode: newOrder.zipCode,
              address: newOrder.address,
              detailAddress: newOrder.detailAddress,
              items: newOrder.items,
              quantity: newOrder.quantity,
              carrier: "CJ대한통운",
              trackingNumber: "-",
              status: "Pending",
              shippingMemo: newOrder.shippingMemo,
              orderDate: new Date().toISOString().replace("T", " ").slice(0, 19),
              shippedDate: null,
              estimatedDelivery: null,
              packages: [
                {
                  id: `PKG-${orderId}-1`,
                  pkgIndex: 1,
                  items: newOrder.items,
                  quantity: newOrder.quantity,
                  carrier: "CJ대한통운",
                  trackingNumber: "-",
                  status: "Pending",
                },
              ],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const savedShipmentsRaw = localStorage.getItem("admin_shipments");
            let shipmentsList: any[] = [];
            if (savedShipmentsRaw) {
              try { shipmentsList = JSON.parse(savedShipmentsRaw); } catch (e) {}
            }
            const updatedShipments = [newShipment, ...shipmentsList.filter((s: any) => s.id !== orderId && s.orderId !== orderId)];
            localStorage.setItem("admin_shipments", JSON.stringify(updatedShipments));
            window.dispatchEvent(new CustomEvent("storage"));
            window.dispatchEvent(new CustomEvent("admin_shipments_updated"));

            // 고객 등급별 적립 혜택 계산
            const effectiveEarnedPoints = pendingOrder?.earnedPoints !== undefined 
              ? Number(pendingOrder.earnedPoints) 
              : Math.floor((isZeroPayment ? 0 : Number(amount)) * 0.01);
            const effectivePointRate = Number(pendingOrder?.pointRate) || 1;
            const effectiveUserGrade = pendingOrder?.userGrade || "GENERAL";
            const effectiveAppliedPoints = Number(pendingOrder?.appliedPoints || 0);

            setEarnedPointsInfo({
              earnedPoints: effectiveEarnedPoints,
              pointRate: effectivePointRate,
              userGrade: effectiveUserGrade,
            });

            // 1) Supabase orders 테이블에 주문 원장 영속 저장
            const dbOrder = {
              id: orderId,
              orderNumber: orderId,
              customerId: (typeof window !== "undefined" && localStorage.getItem("membership_user_id")) || null,
              customerName: newOrder.ordererName,
              customerEmail: newOrder.email,
              customerPhone: newOrder.phone,
              totalAmount: isZeroPayment ? 0 : Number(amount),
              shippingFee: pendingOrder?.shippingFee || 0,
              discountAmount: pendingOrder?.appliedDiscount || 0,
              pointsUsed: effectiveAppliedPoints,
              pointsEarned: effectiveEarnedPoints,
              paymentMethod: newOrder.method || "카드결제 (토스)",
              paymentStatus: "PAID",
              shippingAddress: {
                zipCode: newOrder.zipCode,
                address: newOrder.address,
                detailAddress: newOrder.detailAddress,
              },
              items: pendingOrder?.cart?.lines || [{ title: newOrder.items, quantity: newOrder.quantity, price: isZeroPayment ? 0 : Number(amount) }],
              orderMemo: newOrder.shippingMemo || "",
            };

            supabase
              .from("orders")
              .upsert([dbOrder], { onConflict: "id" })
              .then(({ error }) => {
                if (error) console.warn("Supabase orders insert notice:", error.message);
              });

            // 2) 서버 API에 백그라운드 영구 동기화
            fetch("/api/admin/shipments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedShipments),
            }).catch(() => {});

            // 3) 결제 성공 후 장바구니 자동 비우기
            try {
              localStorage.removeItem("choicomma_cart");
              window.dispatchEvent(new CustomEvent("choicomma_cart_updated", { detail: { action: "clear" } }));
            } catch (e) {}

            // 4) 고객 등급에 따른 적립금 지급 및 포인트 이력 저장 (중복 적립 방지)
            const historyRaw = localStorage.getItem("membership_points_history");
            let historyList: any[] = [];
            if (historyRaw) {
              try { historyList = JSON.parse(historyRaw); } catch (e) {}
            }

            const alreadyCredited = historyList.some((h: any) => h.id === `point-earn-${orderId}`);

            if (!alreadyCredited) {
              const newHistoryEntries: any[] = [];

              if (effectiveAppliedPoints > 0) {
                newHistoryEntries.push({
                  id: `point-use-${orderId}`,
                  label: `[상품 결제 사용] 주문번호: ${orderId}`,
                  date: new Date().toISOString().slice(0, 10),
                  amount: -effectiveAppliedPoints,
                });
              }

              if (effectiveEarnedPoints > 0) {
                newHistoryEntries.push({
                  id: `point-earn-${orderId}`,
                  label: `[상품 구매 적립] 주문번호: ${orderId} (${effectiveUserGrade} 등급 ${effectivePointRate}%)`,
                  date: new Date().toISOString().slice(0, 10),
                  amount: effectiveEarnedPoints,
                });
              }

              if (newHistoryEntries.length > 0) {
                const updatedHistory = [...newHistoryEntries, ...historyList];
                localStorage.setItem("membership_points_history", JSON.stringify(updatedHistory));
              }

              // 로컬 세션 보유 적립금 갱신
              let currentPoints = 0;
              const savedUserPoints = localStorage.getItem("membership_user_points");
              if (savedUserPoints !== null && !isNaN(parseInt(savedUserPoints))) {
                currentPoints = parseInt(savedUserPoints);
              }
              const updatedUserPoints = currentPoints + effectiveEarnedPoints;
              localStorage.setItem("membership_user_points", String(updatedUserPoints));

              // admin_customers 동기화
              const savedCustRaw = localStorage.getItem("admin_customers");
              let custList: any[] = [];
              if (savedCustRaw) {
                try { custList = JSON.parse(savedCustRaw); } catch (e) {}
              }

              const customerEmail = (newOrder.email || "").toLowerCase().trim();
              const customerPhone = (newOrder.phone || "").replace(/[^0-9]/g, "");
              const customerName = (newOrder.ordererName || newOrder.customer || "").trim();

              const matchedIdx = custList.findIndex((c: any) => {
                const cEmail = (c.email || "").toLowerCase().trim();
                const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
                return (
                  (customerEmail && cEmail === customerEmail) ||
                  (customerPhone && customerPhone.length >= 8 && cPhone === customerPhone) ||
                  (customerName && c.name === customerName)
                );
              });

              if (matchedIdx >= 0) {
                const cust = custList[matchedIdx];
                const prevSpent = Number(cust.totalSpent) || 0;
                const newSpent = prevSpent + (isZeroPayment ? 0 : Number(amount));
                cust.totalSpent = newSpent;
                cust.points = (Number(cust.points) || 0) + effectiveEarnedPoints;

                // 구매금액 누적에 따른 자동 승급 (2000만: VVIP, 1000만: PLATINUM, 300만: GOLD, 100만: SILVER)
                if (newSpent >= 20000000 && cust.grade !== "VVIP") {
                  cust.grade = "VVIP";
                } else if (newSpent >= 10000000 && !["VVIP", "PLATINUM"].includes(cust.grade)) {
                  cust.grade = "PLATINUM";
                } else if (newSpent >= 3000000 && !["VVIP", "PLATINUM", "GOLD"].includes(cust.grade)) {
                  cust.grade = "GOLD";
                } else if (newSpent >= 1000000 && !["VVIP", "PLATINUM", "GOLD", "SILVER"].includes(cust.grade)) {
                  cust.grade = "SILVER";
                }

                localStorage.setItem("admin_customers", JSON.stringify(custList));
              }

              // Supabase DB customers 실시간 동기화
              try {
                const matchFilter = customerEmail
                  ? { email: customerEmail }
                  : customerPhone
                  ? { phone: customerPhone }
                  : null;

                if (matchFilter) {
                  supabase
                    .from("customers")
                    .select("id, points, totalSpent")
                    .match(matchFilter)
                    .then(({ data: sbCusts }) => {
                      if (sbCusts && sbCusts.length > 0) {
                        const dbCust = sbCusts[0];
                        const updatedDbPoints = (Number(dbCust.points) || 0) + effectiveEarnedPoints;
                        const updatedDbSpent = (Number(dbCust.totalSpent) || 0) + (isZeroPayment ? 0 : Number(amount));
                        supabase
                          .from("customers")
                          .update({
                            points: updatedDbPoints,
                            totalSpent: updatedDbSpent,
                          })
                          .eq("id", dbCust.id)
                          .then(({ error }) => {
                            if (error) console.warn("Supabase customer points update notice:", error.message);
                          });
                      }
                    });
                }
              } catch (e) {}

              window.dispatchEvent(new CustomEvent("storage"));
              window.dispatchEvent(new CustomEvent("admin_customers_updated"));
              window.dispatchEvent(new CustomEvent("membership_points_updated"));
            } else {
              // 이미 등록된 경우에도 적립 정보 화면 표시 복구
              if (pendingOrder?.earnedPoints !== undefined) {
                setEarnedPointsInfo({
                  earnedPoints: Number(pendingOrder.earnedPoints),
                  pointRate: Number(pendingOrder.pointRate) || 1,
                  userGrade: pendingOrder.userGrade || "GENERAL",
                });
              }
            }
          }

          setIsLoading(false);
        }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-lg font-black text-neutral-900">
          {amount === "0" ? "주문 접수 처리 중..." : "결제 승인 처리 중..."}
        </h2>
        <p className="text-xs text-neutral-500 font-medium">안전하게 주문 정보를 확인하고 있습니다. 잠시만 기다려 주세요.</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-neutral-900">결제 승인 실패</h2>
        <p className="text-xs text-neutral-600 font-medium">{errorMessage}</p>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-neutral-950 text-white rounded-2xl font-bold text-xs hover:bg-neutral-800 transition-all shadow-md"
        >
          메인 화면으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {amount === "0" ? "✨ REWARD POINTS ORDER CONFIRMED" : "✨ ORDER & PAYMENT CONFIRMED"}
          </span>
          <h1 className="text-2xl font-black text-neutral-950 pt-2">주문 및 결제가 완료되었습니다!</h1>
          <p className="text-xs text-neutral-500">초이콤마를 이용해 주셔서 감사합니다. 주문이 안전하게 접수되었습니다.</p>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 text-left space-y-2 font-mono text-xs text-neutral-700">
          <div className="flex justify-between border-b border-neutral-200 pb-2">
            <span className="text-neutral-400 font-sans font-bold">주문 번호</span>
            <span className="font-bold text-neutral-900">{orderId || `ORDER_${Date.now()}`}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-200 pb-2 pt-1">
            <span className="text-neutral-400 font-sans font-bold">최종 결제 금액</span>
            <span className="font-black text-emerald-600 text-sm font-sans">
              {amount !== null && amount !== undefined ? `${Number(amount).toLocaleString()}원` : "0원"}
            </span>
          </div>
          {earnedPointsInfo && earnedPointsInfo.earnedPoints > 0 && (
            <div className="flex justify-between border-b border-neutral-200 pb-2 pt-1">
              <span className="text-neutral-400 font-sans font-bold">적립 혜택</span>
              <span className="font-bold text-emerald-600 font-sans">
                +{earnedPointsInfo.earnedPoints.toLocaleString()}P ({earnedPointsInfo.userGrade} 등급 {earnedPointsInfo.pointRate}%)
              </span>
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="text-neutral-400 font-sans font-bold">결제 수단</span>
            <span className="font-bold text-neutral-900 font-sans">
              {orderPaymentMethod || paymentData?.method || "전액 적립금 결제"}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            쇼핑 계속하기
          </Link>
          <Link
            href="/admin"
            className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold py-3 rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            어드민 실시간 주문 내역 확인하기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const [params, setParams] = useState<{ paymentKey: string | null; orderId: string | null; amount: string | null } | null>(null);

  return (
    <>
      <Suspense fallback={null}>
        <OrderSuccessParamsHandler onParamsLoaded={setParams} />
      </Suspense>
      <OrderSuccessContentInner params={params} />
    </>
  );
}
