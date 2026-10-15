import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60 seconds for batch tracking

interface TrackingItemResult {
  shipmentId: string;
  orderId: string;
  recipient: string;
  trackingNumber: string;
  carrier: string;
  currentStatus: string;
  newStatus: string;
  stateId: string;
  stateText: string;
  isDelivered: boolean;
  deliveredAt: string | null;
  location: string;
  description: string;
}

// Helper to query Tracker Delivery API with timeout and retry
async function fetchTrackerDelivery(trackingNumber: string, retryCount = 0): Promise<{
  stateId: string;
  stateText: string;
  isDelivered: boolean;
  deliveredAt: string | null;
  location: string;
  description: string;
}> {
  const clean = trackingNumber.replace(/[^0-9]/g, "");
  if (!clean || clean.length < 8) {
    return {
      stateId: "invalid",
      stateText: "운송장번호 오류",
      isDelivered: false,
      deliveredAt: null,
      location: "",
      description: "운송장 번호가 올바르지 않습니다.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://apis.tracker.delivery/carriers/kr.cjlogistics/tracks/${clean}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if ((res.status === 403 || res.status === 429) && retryCount < 2) {
      await new Promise((r) => setTimeout(r, 350 * (retryCount + 1)));
      return fetchTrackerDelivery(trackingNumber, retryCount + 1);
    }

    if (res.status === 404) {
      return {
        stateId: "not_found",
        stateText: "배송추적 준비중",
        isDelivered: false,
        deliveredAt: null,
        location: "",
        description: "택배사 전산 등록 대기 중입니다.",
      };
    }

    if (!res.ok) {
      return {
        stateId: "error",
        stateText: "조회 일시지연",
        isDelivered: false,
        deliveredAt: null,
        location: "",
        description: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const stateId = data.state?.id || "unknown";
    const stateText = data.state?.text || "조회불가";
    const isDelivered = stateId === "delivered" || stateText.includes("배송완료") || stateText.includes("배달완료");

    let deliveredAt: string | null = null;
    let location = "";
    let description = "";

    if (Array.isArray(data.progresses) && data.progresses.length > 0) {
      const last = data.progresses[data.progresses.length - 1];
      location = last.location?.name || "";
      description = last.description || "";
      if (isDelivered) {
        deliveredAt = last.time || new Date().toISOString();
      }
    }

    return {
      stateId,
      stateText,
      isDelivered,
      deliveredAt,
      location,
      description,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (retryCount < 1) {
      await new Promise((r) => setTimeout(r, 250));
      return fetchTrackerDelivery(trackingNumber, retryCount + 1);
    }
    return {
      stateId: err.name === "AbortError" ? "timeout" : "network_error",
      stateText: "조회 시간초과",
      isDelivered: false,
      deliveredAt: null,
      location: "",
      description: "택배사 서버 응답 대기 초과",
    };
  }
}

// Concurrency runner helper with safe rate-limiting delay between requests
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  delayMs: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        // safety
      }
      if (delayMs > 0 && currentIndex < items.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      shipmentIds,
      trackingNumbers,
      applyUpdates = false,
      onlyInTransit = true,
      maxItems = 100,
    } = body;

    const shipmentsFilePath = path.join(process.cwd(), "data", "shipments.json");
    let allShipments: any[] = [];
    if (fs.existsSync(shipmentsFilePath)) {
      try {
        allShipments = JSON.parse(fs.readFileSync(shipmentsFilePath, "utf8"));
      } catch (e) {
        console.error("Failed to read shipments.json:", e);
      }
    }

    // Filter targets to sync
    const hasSpecifiedIds = Array.isArray(shipmentIds) && shipmentIds.length > 0;
    const hasSpecifiedTracking = Array.isArray(trackingNumbers) && trackingNumbers.length > 0;

    let targets: any[] = [];
    if (hasSpecifiedIds || hasSpecifiedTracking) {
      const idSet = new Set((shipmentIds || []).map((id: any) => String(id).trim()));
      const trkSet = new Set((trackingNumbers || []).map((t: any) => String(t).replace(/[^0-9]/g, "")));

      targets = allShipments.filter((s) => {
        const sId = String(s.id || "").trim();
        const sOrd = String(s.orderId || "").trim();
        const sTrk = String(s.trackingNumber || "").replace(/[^0-9]/g, "");
        const matchId = idSet.has(sId) || idSet.has(sOrd);
        const matchTrk = sTrk && trkSet.has(sTrk);
        const matchPkg = Array.isArray(s.packages) && s.packages.some((p: any) => {
          const pTrk = String(p.trackingNumber || "").replace(/[^0-9]/g, "");
          return pTrk && trkSet.has(pTrk);
        });
        return matchId || matchTrk || matchPkg;
      });

      // If the target wasn't found in data/shipments.json (e.g., brand new order in localStorage),
      // synthesize a temporary target from the request so we can still track it!
      if (targets.length === 0 && hasSpecifiedTracking) {
        targets = trackingNumbers.map((tn: string, idx: number) => ({
          id: (shipmentIds && shipmentIds[idx]) || `SYNTH-${tn}`,
          orderId: (shipmentIds && shipmentIds[idx]) || `SYNTH-${tn}`,
          trackingNumber: tn,
          carrier: "CJ대한통운",
          status: "In Transit",
        }));
      }
    } else if (onlyInTransit) {
      targets = allShipments.filter((s) => {
        const hasTracking = s.trackingNumber && s.trackingNumber !== "-" && s.trackingNumber.replace(/[^0-9]/g, "").length >= 8;
        return hasTracking && (s.status === "In Transit" || s.status === "Partially Shipped");
      });
    } else {
      targets = allShipments.filter((s) => s.trackingNumber && s.trackingNumber !== "-");
    }

    // Limit targets per sync batch for responsiveness
    const batchTargets = targets.slice(0, maxItems);

    // Track with safe concurrency of 2 and 120ms delay to prevent rate limits
    const results: TrackingItemResult[] = await mapConcurrent(batchTargets, 2, 120, async (ship) => {
      let trackingNumber = String(ship.trackingNumber || "");
      if ((!trackingNumber || trackingNumber === "-") && Array.isArray(ship.packages) && ship.packages.length > 0) {
        const pkgWithTrk = ship.packages.find((p: any) => p.trackingNumber && p.trackingNumber !== "-");
        if (pkgWithTrk) trackingNumber = String(pkgWithTrk.trackingNumber);
      }

      const trackRes = await fetchTrackerDelivery(trackingNumber);

      const isDelivered = trackRes.isDelivered;
      const newStatus = isDelivered ? "Delivered" : ship.status;

      return {
        shipmentId: String(ship.id),
        orderId: String(ship.orderId || ship.id),
        recipient: ship.recipient || ship.customerName || "-",
        trackingNumber,
        carrier: ship.carrier || "CJ대한통운",
        currentStatus: ship.status,
        newStatus,
        stateId: trackRes.stateId,
        stateText: trackRes.stateText,
        isDelivered,
        deliveredAt: trackRes.deliveredAt,
        location: trackRes.location,
        description: trackRes.description,
      };
    });

    const deliveredResults = results.filter((r) => r.isDelivered);
    const inTransitResults = results.filter((r) => !r.isDelivered);

    // If applyUpdates is requested, update data/shipments.json and Supabase
    if (applyUpdates && deliveredResults.length > 0) {
      const deliveredMap = new Map(deliveredResults.map((r) => [r.shipmentId, r.deliveredAt]));

      const updatedShipments = allShipments.map((s) => {
        const sId = String(s.id);
        const sOrd = String(s.orderId || s.id);
        if (deliveredMap.has(sId) || deliveredMap.has(sOrd)) {
          const deliveredAt = deliveredMap.get(sId) || deliveredMap.get(sOrd);
          const updatedPackages = Array.isArray(s.packages)
            ? s.packages.map((p: any) => ({ ...p, status: "Delivered" }))
            : s.packages;
          return {
            ...s,
            status: "Delivered",
            packages: updatedPackages,
            deliveredDate: deliveredAt ? deliveredAt.split("T")[0] : new Date().toISOString().split("T")[0],
            delivered_at: deliveredAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });

      // 1. Write to data/shipments.json
      try {
        fs.writeFileSync(shipmentsFilePath, JSON.stringify(updatedShipments, null, 2), "utf8");
      } catch (err) {
        console.error("Failed to write updated shipments:", err);
      }

      // 2. Also sync to data/orders.json if matching order exists
      try {
        const ordersFilePath = path.join(process.cwd(), "data", "orders.json");
        if (fs.existsSync(ordersFilePath)) {
          const orders = JSON.parse(fs.readFileSync(ordersFilePath, "utf8"));
          if (Array.isArray(orders)) {
            let modified = false;
            const updatedOrders = orders.map((o) => {
              const oId = String(o.id || o.orderNumber);
              if (deliveredMap.has(oId)) {
                modified = true;
                return {
                  ...o,
                  status: "Delivered",
                  shippingStatus: "Delivered",
                  updated_at: new Date().toISOString(),
                };
              }
              return o;
            });
            if (modified) {
              fs.writeFileSync(ordersFilePath, JSON.stringify(updatedOrders, null, 2), "utf8");
            }
          }
        }
      } catch (ordersErr) {
        console.warn("Failed to update orders.json:", ordersErr);
      }

      // 3. Persist to Supabase if configured
      try {
        const deliveredIds = Array.from(deliveredMap.keys());
        await runSafeSupabaseQuery(async (supabase) => {
          const res = await supabase
            .from("shipments")
            .update({
              status: "Delivered",
              updated_at: new Date().toISOString(),
            })
            .in("id", deliveredIds);
          return { data: res.data, error: res.error };
        });

        await runSafeSupabaseQuery(async (supabase) => {
          const res = await supabase
            .from("orders")
            .update({
              status: "Delivered",
              updated_at: new Date().toISOString(),
            })
            .in("order_number", deliveredIds);
          return { data: res.data, error: res.error };
        });
      } catch (dbErr) {
        console.warn("Supabase background update warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: results.length,
      deliveredCount: deliveredResults.length,
      inTransitCount: inTransitResults.length,
      applied: applyUpdates,
      updatedIds: deliveredResults.map((r) => r.shipmentId),
      results,
    });
  } catch (error: any) {
    console.error("[Tracking Sync Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "배송 동기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
