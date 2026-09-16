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
  if (str.includes("REAL") || str.includes("CJ-REAL")) return 999999;
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

function serializeShipmentsForDiff(list: any[]): string {
  if (!Array.isArray(list)) return "";
  return JSON.stringify(
    list.map((s) => ({
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
      shippingMemo: s.shippingMemo || s.shipping_memo || "",
      packages: s.packages || [],
      shippedDate: s.shippedDate || null,
      estimatedDelivery: s.estimatedDelivery || null,
    }))
  );
}

// GET: Return authoritative server-stored shipments to any client (PC, Mobile, Deployed App)
export async function GET() {
  try {
    // 1. Primary Source of Truth: Supabase PostgreSQL DB
    if (isSupabaseConfigured) {
      const { data: dbShipments, error: dbError } = await supabaseServer
        .from("shipments")
        .select("*")
        .order("orderId", { ascending: false });

      if (!dbError && Array.isArray(dbShipments) && dbShipments.length > 0) {
        const sorted = sortShipmentsByNumber(dbShipments);
        globalForShipments.serverShipmentsCache = sorted;
        return NextResponse.json(sorted, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }

      if (dbError) {
        console.warn("Notice: Supabase fetch error or table not yet initialized, falling back to cache/disk:", dbError.message);
      }
    }

    // 2. Fallback: In-memory cache
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      const sorted = sortShipmentsByNumber(globalForShipments.serverShipmentsCache);
      return NextResponse.json(sorted, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // 3. Fallback: Local JSON file
    const filePath = getShipmentsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        const sorted = sortShipmentsByNumber(data);
        globalForShipments.serverShipmentsCache = sorted;
        return NextResponse.json(sorted, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }
    }

    // 4. Default Fallback
    const sorted = sortShipmentsByNumber(initialShipments);
    globalForShipments.serverShipmentsCache = sorted;
    return NextResponse.json(sorted, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
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
          if (s.cjClsfCd || s.cjSubClsfCd || s.cjClldlvempNickNm || s.cjClsfAddr || s.cjClldlvBranNm || s.cjP2pCd) {
            const pkgs = Array.isArray(s.packages) && s.packages.length > 0 ? [...s.packages] : [{ id: `PKG-${s.id}-1` }];
            pkgs[0] = {
              ...pkgs[0],
              cjClsfCd: s.cjClsfCd,
              cjSubClsfCd: s.subClsfCd || s.cjSubClsfCd,
              cjClldlvempNickNm: s.cjClldlvempNickNm,
              cjClsfAddr: s.cjClsfAddr,
              cjClldlvBranNm: s.cjClldlvBranNm,
              cjP2pCd: s.cjP2pCd,
            };
            row.packages = pkgs;
          }
          return row;
        });

        const { error: dbError } = await supabaseServer
          .from("shipments")
          .upsert(dbRows, { onConflict: "id" });

        if (dbError) {
          console.warn("Notice: Failed to upsert shipments to Supabase:", dbError.message);
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
