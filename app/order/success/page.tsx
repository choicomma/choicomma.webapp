"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/sfcc/utils";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    async function confirmPayment() {
      if (!paymentKey || !orderId || !amount) {
        setIsLoading(false);
        setIsSuccess(true); // Fallback for direct test view
        return;
      }

      try {
        const res = await fetch("/api/payment/toss/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setIsSuccess(true);
          setPaymentData(json.data);

          // Save live order into localStorage for Admin live order tracking
          if (typeof window !== "undefined") {
            const savedOrders = localStorage.getItem("admin_orders");
            let ordersList = [];
            if (savedOrders) {
              try { ordersList = JSON.parse(savedOrders); } catch (e) {}
            }

            const newOrder = {
              id: orderId,
              customer: json.data?.customerName || "VIP 고객님",
              email: json.data?.customerEmail || "customer@choicomma.com",
              date: new Date().toISOString().slice(0, 10),
              totalAmount: Number(amount),
              status: "결제완료 (토스)",
              method: json.data?.method || "토스페이먼츠",
            };

            const updated = [newOrder, ...ordersList];
            localStorage.setItem("admin_orders", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("admin_orders_updated"));
          }
        } else {
          setErrorMessage(json.message || "결제 승인 과정에서 오류가 발생했습니다.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "네트워크 통신 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-lg font-black text-neutral-900">토스페이먼츠 결제 승인 처리 중...</h2>
        <p className="text-xs text-neutral-500 font-medium">안전하게 결제 정보를 확인하고 있습니다. 잠시만 기다려 주세요.</p>
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
            ✨ TEST PAYMENT CONFIRMED
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
              {amount ? `${Number(amount).toLocaleString()}원` : "50,000원"}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-neutral-400 font-sans font-bold">결제 수단</span>
            <span className="font-bold text-neutral-900 font-sans">
              {paymentData?.method || "토스페이먼츠 (테스트)"}
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
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
