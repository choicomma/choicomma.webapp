import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

// Fallback in-memory cache for serverless environments
const globalForShipments = global as unknown as { serverShipmentsCache?: any[] };

function getShipmentsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "shipments-data.json");
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

function sortShipmentsByNumber(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a: any, b: any) => {
    const keyA = (a.orderId || a.id || "").trim();
    const keyB = (b.orderId || b.id || "").trim();
    const numA = extractShipmentOrderNumber(keyA);
    const numB = extractShipmentOrderNumber(keyB);
    if (numA !== numB) return numB - numA; // 최신 번호가 상단, 1번이 가장 밑으로 정렬
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

// Rate limiter map to break infinite client loops (e.g. storage event ping-pong)
const lastShipmentHitMap = new Map<string, number>();

// GET: Return authoritative server-stored shipments to any client (PC, Mobile, Deployed App)
export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || "unknown";
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  const clientKey = `${clientIp}:${referer}`;
  const now = Date.now();
  const lastHit = lastShipmentHitMap.get(clientKey) || 0;

  // If a client page (e.g. /membership) requests faster than 2.5s, throttle to break recursive client loops
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
    // 1. Primary Source of Truth: Supabase PostgreSQL DB
    if (isSupabaseConfigured) {
      const { data: dbShipments, error: dbError } = await supabaseServer
        .from("shipments")
        .select("*")
        .order("orderId", { ascending: false });

      if (!dbError && Array.isArray(dbShipments) && dbShipments.length > 0) {
        const sorted = sortShipmentsByNumber(dbShipments.map(hydrateShipmentMergeData));
        globalForShipments.serverShipmentsCache = sorted;
        return formatResponse(sorted);
      }

      if (dbError) {
        console.warn("Notice: Supabase fetch error or table not yet initialized, falling back to cache/disk:", dbError.message);
      }
    }

    // 2. Fallback: In-memory cache
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      const sorted = sortShipmentsByNumber(globalForShipments.serverShipmentsCache.map(hydrateShipmentMergeData));
      return formatResponse(sorted);
    }

    // 3. Fallback: Local JSON file
    const filePath = getShipmentsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        const sorted = sortShipmentsByNumber(data.map(hydrateShipmentMergeData));
        globalForShipments.serverShipmentsCache = sorted;
        return formatResponse(sorted);
      }
    }

    // 4. Default Fallback
    const sorted = sortShipmentsByNumber(initialShipments);
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

// POST: Save and persist updated shipments directly into Supabase and local cache
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

    const sorted = sortShipmentsByNumber(shipments);

    // If server cache has identical business data, return early to prevent recursive Supabase Realtime broadcast loops
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      const cacheSerialized = serializeShipmentsForDiff(globalForShipments.serverShipmentsCache);
      const incomingSerialized = serializeShipmentsForDiff(sorted);
      if (cacheSerialized === incomingSerialized) {
        return NextResponse.json(
          { success: true, count: sorted.length, data: sorted, message: "No business data changed, skipped DB write" },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // 1. Primary: Save to Supabase (Upsert)
    if (isSupabaseConfigured) {
      try {
        const ALLOWED_COLUMNS = [
          "id", "orderId", "recipient", "phone", "altPhone", "zipCode",
          "address", "detailAddress", "items", "quantity", "carrier",
          "trackingNumber", "status", "shippingMemo", "orderDate",
          "shippedDate", "estimatedDelivery", "packages", "created_at", "updated_at"
        ];

        const dbRows = sorted.map((s: any) => {
          const row: any = {};
          ALLOWED_COLUMNS.forEach((col) => {
            if (s[col] !== undefined) row[col] = s[col];
          });
          row.orderId = s.orderId || s.order_id || "";
          row.recipient = s.recipient || "";
          row.phone = s.phone || "";
          row.zipCode = s.zipCode || s.zip_code || "";
          row.address = s.address || "";
          row.items = s.items || "";
          row.quantity = typeof s.quantity === "number" ? s.quantity : 1;
          row.carrier = s.carrier || "CJ대한통운";
          row.trackingNumber = s.trackingNumber || s.tracking_number || "-";
          row.status = s.status || "Pending";
          row.updated_at = new Date().toISOString();

          // Extra CJ classification metadata preserved in packages[0]
          const pkgs = Array.isArray(s.packages) && s.packages.length > 0 ? [...s.packages] : [{ id: `PKG-${s.id}-1` }];
          const pkg0 = { ...pkgs[0] };

          if (s.cjClsfCd || s.cjSubClsfCd || s.cjClldlvempNickNm || s.cjClsfAddr || s.cjClldlvBranNm || s.cjP2pCd) {
            pkg0.cjClsfCd = s.cjClsfCd;
            pkg0.cjSubClsfCd = s.subClsfCd || s.cjSubClsfCd;
            pkg0.cjClldlvempNickNm = s.cjClldlvempNickNm;
            pkg0.cjClsfAddr = s.cjClsfAddr;
            pkg0.cjClldlvBranNm = s.cjClldlvBranNm;
            pkg0.cjP2pCd = s.cjP2pCd;
          }

          // Merge metadata preserved in packages[0]
          const memo = String(s.shippingMemo || s.shipping_memo || "");
          const isMergedChild = Boolean(s.isMergedChild ?? pkg0.isMergedChild ?? memo.includes("[합배송 완료]"));
          const isMergedParent = Boolean(s.isMergedParent ?? pkg0.isMergedParent ?? memo.includes("[합배송:"));

          pkg0.isMergedParent = isMergedParent;
          pkg0.isMergedChild = isMergedChild;
          if (s.mergedIntoId || pkg0.mergedIntoId) pkg0.mergedIntoId = s.mergedIntoId ?? pkg0.mergedIntoId;
          if (s.mergedIntoOrderId || pkg0.mergedIntoOrderId) pkg0.mergedIntoOrderId = s.mergedIntoOrderId ?? pkg0.mergedIntoOrderId;
          if (s.bundledShipmentIds || pkg0.bundledShipmentIds) pkg0.bundledShipmentIds = s.bundledShipmentIds ?? pkg0.bundledShipmentIds;
          if (s.bundledOrderNumbers || pkg0.bundledOrderNumbers) pkg0.bundledOrderNumbers = s.bundledOrderNumbers ?? pkg0.bundledOrderNumbers;
          if (s.bundledRefundPoints !== undefined || pkg0.bundledRefundPoints !== undefined) pkg0.bundledRefundPoints = s.bundledRefundPoints ?? pkg0.bundledRefundPoints;
          if (s.originalItems || pkg0.originalItems) pkg0.originalItems = s.originalItems ?? pkg0.originalItems;
          if (s.originalQuantity !== undefined || pkg0.originalQuantity !== undefined) pkg0.originalQuantity = s.originalQuantity ?? pkg0.originalQuantity;

          pkgs[0] = pkg0;
          row.packages = pkgs;

          return row;
        });

        const { error: dbError } = await supabaseServer
          .from("shipments")
          .upsert(dbRows, { onConflict: "id" });

        if (dbError) {
          console.warn("Notice: Failed to upsert shipments to Supabase:", dbError.message);
        }

        // Also delete any existing Supabase rows that were removed from the authoritative list
        const incomingIds = sorted.map((s: any) => s.id).filter(Boolean);
        if (incomingIds.length > 0) {
          const { data: existingRows } = await supabaseServer.from("shipments").select("id");
          if (Array.isArray(existingRows) && existingRows.length > 0) {
            const incomingSet = new Set(incomingIds);
            const toDelete = existingRows.map((r: any) => r.id).filter((id: string) => !incomingSet.has(id));
            if (toDelete.length > 0) {
              await supabaseServer.from("shipments").delete().in("id", toDelete);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn("Supabase upsert exception:", dbErr.message);
      }
    }

    // 2. In-memory cache update
    globalForShipments.serverShipmentsCache = sorted;

    // Supabase DB 및 인메모리 캐시를 통해 실시간 영속화 관리 (Next.js dev 모드 HMR 자동 새로고침 방지를 위해 소스 폴더 내부 쓰기 제거)

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

// DELETE: Permanently delete orders from Supabase DB, in-memory cache, and disk
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

    // 1. Supabase PostgreSQL에서 해당 ID들 영구 삭제
    if (isSupabaseConfigured) {
      const { error: dbError } = await supabaseServer
        .from("shipments")
        .delete()
        .in("id", ids);

      if (dbError) {
        console.warn("Notice: Failed to delete shipments from Supabase:", dbError.message);
      }
    }

    // 2. In-memory 캐시에서도 해당 ID들 즉시 제거
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      globalForShipments.serverShipmentsCache = globalForShipments.serverShipmentsCache.filter(
        (s: any) => !ids.includes(s.id) && !ids.includes(s.orderId)
      );
    }

    // 3. 로컬 mock shipments JSON 파일에서도 제거
    const filePath = getShipmentsFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const filtered = data.filter((s: any) => !ids.includes(s.id) && !ids.includes(s.orderId));
          fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
        }
      } catch (e) {}
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
