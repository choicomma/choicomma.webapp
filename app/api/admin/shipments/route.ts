import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import { logAdminActivity } from "@/lib/logging/audit-logger";

function normalizeShipmentForSupabase(s: any) {
  let itemsStr = "";
  if (typeof s.items === "string") {
    itemsStr = s.items;
  } else if (Array.isArray(s.items)) {
    itemsStr = s.items.map((i: any) => `${i.name || i.title || "상품"} (${i.quantity || 1}개)`).join(", ");
  }

  return {
    id: String(s.id || s.orderId),
    orderId: String(s.orderId || s.id),
    recipient: String(s.recipient || s.ordererName || s.customerName || "고객님"),
    phone: String(s.phone || s.customerPhone || "-"),
    altPhone: String(s.altPhone || s.alt_phone || ""),
    zipCode: String(s.zipCode || s.zip_code || s.shippingAddress?.zipCode || ""),
    address: String(s.address || s.shippingAddress?.address || "-"),
    detailAddress: String(s.detailAddress || s.detail_address || s.shippingAddress?.detailAddress || ""),
    items: itemsStr || "-",
    quantity: Number(s.quantity || 1),
    carrier: String(s.carrier || "CJ대한통운"),
    trackingNumber: String(s.trackingNumber || s.tracking_number || "-"),
    status: String(s.status || "Pending"),
    shippingMemo: String(s.shippingMemo || s.shipping_memo || ""),
    orderDate: s.orderDate || s.order_date || s.created_at || new Date().toISOString(),
    shippedDate: s.shippedDate || s.shipped_date || null,
    estimatedDelivery: s.estimatedDelivery || s.estimated_delivery || null,
    packages: Array.isArray(s.packages) ? s.packages : [],
    created_at: s.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Fallback in-memory cache for fast response
const globalForShipments = global as unknown as { serverShipmentsCache?: any[] };

function getShipmentsFilePath() {
  return path.join(process.cwd(), "data", "shipments.json");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractShipmentOrderNumber(str: string): number {
  if (!str) return 0;
  if (str.includes("REAL") || str.includes("CJ-REAL")) return 999999999999;
  const chMatch = str.match(/(?:CH|ORD)[-_]?(\d{8})[-_]?(\d+)/i);
  if (chMatch) {
    return parseInt(chMatch[1] + chMatch[2].padStart(4, "0"), 10);
  }
  const match = str.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function getShipmentOrderTimestamp(s: any): number {
  if (!s) return 0;
  const raw = s.orderDate || s.order_date || s.created_at || s.createdAt;
  if (raw) {
    const str = String(raw).trim();
    const match = str.match(/^(\d{4})[-./](\d{2})[-./](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [_, Y, M, D, h, m, sec] = match;
      return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(sec)).getTime();
    }
    const t = new Date(str).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

function sortShipmentsByNumber(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a: any, b: any) => {
    // 1순위: 주문 생성 일시 (가장 최근 주문일시 내림차순)
    const timeA = getShipmentOrderTimestamp(a);
    const timeB = getShipmentOrderTimestamp(b);
    if (timeB !== timeA) return timeB - timeA;

    // 2순위: 동시간대 주문번호 기준 정렬
    const keyA = (a.orderId || a.id || "").trim();
    const keyB = (b.orderId || b.id || "").trim();
    const numA = extractShipmentOrderNumber(keyA);
    const numB = extractShipmentOrderNumber(keyB);
    if (numA !== numB) return numB - numA;

    return keyB.localeCompare(keyA, undefined, { numeric: true, sensitivity: "base" });
  });
}

function hydrateShipmentMergeData(s: any): any {
  if (!s) return s;
  const pkg0 = Array.isArray(s.packages) && s.packages[0] ? s.packages[0] : {};
  const memo = String(s.shippingMemo || s.shipping_memo || "");
  const isMergedChild = Boolean(s.isMergedChild ?? pkg0.isMergedChild ?? memo.includes("[합배송 완료]"));
  const isMergedParent = Boolean(s.isMergedParent ?? pkg0.isMergedParent ?? memo.includes("[합배송:"));

  return {
    ...s,
    isMergedParent,
    isMergedChild,
    mergedIntoId: s.mergedIntoId ?? pkg0.mergedIntoId,
    mergedIntoOrderId: s.mergedIntoOrderId ?? pkg0.mergedIntoOrderId,
    bundledShipmentIds: s.bundledShipmentIds ?? pkg0.bundledShipmentIds,
    bundledOrderNumbers: s.bundledOrderNumbers ?? pkg0.bundledOrderNumbers,
    bundledRefundPoints: s.bundledRefundPoints ?? pkg0.bundledRefundPoints,
    originalItems: s.originalItems ?? pkg0.originalItems,
    originalQuantity: s.originalQuantity ?? pkg0.originalQuantity,
  };
}

function serializeShipmentsForDiff(list: any[]): string {
  if (!Array.isArray(list)) return "";
  return JSON.stringify(
    list.map((s) => {
      const pkg0 = Array.isArray(s.packages) && s.packages[0] ? s.packages[0] : {};
      const memo = String(s.shippingMemo || s.shipping_memo || "");
      return {
        id: s.id,
        orderId: s.orderId || s.order_id || "",
        recipient: s.recipient || "",
        phone: s.phone || "",
        altPhone: s.altPhone || s.alt_phone || "",
        zipCode: s.zipCode || s.zip_code || "",
        address: s.address || "",
        detailAddress: s.detailAddress || s.detail_address || "",
        items: s.items || "",
        quantity: s.quantity || 1,
        carrier: s.carrier || "CJ대한통운",
        trackingNumber: s.trackingNumber || s.tracking_number || "-",
        status: s.status || "Pending",
        shippingMemo: memo,
        packages: s.packages || [],
        shippedDate: s.shippedDate || null,
        estimatedDelivery: s.estimatedDelivery || null,
        isMergedParent: Boolean(s.isMergedParent ?? pkg0.isMergedParent ?? memo.includes("[합배송:")),
        isMergedChild: Boolean(s.isMergedChild ?? pkg0.isMergedChild ?? memo.includes("[합배송 완료]")),
      };
    })
  );
}

function getOrdersFilePath() {
  return path.join(process.cwd(), "data", "orders.json");
}

function readOrdersDisk(): any[] {
  try {
    const targetPath = getOrdersFilePath();
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {}
  return [];
}

function orderToShipment(order: any): any {
  const itemsText = Array.isArray(order.items)
    ? order.items.map((i: any) => `${i.title || i.name} x${i.quantity || 1}`).join(", ")
    : String(order.items || "");
  const qty = Array.isArray(order.items)
    ? order.items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)
    : (order.quantity || 1);

  return {
    id: order.id || order.orderNumber,
    orderId: order.orderNumber || order.id,
    ordererName: order.ordererName || order.customer || order.customerName || order.recipient || "",
    recipient: order.recipient || order.customerName || order.customer || "",
    phone: order.phone || order.customerPhone || "",
    altPhone: order.altPhone || "",
    zipCode: order.zipCode || order.postalCode || "",
    address: order.address || order.shippingAddress || "",
    detailAddress: order.detailAddress || "",
    items: itemsText,
    quantity: qty,
    shippingMemo: order.shippingMemo || order.orderMemo || order.deliveryMemo || "",
    carrier: order.carrier || "CJ대한통운",
    trackingNumber: order.trackingNumber || "-",
    status: order.shippingStatus || order.status || "Pending",
    orderDate: order.orderDate || (order.created_at ? order.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    shippedDate: order.shippedDate || null,
    estimatedDelivery: order.estimatedDelivery || null,
    packages: order.packages || [],
  };
}

function readShipmentsDisk(): any[] {
  let shipments: any[] = [];
  try {
    const targetPath = getShipmentsFilePath();
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) shipments = data;
    }
  } catch (err) {
    console.warn("[Shipments File Read Warning]:", err);
  }

  // Cross-check with data/orders.json to guarantee zero missed orders
  try {
    const orders = readOrdersDisk();
    if (orders.length > 0) {
      const existingKeys = new Set(shipments.map((s: any) => s.id || s.orderId));
      let newlyAdded = false;
      for (const ord of orders) {
        const ordKey = ord.id || ord.orderNumber;
        if (ordKey && !existingKeys.has(ordKey)) {
          shipments.unshift(orderToShipment(ord));
          existingKeys.add(ordKey);
          newlyAdded = true;
        }
      }
      if (newlyAdded) {
        writeShipmentsDisk(shipments);
      }
    }
  } catch (err) {}

  return shipments;
}

function writeShipmentsDisk(data: any[]) {
  try {
    const targetPath = getShipmentsFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

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
  } catch (err) {
    console.error("[Shipments File Write Error]:", err);
  }
}

// Rate limiter map to break infinite client loops
const lastShipmentHitMap = new Map<string, number>();

// GET: 배송 목록 조회 (Git 파일 data/shipments.json 기준)
export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || "unknown";
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  const clientKey = `${clientIp}:${referer}`;
  const now = Date.now();
  const lastHit = lastShipmentHitMap.get(clientKey) || 0;

  if (referer.includes("/membership") && now - lastHit < 2500) {
    return NextResponse.json({ throttled: true, message: "Loop breaker throttle" }, { status: 429 });
  }
  lastShipmentHitMap.set(clientKey, now);

  function formatResponse(list: any[]) {
    if (referer.includes("/membership")) {
      return NextResponse.json({ success: true, shipments: list }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }
    return NextResponse.json(list, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }

  try {
    // 1. Primary Source of Truth: Git JSON file (data/shipments.json)
    if (fs.existsSync(getShipmentsFilePath())) {
      const diskData = readShipmentsDisk();
      const sorted = sortShipmentsByNumber(diskData.map(hydrateShipmentMergeData));
      globalForShipments.serverShipmentsCache = sorted;
      return formatResponse(sorted);
    }

    // 2. In-memory cache
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      const sorted = sortShipmentsByNumber(globalForShipments.serverShipmentsCache.map(hydrateShipmentMergeData));
      return formatResponse(sorted);
    }

    // 3. Supabase 자가 치유 폴백 (로컬 파일 유실 시 복원)
    try {
      const { data, error } = await runSafeSupabaseQuery<any[]>(
        async (supabase) => supabase.from("shipments").select("*"),
        1500
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        writeShipmentsDisk(data);
        const sorted = sortShipmentsByNumber(data.map(hydrateShipmentMergeData));
        globalForShipments.serverShipmentsCache = sorted;
        return formatResponse(sorted);
      }
    } catch {}

    // 4. Fallback: Initial shipments
    const sorted = sortShipmentsByNumber(initialShipments || []);
    globalForShipments.serverShipmentsCache = sorted;
    return formatResponse(sorted);
  } catch (error: any) {
    console.error("Failed to read server shipments:", error);
    return NextResponse.json(initialShipments || [], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}

// POST: 배송 데이터 저장 (스마트 비파괴 병합 & 원자적 영속화)
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const shipments = Array.isArray(payload) ? payload : payload?.shipments;

    if (!Array.isArray(shipments)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 1. 현재 서버 디스크 상의 최신 배송 데이터 읽기 (orders.json 크로스체크 자동 포함)
    const diskShipments = readShipmentsDisk();

    // 2. 클라이언트 전달 수정본 Map 생성 (id 및 orderId 키 매핑)
    const incomingMap = new Map<string, any>();
    for (const item of shipments) {
      if (!item) continue;
      const key = String(item.id || item.orderId || "").trim();
      if (key) {
        incomingMap.set(key, item);
      }
    }

    // 3. 스마트 비파괴 병합:
    //  - 디스크 주문 중 클라이언트 수정본이 있으면 최신 필드로 업데이트
    //  - 디스크 주문 중 클라이언트 목록에 없는 건(새로 체결된 주문)은 절대 삭제하지 않고 보존!
    const mergedList: any[] = [];
    const processedKeys = new Set<string>();

    const modifiedAudits: any[] = [];
    for (const diskItem of diskShipments) {
      const diskKey = String(diskItem.id || diskItem.orderId || "").trim();
      if (incomingMap.has(diskKey)) {
        const incomingItem = incomingMap.get(diskKey);
        const statusChanged = incomingItem.status && incomingItem.status !== diskItem.status;
        const trackingChanged = incomingItem.trackingNumber && incomingItem.trackingNumber !== diskItem.trackingNumber && incomingItem.trackingNumber !== "-";
        if (statusChanged || trackingChanged) {
          modifiedAudits.push({
            orderId: diskItem.orderId || diskItem.id,
            recipient: diskItem.recipient || "고객",
            statusChanged,
            trackingChanged,
            prevStatus: diskItem.status,
            newStatus: incomingItem.status || diskItem.status,
            prevTracking: diskItem.trackingNumber,
            newTracking: incomingItem.trackingNumber || diskItem.trackingNumber,
            carrier: incomingItem.carrier || diskItem.carrier || "CJ대한통운",
          });
        }
        mergedList.push({
          ...diskItem,
          ...incomingItem,
          created_at: diskItem.created_at || incomingItem.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        processedKeys.add(diskKey);
      } else {
        // 클라이언트 목록에 없었던 디스크 항목은 신규 주문이므로 안전하게 보존!
        mergedList.push(diskItem);
      }
    }

    // 4. 클라이언트에서 수동 추가한 신규 항목(아직 디스크에 없었던 건)도 추가
    for (const [key, item] of incomingMap.entries()) {
      if (!processedKeys.has(key)) {
        mergedList.unshift(item);
      }
    }

    // 5. 번호순 내림차순 정렬 및 합배송 상태 하이드레이션
    const sorted = sortShipmentsByNumber(mergedList.map(hydrateShipmentMergeData));

    // If cache serialized is identical, skip write
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      const cacheSerialized = serializeShipmentsForDiff(globalForShipments.serverShipmentsCache);
      const incomingSerialized = serializeShipmentsForDiff(sorted);
      if (cacheSerialized === incomingSerialized) {
        return NextResponse.json(
          { success: true, count: sorted.length, data: sorted, message: "No business data changed, skipped write" },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // 6. Git JSON 파일 원자적 영속화
    writeShipmentsDisk(sorted);

    // 6-1. Supabase 비동기 듀얼 라이트
    const supabasePayload = sorted.map(normalizeShipmentForSupabase);
    runSafeSupabaseQuery(
      async (supabase) => supabase.from("shipments").upsert(supabasePayload, { onConflict: "id" }),
      2500
    ).catch((e) => console.warn("[Supabase Shipments Dual-Write Warning]:", e));

    // 6-2. 관리자 배송/송장 작업 감사 로그 기록
    for (const m of modifiedAudits.slice(0, 10)) {
      logAdminActivity({
        adminId: "admin_master",
        adminName: "배송/물류 관리자",
        actionType: "STATUS_CHANGE",
        domain: "SHIPMENT",
        targetId: m.orderId,
        targetName: `${m.recipient}님 주문 (${m.orderId})`,
        description: m.trackingChanged
          ? `운송장번호 [${m.newTracking}] 등록 (${m.carrier}) 및 배송 상태 변경 (${m.prevStatus} → ${m.newStatus})`
          : `배송 상태 변경 (${m.prevStatus} → ${m.newStatus})`,
        beforeData: { status: m.prevStatus, trackingNumber: m.prevTracking },
        afterData: { status: m.newStatus, trackingNumber: m.newTracking, carrier: m.carrier },
      }).catch(() => {});
    }

    // 7. In-memory cache 업데이트
    globalForShipments.serverShipmentsCache = sorted;

    return NextResponse.json(
      { success: true, count: sorted.length, data: sorted },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to save server shipments:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 데이터 저장 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 배송 목록에서 삭제 (data/shipments.json 및 data/orders.json 반영)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.ids)
      ? body.ids
      : body?.id
      ? [body.id]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: "삭제할 주문 ID가 없습니다." }, { status: 400 });
    }

    // 1. 디스크 배송 데이터 읽기 & 필터링
    const current = readShipmentsDisk();
    const filtered = current.filter((s: any) => !ids.includes(s.id) && !ids.includes(s.orderId));
    writeShipmentsDisk(filtered);

    // 1-1. data/orders.json에서도 함께 삭제하여 재유입 방지
    try {
      const ordersPath = getOrdersFilePath();
      const currentOrders = readOrdersDisk();
      const filteredOrders = currentOrders.filter((o: any) => !ids.includes(o.id) && !ids.includes(o.orderNumber));
      if (filteredOrders.length !== currentOrders.length) {
        fs.writeFileSync(ordersPath, JSON.stringify(filteredOrders, null, 2), "utf-8");
      }
    } catch (err) {}

    // 1-2. Supabase 비동기 듀얼 삭제 (shipments 및 orders 테이블 동시 삭제)
    runSafeSupabaseQuery(
      async (supabase) => {
        const { error: err1 } = await supabase.from("shipments").delete().in("id", ids);
        const { error: err2 } = await supabase.from("orders").delete().in("id", ids);
        return { data: null, error: err1 || err2 };
      },
      2500
    ).catch((e) => console.warn("[Supabase Shipments Dual-Delete Warning]:", e));

    // 2. In-memory 캐시 업데이트
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      globalForShipments.serverShipmentsCache = globalForShipments.serverShipmentsCache.filter(
        (s: any) => !ids.includes(s.id) && !ids.includes(s.orderId)
      );
    }

    return NextResponse.json({ success: true, count: ids.length, deletedIds: ids });
  } catch (error: any) {
    console.error("Failed to delete server shipments:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 데이터 삭제 실패" },
      { status: 500 }
    );
  }
}
