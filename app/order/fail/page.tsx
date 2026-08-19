"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";

function OrderFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

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
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderFailContent />
    </Suspense>
  );
}
