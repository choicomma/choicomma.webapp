/**
 * Safe LocalStorage Manager for Shipments & Orders
 * Prevents DOMException: QuotaExceededError when datasets grow large (e.g. 9,500+ orders / 8MB+)
 * Browser localStorage has a strict 5MB quota per domain.
 */

export const MAX_CACHED_SHIPMENTS_STORAGE = 100;

export function safeSaveShipmentsToStorage(shipments: any[]) {
  if (typeof window === "undefined") return;
  try {
    if (!Array.isArray(shipments)) return;
    // Cache only the latest 100 shipments for fast initial rendering (~50KB)
    const preview = shipments.slice(0, MAX_CACHED_SHIPMENTS_STORAGE);
    localStorage.setItem("admin_shipments", JSON.stringify(preview));
  } catch (err: any) {
    console.warn("[safeSaveShipmentsToStorage] Notice: localStorage quota exceeded or write failed, compacting:", err?.message || err);
    try {
      if (Array.isArray(shipments) && shipments.length > 20) {
        localStorage.setItem("admin_shipments", JSON.stringify(shipments.slice(0, 20)));
      } else {
        localStorage.removeItem("admin_shipments");
      }
    } catch {}
  }
}

export function safeSaveOrdersToStorage(orders: any[]) {
  if (typeof window === "undefined") return;
  try {
    if (!Array.isArray(orders)) return;
    const preview = orders.slice(0, MAX_CACHED_SHIPMENTS_STORAGE);
    localStorage.setItem("admin_orders", JSON.stringify(preview));
  } catch (err: any) {
    console.warn("[safeSaveOrdersToStorage] Notice: localStorage quota exceeded or write failed, compacting:", err?.message || err);
    try {
      if (Array.isArray(orders) && orders.length > 20) {
        localStorage.setItem("admin_orders", JSON.stringify(orders.slice(0, 20)));
      } else {
        localStorage.removeItem("admin_orders");
      }
    } catch {}
  }
}

/**
 * Proactively clean or compact oversized localStorage keys on startup.
 */
export function cleanBloatedStorageKeys() {
  if (typeof window === "undefined") return;
  try {
    const rawShipments = localStorage.getItem("admin_shipments");
    if (rawShipments && rawShipments.length > 300000) {
      try {
        const parsed = JSON.parse(rawShipments);
        if (Array.isArray(parsed)) {
          safeSaveShipmentsToStorage(parsed);
        } else {
          localStorage.removeItem("admin_shipments");
        }
      } catch {
        localStorage.removeItem("admin_shipments");
      }
    }

    const rawOrders = localStorage.getItem("admin_orders");
    if (rawOrders && rawOrders.length > 300000) {
      try {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          safeSaveOrdersToStorage(parsed);
        } else {
          localStorage.removeItem("admin_orders");
        }
      } catch {
        localStorage.removeItem("admin_orders");
      }
    }
  } catch {}
}
