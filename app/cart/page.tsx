"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    // 장바구니 URL 접근 시 결제/주문서 또는 홈으로 자연스럽게 이동
    router.replace("/checkout");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-500 font-medium">장바구니를 불러오는 중입니다...</p>
      </div>
    </div>
  );
}
