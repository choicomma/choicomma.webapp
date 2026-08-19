import { Metadata } from "next";
import CheckoutClientWrapper from "./components/checkout-client-wrapper";

export const metadata: Metadata = {
  title: "주문서 작성 및 결제 | CHOICOMMA",
  description: "초이콤마 오리지널 패션 브랜드 주문서 작성 및 결제 페이지입니다.",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-neutral-50/50 pb-24 pt-8 dark:bg-neutral-950">
      <div className="container mx-auto px-4 max-w-7xl">
        <CheckoutClientWrapper />
      </div>
    </main>
  );
}
