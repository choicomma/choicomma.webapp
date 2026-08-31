"use client";

import { useEffect, useState } from "react";
import { loadTossPayments, TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { X, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { getCalculatedNumericPrice } from "@/lib/currency/currency-service";

interface TossPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  orderName: string;
}

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_docs_Oabc1234567890";
const customerKey = "CHOICOMMA_TEST_USER_99";

export default function TossPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  orderName,
}: TossPaymentModalProps) {
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [paymentInstance, setPaymentInstance] = useState<any>(null);
  const [isSdkLoading, setIsSdkLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const isWidgetKey = clientKey.includes("_gck_");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function initTossSDK() {
      try {
        setIsSdkLoading(true);
        setSdkError(null);

        const tossPayments = await loadTossPayments(clientKey);

        if (isWidgetKey) {
          const tossWidgets = tossPayments.widgets({ customerKey });
          if (isMounted) {
            setWidgets(tossWidgets);
          }
        } else {
          const tossPayment = tossPayments.payment({ customerKey });
          if (isMounted) {
            setPaymentInstance(tossPayment);
          }
        }
      } catch (err: any) {
        console.error("Toss SDK Init Error:", err);
        if (isMounted) {
          setSdkError("토스페이먼츠 결제 모듈을 로드하지 못했습니다. 클라이언트 키 및 모드를 확인해 주세요.");
        }
      } finally {
        if (isMounted) {
          setIsSdkLoading(false);
        }
      }
    }

    initTossSDK();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!widgets || !isOpen || !isWidgetKey) return;

    async function renderPaymentWidgets() {
      const activeWidgets = widgets as any;
      if (!activeWidgets) return;
      try {
        // Set Payment Amount
        if (typeof activeWidgets.setAmount === "function") {
          await activeWidgets.setAmount({
            currency: "KRW",
            value: totalAmount > 0 ? totalAmount : 50000,
          });
        }

        // Render Payment Methods
        if (typeof activeWidgets.renderPaymentMethods === "function") {
          await activeWidgets.renderPaymentMethods({
            selector: "#toss-payment-methods",
            variantKey: "DEFAULT",
          });
        }

        // Render Agreement
        if (typeof activeWidgets.renderAgreement === "function") {
          await activeWidgets.renderAgreement({
            selector: "#toss-agreement",
            variantKey: "AGREEMENT",
          });
        }
      } catch (err: any) {
        console.error("Payment Widget Render Error:", err);
      }
    }

    renderPaymentWidgets();
  }, [widgets, isOpen, totalAmount]);

  if (!isOpen) return null;

  const handleRequestPayment = async () => {
    const orderId = `CHOICOMMA_ORDER_${Date.now()}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    try {
      setIsSubmitting(true);

      if (isWidgetKey && widgets) {
        await widgets.requestPayment({
          orderId,
          orderName: orderName || "초이콤마 오리지널 패션 주문건",
          successUrl: `${origin}/order/success`,
          failUrl: `${origin}/order/fail`,
          customerEmail: "customer@choicomma.com",
          customerName: "홍길동 VIP 회원님",
        });
      } else if (paymentInstance) {
        await paymentInstance.requestPayment({
          method: "CARD",
          amount: {
            currency: "KRW",
            value: totalAmount > 0 ? totalAmount : 50000,
          },
          orderId,
          orderName: orderName || "초이콤마 오리지널 패션 주문건",
          successUrl: `${origin}/order/success`,
          failUrl: `${origin}/order/fail`,
          customerEmail: "customer@choicomma.com",
          customerName: "홍길동 VIP 회원님",
        });
      }
    } catch (err: any) {
      console.error("Payment Request Failed:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-white border border-neutral-200/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 bg-neutral-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-neutral-950">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">토스페이먼츠 1:1 테스트 결제</h2>
              <p className="text-[11px] text-neutral-400 font-medium">안전한 전자결제 PG 시스템 테스트 연동</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Order Summary Pill */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-neutral-400 block tracking-wider">주문 상품 정보</span>
              <p className="text-xs font-bold text-neutral-900 truncate max-w-[240px]">{orderName || "초이콤마 주문 상품"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-neutral-400 block tracking-wider">최종 결제 금액</span>
              <p className="text-sm font-black text-emerald-600">
                {formatPrice(totalAmount > 0 ? totalAmount : 50000)}
              </p>
            </div>
          </div>

          {/* Loading Indicator */}
          {isSdkLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-extrabold text-neutral-600">토스페이먼츠 위젯을 로딩 중입니다...</p>
            </div>
          )}

          {/* SDK Error */}
          {sdkError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold text-center">
              {sdkError}
            </div>
          )}

          {/* Toss Payment Methods Container */}
          <div id="toss-payment-methods" className="min-h-[220px]" />

          {/* Toss Terms Agreement Container */}
          <div id="toss-agreement" />
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-200 bg-neutral-50 shrink-0 space-y-2">
          <button
            type="button"
            disabled={isSdkLoading || isSubmitting || !!sdkError}
            onClick={handleRequestPayment}
            className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                결제 요청 중...
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm font-black">
                <Lock className="w-4 h-4 text-emerald-400" />
                {formatPrice(totalAmount > 0 ? totalAmount : 50000)} 테스트 결제하기
              </span>
            )}
          </button>

          <p className="text-[10px] text-center text-neutral-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            토스페이먼츠 PG 테스트 결제모드이므로 실제 금액이 청구되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
