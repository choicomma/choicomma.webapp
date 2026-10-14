import fs from "fs";
import path from "path";
import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/constants";
import { isRemoteCatalogEnabled, queueRemoteSave, flushRemoteWrites, syncCatalogFromRemote } from "@/lib/products-remote-store";
import { adoptDiskIfNewer, markMemorySyncedWithDisk } from "@/lib/products-disk-sync";
import { confirmOrderReservation } from "./order-counter-service";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export interface PendingOrderData {
  orderId: string;
  formData: {
    ordererName?: string;
    ordererPhone?: string;
    ordererEmail?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAltPhone?: string;
    postcode?: string;
    address?: string;
    addressDetail?: string;
    deliveryMemo?: string;
    customDeliveryMemo?: string;
    paymentMethod?: string;
    refundBank?: string;
    refundAccountNumber?: string;
    refundAccountHolder?: string;
    [key: string]: any;
  };
  cart: {
    lines: any[];
    totalQuantity?: number;
    cost?: {
      totalAmount?: {
        amount: string;
        currencyCode: string;
      };
    };
  };
  finalTotalAmount: number;
  earnedPoints?: number;
  pointRate?: number;
  userGrade?: string;
  appliedPoints?: number;
  appliedDiscount?: number;
  isDirectOrder?: boolean;
  selectedCouponId?: string | null;
  selectedCouponTitle?: string | null;
  selectedCouponType?: string;
  shippingFee?: number;
  paidAt?: string;
  [key: string]: any;
}

function getDataFilePath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
}

function safeAtomicWriteJson(targetPath: string, data: any): boolean {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
    return true;
  } catch (err) {
    console.error(`[Safe Write Error: ${targetPath}]:`, err);
    return false;
  }
}

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    const targetPath = getDataFilePath(filename);
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);
      if (data !== undefined && data !== null) return data as T;
    }
  } catch (err) {
    console.warn(`[Read Warning: ${filename}]:`, err);
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending Orders Store (서버 보류 주문 임시 원장)
// ─────────────────────────────────────────────────────────────────────────────
export function savePendingOrderOnServer(orderId: string, data: PendingOrderData): boolean {
  if (!orderId) return false;
  try {
    const map = readJsonFile<Record<string, PendingOrderData>>("pending-orders.json", {});
    map[orderId] = {
      ...data,
      orderId,
      savedAt: new Date().toISOString(),
    };

    // 오래된 보류 주문(24시간 경과) 자동 정리
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    Object.keys(map).forEach((k) => {
      const savedAt = map[k]?.savedAt ? new Date(map[k].savedAt).getTime() : 0;
      if (savedAt > 0 && now - savedAt > oneDayMs) {
        delete map[k];
      }
    });

    return safeAtomicWriteJson(getDataFilePath("pending-orders.json"), map);
  } catch (err) {
    console.error("[savePendingOrderOnServer Error]:", err);
    return false;
  }
}

export function getPendingOrderOnServer(orderId: string): PendingOrderData | null {
  if (!orderId) return null;
  try {
    const map = readJsonFile<Record<string, PendingOrderData>>("pending-orders.json", {});
    return map[orderId] || null;
  } catch {
    return null;
  }
}

export function removePendingOrderOnServer(orderId: string): void {
  if (!orderId) return;
  try {
    const map = readJsonFile<Record<string, PendingOrderData>>("pending-orders.json", {});
    if (map[orderId]) {
      delete map[orderId];
      safeAtomicWriteJson(getDataFilePath("pending-orders.json"), map);
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock Deduction Helper (서버 사이드 재고 차감)
// ─────────────────────────────────────────────────────────────────────────────
export async function deductStockOnServer(items: Array<{ productId: string; quantity: number; color?: string; size?: string }>): Promise<boolean> {
  if (!Array.isArray(items) || items.length === 0) return true;

  try {
    const filePath = getDataFilePath("products-cache.json");
    const globalForProducts = global as unknown as { serverProductsCache?: any[]; serverProductsDirty?: boolean };

    await syncCatalogFromRemote(true);
    adoptDiskIfNewer();

    let products: any[];
    if (Array.isArray(globalForProducts.serverProductsCache) && globalForProducts.serverProductsCache.length > 0) {
      products = JSON.parse(JSON.stringify(globalForProducts.serverProductsCache));
    } else {
      if (!fs.existsSync(filePath)) return false;
      products = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    if (!Array.isArray(products)) return false;

    let modified = false;

    items.forEach((item) => {
      const pId = String(item.productId || "");
      const qty = Math.max(1, Number(item.quantity) || 1);

      const target = products.find(
        (p: any) => String(p.id) === pId || (p.handle && String(p.handle) === pId) || (p.productCode && String(p.productCode) === pId)
      );

      if (!target) return;

      modified = true;

      // 1. Total numeric stock
      const currentTotal = target.stock !== undefined && target.stock !== null ? Number(target.stock) : 50;
      const newTotal = Math.max(0, currentTotal - qty);
      target.stock = newTotal;

      // 2. Option-specific sizeStock
      if (target.sizeStock && typeof target.sizeStock === "object") {
        const comboKey = item.color && item.size ? `${item.color}-${item.size}` : "";
        if (comboKey && target.sizeStock[comboKey] !== undefined) {
          const optStock = Number(target.sizeStock[comboKey]) || 0;
          target.sizeStock[comboKey] = Math.max(0, optStock - qty);
        } else if (item.size && target.sizeStock[item.size] !== undefined) {
          const optStock = Number(target.sizeStock[item.size]) || 0;
          target.sizeStock[item.size] = Math.max(0, optStock - qty);
        }
      }

      // 3. Auto-toggle Sold Out when stock hits 0
      if (newTotal === 0) {
        target.availableForSale = false;
        if (Array.isArray(target.variants)) {
          target.variants = target.variants.map((v: any) => ({ ...v, availableForSale: false }));
        }
      }
      target.updated_at = new Date().toISOString();
    });

    if (modified) {
      const written = safeAtomicWriteJson(filePath, products);
      globalForProducts.serverProductsCache = products;
      let remoteOk = false;
      if (isRemoteCatalogEnabled) {
        queueRemoteSave("products", products);
        remoteOk = await flushRemoteWrites();
      }
      globalForProducts.serverProductsDirty = !(written || remoteOk);
      if (written || remoteOk) markMemorySyncedWithDisk();

      try {
        revalidateTag(TAGS.products);
        revalidatePath("/", "layout");
        revalidatePath("/shop", "layout");
      } catch {}
    }

    return true;
  } catch (err) {
    console.error("[deductStockOnServer Error]:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Atomic Order Creation Helper (서버 원자적 주문서 + 배송서 생성)
// ─────────────────────────────────────────────────────────────────────────────
export interface ConfirmOrderParams {
  orderId: string;
  paymentKey?: string | null;
  amount: number | string;
  method?: string;
  pendingOrder?: PendingOrderData | null;
  rawPaymentData?: any;
  customerId?: string | null;
}

export async function createConfirmedOrderOnServer(params: ConfirmOrderParams): Promise<{
  success: boolean;
  order: any;
  shipment: any;
  alreadyExisted: boolean;
}> {
  const { orderId, paymentKey, amount, method, rawPaymentData, customerId } = params;

  if (!orderId) {
    throw new Error("주문번호(orderId)가 누락되었습니다.");
  }

  // 1. 기존 주문 여부 확인 (Idempotency 보장: 중복 생성/중복 차감 원천 방지)
  const existingOrders = readJsonFile<any[]>("orders.json", []);
  const existingOrder = existingOrders.find((o) => o.id === orderId || o.orderNumber === orderId);

  const existingShipments = readJsonFile<any[]>("shipments.json", []);
  const existingShipment = existingShipments.find((s) => s.id === orderId || s.orderId === orderId);

  if (existingOrder && existingShipment) {
    return {
      success: true,
      order: existingOrder,
      shipment: existingShipment,
      alreadyExisted: true,
    };
  }

  // 2. 보류 주문 데이터 복원 (클라이언트 전달값 우선 -> 서버 저장소 조회)
  const pending: PendingOrderData | null =
    params.pendingOrder || getPendingOrderOnServer(orderId);

  const numAmount = Number(amount) || 0;
  const isZeroPayment = numAmount === 0 || !paymentKey || paymentKey === "FREE";

  const effectiveMethod =
    method ||
    rawPaymentData?.method ||
    (isZeroPayment
      ? (pending?.appliedPoints && pending.appliedPoints > 0 ? "전액 적립금 결제" : "전액 할인 쿠폰 결제")
      : (pending?.formData?.paymentMethod === "TRANSFER"
          ? "실시간 계좌이체"
          : pending?.formData?.paymentMethod === "EASY_PAY"
          ? "간편결제 (카카오/네이버/토스)"
          : "신용·체크카드 (토스)"));

  const form = pending?.formData || {};
  const ordererName =
    form.ordererName ||
    rawPaymentData?.customerName ||
    form.recipientName ||
    "고객님";

  const recipientName =
    form.recipientName ||
    form.ordererName ||
    rawPaymentData?.customerName ||
    "고객님";

  const email =
    rawPaymentData?.customerEmail ||
    form.ordererEmail ||
    "customer@choicomma.com";

  const phone = form.recipientPhone || form.ordererPhone || "010-0000-0000";
  const altPhone = form.recipientAltPhone || "";
  const zipCode = form.postcode || "";
  const address = form.address || "";
  const detailAddress = form.addressDetail || "";

  const effectiveShippingMemo =
    form.deliveryMemo === "직접 입력"
      ? (form.customDeliveryMemo?.trim() || "직접 입력")
      : (form.deliveryMemo || "");

  const cartLines = Array.isArray(pending?.cart?.lines) ? pending.cart.lines : [];
  const itemsText = cartLines.length > 0
    ? cartLines.map((l: any) => `${l.merchandise?.product?.title || l.title || "상품"} (${l.quantity || 1}개)`).join(", ")
    : (rawPaymentData?.orderName || "초이콤마 오리지널 패션 컬렉션");

  const totalQuantity = cartLines.length > 0
    ? cartLines.reduce((acc: number, l: any) => acc + (Number(l.quantity) || 1), 0)
    : (pending?.cart?.totalQuantity || 1);

  const featuredImg =
    cartLines[0]?.merchandise?.product?.featuredImage?.url ||
    cartLines[0]?.merchandise?.image?.url ||
    cartLines[0]?.image ||
    "/product_1.webp";

  const earnedPoints = pending?.earnedPoints !== undefined
    ? Number(pending.earnedPoints)
    : Math.floor(numAmount * 0.01);

  const appliedPoints = Number(pending?.appliedPoints || 0);
  const discountAmount = Number(pending?.appliedDiscount || 0);
  const shippingFee = Number(pending?.shippingFee || 0);
  const couponId = pending?.selectedCouponId || "";
  const couponTitle = pending?.selectedCouponTitle || "";

  const nowIso = new Date().toISOString();
  const todayYmd = nowIso.slice(0, 10);
  const todayFormatted = nowIso.replace("T", " ").slice(0, 19);

  // 3. 최종 주문서(Order) 객체 생성
  const newOrder = {
    id: orderId,
    orderId,
    orderNumber: orderId,
    customerId: customerId || form.customerId || null,
    customer: ordererName,
    ordererName,
    recipient: recipientName,
    email,
    phone,
    altPhone,
    zipCode,
    address,
    detailAddress,
    shippingAddress: {
      zipCode,
      address,
      detailAddress,
    },
    shippingMemo: effectiveShippingMemo,
    orderMemo: effectiveShippingMemo,
    items: itemsText,
    orderLines: cartLines,
    image: featuredImg,
    quantity: totalQuantity,
    totalAmount: numAmount,
    shippingFee,
    discountAmount,
    pointsUsed: appliedPoints,
    pointsEarned: earnedPoints,
    customerName: ordererName,
    couponId,
    couponTitle,
    method: effectiveMethod,
    paymentMethod: effectiveMethod,
    paymentStatus: "PAID",
    paymentKey: paymentKey || (isZeroPayment ? "FREE" : "-"),
    status: isZeroPayment ? "결제완료 (전액적립금)" : "결제완료 (토스)",
    date: todayYmd,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 4. 최종 배송서(Shipment) 객체 생성
  const newShipment = {
    id: orderId,
    orderId,
    ordererName,
    recipient: recipientName,
    phone,
    altPhone,
    zipCode,
    address,
    detailAddress,
    items: itemsText,
    image: featuredImg,
    quantity: totalQuantity,
    totalAmount: numAmount,
    shippingFee,
    discountAmount,
    pointsUsed: appliedPoints,
    pointsEarned: earnedPoints,
    couponId,
    couponTitle,
    carrier: "CJ대한통운",
    trackingNumber: "-",
    status: "Pending",
    shippingMemo: effectiveShippingMemo,
    orderDate: todayFormatted,
    shippedDate: null,
    estimatedDelivery: null,
    packages: [
      {
        id: `PKG-${orderId}-1`,
        pkgIndex: 1,
        items: itemsText,
        quantity: totalQuantity,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 5. 서버 data/orders.json에 원자적 저장
  const updatedOrders = [newOrder, ...existingOrders.filter((o) => o.id !== orderId && o.orderNumber !== orderId)];
  safeAtomicWriteJson(getDataFilePath("orders.json"), updatedOrders);

  // 5-1. Supabase 비동기 듀얼 라이트 (주문서)
  try {
    const itemsPayload = cartLines.length > 0
      ? cartLines.map((l: any) => ({
          name: l.merchandise?.product?.title || l.title || "상품",
          price: Number(l.cost?.totalAmount?.amount || l.price || 0),
          quantity: Number(l.quantity || 1),
          option: l.option || "",
        }))
      : [{ name: itemsText, quantity: totalQuantity, price: numAmount }];

    const supabaseOrderRow = {
      id: String(newOrder.id),
      orderNumber: String(newOrder.orderNumber),
      customerId: String(newOrder.customerId || ""),
      customerName: String(newOrder.ordererName || "고객님"),
      customerEmail: String(newOrder.email || ""),
      customerPhone: String(newOrder.phone || ""),
      totalAmount: Number(newOrder.totalAmount || 0),
      shippingFee: Number(newOrder.shippingFee || 0),
      discountAmount: Number(newOrder.discountAmount || 0),
      pointsUsed: Number(newOrder.pointsUsed || 0),
      paymentMethod: String(newOrder.paymentMethod || "CARD"),
      paymentStatus: String(newOrder.paymentStatus || "PAID"),
      shippingAddress: [newOrder.address, newOrder.detailAddress].filter(Boolean).join(" ") || "-",
      items: itemsPayload,
      orderMemo: String(newOrder.orderMemo || ""),
      created_at: newOrder.created_at || new Date().toISOString(),
      updated_at: newOrder.updated_at || new Date().toISOString(),
    };

    runSafeSupabaseQuery(
      async (supabase) => supabase.from("orders").upsert([supabaseOrderRow], { onConflict: "id" }),
      2500
    ).catch((e) => console.warn("[Supabase Order Dual-Write Warning]:", e));
  } catch (dualErr) {
    console.warn("[Supabase Order Dual-Write Notice]:", dualErr);
  }

  // 6. 서버 data/shipments.json에 원자적 저장
  const updatedShipments = [newShipment, ...existingShipments.filter((s) => s.id !== orderId && s.orderId !== orderId)];
  safeAtomicWriteJson(getDataFilePath("shipments.json"), updatedShipments);

  // 6-1. Supabase 비동기 듀얼 라이트 (배송서)
  try {
    const supabaseShipmentRow = {
      id: String(newShipment.id),
      orderId: String(newShipment.orderId),
      recipient: String(newShipment.recipient || "고객님"),
      phone: String(newShipment.phone || "-"),
      altPhone: String(newShipment.altPhone || ""),
      zipCode: String(newShipment.zipCode || ""),
      address: String(newShipment.address || "-"),
      detailAddress: String(newShipment.detailAddress || ""),
      items: String(newShipment.items || "-"),
      quantity: Number(newShipment.quantity || 1),
      carrier: String(newShipment.carrier || "CJ대한통운"),
      trackingNumber: String(newShipment.trackingNumber || "-"),
      status: String(newShipment.status || "Pending"),
      shippingMemo: String(newShipment.shippingMemo || ""),
      orderDate: newShipment.orderDate || new Date().toISOString(),
      shippedDate: newShipment.shippedDate || null,
      estimatedDelivery: newShipment.estimatedDelivery || null,
      packages: Array.isArray(newShipment.packages) ? newShipment.packages : [],
      created_at: newShipment.created_at || new Date().toISOString(),
      updated_at: newShipment.updated_at || new Date().toISOString(),
    };

    runSafeSupabaseQuery(
      async (supabase) => supabase.from("shipments").upsert([supabaseShipmentRow], { onConflict: "id" }),
      2500
    ).catch((e) => console.warn("[Supabase Shipment Dual-Write Warning]:", e));
  } catch (shipDualErr) {
    console.warn("[Supabase Shipment Dual-Write Notice]:", shipDualErr);
  }

  // 7. 결제 로그 기록 (data/payment-logs.json)
  try {
    const logs = readJsonFile<any[]>("payment-logs.json", []);
    const newLog = {
      id: `PAY-${orderId}-${Date.now().toString().slice(-4)}`,
      orderId,
      paymentKey: paymentKey || (isZeroPayment ? "FREE" : "-"),
      amount: numAmount,
      status: "DONE",
      method: effectiveMethod,
      approvedAt: nowIso,
      rawResponse: rawPaymentData || { orderId, amount: numAmount, status: "DONE" },
      created_at: nowIso,
    };
    const logIdx = logs.findIndex((l) => (paymentKey && l.paymentKey === paymentKey) || l.orderId === orderId);
    if (logIdx !== -1) {
      logs[logIdx] = { ...logs[logIdx], ...newLog };
    } else {
      logs.unshift(newLog);
    }
    safeAtomicWriteJson(getDataFilePath("payment-logs.json"), logs);

    // 7-1. Supabase 비동기 듀얼 라이트 (결제 로그)
    try {
      const supabaseLogPayload = {
        id: String(newLog.id),
        orderId: String(newLog.orderId || ""),
        paymentKey: String(newLog.paymentKey || ""),
        amount: Number(newLog.amount || 0),
        status: String(newLog.status || "DONE"),
        method: String(newLog.method || ""),
        approvedAt: newLog.approvedAt || new Date().toISOString(),
        rawResponse: newLog.rawResponse || null,
        created_at: newLog.created_at || new Date().toISOString(),
      };

      runSafeSupabaseQuery(
        async (supabase) => supabase.from("payment_logs").upsert([supabaseLogPayload], { onConflict: "id" }),
        2500
      ).catch((e) => console.warn("[Supabase Payment Log Dual-Write Warning]:", e));
    } catch (logDualErr) {
      console.warn("[Supabase Payment Log Dual-Write Notice]:", logDualErr);
    }
  } catch (logErr) {
    console.warn("[Payment Log Write Notice]:", logErr);
  }

  // 8. 재고 실시간 자동 차감
  if (cartLines.length > 0) {
    const deductItems = cartLines.map((l: any) => {
      const opts = l.merchandise?.selectedOptions || [];
      const colorVal = opts.find((o: any) => o.name?.toLowerCase() === "color")?.value || "";
      const sizeVal = opts.find((o: any) => o.name?.toLowerCase() === "size")?.value || "";
      return {
        productId: l.merchandise?.product?.id || l.id,
        quantity: Number(l.quantity) || 1,
        color: colorVal,
        size: sizeVal,
      };
    });
    try {
      await deductStockOnServer(deductItems);
    } catch (err) {
      console.warn("[Stock Deduction Warning]:", err);
    }
  }

  // 9. 보류 주문 목록에서 정리 및 채번 예약 확정
  removePendingOrderOnServer(orderId);
  confirmOrderReservation(orderId);

  return {
    success: true,
    order: newOrder,
    shipment: newShipment,
    alreadyExisted: false,
  };
}
