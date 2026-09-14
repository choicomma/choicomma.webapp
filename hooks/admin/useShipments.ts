"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// Initial Shipment Data (from page.tsx INITIAL_SHIPMENTS)
// ─────────────────────────────────────────────────────────────────────────────
const initialShipments: any[] = [];

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

export function sanitizeShipmentsList(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return list.map((s: any) => ({
    ...s,
    trackingNumber: sanitizeCjTracking(s.trackingNumber),
    packages: Array.isArray(s.packages)
      ? s.packages.map((pkg: any) => ({
          ...pkg,
          trackingNumber: sanitizeCjTracking(pkg.trackingNumber),
        }))
      : s.packages,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useShipments(triggerToast: (msg: string) => void) {
  const SHIPMENTS_PER_PAGE = 15;

  // ── Shipments List ──────────────────────────────────────────────────────────
  const [shipmentsList, setShipmentsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return sanitizeShipmentsList(parsed);
          }
        } catch (e) {}
      }
    }
    return initialShipments;
  });

  // Persist on change without dispatching 'storage' to self
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentJson = JSON.stringify(shipmentsList);
      const saved = localStorage.getItem("admin_shipments");
      if (saved !== currentJson) {
        localStorage.setItem("admin_shipments", currentJson);
        window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
      }
    }
  }, [shipmentsList]);

  // Listen for storage events from other tabs/components
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = () => {
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeShipmentsList(parsed);
            setShipmentsList((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(sanitized)) return prev;
              return sanitized;
            });
          }
        } catch (e) {}
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("admin_shipments_updated", onStorage);
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
    window.addEventListener("admin_shipments_updated", onStorage);
    window.addEventListener("admin_orders_updated", onOrdersUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("admin_shipments_updated", onStorage);
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
  const [shippingPolicy, setShippingPolicy] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_shipping_policy");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return { baseFee: 3000, freeThreshold: 50000 };
  });

  // ── CJ API Config ───────────────────────────────────────────────────────────
  const [cjClientCode, setCjClientCode] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("cj_client_code") || "" : ""
  );
  const [cjContractNo, setCjContractNo] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("cj_contract_no") || "" : ""
  );
  const [cjApiKey, setCjApiKey] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("cj_api_key") || "" : ""
  );
  const [cjSenderAddress, setCjSenderAddress] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("cj_sender_address") || "" : ""
  );

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
    if (!newShipmentOrderId || !newShipmentRecipient || !newShipmentAddress) {
      alert("주문번호, 수령인, 배송지는 필수 항목입니다.");
      return;
    }
    const newShipment = {
      id: `SHP-${Date.now()}`,
      orderId: newShipmentOrderId.trim(),
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
    const updated = shipmentsList.map((s) =>
      s.id === editingShipment.id
        ? {
            ...s,
            carrier: editShipmentCarrier,
            trackingNumber: editShipmentTracking || "-",
            status: editShipmentStatus,
            shippedDate:
              editShipmentStatus === "In Transit" && !s.shippedDate
                ? new Date().toISOString().split("T")[0]
                : s.shippedDate,
          }
        : s
    );
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
    
    // 타겟 결정
    let targetOrders = [];
    if (orderIds) {
      const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
      targetOrders = shipmentsList.filter(s => ids.includes(s.id) && s.status === "Pending");
    } else {
      targetOrders = shipmentsList.filter((s) => s.status === "Pending");
    }

    if (targetOrders.length === 0) {
      alert("송장을 발급할 '배송 준비 중'인 주문이 없습니다.");
      return;
    }

    if (!window.confirm(`선택한 ${targetOrders.length}건의 주문에 대해 송장(트래킹) 번호를 발급하시겠습니까?`)) {
      return;
    }

    setIsIssuing(true);
    triggerToast(`총 ${targetOrders.length}건의 송장 발급을 시작합니다. (순차 처리)`);
    
    let successCount = 0;
    let newPrintData = [];
    let currentList = [...shipmentsList];

    try {
      const origin = window.location.origin;
      
      // 순차 발급 (100건 Rate Limit 및 타임아웃 방지)
      for (let i = 0; i < targetOrders.length; i++) {
        const targetOrder = targetOrders[i];
        try {
          const res = await fetch(`${origin}/api/shipping/cj/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: targetOrder }),
          });
          const data = await res.json();
          
          if (data.success) {
            successCount++;
            
            // 로컬 상태 즉시 업데이트 준비
            currentList = currentList.map((s) =>
              s.id === targetOrder.id
                ? { 
                    ...s, 
                    trackingNumber: data.trackingNumber, 
                    status: "In Transit", 
                    shippedDate: new Date().toISOString().split("T")[0],
                    cjClsfCd: data.clsfCd,
                    cjSubClsfCd: data.subClsfCd,
                    cjClldlvempNickNm: data.clldlvempNickNm,
                    cjClsfAddr: data.clsfAddr,
                    cjClldlvBranNm: data.clldlvBranNm,
                    cjP2pCd: data.p2pCd,
                  }
                : s
            );
            
            newPrintData.push({
              orderId: targetOrder.orderId,
              recipient: targetOrder.recipient,
              phone: targetOrder.phone,
              zipCode: targetOrder.zipCode,
              address: targetOrder.address,
              detailAddress: targetOrder.detailAddress,
              items: targetOrder.items,
              shippingMemo: targetOrder.shippingMemo,
              trackingNumber: data.trackingNumber,
              clsfCd: data.clsfCd,
              subClsfCd: data.subClsfCd,
              clldlvempNickNm: data.clldlvempNickNm,
              clsfAddr: data.clsfAddr,
              clldlvBranNm: data.clldlvBranNm,
              p2pCd: data.p2pCd,
            });
            
            triggerToast(`발급 진행 중... (${successCount}/${targetOrders.length})`);
          } else {
            console.error(`송장 발급 실패 [${targetOrder.id}]:`, data.error);
          }
        } catch (err) {
          console.error(`네트워크 오류 [${targetOrder.id}]:`, err);
        }
      }
      
      setShipmentsList(currentList);
      
      if (newPrintData.length > 0) {
        // 인쇄 모달을 자동으로 띄우지 않고 상태만 업데이트
        triggerToast(`총 ${newPrintData.length}건 발급 완료. [선택 건 송장 일괄 출력] 버튼을 눌러 인쇄하세요.`);
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
