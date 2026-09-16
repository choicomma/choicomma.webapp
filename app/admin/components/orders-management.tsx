"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  CheckCircle2,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  AlertCircle,
  Settings,
  FileText,
  Printer,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  RotateCcw,
  Boxes,
  Layers,
  Sparkles,
  Barcode,
} from "lucide-react";
import * as XLSX from "xlsx";
import { CjLabelPrint } from "./cj-label-print";
import { sortShipmentsByNumber } from "@/hooks/admin/useShipments";
import {
  detectBundleCandidates,
  executeOrderMerge,
  undoOrderMerge,
  type BundleGroup,
} from "@/lib/shipping/bundle-detector";

interface OrdersManagementProps {
  productsList?: any[];
  customersList?: any[];
  shipmentsList: any[];
  setShipmentsList: React.Dispatch<React.SetStateAction<any[]>>;
  shipmentSearchQuery: string;
  setShipmentSearchQuery: (val: string) => void;
  shipmentStatusFilter: string;
  setShipmentStatusFilter: (val: string) => void;
  shipmentCarrierFilter: string;
  setShipmentCarrierFilter: (val: string) => void;
  cjClientCode: string;
  cjContractNo: string;
  setIsAddShipmentModalOpen: (val: boolean) => void;
  setIsCjConfigModalOpen: (val: boolean) => void;
  handleIssueCjLogisticsTracking?: (ids?: string | string[]) => void;
  handleExportCjExcel: () => void;
  handleOpenEditShipment: (shipment: any) => void;
  handleDeleteShipment: (id: string) => void;
  cjPrintData?: any;
  setCjPrintData?: (val: any) => void;
}

export function OrdersManagement({
  productsList,
  customersList,
  shipmentsList,
  setShipmentsList,
  shipmentSearchQuery,
  setShipmentSearchQuery,
  shipmentStatusFilter,
  setShipmentStatusFilter,
  shipmentCarrierFilter,
  setShipmentCarrierFilter,
  cjClientCode,
  cjContractNo,
  setIsAddShipmentModalOpen,
  setIsCjConfigModalOpen,
  handleIssueCjLogisticsTracking,
  handleExportCjExcel,
  handleOpenEditShipment,
  handleDeleteShipment,
  cjPrintData,
  setCjPrintData,
}: OrdersManagementProps) {
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENTS_PER_PAGE = 15;

  // 배송 건 다중 선택 상태 (체크박스)
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());

  // 주문서(거래명세서) 인쇄 모달 상태
  const [isOrderSheetModalOpen, setIsOrderSheetModalOpen] = useState(false);
  const [selectedOrderSheetShipment, setSelectedOrderSheetShipment] = useState<any | null>(null);

  const handleOpenOrderSheet = (ship: any) => {
    setSelectedOrderSheetShipment(ship);
    setIsOrderSheetModalOpen(true);
  };

  // 회원 정보 관리(admin_customers)와 주문서 연동: 받는분 성명 또는 연락처 기준 매칭
  const matchedCustomerForSheet = useMemo(() => {
    if (!selectedOrderSheetShipment) return null;
    let list: any[] = [];
    if (customersList && customersList.length > 0) {
      list = customersList;
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          list = JSON.parse(saved);
        } catch (e) {}
      }
    }

    const sPhone = (selectedOrderSheetShipment.phone || "").replace(/[^0-9]/g, "");
    const sRecipient = (selectedOrderSheetShipment.recipient || "").trim();

    return (
      list.find((c: any) => {
        const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
        const cName = (c.name || "").trim();
        return (
          (sPhone && sPhone.length >= 8 && cPhone === sPhone) ||
          (sRecipient && cName === sRecipient)
        );
      }) || null
    );
  }, [selectedOrderSheetShipment, customersList]);

  // ── 📦 동일 고객/주소지 48시간 이내 합배송 자동 감지 ─────────────────────────
  const bundleGroups = useMemo(() => {
    return detectBundleCandidates(shipmentsList, customersList);
  }, [shipmentsList, customersList]);

  // 합배송 대상 총 주문 건수
  const totalBundleCandidatesCount = useMemo(() => {
    return bundleGroups.reduce((acc, g) => acc + g.shipmentIds.length, 0);
  }, [bundleGroups]);

  // 특정 주문이 어떤 합배송 그룹에 속하는지 빠른 조회를 위한 Map
  const shipmentBundleGroupMap = useMemo(() => {
    const map = new Map<string, BundleGroup>();
    bundleGroups.forEach((group) => {
      group.shipmentIds.forEach((sId) => {
        map.set(sId, group);
      });
    });
    return map;
  }, [bundleGroups]);

  // 합배송 대상 주문 모아보기 전용 필터 상태
  const [isBundleFilterActive, setIsBundleFilterActive] = useState(false);

  // 합배송 확인/실행 모달 상태
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [activeBundleGroup, setActiveBundleGroup] = useState<BundleGroup | null>(null);

  // 합배송 모달 열기 핸들러
  const handleOpenBundleModal = (group: BundleGroup) => {
    setActiveBundleGroup(group);
    setIsBundleModalOpen(true);
  };

  // 합배송 확정 실행 핸들러 (원클릭 1박스 묶음 + 초과 배송비 적립금 자동 환급)
  const handleConfirmBundle = async () => {
    if (!activeBundleGroup || activeBundleGroup.shipmentIds.length < 2) return;

    const primaryId = activeBundleGroup.shipmentIds[0];
    const childIds = activeBundleGroup.shipmentIds.slice(1);
    const refundPoints = activeBundleGroup.refundableShippingFee || 0;

    // 1. 배송 주문 목록 병합
    const updatedShipments = executeOrderMerge(
      shipmentsList,
      primaryId,
      childIds,
      refundPoints
    );

    setShipmentsList(updatedShipments);

    // 로컬 스토리지 및 Supabase 실시간 동기화
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_shipments", JSON.stringify(updatedShipments));
      window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
    }
    try {
      await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedShipments),
      });
    } catch (e) {
      console.warn("Bundle shipments sync warning:", e);
    }

    // 2. 고객 적립금 초과 배송비 환급 (고객 계정 points 가산)
    if (refundPoints > 0 && activeBundleGroup.matchedCustomer) {
      try {
        const cust = activeBundleGroup.matchedCustomer;
        const currentPoints = Number(cust.points || 0);
        const newPoints = currentPoints + refundPoints;

        let allCusts: any[] = [];
        if (customersList && customersList.length > 0) {
          allCusts = customersList;
        } else if (typeof window !== "undefined") {
          const saved = localStorage.getItem("admin_customers");
          if (saved) {
            try { allCusts = JSON.parse(saved); } catch (err) {}
          }
        }

        const updatedCusts = allCusts.map((c: any) =>
          c.id === cust.id ? { ...c, points: newPoints } : c
        );

        if (typeof window !== "undefined") {
          localStorage.setItem("admin_customers", JSON.stringify(updatedCusts));
          window.dispatchEvent(new CustomEvent("storage"));
          window.dispatchEvent(new CustomEvent("admin_customers_updated"));
        }
      } catch (custErr) {
        console.warn("Failed to credit refund points to customer:", custErr);
      }
    }

    setIsBundleModalOpen(false);
    const targetGroup = activeBundleGroup;
    setActiveBundleGroup(null);

    alert(
      `📦 [합배송 완료]\n\n` +
      `총 ${targetGroup.shipmentIds.length}건의 주문이 1개 박스로 성공적으로 묶였습니다.\n` +
      (refundPoints > 0
        ? `\n💰 초과 부과된 배송비 ₩${refundPoints.toLocaleString()}원이 ${targetGroup.recipient}님의 회원 적립금으로 즉시 환급 지급되었습니다!`
        : "")
    );
  };

  // 합배송 분리/원상복원 핸들러
  const handleUnbundle = async (ship: any) => {
    if (!window.confirm(`[${ship.orderId}] 묶음 합배송을 해제하고 각각의 개별 주문으로 분리하시겠습니까?`)) {
      return;
    }

    const updated = undoOrderMerge(shipmentsList, ship.id);
    setShipmentsList(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_shipments", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
    }
    try {
      await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn("Unbundle shipments sync warning:", e);
    }

    alert(`📦 [${ship.orderId}] 합배송이 해제되어 개별 주문으로 원상 복원되었습니다.`);
  };

  // 분할배송(다박스) 모달 상태 및 드래그 앤 드롭 데이터
  interface SplitItem {
    id: string;
    name: string;
    qty: number;
    selectedQty: number; // 인라인 빠른 수량 선택용
  }

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitTargetShipment, setSplitTargetShipment] = useState<any | null>(null);
  const [box1Items, setBox1Items] = useState<SplitItem[]>([]);
  const [box2Items, setBox2Items] = useState<SplitItem[]>([]);
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ sourceBox: 1 | 2; item: SplitItem } | null>(null);
  const [dragOverBox, setDragOverBox] = useState<1 | 2 | null>(null);

  // 수량 분할 다이얼로그 (2개 이상 상품 드래그 앤 드롭 시 팝업)
  const [splitQtyDialog, setSplitQtyDialog] = useState<{
    isOpen: boolean;
    sourceBox: 1 | 2;
    item: SplitItem;
    moveQty: number;
  } | null>(null);

  // 문자열 품목 파싱 헬퍼
  const parseItemsToSplitList = (itemsStr: string): SplitItem[] => {
    if (!itemsStr) return [];
    const result: SplitItem[] = [];
    itemsStr.split(/,\s*/).filter((t: string) => t.trim()).forEach((token: string, idx: number) => {
      const trimmed = token.trim();
      if (!trimmed) return;
      const qtyMatch = trimmed.match(/(\d+)\s*개/) || trimmed.match(/x\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const cleanName = trimmed.replace(/\s*\d+\s*개$/, "").replace(/\s*x\s*\d+$/i, "").trim();
      result.push({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName || trimmed,
        qty: qty || 1,
        selectedQty: 1,
      });
    });
    return result;
  };

  // 상품명 기반 썸네일 매칭 헬퍼
  const getProductThumbnail = (rawName: string): string => {
    if (!rawName) return "/product_1.webp";
    const clean = rawName
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s*\d+\s*개$/g, "")
      .replace(/\s*x\s*\d+$/gi, "")
      .trim()
      .toLowerCase();

    const allProds: any[] = (productsList && productsList.length > 0)
      ? productsList
      : (() => {
          if (typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem("admin_products");
              if (saved) return JSON.parse(saved);
            } catch (e) {}
          }
          return [];
        })();

    if (allProds.length > 0) {
      const found = allProds.find((p: any) => {
        const pTitle = (p.title || p.name || "").toLowerCase();
        return pTitle && (pTitle.includes(clean) || clean.includes(pTitle));
      });
      if (found?.featuredImage?.url) return found.featuredImage.url;
      if (found?.images?.[0]?.url) return found.images[0].url;

      const keywords = [
        "블라우스", "blouse", "원피스", "dress", "슬랙스", "slacks",
        "셔츠", "shirts", "코트", "coat", "재킷", "jacket",
        "스커트", "skirt", "니트", "knit", "머플러", "muffler",
        "벨트", "belt", "스카프", "scarf", "로퍼", "loafer", "가방", "bag"
      ];
      for (const kw of keywords) {
        if (clean.includes(kw)) {
          const kwMatch = allProds.find((p: any) => (p.title || "").toLowerCase().includes(kw));
          if (kwMatch?.featuredImage?.url) return kwMatch.featuredImage.url;
        }
      }
    }

    const fallbackList = [
      "/product_1.webp",
      "/product_2.webp",
      "/product_3.webp",
      "/product_4.webp",
      "/1.jpg",
      "/2.jpg",
      "/3.jpg",
      "/4.jpg",
      "/5.jpg",
      "/6.jpg",
      "/7.jpg",
      "/8.jpg",
      "/9.jpg",
      "/model_1.jpg",
      "/model_2.jpg",
    ];
    let hash = 0;
    for (let i = 0; i < rawName.length; i++) {
      hash = (hash << 5) - hash + rawName.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % fallbackList.length;
    return fallbackList[idx];
  };

  // 주문 상품 문자열을 개별 라인 목록으로 파싱 (한 줄씩 표시용)
  const parseItemLines = (itemsStr: string): { name: string; qty: number; option?: string; raw: string }[] => {
    if (!itemsStr) return [];
    return itemsStr
      .split(/,\s*/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        const qtyMatch = token.match(/(\d+)\s*개$/) || token.match(/x\s*(\d+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const nameWithoutQty = token.replace(/\s*\d+\s*개$/, "").replace(/\s*x\s*\d+$/i, "").trim();

        const optionMatch = nameWithoutQty.match(/\(([^)]+)\)$/);
        const option = optionMatch ? optionMatch[1] : undefined;
        const cleanName = optionMatch ? nameWithoutQty.replace(/\s*\([^)]+\)$/, "").trim() : nameWithoutQty;

        return {
          name: cleanName || nameWithoutQty,
          qty,
          option,
          raw: token,
        };
      });
  };

  // 분할배송 모달 열기 — 기존 1번/2번 박스 이력이 있다면 각각 로드
  const handleOpenSplitModal = (ship: any) => {
    setSplitTargetShipment(ship);

    if (ship.packages && ship.packages.length > 1) {
      const b1 = parseItemsToSplitList(ship.packages[0]?.items || "");
      const b2 = parseItemsToSplitList(ship.packages[1]?.items || "");
      setBox1Items(b1.length > 0 ? b1 : parseItemsToSplitList(ship.items || ""));
      setBox2Items(b2);
    } else {
      const parsed = parseItemsToSplitList(ship.items || "");
      if (parsed.length === 0) {
        parsed.push({
          id: `item-${Date.now()}-0`,
          name: ship.items || "주문 상품 1",
          qty: Number(ship.quantity) || 1,
          selectedQty: 1,
        });
      }
      setBox1Items(parsed);
      setBox2Items([]);
    }

    setIsSplitModalOpen(true);
  };

  // 박스 간 상품 이동 (1번 ➜ 2번 또는 2번 ➜ 1번)
  const moveItemBetweenBoxes = (sourceBox: 1 | 2, item: SplitItem, moveQty: number) => {
    if (moveQty <= 0) return;
    const actualMoveQty = Math.min(moveQty, item.qty);

    if (sourceBox === 1) {
      // 1번 박스 ➜ 2번 박스
      setBox1Items((prev) =>
        prev
          .map((i) => {
            if (i.id === item.id) {
              const rem = i.qty - actualMoveQty;
              return rem > 0 ? { ...i, qty: rem, selectedQty: Math.min(i.selectedQty || 1, rem) } : null;
            }
            return i;
          })
          .filter(Boolean) as SplitItem[]
      );

      setBox2Items((prev) => {
        const existing = prev.find((i) => i.name === item.name);
        if (existing) {
          return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + actualMoveQty } : i));
        } else {
          return [
            ...prev,
            {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name,
              qty: actualMoveQty,
              selectedQty: 1,
            },
          ];
        }
      });
    } else {
      // 2번 박스 ➜ 1번 박스
      setBox2Items((prev) =>
        prev
          .map((i) => {
            if (i.id === item.id) {
              const rem = i.qty - actualMoveQty;
              return rem > 0 ? { ...i, qty: rem, selectedQty: Math.min(i.selectedQty || 1, rem) } : null;
            }
            return i;
          })
          .filter(Boolean) as SplitItem[]
      );

      setBox1Items((prev) => {
        const existing = prev.find((i) => i.name === item.name);
        if (existing) {
          return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + actualMoveQty } : i));
        } else {
          return [
            ...prev,
            {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name,
              qty: actualMoveQty,
              selectedQty: 1,
            },
          ];
        }
      });
    }
  };

  // 1개 박스로 모두 취합(병합 / 초기화)
  const handleMergeAllToBox1 = () => {
    if (box2Items.length === 0) return;
    if (!window.confirm("2번 박스의 모든 품목을 1번 박스로 합치시겠습니까?\n(다박스 분할이 해제되고 1개의 단일 박스로 통합됩니다)")) {
      return;
    }

    setBox1Items((prev) => {
      const merged = [...prev];
      box2Items.forEach((b2Item) => {
        const match = merged.find((m) => m.name === b2Item.name);
        if (match) {
          match.qty += b2Item.qty;
        } else {
          merged.push({ ...b2Item });
        }
      });
      return merged;
    });
    setBox2Items([]);
  };

  // 분할배송 확정 저장 (1번 박스 + 2번 박스)
  const handleConfirmSplitPackage = async () => {
    if (!splitTargetShipment) return;

    if (box1Items.length === 0 && box2Items.length === 0) {
      alert("배송할 상품이 없습니다.");
      return;
    }

    const currentPkgs = (splitTargetShipment.packages && splitTargetShipment.packages.length > 0)
      ? splitTargetShipment.packages
      : [{
          id: `PKG-${String(Date.now()).slice(-4)}-1`,
          pkgIndex: 1,
          items: splitTargetShipment.items,
          quantity: splitTargetShipment.quantity || 1,
          carrier: splitTargetShipment.carrier || "CJ대한통운",
          trackingNumber: splitTargetShipment.trackingNumber || "-",
          status: splitTargetShipment.status || "Pending",
        }];

    // 1) 2번 박스가 비어있는 경우 ➜ 1개 단일 박스로 통합(병합)
    if (box2Items.length === 0) {
      const b1Text = box1Items.map((i) => `${i.name} ${i.qty}개`).join(", ");
      const b1Qty = box1Items.reduce((sum, i) => sum + i.qty, 0);

      const singlePackage = [{
        ...currentPkgs[0],
        pkgIndex: 1,
        items: b1Text,
        quantity: b1Qty || 1,
      }];

      const updatedShipments = shipmentsList.map((s) =>
        s.id === splitTargetShipment.id
          ? {
              ...s,
              items: b1Text,
              quantity: b1Qty,
              packages: singlePackage,
            }
          : s
      );

      setShipmentsList(updatedShipments);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_shipments", JSON.stringify(updatedShipments));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      try {
        await fetch("/api/admin/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedShipments),
        });
      } catch (e) {
        console.warn("Save shipments error:", e);
      }

      setIsSplitModalOpen(false);
      setSplitTargetShipment(null);
      alert(`📦 [${splitTargetShipment.orderId}] 배송이 1개 단일 박스로 통합(병합)되었습니다.`);
      return;
    }

    // 2) 1번 박스와 2번 박스에 각각 상품이 나뉘어 있는 경우 ➜ 2개 박스 분할 확정
    if (box1Items.length === 0) {
      alert("❌ 1번 박스에도 최소 1개 이상의 상품이 남아있어야 합니다. 모든 상품을 이동할 수 없습니다.");
      return;
    }

    const b1Text = box1Items.map((i) => `${i.name} ${i.qty}개`).join(", ");
    const b1Qty = box1Items.reduce((sum, i) => sum + i.qty, 0);

    const b2Text = box2Items.map((i) => `${i.name} ${i.qty}개`).join(", ");
    const b2Qty = box2Items.reduce((sum, i) => sum + i.qty, 0);

    const newPackage1 = {
      ...currentPkgs[0],
      pkgIndex: 1,
      items: b1Text,
      quantity: b1Qty || 1,
    };

    const newPackage2 = {
      id: currentPkgs[1]?.id || `PKG-${String(Date.now()).slice(-4)}-2`,
      pkgIndex: 2,
      items: b2Text,
      quantity: b2Qty || 1,
      carrier: splitTargetShipment.carrier || "CJ대한통운",
      trackingNumber: currentPkgs[1]?.trackingNumber || "-",
      status: currentPkgs[1]?.status || "Pending",
    };

    const newPackagesList = [newPackage1, newPackage2];

    const anyTransit = newPackagesList.some((p) => (p.trackingNumber && p.trackingNumber !== "-") || p.status === "In Transit");
    const allTransitWithTracking = newPackagesList.every((p) => p.trackingNumber && p.trackingNumber !== "-");
    let newOrderStatus = splitTargetShipment.status;
    if (allTransitWithTracking) newOrderStatus = "In Transit";
    else if (anyTransit) newOrderStatus = "Partially Shipped";

    const updatedShipments = shipmentsList.map((s) =>
      s.id === splitTargetShipment.id
        ? {
            ...s,
            packages: newPackagesList,
            status: newOrderStatus,
          }
        : s
    );

    setShipmentsList(updatedShipments);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_shipments", JSON.stringify(updatedShipments));
      window.dispatchEvent(new CustomEvent("storage"));
    }
    try {
      await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedShipments),
      });
    } catch (e) {
      console.warn("Save shipments error:", e);
    }

    setIsSplitModalOpen(false);
    setSplitTargetShipment(null);
    alert(`📦 [${splitTargetShipment.orderId}] 주문이 1번 박스와 2번 박스(총 2개 패키지)로 성공적으로 분할되었습니다.\n\n각 박스별로 개별 송장번호를 발급하거나 라벨을 출력할 수 있습니다.`);
  };

  // 분리된 개별 박스 송장 단건 발급 핸들러
  const handleIssueSinglePackageTracking = async (ship: any, pkgIndex: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const pkg = ship.packages?.find((p: any) => (p.pkgIndex || 1) === pkgIndex);
      if (!pkg) return;

      if (!window.confirm(`[${ship.orderId}] 주문의 ${pkgIndex}번 박스 송장번호를 신규 발급하시겠습니까?`)) {
        return;
      }

      const orderPayload = {
        id: `${ship.id}-${pkgIndex}`,
        orderId: `${ship.orderId}-${pkgIndex}`,
        parentOrderId: ship.orderId,
        parentShipmentId: ship.id,
        pkgIndex: pkgIndex,
        recipient: ship.recipient,
        phone: ship.phone,
        zipCode: ship.zipCode,
        address: ship.address,
        detailAddress: ship.detailAddress,
        items: pkg.items,
        shippingMemo: ship.shippingMemo,
      };

      const res = await fetch("/api/shipping/cj/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderPayload }),
      });
      const data = await res.json();
      const printItem = Array.isArray(data) ? data[0] : (data?.trackingNumber ? data : null);

      if (printItem && printItem.trackingNumber) {
        const updatedPackages = (ship.packages || []).map((p: any) =>
          (p.pkgIndex || 1) === pkgIndex
            ? { ...p, trackingNumber: printItem.trackingNumber, status: "In Transit" }
            : p
        );

        const allTransit = updatedPackages.every((p: any) => p.trackingNumber && p.trackingNumber !== "-");
        const anyTransit = updatedPackages.some((p: any) => p.trackingNumber && p.trackingNumber !== "-");
        const newStatus = allTransit ? "In Transit" : anyTransit ? "Partially Shipped" : (ship.status || "Pending");

        const firstValidTracking =
          updatedPackages.find((p: any) => p.trackingNumber && p.trackingNumber !== "-")?.trackingNumber ||
          ship.trackingNumber ||
          printItem.trackingNumber;

        let updatedList: any[] = [];
        setShipmentsList((prev: any[]) => {
          const next = prev.map((s) =>
            s.id === ship.id
              ? {
                  ...s,
                  packages: updatedPackages,
                  status: newStatus,
                  trackingNumber: firstValidTracking,
                }
              : s
          );
          updatedList = next;
          return next;
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("admin_shipments", JSON.stringify(updatedList));
          window.dispatchEvent(new CustomEvent("admin_shipments_updated"));
        }

        await fetch("/api/admin/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedList),
        });

        alert(`📦 [박스 ${pkgIndex}] 송장번호 (${printItem.trackingNumber})가 성공적으로 발급되었습니다!`);
      } else {
        alert("송장 발급에 실패했습니다: " + (data?.error || "알 수 없는 오류"));
      }
    } catch (err: any) {
      alert("송장 발급 오류: " + err.message);
    }
  };

  // CJ 송장 인쇄 핸들러 (다박스 분할 건 개별 라벨 지원)
  const handlePrintSelected = () => {
    const ids = Array.from(selectedShipmentIds);
    const targetOrders = shipmentsList.filter((s) => ids.includes(s.id));

    const newPrintData: any[] = [];
    targetOrders.forEach((targetOrder) => {
      if (targetOrder.packages && targetOrder.packages.length > 1) {
        targetOrder.packages.forEach((pkg: any, pi: number) => {
          const tNum = pkg.trackingNumber && pkg.trackingNumber !== "-" ? pkg.trackingNumber : targetOrder.trackingNumber;
          if (tNum && tNum !== "-") {
            newPrintData.push({
              orderId: `${targetOrder.orderId}-${pkg.pkgIndex || pi + 1}`,
              recipient: targetOrder.recipient,
              phone: targetOrder.phone,
              zipCode: targetOrder.zipCode,
              address: targetOrder.address,
              detailAddress: targetOrder.detailAddress,
              items: pkg.items || targetOrder.items,
              shippingMemo: targetOrder.shippingMemo,
              trackingNumber: tNum,
              clsfCd: (targetOrder as any).cjClsfCd || "4W44",
              subClsfCd: (targetOrder as any).cjSubClsfCd || "-4g",
              clldlvempNickNm: (targetOrder as any).cjClldlvempNickNm || "A01-1구역",
              clsfAddr: (targetOrder as any).cjClsfAddr || targetOrder.detailAddress || "",
              clldlvBranNm: (targetOrder as any).cjClldlvBranNm || "대한통운",
              p2pCd: (targetOrder as any).cjP2pCd || "P1",
            });
          }
        });
      } else {
        if (targetOrder.trackingNumber && targetOrder.trackingNumber !== "-") {
          newPrintData.push({
            orderId: targetOrder.orderId,
            recipient: targetOrder.recipient,
            phone: targetOrder.phone,
            zipCode: targetOrder.zipCode,
            address: targetOrder.address,
            detailAddress: targetOrder.detailAddress,
            items: targetOrder.items,
            shippingMemo: targetOrder.shippingMemo,
            trackingNumber: targetOrder.trackingNumber,
            clsfCd: (targetOrder as any).cjClsfCd || "4W44",
            subClsfCd: (targetOrder as any).cjSubClsfCd || "-4g",
            clldlvempNickNm: (targetOrder as any).cjClldlvempNickNm || "A01-1구역",
            clsfAddr: (targetOrder as any).cjClsfAddr || targetOrder.detailAddress || "",
            clldlvBranNm: (targetOrder as any).cjClldlvBranNm || "대한통운",
            p2pCd: (targetOrder as any).cjP2pCd || "P1",
          });
        }
      }
    });

    if (newPrintData.length === 0) {
      alert("선택된 주문 중 송장(트래킹) 번호가 발급된 건이 없습니다.\n\n먼저 '송장 일괄 발급' 버튼을 눌러 채번을 완료해 주세요.");
      return;
    }

    setCjPrintData?.(newPrintData);
  };

  // CJ LoIS Invoice Excel Upload Handler (CJ대한통운 건별 출력데이터 상세 및 표준 엑셀 완벽 지원)
  const handleUploadInvoiceExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert("엑셀 파일에 데이터가 비어있습니다.");
          return;
        }

        // 엑셀 행 데이터 정규화 (주문번호, 운송장번호, 수령인)
        const parsedRows = rows.map((row) => {
          let orderNo = "";
          let trackingNo = "";
          let recipientName = "";
          let phoneNo = "";

          for (const [k, v] of Object.entries(row)) {
            const kc = String(k || "").replace(/\s+/g, "");
            const vs = String(v ?? "").trim();
            if (!vs) continue;

            // 1. 주문번호 식별 (우선순위: 고객주문번호 > 주문번호 > 기타)
            if (kc.includes("고객주문번호") || kc === "주문번호" || kc.includes("주문번호") || kc.includes("주문ID") || kc.toLowerCase().includes("orderid") || kc.toLowerCase().includes("order_id")) {
              if (!orderNo || kc.includes("고객주문번호") || kc === "주문번호") {
                orderNo = vs;
              }
            }

            // 2. 운송장번호 식별 (전화번호, 우편번호, 주문번호 열 제외)
            if (
              !kc.includes("전화번호") &&
              !kc.includes("연락처") &&
              !kc.includes("우편번호") &&
              !kc.includes("주문번호") &&
              !kc.includes("고객주문") &&
              !kc.includes("일자")
            ) {
              if (
                kc.includes("운송장") ||
                kc.includes("송장") ||
                kc.toLowerCase().includes("tracking") ||
                kc.includes("원송장") ||
                kc.includes("등기번호") ||
                kc.includes("배송번호")
              ) {
                const digits = vs.replace(/[^0-9]/g, "");
                if (digits.length >= 8) {
                  trackingNo = vs; // 하이픈 유지 (예: 6002-2271-0913)
                }
              }
            }

            // 3. 수령인 식별
            if (kc === "받는분" || kc.includes("받는분성명") || kc.includes("수령인") || kc.includes("수하인")) {
              recipientName = vs;
            } else if (!recipientName && (kc.includes("받는분") || kc === "고객명" || kc.includes("성명"))) {
              recipientName = vs;
            }

            // 4. 연락처 식별
            if (kc.includes("받는분전화") || kc.includes("받는분연락처") || kc.includes("휴대폰") || kc.includes("전화번호")) {
              phoneNo = vs.replace(/[^0-9]/g, "");
            }
          }

          return {
            orderNo: orderNo.trim(),
            trackingNo: trackingNo.trim(),
            recipientName: recipientName.trim(),
            phoneNo,
            raw: row,
          };
        }).filter((r) => r.trackingNo && r.trackingNo.replace(/[^0-9]/g, "").length >= 8);

        if (parsedRows.length === 0) {
          alert("⚠️ 엑셀 파일에서 유효한 '운송장번호'(8자리 이상)를 찾을 수 없습니다.\n\nCJ대한통운 LoIS의 '건별 출력데이터 상세' 파일 또는 운송장번호가 포함된 엑셀인지 확인해 주세요.");
          return;
        }

        let updatedPackageCount = 0;
        const updatedList = shipmentsList.map((ship) => {
          const currentPkgs = (ship.packages && ship.packages.length > 0)
            ? [...ship.packages]
            : [
                {
                  id: `${ship.id}-1`,
                  pkgIndex: 1,
                  items: ship.items,
                  quantity: ship.quantity || 1,
                  carrier: ship.carrier || "CJ대한통운",
                  trackingNumber: ship.trackingNumber || "-",
                  status: ship.status || "Pending",
                },
              ];

          let isShipmentModified = false;

          const updatedPackages = currentPkgs.map((pkg: any) => {
            const shipOrder = String(ship.orderId || "").trim();
            const shipId = String(ship.id || "").trim();
            const shipRecip = String(ship.recipient || "").trim();
            const shipPhone = String(ship.phone || "").replace(/[^0-9]/g, "");

            // 패키지별 접미사 패턴 (-1, _S1, _1)
            const sfx1 = `-${pkg.pkgIndex}`;
            const sfx2 = `_S${pkg.pkgIndex}`;
            const sfx3 = `_${pkg.pkgIndex}`;

            // 파싱된 행 중 가장 일치하는 항목 찾기
            const matchedRow = parsedRows.find((row) => {
              if (row.orderNo) {
                // 1. 접미사 포함 정확 매칭 (분할 배송 패키지)
                if (
                  row.orderNo === `${shipOrder}${sfx1}` ||
                  row.orderNo === `${shipOrder}${sfx2}` ||
                  row.orderNo === `${shipOrder}${sfx3}` ||
                  row.orderNo === `${shipId}${sfx1}` ||
                  row.orderNo === `${shipId}${sfx2}`
                ) {
                  return true;
                }
                // 2. 단일 패키지이거나 첫 번째 박스인 경우 베이스 주문번호 매칭
                if (row.orderNo === shipOrder || row.orderNo === shipId) {
                  if (currentPkgs.length === 1 || pkg.pkgIndex === 1) return true;
                }
              }

              // 3. 수령인 + 연락처 폴백 매칭 (단일 박스 주문에 한함)
              if (currentPkgs.length === 1 && row.recipientName && shipRecip && (row.recipientName === shipRecip || shipRecip.includes(row.recipientName))) {
                if (!row.phoneNo || !shipPhone || row.phoneNo === shipPhone || shipPhone.includes(row.phoneNo)) {
                  return true;
                }
              }

              return false;
            });

            if (matchedRow && matchedRow.trackingNo) {
              isShipmentModified = true;
              updatedPackageCount++;
              return {
                ...pkg,
                carrier: "CJ대한통운",
                trackingNumber: matchedRow.trackingNo,
                status: "In Transit" as const,
              };
            }

            return pkg;
          });

          if (isShipmentModified) {
            const totalPkgs = updatedPackages.length;
            const validPkgs = updatedPackages.filter((p: any) => p.trackingNumber && p.trackingNumber !== "-" && p.trackingNumber.replace(/[^0-9]/g, "").length >= 8);
            const allDelivered = updatedPackages.every((p: any) => p.status === "Delivered");

            let orderStatus = "Pending";
            if (allDelivered) orderStatus = "Delivered";
            else if (validPkgs.length === totalPkgs) orderStatus = "In Transit";
            else if (validPkgs.length > 0) orderStatus = "Partially Shipped";

            return {
              ...ship,
              carrier: "CJ대한통운",
              trackingNumber: validPkgs.map((p: any) => p.trackingNumber).join(", ") || "-",
              status: orderStatus,
              packages: updatedPackages,
              shippedDate: new Date().toISOString().split("T")[0],
              estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
            };
          }

          return ship;
        });

        setShipmentsList(updatedList);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_shipments", JSON.stringify(updatedList));
          window.dispatchEvent(new CustomEvent("storage"));
        }

        if (updatedPackageCount > 0) {
          alert(`✅ 운송장 번호 일괄 등록 성공!\n\n총 ${updatedPackageCount}개 박스(패키지)에 운송장 번호가 등록되었으며, 주문 상태가 [배송중] 또는 [부분배송중]으로 자동 갱신되었습니다.`);
        } else {
          alert("⚠️ 업로드된 파일의 주문번호/수령인 정보와 일치하는 배송 대기 주문을 찾지 못했습니다.\n\n주문번호(-1, -2 접미사 포함)가 관리자 주문 목록과 일치하는지 확인해 주세요.");
        }

      } catch (err) {
        console.error("Failed to parse invoice excel:", err);
        alert("엑셀 파일 분석 중 오류가 발생했습니다. 정상적인 엑셀(.xlsx/.xls) 파일인지 확인해 주세요.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredShipments = React.useMemo(() => {
    const filtered = shipmentsList.filter((s) => {
      const q = shipmentSearchQuery.toLowerCase();
      const matchesSearch =
        s.recipient?.toLowerCase().includes(q) ||
        s.orderId?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.trackingNumber?.includes(q) ||
        s.address?.toLowerCase().includes(q);
      const matchesStatus = shipmentStatusFilter === "all" || s.status === shipmentStatusFilter;
      const matchesCarrier = shipmentCarrierFilter === "all" || s.carrier === shipmentCarrierFilter;
      return matchesSearch && matchesStatus && matchesCarrier;
    });
    return sortShipmentsByNumber(filtered);
  }, [shipmentsList, shipmentSearchQuery, shipmentStatusFilter, shipmentCarrierFilter]);

  const totalShipmentPages = Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE) || 1;
  const paginatedShipments = React.useMemo(() => {
    const start = (shipmentPage - 1) * SHIPMENTS_PER_PAGE;
    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);
  }, [filteredShipments, shipmentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for Invoice Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadInvoiceExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-neutral-900" />
            주문 및 배송 통합 관리
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            고객 주문 내역 수집, CJ대한통운 엑셀 연동, 운송장 일괄 등록 및 배송 현황 통합 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCjConfigModalOpen(true)}
            className="bg-white hover:bg-neutral-50 text-neutral-700 font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 transition-all shadow-xs flex items-center justify-center gap-1.5 text-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="배송 정책 & CJ대한통운 환경설정 열기"
          >
            <Settings className="w-4 h-4 text-neutral-500" />
            <span>배송 정책 / CJ 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddShipmentModalOpen(true)}
            className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>수동등록</span>
          </button>
        </div>
      </div>

      {/* 📦 48시간 이내 동일 고객/주소지 합배송 자동 감지 안내 배너 */}
      {bundleGroups.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200/90 rounded-2xl p-4 shadow-sm transition-all animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
                    <span>합배송 대상 주문이 있습니다</span>
                    <span className="bg-blue-600 text-white text-[11px] font-mono px-2 py-0.5 rounded-full">
                      총 {totalBundleCandidatesCount}건 ({bundleGroups.length}개 수령지)
                    </span>
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    48시간 이내 복수 결제 감지
                  </span>
                </div>
                <p className="text-xs text-blue-800/80 mt-1">
                  동일한 수령인 이름, 연락처, 배송지 주소로 결제된 주문들입니다. 1개 박스로 묶으면 초과 결제된 배송비가 고객 적립금으로 자동 환급됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
              {bundleGroups.length === 1 ? (
                <button
                  type="button"
                  onClick={() => handleOpenBundleModal(bundleGroups[0])}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Boxes className="w-4 h-4" />
                  <span>주문 1개로 합치기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                bundleGroups.map((group, idx) => (
                  <button
                    key={group.id || idx}
                    type="button"
                    onClick={() => handleOpenBundleModal(group)}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs hover:shadow cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title={`${group.recipient}님의 ${group.shipmentIds.length}건 주문을 1개로 합칩니다`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>[{group.recipient}] 주문 1개로 합치기 ({group.shipmentIds.length}건)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="수령인, 주문번호, 운송장번호, 배송지 주소 검색..."
              value={shipmentSearchQuery}
              onChange={(e) => setShipmentSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
          </div>

          {(shipmentSearchQuery || shipmentStatusFilter !== "all" || shipmentCarrierFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setShipmentSearchQuery("");
                setShipmentStatusFilter("all");
                setShipmentCarrierFilter("all");
              }}
              className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
          <span className="text-xs font-bold text-neutral-500 mr-1">진행 상태:</span>
          {[
            { id: "all", label: "전체 상태" },
            { id: "Pending", label: "배송 준비 중" },
            { id: "Partially Shipped", label: "부분배송중" },
            { id: "In Transit", label: "배송 중" },
            { id: "Delivered", label: "배송 완료" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setShipmentStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${shipmentStatusFilter === st.id
                ? "bg-neutral-950 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
                }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integrated Orders & Shipments Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm text-neutral-700 min-w-[1300px]">
            <colgroup>
              <col className="w-[48px]" />
              <col className="w-[220px]" />
              <col className="w-[280px]" />
              <col className="w-[300px]" />
              <col className="w-[180px]" />
              <col className="w-[120px]" />
              <col className="w-[170px]" />
            </colgroup>
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-4 w-[48px] text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                    checked={paginatedShipments.length > 0 && paginatedShipments.every(s => selectedShipmentIds.has(s.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSet = new Set(selectedShipmentIds);
                        paginatedShipments.forEach(s => newSet.add(s.id));
                        setSelectedShipmentIds(newSet);
                      } else {
                        const newSet = new Set(selectedShipmentIds);
                        paginatedShipments.forEach(s => newSet.delete(s.id));
                        setSelectedShipmentIds(newSet);
                      }
                    }}
                  />
                </th>
                <th className="py-3.5 px-4 w-[220px] whitespace-nowrap">주문/배송번호</th>
                <th className="py-3.5 px-4 w-[280px]">수령인 / 배송지 주소</th>
                <th className="py-3.5 px-4 w-[300px]">주문 상품</th>
                <th className="py-3.5 px-4 w-[180px]">택배사 / 운송장 번호</th>
                <th className="py-3.5 px-4 w-[120px] whitespace-nowrap">진행 상태</th>
                <th className="py-3.5 px-4 text-right w-[170px] whitespace-nowrap sticky right-0 bg-neutral-50 shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] z-20">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    검색 조건에 해당되는 주문/배송 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((ship) => (
                  <tr key={ship.id} className="hover:bg-neutral-50/70 transition-colors group">
                    <td className="py-4 px-4 text-center w-[48px]">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                        checked={selectedShipmentIds.has(ship.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedShipmentIds);
                          if (e.target.checked) newSet.add(ship.id);
                          else newSet.delete(ship.id);
                          setSelectedShipmentIds(newSet);
                        }}
                      />
                    </td>
                    <td className="py-4 px-4 align-top w-[220px]">
                      <div>
                        {/* 📦 합배송 대상 감지 배지 or 합배송 완료 표시 */}
                        {(() => {
                          const bundleGroup = shipmentBundleGroupMap.get(ship.id);
                          if (bundleGroup) {
                            return (
                              <div className="mb-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBundleModal(bundleGroup);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 cursor-pointer shadow-2xs transition-all animate-pulse"
                                  title="클릭하여 48시간 이내 동일 주소지 주문들을 1박스로 합배송"
                                >
                                  <Boxes className="w-3 h-3 text-blue-600" />
                                  <span>📦 주문 1개로 합치기 ({bundleGroup.shipmentIds.length}건)</span>
                                </button>
                              </div>
                            );
                          }
                          if (ship.isMergedParent) {
                            return (
                              <div className="mb-1.5 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
                                  <Layers className="w-3 h-3 text-indigo-600" />
                                  <span>📦 통합 1박스 합배송 (대표)</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnbundle(ship);
                                  }}
                                  className="text-[10px] font-bold text-neutral-500 hover:text-rose-600 hover:underline px-1 cursor-pointer"
                                  title="합배송 해제 및 원래 개별 주문으로 분리"
                                >
                                  해제
                                </button>
                              </div>
                            );
                          }
                          if (ship.isMergedChild) {
                            return (
                              <div className="mb-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-100 text-neutral-600 border border-neutral-300">
                                  <span>↳ {ship.mergedIntoOrderId || "대표주문"}에 통합됨</span>
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <p className="font-extrabold text-neutral-950 text-xs font-mono break-all" title={ship.orderId}>
                          {ship.orderId}
                        </p>
                        {ship.id && ship.id !== ship.orderId && (
                          <span className="text-[10px] text-neutral-400 font-mono truncate block max-w-[200px]" title={ship.id}>
                            {ship.id}
                          </span>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                          <span className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
                            주문자
                          </span>
                          <span className="text-xs font-bold text-neutral-950 truncate max-w-[130px]" title={ship.ordererName || (ship as any).customerName || (ship as any).customer || ship.recipient || "고객님"}>
                            {ship.ordererName || (ship as any).customerName || (ship as any).customer || ship.recipient || "고객님"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top w-[280px]">
                      <div>
                        <p className="font-bold text-neutral-950 text-xs flex items-center flex-wrap gap-1">
                          <span>{ship.recipient}</span>
                          <span className="font-normal text-neutral-600 text-[11px] font-mono">
                            ({ship.phone})
                          </span>
                        </p>
                        <div className="text-xs text-neutral-700 mt-1 max-w-[260px] leading-relaxed break-keep">
                          {ship.zipCode && (
                            <span className="font-mono text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded mr-1 font-bold border border-neutral-200 shrink-0">
                              [{ship.zipCode}]
                            </span>
                          )}
                          <span className="font-medium text-neutral-900 break-words" title={`${ship.address || ""} ${ship.detailAddress || ""}`.trim()}>
                            {ship.address || <span className="text-neutral-400 italic">배송지 미입력</span>}
                          </span>
                          {ship.detailAddress && (
                            <span className="text-neutral-500 ml-1 font-normal break-words">
                              {ship.detailAddress}
                            </span>
                          )}
                        </div>
                        {(ship.shippingMemo || (ship as any).deliveryMemo) && (
                          <div className="mt-2 inline-flex items-center gap-1.5 max-w-[260px] bg-blue-50/70 border border-blue-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
                            <span className="inline-flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white border border-blue-600 whitespace-nowrap shrink-0 leading-tight">
                              배송요청
                            </span>
                            <span 
                              className="text-xs text-blue-950 font-bold leading-normal truncate max-w-[190px]"
                              title={ship.shippingMemo || (ship as any).deliveryMemo}
                            >
                              {ship.shippingMemo || (ship as any).deliveryMemo}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top w-[300px]">
                      {ship.packages && ship.packages.length > 1 ? (
                        <div className="space-y-2 w-full max-w-[280px]">
                          {ship.packages.map((pkg: any, pi: number) => {
                            const pkgItems = parseItemLines(pkg.items);
                            return (
                              <div key={pi} className="text-xs bg-blue-50/50 p-2.5 rounded-2xl border border-blue-200/70 space-y-1.5">
                                <div className="flex items-center justify-between pb-1 border-b border-blue-200/50 mb-1">
                                  <span className="font-extrabold text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono">
                                    박스 {pkg.pkgIndex || pi + 1}
                                  </span>
                                  <span className="text-[11px] font-bold text-blue-700 font-mono">
                                    총 {pkg.quantity || pkgItems.reduce((acc, x) => acc + x.qty, 0)}개
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {pkgItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <img
                                        src={getProductThumbnail(item.name)}
                                        alt={item.name}
                                        className="w-8 h-8 rounded-lg object-cover border border-neutral-200/80 shrink-0 bg-white shadow-2xs"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product_1.webp"; }}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2 break-words" title={item.name}>
                                          {item.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          {item.option && (
                                            <span className="text-[10px] font-semibold text-neutral-500 bg-white px-1.5 py-0.2 rounded border border-neutral-200 font-mono">
                                              {item.option}
                                            </span>
                                          )}
                                          <span className="text-blue-700 font-mono text-[11px] font-extrabold">
                                            {item.qty}개
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2 w-full max-w-[280px]">
                          {parseItemLines(ship.items).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 py-0.5">
                              <img
                                src={getProductThumbnail(item.name)}
                                alt={item.name}
                                className="w-9 h-9 rounded-xl object-cover border border-neutral-200/80 shrink-0 bg-neutral-100 shadow-2xs"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product_1.webp"; }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-neutral-950 leading-snug line-clamp-2 break-words" title={item.name}>
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.option && (
                                    <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200 font-mono">
                                      {item.option}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-extrabold text-neutral-800 font-mono">
                                    {item.qty}개
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top w-[180px]">
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block mb-1">{ship.carrier}</span>
                        {/* 분리배송 패키지별 운송장 및 발급 액션 */}
                        {ship.packages && ship.packages.length > 1 ? (
                          <div className="space-y-1.5 min-w-[170px]">
                            {ship.packages.map((pkg: any, pi: number) => {
                              const pIndex = pkg.pkgIndex || pi + 1;
                              const hasTracking = pkg.trackingNumber && pkg.trackingNumber !== "-";
                              return (
                                <div
                                  key={pi}
                                  className="bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-2 shadow-2xs"
                                >
                                  <div>
                                    <span className="text-xs font-extrabold font-mono text-blue-700 block">
                                      박스 {pIndex}
                                    </span>
                                    {hasTracking ? (
                                      <a
                                        href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${pkg.trackingNumber.replace(/[^0-9]/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-mono text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                      >
                                        {pkg.trackingNumber}
                                        <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                      </a>
                                    ) : (
                                      <span className="text-xs font-mono text-neutral-500 font-bold">미발급</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {!hasTracking && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleIssueSinglePackageTracking(ship, pIndex, e)}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                                        title={`박스 ${pIndex} 개별 송장번호 발급`}
                                      >
                                        발급
                                      </button>
                                    )}
                                    {hasTracking && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCjPrintData?.([{
                                            orderId: `${ship.orderId}-${pIndex}`,
                                            recipient: ship.recipient,
                                            phone: ship.phone,
                                            zipCode: ship.zipCode,
                                            address: ship.address,
                                            detailAddress: ship.detailAddress,
                                            items: pkg.items,
                                            shippingMemo: ship.shippingMemo,
                                            trackingNumber: pkg.trackingNumber,
                                            clsfCd: (ship as any).cjClsfCd || "4W44",
                                            subClsfCd: (ship as any).cjSubClsfCd || "-4g",
                                            clldlvempNickNm: (ship as any).cjClldlvempNickNm || "A01-1구역",
                                            clsfAddr: (ship as any).cjClsfAddr || ship.detailAddress || "",
                                            clldlvBranNm: (ship as any).cjClldlvBranNm || "대한통운",
                                            p2pCd: (ship as any).cjP2pCd || "P1",
                                          }]);
                                        }}
                                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                                        title={`박스 ${pIndex} 라벨 단독 인쇄`}
                                      >
                                        <Printer className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : ship.trackingNumber && ship.trackingNumber !== "-" ? (
                          <a
                            href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${ship.trackingNumber.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-blue-600 hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                            title="CJ대한통운 공식 실시간 배송추적 열기"
                          >
                            {ship.trackingNumber}
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleIssueCjLogisticsTracking?.(ship.id)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-2xs cursor-pointer transition-colors inline-flex items-center gap-1 active:scale-95"
                              title="CJ대한통운 송장 신규 발급"
                            >
                              <Barcode className="w-3 h-3" />
                              <span>발급</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditShipment(ship)}
                              className="text-xs font-mono text-neutral-600 hover:text-neutral-950 font-bold bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded-md border border-neutral-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="클릭하여 운송장 번호 직접 입력"
                            >
                              <span>미등록</span>
                              <Pencil className="w-2.5 h-2.5 text-neutral-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top w-[120px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShipment(ship)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-2xs hover:shadow-xs group ${
                          ship.status === "Delivered"
                            ? "bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200"
                            : ship.status === "In Transit"
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                              : ship.status === "Partially Shipped"
                                ? "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                                : "bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                          }`}
                        title="클릭하여 운송장 번호 직접 입력 및 배송 상태 변경"
                      >
                        <span
                          className={`w-2 h-2 rounded-full transition-transform group-hover:scale-125 ${
                            ship.status === "Delivered"
                              ? "bg-neutral-500"
                              : ship.status === "In Transit"
                                ? "bg-blue-500"
                                : ship.status === "Partially Shipped"
                                  ? "bg-blue-600"
                                  : "bg-neutral-400"
                          }`}
                        />
                        <span>
                          {ship.status === "Delivered"
                            ? "배송 완료"
                            : ship.status === "In Transit"
                              ? "배송 중"
                              : ship.status === "Partially Shipped"
                                ? "부분배송중"
                                : "배송 준비 중"}
                        </span>
                        <Pencil className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5 text-current" />
                      </button>
                      {ship.packages && ship.packages.length > 1 && (
                        <span className="block text-[10px] text-blue-600 font-bold mt-0.5">
                          📦 {ship.packages.length}개 박스 분리배송
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-[#f9fafb] transition-colors shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] z-20 w-[170px]">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {/* 1. 주문서 출력 버튼 (툴팁 말풍선 포함) */}
                        <div className="relative group/btn flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenOrderSheet(ship)}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-all cursor-pointer shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
                            aria-label="주문서 인쇄"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {/* 호버 말풍선 */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:flex flex-col items-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
                            <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                              주문서 인쇄
                            </div>
                            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900 -mt-px" />
                          </div>
                        </div>

                        {/* 2. CJ 송장 신규 발급 버튼 (송장 미등록 건 또는 분할배송 중 미발급 박스 포함 건) */}
                        {(!ship.trackingNumber || ship.trackingNumber === "-" || (ship.packages && ship.packages.some((p: any) => !p.trackingNumber || p.trackingNumber === "-"))) && (
                          <div className="relative group/btn flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleIssueCjLogisticsTracking?.(ship.id)}
                              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
                              aria-label="송장 발급"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                            {/* 호버 말풍선 */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:flex flex-col items-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
                              <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                                송장 발급
                              </div>
                              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900 -mt-px" />
                            </div>
                          </div>
                        )}

                        {/* 3. CJ 송장 라벨 단건 인쇄 버튼 (송장 등록된 건) */}
                        {ship.trackingNumber && ship.trackingNumber !== "-" && (
                          <div className="relative group/btn flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCjPrintData?.([{
                                  orderId: ship.orderId,
                                  recipient: ship.recipient,
                                  phone: ship.phone,
                                  zipCode: ship.zipCode,
                                  address: ship.address,
                                  detailAddress: ship.detailAddress,
                                  items: ship.items,
                                  shippingMemo: ship.shippingMemo,
                                  trackingNumber: ship.trackingNumber,
                                  clsfCd: (ship as any).cjClsfCd || (ship as any).clsfCd || (ship.packages?.[0] as any)?.cjClsfCd || (ship.orderId?.includes("REAL") ? "5R67" : "4W44"),
                                  subClsfCd: (ship as any).cjSubClsfCd || (ship as any).subClsfCd || (ship.packages?.[0] as any)?.cjSubClsfCd || (ship.orderId?.includes("REAL") ? "1e" : "-4g"),
                                  clldlvempNickNm: (ship as any).cjClldlvempNickNm || (ship as any).clldlvempNickNm || (ship.packages?.[0] as any)?.cjClldlvempNickNm || (ship.orderId?.includes("REAL") ? "E04-1구역" : "A01-1구역"),
                                  clsfAddr: (ship as any).cjClsfAddr || (ship as any).clsfAddr || (ship.packages?.[0] as any)?.cjClsfAddr || (ship.orderId?.includes("REAL") ? "태평1 31 서울시청" : (ship.detailAddress || "")),
                                  clldlvBranNm: (ship as any).cjClldlvBranNm || (ship as any).clldlvBranNm || (ship.packages?.[0] as any)?.cjClldlvBranNm || (ship.orderId?.includes("REAL") ? "중구무교" : "대한통운"),
                                  p2pCd: (ship as any).cjP2pCd || (ship as any).p2pCd || (ship.packages?.[0] as any)?.cjP2pCd || "P1",
                                }]);
                              }}
                              className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-all cursor-pointer shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
                              aria-label="CJ 송장 출력"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {/* 호버 말풍선 */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:flex flex-col items-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
                              <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                                CJ 송장 출력
                              </div>
                              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900 -mt-px" />
                            </div>
                          </div>
                        )}

                        {/* 3. 배송 분할 (다박스) 버튼 */}
                        <div className="relative group/btn flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSplitModal(ship)}
                            disabled={ship.status === "Delivered"}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs hover:shadow-xs active:scale-95"
                            aria-label="박스 분할 배송"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </button>
                          {/* 호버 말풍선 */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:flex flex-col items-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
                            <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                              박스 분할 배송
                            </div>
                            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900 -mt-px" />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            총 {filteredShipments.length.toLocaleString()}건 중 {filteredShipments.length > 0 ? ((shipmentPage - 1) * SHIPMENTS_PER_PAGE + 1).toLocaleString() : 0} - {Math.min(shipmentPage * SHIPMENTS_PER_PAGE, filteredShipments.length).toLocaleString()}건 표시 중
          </span>
          {totalShipmentPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={shipmentPage === 1}
                onClick={() => setShipmentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                이전
              </button>
              <span className="font-extrabold text-neutral-950 px-2 font-mono">
                {shipmentPage} / {totalShipmentPages} 페이지
              </span>
              <button
                type="button"
                disabled={shipmentPage >= totalShipmentPages}
                onClick={() => setShipmentPage((prev) => Math.min(totalShipmentPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 다중 선택 시 하단에 등장하는 송장 일괄 발급 / 일괄 출력 플로팅 바 ── */}
      {selectedShipmentIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[calc(100%-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-neutral-950/95 text-white border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Selection count & unselect */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <span className="text-neutral-400">선택된 주문:</span>{" "}
                <strong className="text-white text-sm font-extrabold font-mono">{selectedShipmentIds.size}</strong>
                <span className="text-neutral-400 text-xs">건</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShipmentIds(new Set())}
                className="text-[11px] text-neutral-400 hover:text-white underline underline-offset-2 ml-1 cursor-pointer transition-colors"
              >
                선택 해제
              </button>
            </div>

            {/* Right: Batch Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* 선택 건 송장 일괄 발급 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedShipmentIds.size === 0) return;
                  const ids = Array.from(selectedShipmentIds);
                  const unissued = shipmentsList.filter(
                    (s) =>
                      ids.includes(s.id) &&
                      (!s.trackingNumber ||
                        s.trackingNumber === "-" ||
                        s.trackingNumber.trim() === "" ||
                        (s.packages && s.packages.some((p: any) => !p.trackingNumber || p.trackingNumber === "-")))
                  );
                  const alreadyIssued = shipmentsList.filter(
                    (s) =>
                      ids.includes(s.id) &&
                      s.trackingNumber &&
                      s.trackingNumber !== "-" &&
                      s.trackingNumber.trim() !== "" &&
                      (!s.packages || s.packages.every((p: any) => p.trackingNumber && p.trackingNumber !== "-"))
                  );

                  if (unissued.length === 0) {
                    alert(
                      `선택하신 ${ids.length}건의 주문은 이미 송장번호가 모두 정상 발급되어 있습니다.\n\n기존 송장번호가 안전하게 유지되며 재발급되지 않습니다.\n출력이 필요하시면 [선택 건 송장 일괄 출력] 버튼을 눌러주세요.`
                    );
                    return;
                  }

                  const confirmMsg =
                    alreadyIssued.length > 0
                      ? `선택한 ${ids.length}건 중 아직 송장번호가 없거나 일부 박스가 미발급된 ${unissued.length}건에 대해 새 송장번호를 발급하시겠습니까?\n\n(이미 완료된 ${alreadyIssued.length}건은 기존 번호가 그대로 유지됩니다)`
                      : `선택한 ${unissued.length}건의 주문에 대해 새 송장번호를 발급하시겠습니까?`;

                  if (window.confirm(confirmMsg)) {
                    handleIssueCjLogisticsTracking?.(unissued.map((s) => s.id));
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="미발급 주문 건들의 CJ대한통운 송장 번호를 신규 채번합니다 (기발급 건은 안전 유지)"
              >
                <FileText className="w-4 h-4" />
                <span>선택 건 송장 일괄 발급 ({selectedShipmentIds.size})</span>
              </button>

              {/* 선택 건 송장 일괄 출력 */}
              <button
                type="button"
                onClick={handlePrintSelected}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="선택한 주문 건들의 CJ대한통운 표준 운송장 라벨을 일괄 출력합니다"
              >
                <Printer className="w-4 h-4" />
                <span>선택 건 송장 일괄 출력</span>
              </button>

              {/* 선택 건 주문 삭제 */}
              <button
                type="button"
                onClick={async () => {
                  if (selectedShipmentIds.size === 0) return;
                  const ids = Array.from(selectedShipmentIds);
                  if (!window.confirm(`선택한 ${ids.length}건의 주문/배송 데이터를 정말 삭제하시겠습니까?\n\n(삭제 후에는 복구할 수 없습니다)`)) {
                    return;
                  }

                  const updated = shipmentsList.filter((s) => !ids.includes(s.id));
                  setShipmentsList(updated);
                  setSelectedShipmentIds(new Set());

                  if (typeof window !== "undefined") {
                    localStorage.setItem("admin_shipments", JSON.stringify(updated));
                    window.dispatchEvent(new CustomEvent("storage"));
                  }

                  try {
                    await fetch("/api/admin/shipments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updated),
                    });
                  } catch (e) {
                    console.warn("Delete shipments error:", e);
                  }

                  alert(`선택한 ${ids.length}건의 주문이 성공적으로 삭제되었습니다.`);
                }}
                className="bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-rose-500/60"
                title="선택한 주문/배송 건들을 삭제합니다"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>주문 삭제</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShipmentIds(new Set())}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                title="닫기 (선택 해제)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PACKAGE SPLIT MODAL (배송 분할 모달 — 드래그 앤 드롭 & 박스 이동 방식) */}
      {isSplitModalOpen && splitTargetShipment && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-sm">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-neutral-950">배송 분할 (다박스 출고 설정)</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-700">
                      드래그 앤 드롭 지원
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    주문번호: <strong className="text-neutral-800 font-extrabold">{splitTargetShipment.orderId}</strong> | 수령인: {splitTargetShipment.recipient}님
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSplitModalOpen(false);
                  setSplitTargetShipment(null);
                  setSplitQtyDialog(null);
                }}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide banner */}
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 text-xs text-purple-900 flex items-start gap-3">
              <div className="p-1 bg-purple-200 rounded-lg text-purple-800 shrink-0 mt-0.5">
                <Package className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold">
                  상품 카드를 마우스로 <strong>잡아 끌어서(Drag & Drop)</strong> 원하는 박스에 놓거나, 카드 우측의 <strong>이동 버튼</strong>을 클릭해 소속 박스를 변경하세요.
                </p>
                <p className="text-purple-700 text-[11px]">
                  * 수량이 2개 이상인 품목은 부분 수량을 쪼개어 이동할 수 있습니다. 1개 박스로 되돌리려면 [모두 1번 박스로 합치기]를 누르세요.
                </p>
              </div>
            </div>

            {/* 2-Column Split Area: Box 1 vs Box 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ── [ 1번 박스 영역 ] ── */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverBox(1);
                }}
                onDragLeave={() => setDragOverBox(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverBox(null);
                  if (!draggedItemInfo) return;
                  if (draggedItemInfo.sourceBox === 1) return;
                  if (draggedItemInfo.item.qty > 1) {
                    setSplitQtyDialog({
                      isOpen: true,
                      sourceBox: 2,
                      item: draggedItemInfo.item,
                      moveQty: 1,
                    });
                  } else {
                    moveItemBetweenBoxes(2, draggedItemInfo.item, 1);
                  }
                  setDraggedItemInfo(null);
                }}
                className={`rounded-2xl border-2 transition-all p-4 flex flex-col min-h-[340px] ${
                  dragOverBox === 1
                    ? "border-purple-500 bg-purple-50/40 shadow-lg scale-[1.01]"
                    : "border-neutral-200 bg-neutral-50/50"
                }`}
              >
                {/* Box 1 Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h4 className="font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                      📦 1번 박스 <span className="text-xs font-normal text-neutral-500">(기본 패키지)</span>
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                    {box1Items.reduce((acc, i) => acc + i.qty, 0)}개 담김
                  </span>
                </div>

                {/* Box 1 Cards List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                  {box1Items.length === 0 ? (
                    <div className="h-full min-h-[180px] border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-neutral-400">
                      <Package className="w-8 h-8 mb-2 opacity-40 text-neutral-400" />
                      <p className="text-xs font-bold text-neutral-500">1번 박스가 비어 있습니다</p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        상품을 드래그하거나 [← 1번으로 이동] 버튼을 누르세요
                      </p>
                    </div>
                  ) : (
                    box1Items.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemInfo({ sourceBox: 1, item });
                          e.dataTransfer.setData("text/plain", JSON.stringify({ sourceBox: 1, itemId: item.id }));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggedItemInfo(null);
                          setDragOverBox(null);
                        }}
                        className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-purple-300 group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-neutral-300 group-hover:text-purple-500 shrink-0" />
                            <img
                              src={getProductThumbnail(item.name)}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover border border-neutral-200 shrink-0 bg-neutral-100 shadow-2xs"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product_1.webp"; }}
                            />
                            <p className="font-bold text-xs text-neutral-900 leading-snug">{item.name}</p>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 bg-neutral-100 rounded-md text-[11px] font-extrabold text-neutral-700 font-mono border border-neutral-200">
                            {item.qty}개
                          </span>
                        </div>

                        {/* Move Actions */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
                          {item.qty > 1 ? (
                            <div className="flex items-center gap-1.5 w-full justify-between">
                              <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = Math.max(1, (item.selectedQty || 1) - 1);
                                    setBox1Items((prev) =>
                                      prev.map((x) => (x.id === item.id ? { ...x, selectedQty: next } : x))
                                    );
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-neutral-700 font-bold hover:bg-neutral-200 text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-[11px] px-1 text-neutral-800">
                                  {item.selectedQty || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = Math.min(item.qty, (item.selectedQty || 1) + 1);
                                    setBox1Items((prev) =>
                                      prev.map((x) => (x.id === item.id ? { ...x, selectedQty: next } : x))
                                    );
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-neutral-700 font-bold hover:bg-neutral-200 text-xs"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveItemBetweenBoxes(1, item, item.selectedQty || 1)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`${item.selectedQty || 1}개만 2번 박스로 이동`}
                                >
                                  <span>{item.selectedQty || 1}개 이동</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItemBetweenBoxes(1, item, item.qty)}
                                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="전체 2번 박스로 이동"
                                >
                                  전체
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveItemBetweenBoxes(1, item, 1)}
                              className="ml-auto px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>2번 박스로 이동</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── [ 2번 박스 영역 ] ── */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverBox(2);
                }}
                onDragLeave={() => setDragOverBox(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverBox(null);
                  if (!draggedItemInfo) return;
                  if (draggedItemInfo.sourceBox === 2) return;
                  if (draggedItemInfo.item.qty > 1) {
                    setSplitQtyDialog({
                      isOpen: true,
                      sourceBox: 1,
                      item: draggedItemInfo.item,
                      moveQty: 1,
                    });
                  } else {
                    moveItemBetweenBoxes(1, draggedItemInfo.item, 1);
                  }
                  setDraggedItemInfo(null);
                }}
                className={`rounded-2xl border-2 transition-all p-4 flex flex-col min-h-[340px] ${
                  dragOverBox === 2
                    ? "border-purple-500 bg-purple-50/40 shadow-lg scale-[1.01]"
                    : "border-purple-200 bg-purple-50/20"
                }`}
              >
                {/* Box 2 Header */}
                <div className="flex items-center justify-between pb-3 border-b border-purple-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                    <h4 className="font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                      📦 2번 박스 <span className="text-xs font-normal text-purple-700 font-bold">(분리 배송 패키지)</span>
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                    {box2Items.reduce((acc, i) => acc + i.qty, 0)}개 담김
                  </span>
                </div>

                {/* Box 2 Cards List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                  {box2Items.length === 0 ? (
                    <div className="h-full min-h-[180px] border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-purple-400 bg-white/60">
                      <div className="p-3 bg-purple-100/60 rounded-2xl text-purple-600 mb-2">
                        <ArrowRight className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-700">2번 박스로 보낼 상품을 끌어다 놓으세요</p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        카드를 잡고 드래그하거나 [2번 박스로 이동] 버튼을 누르면 새 박스로 분리됩니다.
                      </p>
                    </div>
                  ) : (
                    box2Items.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemInfo({ sourceBox: 2, item });
                          e.dataTransfer.setData("text/plain", JSON.stringify({ sourceBox: 2, itemId: item.id }));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggedItemInfo(null);
                          setDragOverBox(null);
                        }}
                        className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-purple-400 group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-neutral-300 group-hover:text-purple-500 shrink-0" />
                            <img
                              src={getProductThumbnail(item.name)}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover border border-purple-200 shrink-0 bg-white shadow-2xs"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product_1.webp"; }}
                            />
                            <p className="font-bold text-xs text-neutral-900 leading-snug">{item.name}</p>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 bg-purple-100 rounded-md text-[11px] font-extrabold text-purple-800 font-mono border border-purple-200">
                            {item.qty}개
                          </span>
                        </div>

                        {/* Move Actions */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
                          {item.qty > 1 ? (
                            <div className="flex items-center gap-1.5 w-full justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveItemBetweenBoxes(2, item, item.qty)}
                                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="전체 1번 박스로 되돌리기"
                                >
                                  전체
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItemBetweenBoxes(2, item, item.selectedQty || 1)}
                                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`${item.selectedQty || 1}개만 1번 박스로 되돌리기`}
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                  <span>{item.selectedQty || 1}개 복귀</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = Math.max(1, (item.selectedQty || 1) - 1);
                                    setBox2Items((prev) =>
                                      prev.map((x) => (x.id === item.id ? { ...x, selectedQty: next } : x))
                                    );
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-neutral-700 font-bold hover:bg-neutral-200 text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-[11px] px-1 text-neutral-800">
                                  {item.selectedQty || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = Math.min(item.qty, (item.selectedQty || 1) + 1);
                                    setBox2Items((prev) =>
                                      prev.map((x) => (x.id === item.id ? { ...x, selectedQty: next } : x))
                                    );
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-neutral-700 font-bold hover:bg-neutral-200 text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveItemBetweenBoxes(2, item, 1)}
                              className="mr-auto px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              <span>1번 박스로 이동</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleMergeAllToBox1}
                disabled={box2Items.length === 0}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-neutral-500" />
                <span>모두 1번 박스로 합치기 (취합/초기화)</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitModalOpen(false);
                    setSplitTargetShipment(null);
                    setSplitQtyDialog(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSplitPackage}
                  className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                    box2Items.length > 0
                      ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white"
                  }`}
                >
                  <Package className="w-4 h-4 text-white" />
                  <span>
                    {box2Items.length > 0 ? "2개 박스로 배송 분할 확정 저장" : "1개 단일 박스로 통합 저장"}
                  </span>
                </button>
              </div>
            </div>

            {/* ── DRAG & DROP MULTI-QTY SPLIT POPUP DIALOG ── */}
            {splitQtyDialog && splitQtyDialog.isOpen && (
              <div className="fixed inset-0 z-60 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <h5 className="font-extrabold text-sm text-neutral-900 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-purple-600" />
                      <span>수량 분할 이동</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setSplitQtyDialog(null)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-neutral-800 truncate">{splitQtyDialog.item.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      총 보유 수량: <strong className="text-purple-600">{splitQtyDialog.item.qty}개</strong>
                    </p>
                    <p className="text-xs text-neutral-600">
                      {splitQtyDialog.sourceBox === 1 ? "2번 박스" : "1번 박스"}로 몇 개를 이동하시겠습니까?
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200">
                    <button
                      type="button"
                      onClick={() =>
                        setSplitQtyDialog((prev) =>
                          prev ? { ...prev, moveQty: Math.max(1, prev.moveQty - 1) } : null
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-800 font-extrabold hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-extrabold text-lg text-purple-700 min-w-[3rem] text-center">
                      {splitQtyDialog.moveQty}개
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSplitQtyDialog((prev) =>
                          prev ? { ...prev, moveQty: Math.min(prev.item.qty, prev.moveQty + 1) } : null
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-800 font-extrabold hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        moveItemBetweenBoxes(
                          splitQtyDialog.sourceBox,
                          splitQtyDialog.item,
                          splitQtyDialog.item.qty
                        );
                        setSplitQtyDialog(null);
                      }}
                      className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer text-center"
                    >
                      전체({splitQtyDialog.item.qty}개) 이동
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        moveItemBetweenBoxes(
                          splitQtyDialog.sourceBox,
                          splitQtyDialog.item,
                          splitQtyDialog.moveQty
                        );
                        setSplitQtyDialog(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer text-center"
                    >
                      {splitQtyDialog.moveQty}개 이동
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER SHEET MODAL (주문서 / 거래명세서 출력 모달) */}
      {isOrderSheetModalOpen && selectedOrderSheetShipment && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Top Action Bar (화면 전용 컨트롤) */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-neutral-800 rounded-xl">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">주문서 / 거래명세표 출력</h3>
                  <p className="text-xs text-neutral-400 font-mono">주문번호: {selectedOrderSheetShipment.orderId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContent = document.getElementById("printable-order-sheet");
                    if (!printContent) {
                      window.print();
                      return;
                    }

                    // 숨겨진 iframe을 생성하여 주문서 영역만 깨끗하게 단독 인쇄
                    const iframe = document.createElement("iframe");
                    iframe.style.position = "fixed";
                    iframe.style.right = "0";
                    iframe.style.bottom = "0";
                    iframe.style.width = "0";
                    iframe.style.height = "0";
                    iframe.style.border = "0";
                    document.body.appendChild(iframe);

                    const doc = iframe.contentWindow?.document;
                    if (!doc) {
                      window.print();
                      return;
                    }

                    // 현재 페이지의 모든 스타일시트 복사
                    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
                      .map((el) => el.outerHTML)
                      .join("\n");

                    doc.open();
                    doc.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>주문확인서_${selectedOrderSheetShipment.orderId}</title>
                          ${styles}
                          <style>
                            @page {
                              size: A4 portrait;
                              margin: 12mm 15mm;
                            }
                            @font-face {
                              font-family: 'Pretendard';
                              src: url('/font/Pretendard-Regular.otf') format('opentype');
                              font-weight: 400;
                            }
                            @font-face {
                              font-family: 'Pretendard';
                              src: url('/font/Pretendard-Bold.otf') format('opentype');
                              font-weight: 700;
                            }
                            @font-face {
                              font-family: 'Pretendard';
                              src: url('/font/Pretendard-ExtraBold.otf') format('opentype');
                              font-weight: 800;
                            }
                            * {
                              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif !important;
                            }
                            html, body {
                              margin: 0 !important;
                              padding: 0 !important;
                              height: 100% !important;
                              background: white !important;
                              color: #111 !important;
                              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif !important;
                              -webkit-print-color-adjust: exact !important;
                              print-color-adjust: exact !important;
                            }
                            #printable-order-sheet {
                              padding: 0 !important;
                              margin: 0 !important;
                              width: 100% !important;
                              max-width: 100% !important;
                              min-height: calc(297mm - 24mm) !important;
                              display: flex !important;
                              flex-direction: column !important;
                              justify-content: space-between !important;
                              box-sizing: border-box !important;
                            }
                          </style>
                        </head>
                        <body>
                          <div id="printable-order-sheet">
                            ${printContent.innerHTML}
                          </div>
                        </body>
                      </html>
                    `);
                    doc.close();

                    setTimeout(() => {
                      iframe.contentWindow?.focus();
                      iframe.contentWindow?.print();
                      setTimeout(() => {
                        document.body.removeChild(iframe);
                      }, 1000);
                    }, 250);
                  }}
                  className="bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ 인쇄하기 (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOrderSheetModalOpen(false); setSelectedOrderSheetShipment(null); }}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Order Sheet Document Area */}
            <div className="p-6 md:p-8 overflow-y-auto bg-white flex-1 text-neutral-900 flex flex-col justify-between min-h-[750px] print:min-h-[265mm]" id="printable-order-sheet">
              {/* TOP CONTENT WRAPPER */}
              <div className="space-y-4">
                {/* Document Header - Large CHOICOMMA Text in Arial Medium */}
                <div className="border-b-2 border-neutral-950 pb-4">
                  {/* Full-width Large CHOICOMMA Text Header */}
                  <div className="text-center py-2.5 mb-3 border-b border-neutral-200">
                    <span
                      style={{
                        fontFamily: "var(--font-pretendard), 'Pretendard', sans-serif",
                        fontWeight: 800,
                        letterSpacing: "0.22em",
                      }}
                      className="block text-4xl sm:text-5xl uppercase text-neutral-950 leading-none"
                    >
                      CHOICOMMA
                    </span>
                    <p className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase mt-1.5 font-mono">
                      PREMIUM SIGNATURE COLLECTION
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-neutral-500">주문번호:</span>
                      <span className="font-mono font-black text-neutral-950 text-base">{selectedOrderSheetShipment.orderId}</span>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg sm:text-xl font-black text-neutral-950 tracking-tight border-b-2 border-neutral-950 pb-0.5 inline-block">
                        주 문 확 인 서
                      </h2>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                        (ORDER CONFIRMATION & PACKING LIST)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer & Shipping Information */}
                <div className="border border-neutral-300 rounded-2xl p-4 bg-neutral-50/60 text-xs shadow-2xs">
                  <h4 className="font-black text-neutral-950 border-b border-neutral-200 pb-1.5 mb-2.5 flex items-center justify-between text-xs">
                    <span>주문자 / 받는 분 정보 (Buyer & Shipping Information)</span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                      {selectedOrderSheetShipment.status === "Delivered" ? "배송완료" : selectedOrderSheetShipment.status === "In Transit" ? "배송중" : selectedOrderSheetShipment.status === "Partially Shipped" ? "부분배송중" : "배송준비"}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                    <p>
                      <strong className="text-neutral-600">받는분 성명:</strong>{" "}
                      <strong className="text-neutral-950 font-extrabold text-sm">{selectedOrderSheetShipment.recipient}</strong> 고객님
                      {matchedCustomerForSheet && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          👑 {matchedCustomerForSheet.grade || "일반"} 회원 ({matchedCustomerForSheet.id})
                        </span>
                      )}
                    </p>
                    <p><strong className="text-neutral-600">연락처:</strong> <span className="font-mono font-bold text-neutral-900">{selectedOrderSheetShipment.phone || "010-0000-0000"}</span> {selectedOrderSheetShipment.altPhone ? `(비상: ${selectedOrderSheetShipment.altPhone})` : ""}</p>
                    <p className="sm:col-span-2">
                      <strong className="text-neutral-600">배송지 주소:</strong>{" "}
                      <span className="text-neutral-900 font-semibold">
                        {selectedOrderSheetShipment.zipCode ? `[${selectedOrderSheetShipment.zipCode}] ` : ""}
                        {selectedOrderSheetShipment.address || "배송지 정보 없음"}
                        {selectedOrderSheetShipment.detailAddress ? ` ${selectedOrderSheetShipment.detailAddress}` : ""}
                      </span>
                    </p>
                    <p className="sm:col-span-2"><strong className="text-neutral-600">배송 요청사항:</strong> <span className="text-neutral-900">{selectedOrderSheetShipment.shippingMemo || "부재시 문앞에 놓아주세요."}</span></p>
                    {matchedCustomerForSheet?.address && matchedCustomerForSheet.address !== "-" && (
                      <div className="sm:col-span-2 mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px]">
                          <span className="font-bold text-amber-800">💡 회원 정보 관리 등록 최신 주소:</span>{" "}
                          <span className="font-medium">
                            {matchedCustomerForSheet.postcode ? `[${matchedCustomerForSheet.postcode}] ` : ""}
                            {matchedCustomerForSheet.address}
                            {matchedCustomerForSheet.detailAddress ? ` ${matchedCustomerForSheet.detailAddress}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            let newZip = selectedOrderSheetShipment.zipCode;
                            let newAddr = matchedCustomerForSheet.address;
                            let newDetail = selectedOrderSheetShipment.detailAddress;
                            if (matchedCustomerForSheet.postcode) {
                              newZip = matchedCustomerForSheet.postcode;
                            }
                            if (matchedCustomerForSheet.detailAddress) {
                              newDetail = matchedCustomerForSheet.detailAddress;
                            }
                            // If address starts with [01234] extract zip
                            const zipMatch = newAddr.match(/^\[(\d{5})\]\s*(.*)$/);
                            if (zipMatch) {
                              newZip = zipMatch[1];
                              newAddr = zipMatch[2];
                            }

                            const updated = shipmentsList.map((s) =>
                              s.id === selectedOrderSheetShipment.id
                                ? { ...s, address: newAddr, zipCode: newZip, detailAddress: newDetail }
                                : s
                            );
                            setShipmentsList(updated);
                            setSelectedOrderSheetShipment((prev: any) => ({
                              ...prev,
                              address: newAddr,
                              zipCode: newZip,
                              detailAddress: newDetail,
                            }));
                            if (typeof window !== "undefined") {
                              localStorage.setItem("admin_shipments", JSON.stringify(updated));
                              window.dispatchEvent(new CustomEvent("storage"));
                            }
                            alert("회원 정보 관리의 최신 배송지(우편번호, 기본주소, 상세주소)가 주문서에 성공적으로 반영되었습니다.");
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-extrabold shrink-0 shadow-xs transition-colors cursor-pointer"
                        >
                          최신 주소로 주문서 반영
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping & Box Status (출고 및 택배 배송 현황) */}
                <div className="border border-neutral-300 rounded-2xl p-4 bg-white text-xs shadow-2xs">
                  <h4 className="font-black text-neutral-950 mb-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-purple-600" />
                      <span>출고 및 택배 배송 현황</span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {(selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 1)
                        ? `총 ${selectedOrderSheetShipment.packages.length}개 분할 박스 출고`
                        : "단일 1박스 출고"}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {(selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 0
                      ? selectedOrderSheetShipment.packages
                      : [{
                          pkgIndex: 1,
                          items: selectedOrderSheetShipment.items,
                          quantity: selectedOrderSheetShipment.quantity || 1,
                          carrier: selectedOrderSheetShipment.carrier || "CJ대한통운",
                          trackingNumber: selectedOrderSheetShipment.trackingNumber || "-",
                          status: selectedOrderSheetShipment.status,
                        }]
                    ).map((pkg: any, idx: number) => {
                      const boxNum = pkg.pkgIndex || idx + 1;
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200 gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white font-black text-xs font-mono shrink-0 shadow-2xs">
                              박스 {boxNum}번
                            </span>
                            <span className="font-bold text-neutral-900 text-xs sm:text-sm">{pkg.items}</span>
                          </div>
                          <div className="flex items-center gap-3 text-right shrink-0 text-xs sm:text-sm">
                            <span className="font-bold text-neutral-600">{pkg.carrier || "CJ대한통운"}</span>
                            <span className="font-mono font-bold text-neutral-950">
                              {pkg.trackingNumber && pkg.trackingNumber !== "-" ? pkg.trackingNumber : "순차 발송"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items Table with Product Thumbnails */}
                <div className="overflow-hidden rounded-2xl border border-neutral-300 text-xs shadow-2xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-white font-bold text-xs">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">No.</th>
                        <th className="py-3 px-4">주문 상품명 / 옵션</th>
                        <th className="py-3 px-3.5 text-center w-16">수량</th>
                        <th className="py-3 px-3.5 text-center w-24">배송 구분</th>
                        <th className="py-3 px-3.5 text-right w-20">검수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {String(selectedOrderSheetShipment.items || "")
                        .split(/,\s*/)
                        .filter((t) => t.trim())
                        .map((itemToken, i) => {
                          const qtyMatch = itemToken.match(/(\d+)\s*개/) || itemToken.match(/x\s*(\d+)/i);
                          const qty = qtyMatch ? qtyMatch[1] : "1";
                          const cleanName = itemToken.replace(/\s*\d+\s*개$/, "").replace(/\s*x\s*\d+$/i, "").trim();

                          // 상품별 맞춤 썸네일 이미지 매핑
                          const getThumb = (name: string) => {
                            const n = name.toLowerCase();
                            if (n.includes("재킷") || n.includes("자켓") || n.includes("jacket")) return "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("블라우스") || n.includes("blouse")) return "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("셔츠") || n.includes("shirt")) return "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("슬랙스") || n.includes("팬츠") || n.includes("바지") || n.includes("slacks")) return "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("스커트") || n.includes("skirt")) return "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("원피스") || n.includes("드레스") || n.includes("dress")) return "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("코트") || n.includes("coat")) return "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("니트") || n.includes("knit") || n.includes("스웨터")) return "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=160&auto=format&fit=crop&q=80";
                            if (n.includes("스카프") || n.includes("머플러") || n.includes("벨트")) return "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=160&auto=format&fit=crop&q=80";
                            return "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=160&auto=format&fit=crop&q=80";
                          };

                          const thumbUrl = getThumb(cleanName || itemToken);

                          // 어떤 박스에 포함되어 있는지 확인
                          let assignedBoxText = "기본출고";
                          if (selectedOrderSheetShipment.packages && selectedOrderSheetShipment.packages.length > 1) {
                            const matchedPkg = selectedOrderSheetShipment.packages.find((p: any) =>
                              String(p.items || "").includes(cleanName) || cleanName.includes(String(p.items || ""))
                            );
                            if (matchedPkg) {
                              assignedBoxText = `박스 ${matchedPkg.pkgIndex}번`;
                            } else {
                              assignedBoxText = "분리출고";
                            }
                          }

                          return (
                            <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="py-3 px-3.5 text-center font-mono text-neutral-500 font-bold">{i + 1}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 shadow-2xs">
                                    <img
                                      src={thumbUrl}
                                      alt={cleanName}
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-neutral-950 text-xs sm:text-sm leading-tight">{cleanName || itemToken}</p>
                                    <span className="text-[10px] text-neutral-500 font-mono">단품코드: CHOI-ITEM-{String(i + 1).padStart(3, "0")}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-bold text-neutral-950 text-sm">{qty}개</td>
                              <td className="py-3 px-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${assignedBoxText.includes("박스") ? "bg-purple-100 text-purple-800" : "bg-neutral-100 text-neutral-700"}`}>
                                  {assignedBoxText}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <span className="inline-block w-4 h-4 border border-neutral-400 rounded-xs"></span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM FOOTER SECTION */}
              <div className="pt-4 mt-2">
                {/* Notice & Footer */}
                <div className="border-t border-neutral-200 pt-3 text-[10px] text-neutral-500 space-y-1">
                  <p>• 초이콤마(choicomma)를 이용해 주셔서 진심으로 감사드립니다.</p>
                  <p>• 상품 수령 후 7일 이내 교환/반품 접수가 가능하며, 포장 개봉 및 상품 훼손 시 교환/반품이 제한될 수 있습니다.</p>
                  <p>• 분리배송(다박스) 건의 경우 부피 또는 물류 상황에 따라 박스별 배송 도착 시간에 차이가 발생할 수 있습니다.</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-neutral-500">💡 [🖨️ 인쇄하기] 버튼을 누르면 인쇄 미리보기 창이 열립니다.</span>
              <button
                type="button"
                onClick={() => { setIsOrderSheetModalOpen(false); setSelectedOrderSheetShipment(null); }}
                className="px-5 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Isolation for Order Sheet */}
      {isOrderSheetModalOpen && (
        <style jsx global>{`
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          @media print {
            html, body {
              background: white !important;
              height: 100% !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-order-sheet,
            #printable-order-sheet * {
              visibility: visible !important;
            }
            #printable-order-sheet {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              overflow: visible !important;
            }
          }
        `}</style>
      )}

      {/* CJ대한통운 송장 라벨 인쇄 모달 */}
      {cjPrintData && (
        <CjLabelPrint data={cjPrintData} onClose={() => setCjPrintData?.(null)} />
      )}

      {/* 📦 동일 고객/주소지 합배송 확정 모달 */}
      {isBundleModalOpen && activeBundleGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-950 flex items-center gap-2">
                    <span>주문 합배송 (1박스 포장 묶음)</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                      {activeBundleGroup.orders.length}건 묶음
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    동일 수령지 {activeBundleGroup.timeDiffText} 감지 • 1박스로 묶어 발송합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBundleModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* 수령지 & 고객 정보 */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between text-neutral-500 font-bold text-[11px]">
                  <span>배송지 정보</span>
                  {activeBundleGroup.matchedCustomer && (
                    <span className="text-blue-600 font-bold">
                      회원 연동 완료 ({activeBundleGroup.matchedCustomer.grade || "회원"})
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-neutral-950 flex items-center gap-2">
                    <span>{activeBundleGroup.recipient}</span>
                    <span className="text-xs text-neutral-600 font-mono font-medium">
                      ({activeBundleGroup.phone})
                    </span>
                  </p>
                  <p className="text-neutral-700 leading-relaxed font-medium">
                    {activeBundleGroup.zipCode && `[${activeBundleGroup.zipCode}] `}
                    {activeBundleGroup.address} {activeBundleGroup.detailAddress || ""}
                  </p>
                </div>
              </div>

              {/* 합배송 대상 개별 주문 내역 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-neutral-900 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>합포장 대상 주문 목록 ({activeBundleGroup.orders.length}개 주문)</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    총 상품 {activeBundleGroup.totalItemsCount}개
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeBundleGroup.orders.map((ord: any, idx: number) => (
                    <div
                      key={ord.id}
                      className="flex items-start justify-between bg-white border border-neutral-200 rounded-2xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold font-mono text-xs text-neutral-950">
                            {ord.orderId}
                          </span>
                          {idx === 0 && (
                            <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                              대표 송장 기준
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {ord.orderDate || ord.created_at?.slice(0, 10) || "최근 결제"}
                          </span>
                        </div>
                        <p className="text-neutral-800 font-semibold text-xs truncate">
                          {ord.items}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-extrabold text-xs text-blue-700 block">
                          수량 {ord.quantity || 1}개
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          배송비 ₩3,000 부과됨
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 💰 초과 배송비 자동 계산 및 적립금 환급 안내 카드 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>초과 부과된 배송비 자동 환급</span>
                  </span>
                  <span className="font-mono font-black text-sm text-amber-900">
                    + ₩{activeBundleGroup.refundableShippingFee.toLocaleString()}원
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  고객이 {activeBundleGroup.orders.length}개 주문을 따로 결제하여 중복 부과된 배송비{" "}
                  <strong>₩{activeBundleGroup.refundableShippingFee.toLocaleString()}원</strong>이{" "}
                  합배송 확정 즉시 고객 <strong>{activeBundleGroup.recipient}</strong>님의 회원 적립금으로 자동 지급 환급됩니다.
                </p>
              </div>

              {/* 안내 문구 */}
              <div className="text-[11px] text-neutral-400 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 leading-relaxed">
                ℹ️ <strong>합배송 확정 시</strong>: {activeBundleGroup.orders[0]?.orderId}번 주문으로 모든 상품 품목이 1개 박스 라벨로 통합되며, CJ대한통운 송장 출력 시 단 1장의 송장 라벨이 인쇄됩니다.
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBundleModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-bold hover:bg-neutral-100 transition-colors cursor-pointer text-xs"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleConfirmBundle}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md shadow-blue-200 transition-all cursor-pointer text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Boxes className="w-4 h-4" />
                <span>합배송 확정 및 1박스로 묶기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
