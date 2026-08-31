"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, ShieldCheck, Lock, CreditCard, Truck, CheckCircle2, ChevronRight } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/sfcc/utils";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { translateProductTitle, getCurrentLanguage } from "@/lib/i18n/translation";
import { useEffect } from "react";

export default function CheckoutClientWrapper() {
  const { cart } = useCart();
  const [isTossModalOpen, setIsTossModalOpen] = useState(false);
  const [isDirectPayLoading, setIsDirectPayLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    // Orderer
    ordererName: "홍길동",
    ordererEmail: "customer@choicomma.com",
    ordererPhone: "010-1234-5678",
    // Shipping
    recipientName: "홍길동",
    recipientPhone: "010-1234-5678",
    postcode: "06123",
    address: "서울특별시 강남구 테헤란로 123",
    addressDetail: "초이콤마 타워 8층 801호",
    deliveryMemo: "문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)",
    customDeliveryMemo: "",
    // Payment
    paymentMethod: "easypay", // easypay | card | vbank
  });

  // Coupon / Discount State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Terms Agreement
  const [agreedTerms, setAgreedTerms] = useState({
    all: true,
    privacy: true,
    thirdParty: true,
    paymentService: true,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    if (couponCode.toUpperCase() === "CHOI10" || couponCode.toUpperCase() === "VIP") {
      setAppliedDiscount(10000);
      setCouponMessage("🎉 10,000원 정액 할인 쿠폰이 적용되었습니다!");
    } else if (couponCode.toUpperCase() === "WELCOME") {
      setAppliedDiscount(5000);
      setCouponMessage("🎉 5,000원 웰컴 쿠폰이 적용되었습니다!");
    } else {
      setCouponMessage("❌ 유효하지 않은 쿠폰 코드입니다. (테스트용 추천 코드: CHOI10, WELCOME)");
  // Dynamic Shipping Policy State
  const [shippingPolicy, setShippingPolicy] = useState({
    baseFee: 3000,
    freeShippingThreshold: 100000,
    islandExtraFee: 3000,
    returnExchangeFee: 6000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  useEffect(() => {
    const updateShippingPolicy = () => {
      if (typeof window !== "undefined") {
        const savedPolicy = localStorage.getItem("shipping_policy");
        if (savedPolicy) {
          try {
            setShippingPolicy(JSON.parse(savedPolicy));
          } catch (e) {}
        }
      }
    };
    updateShippingPolicy();
    window.addEventListener("storage", updateShippingPolicy);
    window.addEventListener("shipping_policy_updated", updateShippingPolicy);
    return () => {
      window.removeEventListener("storage", updateShippingPolicy);
      window.removeEventListener("shipping_policy_updated", updateShippingPolicy);
    };
  }, []);

  const totalItemAmount = Number(cart?.cost?.totalAmount?.amount || 0);
  const freeThreshold = shippingPolicy.freeShippingThreshold || 100000;
  const baseShippingFee = shippingPolicy.baseFee || 3000;
  const shippingFee = totalItemAmount >= freeThreshold || totalItemAmount === 0 ? 0 : baseShippingFee;
  const finalTotalAmount = Math.max(0, totalItemAmount + shippingFee - appliedDiscount);

  let rawClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_docs_Oabc1234567890";
  if (rawClientKey.includes("yL0qZ4G1VOlDEDezkwPProWb2MQY")) {
    rawClientKey = "test_ck_docs_Oabc1234567890";
  }
  const clientKey = rawClientKey;
  const customerKey = "CHOICOMMA_TEST_USER_99";
  const isWidgetKey = clientKey.includes("_gck_");

  const handlePayment = async () => {
    if (!agreedTerms.privacy || !agreedTerms.thirdParty || !agreedTerms.paymentService) {
      alert("주문 진행을 위해 필수 약관에 동의해 주세요.");
      return;
    }

    if (!formData.recipientName || !formData.recipientPhone || !formData.address) {
      alert("배송지 정보를 정확히 입력해 주세요.");
      return;
    }

    try {
      setIsDirectPayLoading(true);

      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `CHOICOMMA_ORDER_${Date.now()}`;
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const orderName = cart?.lines?.[0]?.merchandise?.product?.title
        ? cart.lines.length > 1
          ? `${cart.lines[0].merchandise.product.title} 외 ${cart.lines.length - 1}건`
          : cart.lines[0].merchandise.product.title
        : "초이콤마 오리지널 패션 주문건";

      if (isWidgetKey) {
        const widgets = tossPayments.widgets({ customerKey });
        await widgets.requestPayment({
          orderId,
          orderName,
          successUrl: `${origin}/order/success`,
          failUrl: `${origin}/order/fail`,
          customerEmail: formData.ordererEmail || "customer@choicomma.com",
          customerName: formData.recipientName || "홍길동",
        });
      } else {
        const payment = tossPayments.payment({ customerKey });
        await (payment as any).requestPayment({
          method: "CARD",
          amount: {
            currency: "KRW",
            value: finalTotalAmount > 0 ? finalTotalAmount : 50000,
          },
          orderId,
          orderName,
          successUrl: `${origin}/order/success`,
          failUrl: `${origin}/order/fail`,
          customerEmail: formData.ordererEmail || "customer@choicomma.com",
          customerName: formData.recipientName || "홍길동",
        });
      }
    } catch (err: any) {
      // Ignore user cancellation (closing the payment popup/window)
      if (
        err?.code === "PAY_PROCESS_CANCELED" ||
        err?.code === "USER_CANCEL" ||
        err?.message?.includes("취소")
      ) {
        console.log("사용자가 결제창을 취소하거나 닫았습니다.");
        return;
      }
      console.error("Direct Payment Request Failed:", err);
      alert(err?.message || "결제 창 호출 중 오류가 발생했습니다. 클라이언트 키 또는 네트워크 상태를 확인해 주세요.");
    } finally {
      setIsDirectPayLoading(false);
    }
  };

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-24 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto text-neutral-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">장바구니가 비어 있습니다</h2>
          <p className="text-sm text-neutral-500">주문서에 담을 상품을 먼저 장바구니에 담아주세요.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center gap-2 bg-neutral-950 text-white font-extrabold px-8 py-3.5 rounded-2xl text-sm shadow-lg hover:bg-neutral-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
        <Link href="/" className="hover:text-neutral-900 transition-colors">HOME</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-neutral-900 transition-colors">SHOP</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-neutral-900 dark:text-white font-bold">CHECKOUT</span>
      </nav>

      {/* Page Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
          주문서 작성 및 결제
        </h1>
        <p className="text-sm text-neutral-500 mt-1 font-medium">
          주문 내역과 배송 정보를 확인하신 후 결제를 진행해 주세요.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Forms (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          {/* Section 1: Orderer Info */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>👤</span> 주문자 정보
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">주문자 성함</label>
                <input
                  type="text"
                  value={formData.ordererName}
                  onChange={(e) => handleInputChange("ordererName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">연락처</label>
                <input
                  type="tel"
                  value={formData.ordererPhone}
                  onChange={(e) => handleInputChange("ordererPhone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">이메일 주소 (주문 확인서 수신용)</label>
                <input
                  type="email"
                  value={formData.ordererEmail}
                  onChange={(e) => handleInputChange("ordererEmail", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Info */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-neutral-900 dark:text-white" /> 배송지 정보
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    recipientName: prev.ordererName,
                    recipientPhone: prev.ordererPhone,
                  }));
                }}
                className="text-xs font-bold text-neutral-900 dark:text-neutral-300 hover:underline"
              >
                주문자 정보와 동일하게 채우기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">수령인 성함 *</label>
                <input
                  type="text"
                  required
                  value={formData.recipientName}
                  onChange={(e) => handleInputChange("recipientName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">수령인 연락처 *</label>
                <input
                  type="tel"
                  required
                  value={formData.recipientPhone}
                  onChange={(e) => handleInputChange("recipientPhone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">우편번호 및 기본주소 *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.postcode}
                    className="w-32 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => alert("우편번호 검색 기능이 준비되어 있습니다. 기본값이 설정되었습니다.")}
                    className="px-5 py-3 bg-neutral-900 text-white rounded-xl text-xs font-extrabold hover:bg-neutral-800 transition-colors"
                  >
                    우편번호 검색
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-2"
                  placeholder="기본주소"
                />
                <input
                  type="text"
                  value={formData.addressDetail}
                  onChange={(e) => handleInputChange("addressDetail", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="상세주소 (동, 호수 등)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">배송 요청사항</label>
                <select
                  value={formData.deliveryMemo}
                  onChange={(e) => handleInputChange("deliveryMemo", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)">문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)</option>
                  <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                  <option value="배송 전 미리 연락 바랍니다">배송 전 미리 연락 바랍니다</option>
                  <option value="택배함에 보관해 주세요">택배함에 보관해 주세요</option>
                  <option value="직접 입력">직접 입력</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout CTA (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-black text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-4">
              주문 상품 요약 ({cart.lines.length}개)
            </h2>

            {/* Cart Items List */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {cart.lines.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  {item.merchandise.product.featuredImage?.url && (
                    <img
                      src={item.merchandise.product.featuredImage.url}
                      alt={item.merchandise.product.title}
                      className="w-14 h-14 object-cover rounded-xl border border-neutral-200/60 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-neutral-900 dark:text-white truncate">
                      {translateProductTitle(item.merchandise.product.title, currentLang)}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      수량: {item.quantity}개
                    </p>
                  </div>
                  <p className="text-xs font-black text-neutral-900 dark:text-white">
                    {formatPrice(item.cost.totalAmount.amount, item.cost.totalAmount.currencyCode)}
                  </p>
                </div>
              ))}
            </div>

            {/* Coupon Code Section inside Order Summary */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <label className="block text-xs font-extrabold text-neutral-700 dark:text-neutral-300">
                🎟️ 쿠폰 할인 적용
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="쿠폰 코드 (예: CHOI10, WELCOME)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-colors"
                >
                  적용
                </button>
              </div>
              {couponMessage && (
                <p className={`text-[11px] font-bold ${couponMessage.startsWith("🎉") ? "text-neutral-900 dark:text-white" : "text-rose-500"}`}>
                  {couponMessage}
                </p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-sm font-bold">
              <div className="flex justify-between text-neutral-500">
                <span>총 상품 금액</span>
                <span className="font-bold text-neutral-900 dark:text-white">{formatPrice(totalItemAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>배송비</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {shippingFee === 0 ? "무료배송 (0원)" : formatPrice(shippingFee)}
                </span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-neutral-900 dark:text-white font-bold">
                  <span>쿠폰 할인</span>
                  <span className="font-bold text-rose-600">-{formatPrice(appliedDiscount)}</span>
                </div>
              )}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 flex justify-between items-baseline">
                <span className="text-base font-black text-neutral-900 dark:text-white">최종 결제 금액</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-white">
                  {formatPrice(finalTotalAmount)}
                </span>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-extrabold text-neutral-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={agreedTerms.all}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAgreedTerms({ all: checked, privacy: checked, thirdParty: checked, paymentService: checked });
                  }}
                  className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900"
                />
                <span>구매 조건 확인 및 전체 약관 동의</span>
              </label>
              <div className="pl-6 space-y-1 text-neutral-400 font-medium text-[11px]">
                <p>✓ 개인정보 수집·이용 동의 (필수)</p>
                <p>✓ 결제대행 서비스 이용약관 동의 (필수)</p>
              </div>
            </div>

            {/* Final Submit Payment Button */}
            <button
              type="button"
              disabled={isDirectPayLoading}
              onClick={handlePayment}
              className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDirectPayLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  토스결제창 로딩 중...
                </span>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>{formatPrice(finalTotalAmount)} 결제하기</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-neutral-400 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              토스페이먼츠 PG 연동으로 안전하게 보호됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
