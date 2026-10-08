"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { restoreCouponByOrder } from "@/lib/membership/coupons";

function OrderFailParamsHandler({ onParamsLoaded }: { onParamsLoaded: (p: { code: string | null; message: string | null; orderId: string | null }) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const code = searchParams.get("code");
    const message = searchParams.get("message");
    const orderId = searchParams.get("orderId");

    // 결제 실패/취소 리다이렉트 시 보류 주문에서 차감되었던 적립금 및 쿠폰 자동 원복
    if (orderId && typeof window !== "undefined") {
      try {
        const rawPending = sessionStorage.getItem(`pending_order_${orderId}`);
        if (rawPending) {
          const pending = JSON.parse(rawPending);
          if (pending?.appliedPoints > 0) {
            const currentPoints = parseInt(localStorage.getItem("membership_user_points") || "0", 10);
            const restoredPoints = currentPoints + Number(pending.appliedPoints);
            localStorage.setItem("membership_user_points", String(restoredPoints));
            window.dispatchEvent(new CustomEvent("membership_points_updated"));
          }
          if (pending?.selectedCouponId) {
            restoreCouponByOrder(orderId, pending.selectedCouponId);
          }
          sessionStorage.removeItem(`pending_order_${orderId}`);
        }
      } catch (e) {}
    }

    onParamsLoaded({
      code,
      message,
      orderId,
    });
  }, [searchParams, onParamsLoaded]);
  return null;
}

function OrderFailContentInner({ params }: { params: { code: string | null; message: string | null; orderId?: string | null } | null }) {
  const code = params?.code || null;
  const message = params?.message || null;

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
          <XCircle className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            PAYMENT CANCELLED / FAILED
          </span>
          <h1 className="text-2xl font-black text-neutral-950 pt-2">결제가 취소되거나 실패하였습니다</h1>
          <p className="text-xs text-neutral-500">결제 진행 중 요청이 취소되었거나 오류가 발생했습니다.</p>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 text-left space-y-1.5 font-mono text-xs text-rose-900">
          {code && <p className="font-bold">에러 코드: {code}</p>}
          <p className="font-sans text-xs">{message || "사용자가 결제를 취소했거나 승인에 실패했습니다."}</p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            쇼핑몰 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderFailPage() {
  const [params, setParams] = useState<{ code: string | null; message: string | null } | null>(null);

  return (
    <>
      <Suspense fallback={null}>
        <OrderFailParamsHandler onParamsLoaded={setParams} />
      </Suspense>
      <OrderFailContentInner params={params} />
    </>
  );
}
