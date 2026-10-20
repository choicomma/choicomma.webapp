import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import { filterOrdersForCustomer } from "@/lib/shipping/customer-order-filter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-Memory Concurrency Mutex Lock
let ordersMutex = Promise.resolve();

async function runWithOrdersLock<T>(task: () => Promise<T> | T): Promise<T> {
  const prevMutex = ordersMutex;
  let release: () => void = () => {};
  ordersMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prevMutex;
    return await task();
  } finally {
    release();
  }
}

function getOrdersFilePath() {
  return path.join(process.cwd(), "data", "orders.json");
}

function readOrdersFile(): any[] {
  try {
    const filePath = getOrdersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Orders File Read Warning]:", err);
  }
  return [];
}

function writeOrdersFile(data: any[]): boolean {
  try {
    const targetPath = getOrdersFilePath();
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
    return true;
  } catch (err) {
    console.error("[Orders File Write Error]:", err);
    return false;
  }
}

function normalizeLocalOrderToSupabase(o: any) {
  let shippingAddrStr = "";
  if (typeof o.shippingAddress === "string") {
    shippingAddrStr = o.shippingAddress;
  } else if (typeof o.shippingAddress === "object" && o.shippingAddress) {
    shippingAddrStr = [o.shippingAddress.address, o.shippingAddress.detailAddress].filter(Boolean).join(" ");
  } else {
    shippingAddrStr = [o.address, o.detailAddress].filter(Boolean).join(" ");
  }

  let itemsPayload: any = [];
  if (Array.isArray(o.orderLines) && o.orderLines.length > 0) {
    itemsPayload = o.orderLines.map((l: any) => ({
      name: l.merchandise?.product?.title || l.title || l.name || "상품",
      price: Number(l.cost?.totalAmount?.amount || l.price || 0),
      quantity: Number(l.quantity || 1),
      option: l.option || "",
    }));
  } else if (Array.isArray(o.items)) {
    itemsPayload = o.items;
  } else if (typeof o.items === "string") {
    itemsPayload = [{ name: o.items, quantity: Number(o.quantity || 1), price: Number(o.totalAmount || 0) }];
  }

  return {
    id: String(o.id || o.orderNumber),
    orderNumber: String(o.orderNumber || o.id),
    customerId: String(o.customerId || ""),
    customerName: String(o.customerName || o.customer || o.ordererName || "고객님"),
    customerEmail: String(o.customerEmail || o.email || ""),
    customerPhone: String(o.customerPhone || o.phone || ""),
    totalAmount: Number(o.totalAmount || 0),
    shippingFee: Number(o.shippingFee || 0),
    discountAmount: Number(o.discountAmount || 0),
    pointsUsed: Number(o.pointsUsed || 0),
    paymentMethod: String(o.paymentMethod || o.method || "CARD"),
    paymentStatus: String(o.paymentStatus || "PAID"),
    shippingAddress: shippingAddrStr || "-",
    items: itemsPayload,
    orderMemo: String(o.orderMemo || o.shippingMemo || ""),
    created_at: o.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeSupabaseOrderToLocal(o: any) {
  const addrStr = typeof o.shippingAddress === "string" ? o.shippingAddress : (o.shippingAddress?.address || "");
  const addrDetail = typeof o.shippingAddress === "object" ? (o.shippingAddress?.detailAddress || "") : "";
  const zip = typeof o.shippingAddress === "object" ? (o.shippingAddress?.zipCode || "") : "";

  let itemsText = "";
  if (typeof o.items === "string") {
    itemsText = o.items;
  } else if (Array.isArray(o.items)) {
    itemsText = o.items.map((i: any) => `${i.name || i.title || "상품"} (${i.quantity || i.qty || 1}개)`).join(", ");
  }

  const totalQty = Array.isArray(o.items)
    ? o.items.reduce((sum: number, it: any) => sum + (Number(it.quantity || it.qty) || 1), 0)
    : 1;

  const orderKey = String(o.id || o.orderNumber);

  return {
    id: orderKey,
    orderId: orderKey,
    orderNumber: String(o.orderNumber || orderKey),
    customerId: o.customerId || "",
    customer: o.customerName || "고객님",
    customerName: o.customerName || "고객님",
    ordererName: o.customerName || "고객님",
    recipient: o.customerName || "고객님",
    email: o.customerEmail || "",
    customerEmail: o.customerEmail || "",
    phone: o.customerPhone || "",
    customerPhone: o.customerPhone || "",
    zipCode: zip,
    address: addrStr,
    detailAddress: addrDetail,
    shippingAddress: typeof o.shippingAddress === "object" ? o.shippingAddress : {
      zipCode: zip,
      address: addrStr,
      detailAddress: addrDetail
    },
    shippingMemo: o.orderMemo || "",
    orderMemo: o.orderMemo || "",
    items: itemsText || o.items,
    orderLines: Array.isArray(o.items) ? o.items : [],
    quantity: totalQty,
    totalAmount: Number(o.totalAmount || 0),
    shippingFee: Number(o.shippingFee || 0),
    discountAmount: Number(o.discountAmount || 0),
    pointsUsed: Number(o.pointsUsed || 0),
    paymentMethod: o.paymentMethod || "CARD",
    paymentStatus: o.paymentStatus || "PAID",
    status: o.paymentStatus === "PAID" ? "결제완료" : (o.paymentStatus || "결제대기"),
    created_at: o.created_at || new Date().toISOString(),
    updated_at: o.updated_at || new Date().toISOString(),
    date: (o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
  };
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: 주문 목록 조회 (Git data/orders.json 기준 + Supabase 자가 치유 폴백)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("orderNumber");
    const customerId = url.searchParams.get("customerId");
    const status = url.searchParams.get("status");

    let list = readOrdersFile();

    // 자가 치유 폴백(Self-Healing Fallback): 로컬 파일이 비어있는 경우 Supabase에서 복구 시도
    if (list.length === 0) {
      try {
        const { data, error } = await runSafeSupabaseQuery<any[]>(
          async (supabase) => supabase.from("orders").select("*").order("created_at", { ascending: false }),
          1500
        );
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data.map(normalizeSupabaseOrderToLocal);
          writeOrdersFile(list); // 로컬 캐시 자가 복구
        }
      } catch (fallbackErr) {
        console.warn("[Orders Remote Fallback Warning]:", fallbackErr);
      }
    }

    const forCustomer = url.searchParams.get("forCustomer") === "true";
    const customerEmail = (url.searchParams.get("email") || url.searchParams.get("customerEmail") || "").toLowerCase().trim();
    const customerPhone = (url.searchParams.get("phone") || url.searchParams.get("customerPhone") || "").replace(/[^0-9]/g, "");
    const customerName = (url.searchParams.get("name") || url.searchParams.get("customerName") || "").trim();
    const isAdminParam = url.searchParams.get("isAdmin") === "true";

    if (forCustomer) {
      list = filterOrdersForCustomer(list, {
        email: customerEmail,
        phone: customerPhone,
        name: customerName,
        isAdmin: isAdminParam,
      });
    }

    if (orderNumber) {
      list = list.filter((o) => o.orderNumber === orderNumber || o.id === orderNumber);
    }
    if (customerId) {
      list = list.filter((o) => o.customerId === customerId);
    }
    if (status && status !== "all") {
      list = list.filter((o) => o.paymentStatus === status || o.status === status);
    }

    return NextResponse.json({ success: true, count: list.length, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: 주문 등록 또는 업데이트 (동시성 락 및 Supabase 비동기 듀얼 라이트 적용)
export async function POST(req: NextRequest) {
  return runWithOrdersLock(async () => {
    try {
      const body = await req.json();
      let current = readOrdersFile();

      let itemsToUpsertToSupabase: any[] = [];

      if (Array.isArray(body)) {
        // 다중 주문 배열 저장/업데이트
        for (const item of body) {
          if (!item) continue;
          const targetId = item.id || item.orderNumber;
          const idx = current.findIndex((o) => o.id === targetId || o.orderNumber === targetId);
          if (idx !== -1) {
            current[idx] = { ...current[idx], ...item, updated_at: new Date().toISOString() };
          } else {
            current.unshift({
              ...item,
              id: item.id || item.orderNumber || `ORD-${Date.now()}`,
              orderNumber: item.orderNumber || item.id,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        itemsToUpsertToSupabase = current.map(normalizeLocalOrderToSupabase);
      } else if (body) {
        const targetId = body.id || body.orderNumber;
        const idx = current.findIndex((o) => (targetId && (o.id === targetId || o.orderNumber === targetId)));
        let updatedRecord: any;
        if (idx !== -1) {
          updatedRecord = { ...current[idx], ...body, updated_at: new Date().toISOString() };
          current[idx] = updatedRecord;
        } else {
          updatedRecord = {
            ...body,
            id: body.id || body.orderNumber || `ORD-${Date.now()}`,
            orderNumber: body.orderNumber || body.id,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          current.unshift(updatedRecord);
        }
        itemsToUpsertToSupabase = [normalizeLocalOrderToSupabase(updatedRecord)];
      }

      // 1. 로컬 저장 (0ms 보장, 무손실 원자적 쓰기)
      writeOrdersFile(current);

      // 2. Supabase 비동기 듀얼 라이트
      if (itemsToUpsertToSupabase.length > 0) {
        runSafeSupabaseQuery(
          async (supabase) => supabase.from("orders").upsert(itemsToUpsertToSupabase, { onConflict: "id" }),
          2500
        )
          .then((res) => {
            if (res.error) {
              console.warn("[Orders Supabase Dual-Write Notice]:", res.error.message || res.error);
            } else {
              console.log(`[Orders Supabase Dual-Write Success] Count: ${itemsToUpsertToSupabase.length}`);
            }
          })
          .catch((err) => {
            console.warn("[Orders Supabase Dual-Write Warning]:", err);
          });
      }

      return NextResponse.json({ success: true, count: current.length, data: current }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      console.error("API /api/orders error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

// DELETE: 주문 삭제 (동시성 락 및 Supabase 듀얼 삭제 적용)
export async function DELETE(req: NextRequest) {
  return runWithOrdersLock(async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const orderNumber = url.searchParams.get("orderNumber");
      const targetKey = id || orderNumber;

      if (!targetKey) {
        return NextResponse.json({ success: false, message: "주문 식별자 누락" }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const current = readOrdersFile();
      const filtered = current.filter((o) => o.id !== targetKey && o.orderNumber !== targetKey);
      
      // 1. 로컬 저장
      writeOrdersFile(filtered);

      // 2. Supabase 비동기 듀얼 삭제
      runSafeSupabaseQuery(
        async (supabase) => supabase.from("orders").delete().or(`id.eq.${targetKey},orderNumber.eq.${targetKey}`),
        2500
      )
        .then((res) => {
          if (res.error) {
            console.warn("[Orders Supabase Dual-Delete Notice]:", res.error.message || res.error);
          } else {
            console.log(`[Orders Supabase Dual-Delete Success] Target: ${targetKey}`);
          }
        })
        .catch((err) => {
          console.warn("[Orders Supabase Dual-Delete Warning]:", err);
        });

      return NextResponse.json({ success: true, count: filtered.length, data: filtered }, { headers: NO_CACHE_HEADERS });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}
