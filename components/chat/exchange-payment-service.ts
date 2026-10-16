import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export type ExchangePaymentMethod = "CARD" | "EASY_PAY" | "TRANSFER" | "VIRTUAL_ACCOUNT";

export async function requestTossExchangePayment({
  orderNumber,
  items,
  amount = 16000,
  customerName,
  customerEmail,
  reason,
  details,
  paymentMethod = "CARD",
}: {
  orderNumber: string;
  items: string;
  amount?: number;
  customerName?: string;
  customerEmail?: string;
  reason?: string;
  details?: string;
  paymentMethod?: ExchangePaymentMethod;
}) {
  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY &&
    !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY.includes("docs_") &&
    !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY.includes("yL0qZ4G1VOlDEDezkwPProWb2MQY")
      ? process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      : "live_ck_24xLea5zVA9vgOXeeq92VQAMYNwW";

  const excOrderId = `EXC-${Date.now()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const effEmail =
    customerEmail ||
    (typeof window !== "undefined" ? localStorage.getItem("membership_user_email") || "" : "") ||
    "customer@choicomma.com";
  const effName =
    customerName ||
    (typeof window !== "undefined" ? localStorage.getItem("membership_user_name") || "" : "") ||
    "VIP 회원님";

  const methodLabel =
    paymentMethod === "TRANSFER"
      ? "실시간 계좌이체"
      : paymentMethod === "EASY_PAY"
      ? "간편결제 (카카오/네이버/토스)"
      : "신용·체크카드";

  // Save exchange intent into sessionStorage & localStorage so success page can read it
  const exchangeData = {
    exchangeId: excOrderId,
    orderNumber: orderNumber || "교환주문",
    items: items || "교환 접수 상품",
    amount,
    reason: reason || "교환 왕복 배송비",
    details: details || "",
    paymentMethod: methodLabel,
    customerName: effName,
    customerEmail: effEmail,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`pending_exchange_${excOrderId}`, JSON.stringify(exchangeData));
      localStorage.setItem("choicomma_last_exchange_intent", JSON.stringify(exchangeData));
    } catch {}
  }

  const tossPayments = await loadTossPayments(clientKey);
  const customerKey = "CHOICOMMA_USER_" + (effEmail ? effEmail.replace(/[^a-zA-Z0-9]/g, "") : "GUEST");
  const payment = tossPayments.payment({ customerKey });

  const basePaymentConfig = {
    amount: {
      currency: "KRW",
      value: amount, // 16,000 KRW
    },
    orderId: excOrderId,
    orderName: `[초이콤마] 교환 왕복 배송비 (16,000원)`,
    successUrl: `${origin}/order/success?type=EXCHANGE&orderId=${excOrderId}&amount=${amount}&refOrder=${encodeURIComponent(orderNumber || "")}&method=${encodeURIComponent(methodLabel)}`,
    failUrl: `${origin}/order/fail?type=EXCHANGE`,
    customerEmail: effEmail,
    customerName: effName,
  };

  if (paymentMethod === "TRANSFER") {
    await (payment as any).requestPayment({
      ...basePaymentConfig,
      method: "TRANSFER",
      transfer: {
        cashReceipt: {
          type: "소득공제",
        },
        useEscrow: false,
      },
    });
  } else {
    // CARD and EASY_PAY
    await (payment as any).requestPayment({
      ...basePaymentConfig,
      method: "CARD",
      card: {
        useEscrow: false,
        flowMode: "DEFAULT",
        useCardPoint: false,
        useAppCardOnly: false,
      },
    });
  }
}
