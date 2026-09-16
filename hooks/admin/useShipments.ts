"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

import { initialShipments as defaultShipments } from "@/lib/sfcc/mock/shipments-data";
import { supabase } from "@/lib/supabase/client";
import { generateNextOrderId } from "@/lib/shipping/order-id";

// ─────────────────────────────────────────────────────────────────────────────
// Initial Shipment Data (from mock data file)
// ─────────────────────────────────────────────────────────────────────────────
const initialShipments: any[] = defaultShipments || [];

// CJ대한통운 12자리 표준 송장번호 형식 (6892-XXXX-XXXX) 변환 유틸
export function sanitizeCjTracking(tracking: string): string {
  if (!tracking || tracking === "-") return "-";
  let clean = tracking.trim();
  if (clean.toUpperCase().startsWith("MOCK-") || clean.toUpperCase().startsWith("MOCK")) {
    const seed = clean.replace(/[^0-9]/g, "").padEnd(8, "0").slice(0, 8);
    const num12 = `6892${seed}`;
    return `${num12.slice(0, 4)}-${num12.slice(4, 8)}-${num12.slice(8, 12)}`;
  }
  const digits = clean.replace(/[^0-9]/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
  }
  return clean;
}

// 주문/배송 번호 기준 고정 내림차순 정렬 유틸 (CH/ORD + 날짜 + 순번 파싱 지원, 최신 주문이 상단)
export function extractShipmentOrderNumber(str: string): number {
  if (!str) return 0;
  if (str.includes("REAL") || str.includes("CJ-REAL")) return 999999999999;
  const chMatch = str.match(/(?:CH|ORD)[-_]?(\d{8})[-_]?(\d+)/i);
  if (chMatch) {
    return parseInt(chMatch[1] + chMatch[2].padStart(4, "0"), 10);
  }
  const match = str.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function sortShipmentsByNumber(list: any[]): any[] {
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

export function sanitizeShipmentsList(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const sanitized = list.map((s: any) => ({
    ...s,
    orderId: s.orderId || s.order_id || "",
    ordererName: s.ordererName || s.orderer_name || s.orderer || s.customer || s.recipient || "",
    altPhone: s.altPhone || s.alt_phone || "",
    zipCode: s.zipCode || s.zip_code || "",
    detailAddress: s.detailAddress || s.detail_address || "",
    trackingNumber: sanitizeCjTracking(s.trackingNumber || s.tracking_number || "-"),
    shippingMemo: s.shippingMemo || s.shipping_memo || "",
    orderDate: s.orderDate || s.order_date || "",
    shippedDate: s.shippedDate || s.shipped_date || null,
    estimatedDelivery: s.estimatedDelivery || s.estimated_delivery || null,
    packages: Array.isArray(s.packages)
      ? s.packages.map((pkg: any) => ({
          ...pkg,
          trackingNumber: sanitizeCjTracking(pkg.trackingNumber || pkg.tracking_number || "-"),
        }))
      : s.packages,
  }));
  return sortShipmentsByNumber(sanitized);
}

export function serializeShipmentsForSync(list: any[]): string {
  if (!Array.isArray(list)) return "";
  return JSON.stringify(
    list.map((s) => ({
      id: s.id,
      orderId: s.orderId || s.order_id || "",
      ordererName: s.ordererName || s.orderer || s.customer || s.recipient || "",
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

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useShipments(triggerToast: (msg: string) => void) {
  const SHIPMENTS_PER_PAGE = 15;

  // Sync control refs to prevent recursive infinite loops between server & Supabase Realtime
  const isRemoteUpdateRef = useRef(true); // true on mount to avoid initial post-back
  const lastSyncedJsonRef = useRef<string>("");
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Shipments List ──────────────────────────────────────────────────────────
  const [shipmentsList, setShipmentsList] = useState<any[]>(initialShipments);

  // 1. Fetch authoritative shipments from server API / Supabase on mount and tab focus + Realtime
  useEffect(() => {
    let isMounted = true;

    // Load any locally cached edits immediately after client hydration
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = sanitizeShipmentsList(parsed);
            lastSyncedJsonRef.current = serializeShipmentsForSync(sanitized);
            setShipmentsList(sanitized);
          }
        } catch (e) {}
      }
    }

    const fetchServerShipments = async () => {
      try {
        const res = await fetch("/api/admin/shipments", {
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            const sanitized = sanitizeShipmentsList(data);
            isRemoteUpdateRef.current = true;
            setShipmentsList((prev) => {
              // 로컬에 이미 발급된 송장번호(메인 및 packages 개별 박스)가 있는데 서버 응답이 아직 '-'인 경우, 로컬 송장번호를 안전하게 보존
              const merged = sanitized.map((serverItem) => {
                const localItem = prev.find((p) => p.id === serverItem.id);
                if (!localItem) return serverItem;

                // 1) packages 배열 개별 박스 송장번호 보존 병합
                let mergedPackages = serverItem.packages;
                if (Array.isArray(localItem.packages) && localItem.packages.length > 0) {
                  if (!Array.isArray(serverItem.packages) || serverItem.packages.length === 0) {
                    mergedPackages = localItem.packages;
                  } else {
                    mergedPackages = serverItem.packages.map((sp: any, idx: number) => {
                      const lp = localItem.packages.find((p: any) => (p.pkgIndex || idx + 1) === (sp.pkgIndex || idx + 1)) || localItem.packages[idx];
                      if (lp && lp.trackingNumber && lp.trackingNumber !== "-" && (!sp.trackingNumber || sp.trackingNumber === "-")) {
                        return {
                          ...sp,
                          trackingNumber: lp.trackingNumber,
                          status: lp.status !== "Pending" ? lp.status : sp.status,
                        };
                      }
                      return sp;
                    });
                  }
                }

                // 2) 메인 송장번호 보존 병합
                const localHasTracking = localItem.trackingNumber && localItem.trackingNumber !== "-";
                const serverHasTracking = serverItem.trackingNumber && serverItem.trackingNumber !== "-";
                const pkgHasTracking = Array.isArray(mergedPackages) && mergedPackages.find((p: any) => p.trackingNumber && p.trackingNumber !== "-")?.trackingNumber;

                const finalTracking = serverHasTracking
                  ? serverItem.trackingNumber
                  : localHasTracking
                  ? localItem.trackingNumber
                  : (pkgHasTracking || serverItem.trackingNumber || "-");

                const finalStatus = localItem.status !== "Pending" ? localItem.status : serverItem.status;

                return {
                  ...serverItem,
                  packages: mergedPackages,
                  trackingNumber: finalTracking,
                  status: finalStatus,
                  shippedDate: localItem.shippedDate || serverItem.shippedDate,
                };
              });

              // 서버 응답에 아직 없는 로컬 신규 주문(합배송 테스트 주문 등)이 삭제되지 않도록 보존
              const serverIdSet = new Set(sanitized.map((s) => s.id));
              const localOnlyItems = prev.filter((p) => !serverIdSet.has(p.id));
              const fullMerged = [...merged, ...localOnlyItems];

              lastSyncedJsonRef.current = serializeShipmentsForSync(fullMerged);
              if (typeof window !== "undefined") {
                localStorage.setItem("admin_shipments", JSON.stringify(fullMerged));
              }

              if (JSON.stringify(prev) === JSON.stringify(fullMerged)) return prev;
              return fullMerged;
            });
          }
        }
      } catch (err) {
        console.warn("Notice: Using local shipments storage fallback:", err);
      }
    };

    fetchServerShipments();

    // Supabase Realtime 채널: 타 기기/창에서 변경 시 즉시 동기화
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel("shipments-realtime-sub")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shipments" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new;
              isRemoteUpdateRef.current = true;
              setShipmentsList((prev) => {
                if (prev.some((s) => s.id === newRow.id)) return prev;
                const next = sanitizeShipmentsList([newRow, ...prev]);
                lastSyncedJsonRef.current = serializeShipmentsForSync(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("admin_shipments", JSON.stringify(next));
                }
                return next;
              });
            } else if (payload.eventType === "UPDATE") {
              const updatedRow = payload.new;
              isRemoteUpdateRef.current = true;
              setShipmentsList((prev) => {
                const next = sanitizeShipmentsList(
                  prev.map((s) => {
                    if (s.id !== updatedRow.id) return s;
                    let pkgs = updatedRow.packages || s.packages;
                    if (Array.isArray(s.packages) && Array.isArray(pkgs)) {
                      pkgs = pkgs.map((upPkg: any, idx: number) => {
                        const localPkg = s.packages.find((p: any) => (p.pkgIndex || idx + 1) === (upPkg.pkgIndex || idx + 1)) || s.packages[idx];
                        if (localPkg && localPkg.trackingNumber && localPkg.trackingNumber !== "-" && (!upPkg.trackingNumber || upPkg.trackingNumber === "-")) {
                          return { ...upPkg, trackingNumber: localPkg.trackingNumber, status: localPkg.status !== "Pending" ? localPkg.status : upPkg.status };
                        }
                        return upPkg;
                      });
                    }
                    const finalTracking = (updatedRow.trackingNumber && updatedRow.trackingNumber !== "-")
                      ? updatedRow.trackingNumber
                      : (s.trackingNumber && s.trackingNumber !== "-")
                      ? s.trackingNumber
                      : (Array.isArray(pkgs) && pkgs.find((p: any) => p.trackingNumber && p.trackingNumber !== "-")?.trackingNumber) || "-";
                    return { ...s, ...updatedRow, packages: pkgs, trackingNumber: finalTracking };
                  })
                );
                lastSyncedJsonRef.current = serializeShipmentsForSync(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("admin_shipments", JSON.stringify(next));
                }
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              isRemoteUpdateRef.current = true;
              setShipmentsList((prev) => {
                const next = prev.filter((s) => s.id !== payload.old.id);
                lastSyncedJsonRef.current = serializeShipmentsForSync(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("admin_shipments", JSON.stringify(next));
                }
                return next;
              });
            }
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn("Supabase Realtime subscription notice:", realtimeErr);
    }

    // Re-sync when user returns to the tab (e.g. on mobile or switching back from other apps)
    const onWindowFocus = () => {
      fetchServerShipments();
    };

    window.addEventListener("focus", onWindowFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchServerShipments();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  // 2. Persist user local edits to both localStorage and Server API (with loop guard & debounce)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If update originated from server (initial fetch, window focus refresh, or Supabase realtime event)
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    const currentSerialized = serializeShipmentsForSync(shipmentsList);
    // If the business payload hasn't changed compared to last server sync, do not sync back to server
    if (lastSyncedJsonRef.current && lastSyncedJsonRef.current === currentSerialized) {
      return;
    }

    const currentJson = JSON.stringify(shipmentsList);
    localStorage.setItem("admin_shipments", currentJson);

    // Debounce server POST to batch quick consecutive edits and prevent request hammering
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      lastSyncedJsonRef.current = currentSerialized;
      fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: currentJson,
      }).catch((err) => {
        console.warn("Failed to sync shipments to server:", err);
      });
    }, 800);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [shipmentsList]);

  // Listen for storage events from other browser tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== "admin_shipments") return;
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeShipmentsList(parsed);
            isRemoteUpdateRef.current = true;
            setShipmentsList((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(sanitized)) return prev;
              return sanitized;
            });
          }
        } catch (e) {}
      }
    };

    // Also load orders and merge
    const onOrdersUpdate = () => {
      const savedOrders = localStorage.getItem("admin_orders");
      if (savedOrders) {
        try {
          const orders = JSON.parse(savedOrders);
          if (Array.isArray(orders) && orders.length > 0) {
            setShipmentsList((prev) => {
              const existingIds = new Set(prev.map((s: any) => s.id || s.orderId));
              const newFromOrders = orders
                .filter((o: any) => !existingIds.has(o.id) && !existingIds.has(o.orderId))
                .map((o: any) => ({
                  id: o.id || o.orderId,
                  orderId: o.orderId || o.id,
                  ordererName: o.ordererName || o.customer || o.recipient || "",
                  recipient: o.recipient || o.customerName || "",
                  phone: o.phone || o.customerPhone || "",
                  altPhone: o.altPhone || "",
                  zipCode: o.zipCode || o.postalCode || "",
                  address: o.address || o.shippingAddress || "",
                  detailAddress: o.detailAddress || "",
                  items: o.items || o.productName || "",
                  quantity: o.quantity || 1,
                  shippingMemo: o.shippingMemo || o.deliveryMemo || "",
                  carrier: o.carrier || "CJ대한통운",
                  trackingNumber: o.trackingNumber || "-",
                  status: o.status || "Pending",
                  orderDate: o.orderDate || o.createdAt || new Date().toISOString().split("T")[0],
                  shippedDate: o.shippedDate || null,
                  estimatedDelivery: o.estimatedDelivery || null,
                  packages: o.packages || [],
                }));
              if (newFromOrders.length > 0) {
                const updated = [...prev, ...newFromOrders];
                localStorage.setItem("admin_shipments", JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("admin_orders_updated", onOrdersUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("admin_orders_updated", onOrdersUpdate);
    };
  }, []);

  // ── Filters & Pagination ────────────────────────────────────────────────────
  const [shipmentSearchQuery, setShipmentSearchQuery] = useState("");
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState("all");
  const [shipmentCarrierFilter, setShipmentCarrierFilter] = useState("all");
  const [shipmentPage, setShipmentPage] = useState(1);

  const filteredShipments = useMemo(() => {
    return shipmentsList.filter((s) => {
      const q = shipmentSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.recipient?.toLowerCase().includes(q) ||
        s.orderId?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.trackingNumber?.includes(q) ||
        s.address?.toLowerCase().includes(q);
      const matchesStatus = shipmentStatusFilter === "all" || s.status === shipmentStatusFilter;
      const matchesCarrier = shipmentCarrierFilter === "all" || s.carrier === shipmentCarrierFilter;
      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [shipmentsList, shipmentSearchQuery, shipmentStatusFilter, shipmentCarrierFilter]);

  const totalShipmentPages = Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE) || 1;

  const paginatedShipments = useMemo(() => {
    const start = (shipmentPage - 1) * SHIPMENTS_PER_PAGE;
    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);
  }, [filteredShipments, shipmentPage]);

  // ── Add Shipment Modal ──────────────────────────────────────────────────────
  const [isAddShipmentModalOpen, setIsAddShipmentModalOpen] = useState(false);
  const [newShipmentOrderId, setNewShipmentOrderId] = useState("");
  const [newShipmentRecipient, setNewShipmentRecipient] = useState("");
  const [newShipmentPhone, setNewShipmentPhone] = useState("");
  const [newShipmentAltPhone, setNewShipmentAltPhone] = useState("");
  const [newShipmentZipCode, setNewShipmentZipCode] = useState("");
  const [newShipmentAddress, setNewShipmentAddress] = useState("");
  const [newShipmentDetailAddress, setNewShipmentDetailAddress] = useState("");
  const [newShipmentItems, setNewShipmentItems] = useState("");
  const [newShipmentQuantity, setNewShipmentQuantity] = useState(1);
  const [newShipmentShippingMemo, setNewShipmentShippingMemo] = useState("");
  const [newShipmentCarrier, setNewShipmentCarrier] = useState("CJ대한통운");
  const [newShipmentTracking, setNewShipmentTracking] = useState("");
  const [newShipmentStatus, setNewShipmentStatus] = useState("Pending");

  // ── Edit Shipment State ─────────────────────────────────────────────────────
  const [editingShipment, setEditingShipment] = useState<any | null>(null);
  const [editShipmentCarrier, setEditShipmentCarrier] = useState("CJ대한통운");
  const [editShipmentTracking, setEditShipmentTracking] = useState("");
  const [editShipmentStatus, setEditShipmentStatus] = useState("Pending");

  // ── CJ Config Modal ─────────────────────────────────────────────────────────
  const [isCjConfigModalOpen, setIsCjConfigModalOpen] = useState(false);
  const [configModalTab, setConfigModalTab] = useState<"shipping" | "cj" | "policy">("shipping");

  // ── Shipping Policy ─────────────────────────────────────────────────────────
  const [shippingPolicy, setShippingPolicy] = useState<{
    baseFee: number;
    freeThreshold: number;
    freeShippingThreshold: number;
    islandExtraFee: number;
    returnExchangeFee: number;
    courierName: string;
    shippingNotice: string;
  }>({
    baseFee: 3000,
    freeThreshold: 50000,
    freeShippingThreshold: 100000,
    islandExtraFee: 3000,
    returnExchangeFee: 6000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  // ── CJ API Config ───────────────────────────────────────────────────────────
  const [cjClientCode, setCjClientCode] = useState("");
  const [cjContractNo, setCjContractNo] = useState("");
  const [cjApiKey, setCjApiKey] = useState("");
  const [cjSenderAddress, setCjSenderAddress] = useState("");

  // Sync config from localStorage after client mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPolicy = localStorage.getItem("admin_shipping_policy");
    if (savedPolicy) {
      try { setShippingPolicy(JSON.parse(savedPolicy)); } catch (e) {}
    }
    setCjClientCode(localStorage.getItem("cj_client_code") || "");
    setCjContractNo(localStorage.getItem("cj_contract_no") || "");
    setCjApiKey(localStorage.getItem("cj_api_key") || "");
    setCjSenderAddress(localStorage.getItem("cj_sender_address") || "");
  }, []);

  // ── Postcode (Daum / Kakao) Opener ─────────────────────────────────────────
  const handleOpenSenderPostcode = () => {
    if (typeof window === "undefined") return;
    // @ts-ignore
    if (window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          setCjSenderAddress(data.roadAddress || data.jibunAddress);
        },
      }).open();
    } else {
      alert("주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleOpenNewShipmentPostcode = () => {
    if (typeof window === "undefined") return;
    // @ts-ignore
    if (window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          setNewShipmentZipCode(data.zonecode || "");
          setNewShipmentAddress(data.roadAddress || data.jibunAddress);
        },
      }).open();
    } else {
      alert("주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // ── Add Shipment Submit ─────────────────────────────────────────────────────
  const handleAddShipmentSubmit = () => {
    if (!newShipmentRecipient || !newShipmentAddress) {
      alert("수령인, 배송지는 필수 항목입니다.");
      return;
    }
    const finalOrderId = newShipmentOrderId.trim() || generateNextOrderId(shipmentsList);
    const newShipment = {
      id: finalOrderId,
      orderId: finalOrderId,
      recipient: newShipmentRecipient.trim(),
      phone: newShipmentPhone.trim(),
      altPhone: newShipmentAltPhone.trim(),
      zipCode: newShipmentZipCode.trim(),
      address: newShipmentAddress.trim(),
      detailAddress: newShipmentDetailAddress.trim(),
      items: newShipmentItems.trim(),
      quantity: newShipmentQuantity || 1,
      shippingMemo: newShipmentShippingMemo.trim(),
      carrier: newShipmentCarrier,
      trackingNumber: newShipmentTracking.trim() || "-",
      status: newShipmentStatus,
      orderDate: new Date().toISOString().split("T")[0],
      shippedDate: null,
      estimatedDelivery: null,
      packages: [],
    };
    const updated = [newShipment, ...shipmentsList];
    setShipmentsList(updated);
    setIsAddShipmentModalOpen(false);
    // Reset form
    setNewShipmentOrderId(""); setNewShipmentRecipient(""); setNewShipmentPhone("");
    setNewShipmentAltPhone(""); setNewShipmentZipCode(""); setNewShipmentAddress("");
    setNewShipmentDetailAddress(""); setNewShipmentItems(""); setNewShipmentQuantity(1);
    setNewShipmentShippingMemo(""); setNewShipmentCarrier("CJ대한통운");
    setNewShipmentTracking(""); setNewShipmentStatus("Pending");
    triggerToast("배송 건이 수동 등록되었습니다.");
  };

  // ── Open / Save Edit Shipment ───────────────────────────────────────────────
  const handleOpenEditShipment = (shipment: any) => {
    setEditingShipment(shipment);
    setEditShipmentCarrier(shipment.carrier || "CJ대한통운");
    setEditShipmentTracking(shipment.trackingNumber || "");
    setEditShipmentStatus(shipment.status || "Pending");
  };

  const handleSaveEditShipment = () => {
    if (!editingShipment) return;
    const updated = shipmentsList.map((s) => {
      if (s.id !== editingShipment.id) return s;

      let updatedPackages = editingShipment.packages ? [...editingShipment.packages] : s.packages;
      if (updatedPackages && updatedPackages.length > 0) {
        updatedPackages = updatedPackages.map((p: any, idx: number) => {
          const pkgTracking = p.trackingNumber && p.trackingNumber !== "-"
            ? p.trackingNumber
            : (idx === 0 ? (editShipmentTracking || "-") : "-");
          return {
            ...p,
            carrier: editShipmentCarrier,
            trackingNumber: pkgTracking,
            status: editShipmentStatus,
          };
        });
      }

      return {
        ...s,
        carrier: editShipmentCarrier,
        trackingNumber: (updatedPackages && updatedPackages[0]?.trackingNumber) || editShipmentTracking || "-",
        status: editShipmentStatus,
        packages: updatedPackages,
        shippedDate:
          editShipmentStatus === "In Transit" && !s.shippedDate
            ? new Date().toISOString().split("T")[0]
            : s.shippedDate,
      };
    });
    setShipmentsList(updated);
    setEditingShipment(null);
    triggerToast("배송 정보가 수정되었습니다.");
  };

  const handleSaveShipmentDetails = handleSaveEditShipment;

  // ── Delete Shipment ─────────────────────────────────────────────────────────
  const handleDeleteShipment = (id: string) => {
    if (!confirm("이 배송 건을 삭제하시겠습니까?")) return;
    const updated = shipmentsList.filter((s) => s.id !== id);
    setShipmentsList(updated);
    triggerToast("배송 건이 삭제되었습니다.");
  };

  // ── CJ Logistics: Export Excel (LoIS 접수용) ────────────────────────────────
  const handleExportCjExcel = () => {
    const pendingShipments = shipmentsList.filter((s) => s.status === "Pending");
    if (pendingShipments.length === 0) {
      alert("배송 대기 중인 주문이 없습니다.");
      return;
    }
    const rows = pendingShipments.flatMap((ship: any) => {
      const pkgs = ship.packages && ship.packages.length > 0 ? ship.packages : [ship];
      return pkgs.map((pkg: any, idx: number) => ({
        "고객주문번호": idx === 0 ? ship.orderId : `${ship.orderId}-${idx + 1}`,
        "수령인": ship.recipient || "",
        "전화번호1": ship.phone || "",
        "전화번호2": ship.altPhone || "",
        "우편번호": ship.zipCode || "",
        "주소": `${ship.address || ""} ${ship.detailAddress || ""}`.trim(),
        "품명": pkg.items || ship.items || "",
        "수량": pkg.quantity || ship.quantity || 1,
        "배송메모": ship.shippingMemo || "",
        "고객사코드": cjClientCode || "",
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CJ접수");
    XLSX.writeFile(wb, `CJ_배송접수_${new Date().toISOString().slice(0, 10)}.xlsx`);
    triggerToast(`${rows.length}건의 CJ대한통운 접수용 엑셀이 다운로드되었습니다.`);
  };

  const [cjPrintData, setCjPrintData] = useState<any[] | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  const handleIssueCjLogisticsTracking = async (orderIds?: string | string[]) => {
    if (isIssuing) return;
    
    // 타겟 결정: 이미 송장번호가 발급된 건은 안전하게 보존하고, 아직 송장번호가 없는 미발급 건만 발급 대상으로 지정
    const isUnissued = (s: any) => {
      if (s.packages && s.packages.length > 1) {
        return s.packages.some((p: any) => !p.trackingNumber || p.trackingNumber === "-" || p.trackingNumber.trim() === "");
      }
      return !s.trackingNumber || s.trackingNumber === "-" || s.trackingNumber.trim() === "";
    };

    let targetOrders = [];
    if (orderIds) {
      const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
      targetOrders = shipmentsList.filter((s) => ids.includes(s.id) && isUnissued(s));
    } else {
      targetOrders = shipmentsList.filter((s) => isUnissued(s));
    }

    if (targetOrders.length === 0) {
      alert("선택하신 주문은 이미 모두 송장번호가 정상 발급되어 있습니다.\n\n기존 송장번호가 그대로 유지되며 새로 갱신되지 않습니다.\n출력이 필요하시면 [선택 건 송장 일괄 출력]을 눌러주세요.");
      return;
    }

    if (!window.confirm(`선택한 주문 중 미발급 ${targetOrders.length}건에 대해 송장(트래킹) 번호를 신규 발급하시겠습니까?\n(다박스 분할 주문은 각 박스별로 개별 송장이 채번됩니다)`)) {
      return;
    }

    setIsIssuing(true);
    triggerToast(`총 ${targetOrders.length}건의 송장 신규 발급을 시작합니다. (순차 처리)`);
    
    let successCount = 0;
    let newPrintData = [];
    let currentList = [...shipmentsList];

    try {
      const origin = window.location.origin;
      
      // 순차 발급 (100건 Rate Limit 및 타임아웃 방지)
      for (let i = 0; i < targetOrders.length; i++) {
        const targetOrder = targetOrders[i];
        try {
          if (targetOrder.packages && targetOrder.packages.length > 1) {
            // 다박스(분할 배송) 주문 처리
            const updatedPackages = [...targetOrder.packages];
            let anyPkgSuccess = false;

            for (let pIdx = 0; pIdx < updatedPackages.length; pIdx++) {
              const pkg = updatedPackages[pIdx];
              if (!pkg.trackingNumber || pkg.trackingNumber === "-" || pkg.trackingNumber.trim() === "") {
                const pIndex = pkg.pkgIndex || (pIdx + 1);
                const pkgPayload = {
                  ...targetOrder,
                  id: `${targetOrder.id}-${pIndex}`,
                  orderId: `${targetOrder.orderId}-${pIndex}`,
                  items: pkg.items,
                  quantity: pkg.quantity || 1,
                };

                const res = await fetch(`${origin}/api/shipping/cj/issue`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order: pkgPayload }),
                });
                const data = await res.json();
                const printItem = Array.isArray(data) ? data[0] : (data?.trackingNumber ? data : null);

                if (printItem && printItem.trackingNumber) {
                  anyPkgSuccess = true;
                  updatedPackages[pIdx] = {
                    ...pkg,
                    trackingNumber: printItem.trackingNumber,
                    status: "In Transit",
                  };
                  newPrintData.push(printItem);
                } else {
                  console.error(`송장 발급 실패 [${targetOrder.id} 박스 ${pIndex}]:`, data?.error || data);
                }
              }
            }

            if (anyPkgSuccess) {
              successCount++;
              const allTransit = updatedPackages.every((p: any) => p.trackingNumber && p.trackingNumber !== "-");
              const newStatus = allTransit ? "In Transit" : "Partially Shipped";

              currentList = currentList.map((s) =>
                s.id === targetOrder.id
                  ? {
                      ...s,
                      packages: updatedPackages,
                      status: newStatus,
                      trackingNumber: updatedPackages[0]?.trackingNumber || s.trackingNumber,
                      shippedDate: new Date().toISOString().split("T")[0],
                    }
                  : s
              );
              triggerToast(`발급 진행 중... (${successCount}/${targetOrders.length})`);
            }
          } else {
            // 일반(단일 박스) 주문 처리
            const res = await fetch(`${origin}/api/shipping/cj/issue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: targetOrder }),
            });
            const data = await res.json();
            const printItem = Array.isArray(data) ? data[0] : (data?.trackingNumber ? data : null);
            
            if (printItem && printItem.trackingNumber) {
              successCount++;
              
              // 로컬 상태 즉시 업데이트 준비
              currentList = currentList.map((s) =>
                s.id === targetOrder.id
                  ? { 
                      ...s, 
                      trackingNumber: printItem.trackingNumber, 
                      status: "In Transit", 
                      shippedDate: new Date().toISOString().split("T")[0],
                      cjClsfCd: printItem.clsfCd,
                      cjSubClsfCd: printItem.subClsfCd,
                      cjClldlvempNickNm: printItem.clldlvempNickNm,
                      cjClsfAddr: printItem.clsfAddr,
                      cjClldlvBranNm: printItem.clldlvBranNm,
                      cjP2pCd: printItem.p2pCd,
                    }
                  : s
              );
              
              newPrintData.push(printItem);
              
              triggerToast(`발급 진행 중... (${successCount}/${targetOrders.length})`);
            } else {
              console.error(`송장 발급 실패 [${targetOrder.id}]:`, data?.error || data);
            }
          }
        } catch (err) {
          console.error(`네트워크 오류 [${targetOrder.id}]:`, err);
        }
      }
      
      setShipmentsList(currentList);

      // 브라우저 캐시 및 서버 API(Supabase)에 영구 저장
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_shipments", JSON.stringify(currentList));
      }
      try {
        await fetch("/api/admin/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentList),
        });
      } catch (saveErr) {
        console.warn("Failed to persist newly issued shipments to server:", saveErr);
      }
      
      if (newPrintData.length > 0) {
        triggerToast(`총 ${newPrintData.length}건 신규 발급 완료.`);
        if (window.confirm(`총 ${newPrintData.length}건의 송장이 성공적으로 발급되었습니다.\n지금 바로 라벨 출력을 진행하시겠습니까?`)) {
          setCjPrintData(newPrintData);
        }
      } else {
        alert("성공적으로 발급된 송장이 없습니다.");
      }

    } catch (err: any) {
      alert(`송장 발급 중 오류 발생: ${err.message}`);
    } finally {
      setIsIssuing(false);
    }
  };

  return {
    // List & CRUD
    shipmentsList,
    setShipmentsList,
    // Filters
    shipmentSearchQuery,
    setShipmentSearchQuery,
    shipmentStatusFilter,
    setShipmentStatusFilter,
    shipmentCarrierFilter,
    setShipmentCarrierFilter,
    // Pagination
    shipmentPage,
    setShipmentPage,
    SHIPMENTS_PER_PAGE,
    filteredShipments,
    totalShipmentPages,
    paginatedShipments,
    // Add Shipment Modal
    isAddShipmentModalOpen,
    setIsAddShipmentModalOpen,
    newShipmentOrderId,
    setNewShipmentOrderId,
    newShipmentRecipient,
    setNewShipmentRecipient,
    newShipmentPhone,
    setNewShipmentPhone,
    newShipmentAltPhone,
    setNewShipmentAltPhone,
    newShipmentZipCode,
    setNewShipmentZipCode,
    newShipmentAddress,
    setNewShipmentAddress,
    newShipmentDetailAddress,
    setNewShipmentDetailAddress,
    newShipmentItems,
    setNewShipmentItems,
    newShipmentQuantity,
    setNewShipmentQuantity,
    newShipmentShippingMemo,
    setNewShipmentShippingMemo,
    newShipmentCarrier,
    setNewShipmentCarrier,
    newShipmentTracking,
    setNewShipmentTracking,
    newShipmentStatus,
    setNewShipmentStatus,
    // Edit Shipment
    editingShipment,
    setEditingShipment,
    editShipmentCarrier,
    setEditShipmentCarrier,
    editShipmentTracking,
    setEditShipmentTracking,
    editShipmentStatus,
    setEditShipmentStatus,
    // CJ Config Modal
    isCjConfigModalOpen,
    setIsCjConfigModalOpen,
    configModalTab,
    setConfigModalTab,
    // Shipping Policy
    shippingPolicy,
    setShippingPolicy,
    // CJ API Config
    cjClientCode,
    setCjClientCode,
    cjContractNo,
    setCjContractNo,
    cjApiKey,
    setCjApiKey,
    cjSenderAddress,
    setCjSenderAddress,
    // Handlers
    handleOpenSenderPostcode,
    handleOpenNewShipmentPostcode,
    handleAddShipmentSubmit,
    handleOpenEditShipment,
    handleSaveEditShipment,
    handleSaveShipmentDetails,
    handleDeleteShipment,
    handleExportCjExcel,
    handleIssueCjLogisticsTracking,
    isIssuing,
    cjPrintData,
    setCjPrintData,
  };
}
