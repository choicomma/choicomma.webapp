import { getProductThumbnail } from "@/lib/products/thumbnail-helper";
import productsCache from "@/data/products-cache.json";

export interface ExplodedExchangeItem {
  id: string;
  uniqueSelectId: string;
  orderId: string;
  orderNumber: string;
  originalOrderId?: string;
  items: string; // 단일 상품명 (표시용 e.g. "오버핏 울 코트 (블랙 / L)")
  itemName: string; // 상품명 순수 텍스트
  itemOption?: string;
  quantity: number;
  image?: string;
  amount?: string;
  recipient?: string;
  phone?: string;
  address?: string;
  detailAddress?: string;
  zipCode?: string;
  trackingNumber?: string;
  status?: string;
  orderDate?: string;
  deliveredDate?: string;
  deliveredDateStr?: string;
  daysAgo?: number;
  daysLeft?: number;
  availableSizes?: string[];
  availableColors?: string[];
  colorImageMap?: Record<string, string>;
  colorHexMap?: Record<string, string>;
  currentSize?: string;
  currentColor?: string;
}

export interface ProductExchangeOptions {
  matchedTitle: string;
  currentSize: string;
  currentColor: string;
  sizes: string[];
  colors: string[];
  colorImageMap: Record<string, string>;
  colorHexMap: Record<string, string>;
  hasOptions: boolean;
}

// 옵션 값에서 객체([object Object]) 방지 및 안전한 문자열 추출 헬퍼
const cleanOptString = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object") {
    const candidate = val.name || val.value || val.title || val.label || val.id || "";
    if (typeof candidate === "string" && candidate && !candidate.includes("[object")) {
      return candidate.trim();
    }
    return "";
  }
  const s = String(val).trim();
  if (s.includes("[object") || s === "undefined" || s === "null") return "";
  return s;
};

// 색상/타입 이름 유효성 검사 (구매 수량 등 불필요한 단어 배제)
const isValidColorToken = (str: string): boolean => {
  if (!str || str.length > 25) return false;
  if (/^\d+\s*개/.test(str)) return false;
  if (/^3개이상|^1개|^6개구매|^3~5개구매/.test(str)) return false;
  if (str.includes("구매") || str.includes("단품") || str.includes("세트")) return false;
  return true;
};

/**
 * 주문 상품명 또는 옵션 텍스트로부터 쇼핑몰 상품의 선택 가능 사이즈 및 색상 옵션을 연동 추출하는 함수
 */
export function resolveProductExchangeOptions(rawText?: string, rawOption?: string): ProductExchangeOptions {
  if (!rawText && !rawOption) {
    return {
      matchedTitle: "",
      currentSize: "",
      currentColor: "",
      sizes: [],
      colors: [],
      colorImageMap: {},
      colorHexMap: {},
      hasOptions: false,
    };
  }

  const combined = `${rawText || ""} ${rawOption || ""}`.trim();
  if (!combined || combined === "교환 요청 상품" || combined === "직접입력주문") {
    return {
      matchedTitle: "",
      currentSize: "",
      currentColor: "",
      sizes: [],
      colors: [],
      colorImageMap: {},
      colorHexMap: {},
      hasOptions: false,
    };
  }

  // 1. 현재 주문된 사이즈 추출
  let currentSize = "";
  const sizeMatch =
    combined.match(/사이즈\s*[:：]?\s*([0-9a-zA-Z가-힣()-_/]+)/i) ||
    combined.match(/\((FREE|\d\([^)]+\)|[SMLXL]+)\)/i);
  if (sizeMatch) currentSize = sizeMatch[1].trim().replace(/_+$/, "");

  // 2. 현재 주문된 색상/타입 추출
  let currentColor = "";
  const colorMatch =
    combined.match(/\/\s*([가-힣a-zA-Z0-9]+타입|[가-힣a-zA-Z]+)/) ||
    combined.match(/색상\s*[:：]?\s*([가-힣a-zA-Z0-9]+)/i);
  if (colorMatch) currentColor = colorMatch[1].trim();

  // 3. 순수 상품명 정제
  const cleanName = String(rawText || "")
    .replace(/\(.*?\)/g, "")
    .replace(/x\s*\d+$/i, "")
    .replace(/\/\s*.*$/, "")
    .trim();

  const productsList = Array.isArray(productsCache) ? (productsCache as any[]) : [];

  // 4. productsCache에서 상품 매칭
  let matched = productsList.find((p: any) => (p.title || p.name) === cleanName);
  if (!matched) {
    matched = productsList.find(
      (p: any) => cleanName.includes(p.title || p.name) || (p.title || p.name).includes(cleanName)
    );
  }
  if (!matched) {
    const baseCore = cleanName.replace(/\[.*?\]/g, "").trim();
    if (baseCore.length >= 2) {
      matched = productsList.find((p: any) => (p.title || p.name).includes(baseCore));
    }
  }

  // 5. 동일 기본 상품의 형제 옵션(타입/색상) 상품까지 포함하여 사이즈 및 색상 옵션 수집
  const baseTitle = matched
    ? (matched.title || matched.name).replace(/\s*\/\s*.*$/, "").trim()
    : cleanName;
  const siblings = matched
    ? productsList.filter((p: any) => (p.title || p.name).startsWith(baseTitle))
    : [];

  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();
  const colorImageMap: Record<string, string> = {};
  const colorHexMap: Record<string, string> = {};

  // 기본 상품의 colorImages & colorHexMap 수집
  if (matched) {
    if (matched.colorImages && typeof matched.colorImages === "object") {
      Object.entries(matched.colorImages).forEach(([c, img]) => {
        const colStr = cleanOptString(c);
        if (colStr && img && isValidColorToken(colStr)) {
          colorImageMap[colStr] = String(img);
        }
      });
    }
    if (matched.colorHexMap && typeof matched.colorHexMap === "object") {
      Object.entries(matched.colorHexMap).forEach(([c, hex]) => {
        const colStr = cleanOptString(c);
        if (colStr && hex) colorHexMap[colStr] = String(hex);
      });
    }

    (matched.sizes || []).forEach((s: any) => {
      const szStr = cleanOptString(s);
      if (szStr) sizesSet.add(szStr);
    });
    (matched.colors || []).forEach((c: any) => {
      const colStr = cleanOptString(c);
      if (colStr && isValidColorToken(colStr)) colorsSet.add(colStr);
    });
  }

  // 형제 상품들로부터 옵션 및 썸네일 수집
  siblings.forEach((s: any) => {
    const sImg = s.featuredImage?.url || s.image || (Array.isArray(s.images) && s.images[0]?.url) || "";
    (s.sizes || []).forEach((sz: any) => {
      const szStr = cleanOptString(sz);
      if (szStr) sizesSet.add(szStr);
    });

    const subColor = cleanOptString((s.title || s.name).split("/")[1]);
    if (subColor && isValidColorToken(subColor)) {
      colorsSet.add(subColor);
      if (sImg && !colorImageMap[subColor]) colorImageMap[subColor] = sImg;
    }

    (s.colors || []).forEach((c: any) => {
      const colStr = cleanOptString(c);
      if (colStr && isValidColorToken(colStr)) {
        colorsSet.add(colStr);
        if (sImg && !colorImageMap[colStr]) colorImageMap[colStr] = sImg;
      }
    });

    if (s.colorImages && typeof s.colorImages === "object") {
      Object.entries(s.colorImages).forEach(([c, img]) => {
        const colStr = cleanOptString(c);
        if (colStr && img && isValidColorToken(colStr) && !colorImageMap[colStr]) {
          colorImageMap[colStr] = String(img);
        }
      });
    }
  });

  // 6. 만약 상품 옵션에 명시된 options 배열이 있는 경우 추가 수집
  if (matched && Array.isArray(matched.options)) {
    matched.options.forEach((opt: any) => {
      const optName = String(opt.name || opt.id || "").toLowerCase();
      if (optName.includes("size") || optName.includes("사이즈")) {
        (opt.values || []).forEach((v: any) => {
          const szStr = cleanOptString(v);
          if (szStr) sizesSet.add(szStr);
        });
      }
      if (optName.includes("color") || optName.includes("색상") || optName.includes("컬러") || optName.includes("type") || optName.includes("타입")) {
        (opt.values || []).forEach((v: any) => {
          const colStr = cleanOptString(v);
          if (colStr && isValidColorToken(colStr)) colorsSet.add(colStr);
        });
      }
    });
  }

  let sizes = Array.from(sizesSet);
  if (sizes.length === 0 && matched) {
    sizes = ["FREE", "1(44-55)", "2(66-77)", "S", "M", "L"];
  }
  let colors = Array.from(colorsSet);

  // 썸네일 폴백 보완: 등록된 상품 이미지 배열에서 순서대로 매핑
  const matchedImages = Array.isArray(matched?.images)
    ? matched.images.map((im: any) => (typeof im === "string" ? im : im?.url)).filter(Boolean)
    : [];
  const defaultFallbackImg = matched?.featuredImage?.url || matched?.image || matchedImages[0] || "/product_1.webp";

  colors.forEach((col, idx) => {
    if (!colorImageMap[col]) {
      if (matchedImages[idx]) {
        colorImageMap[col] = matchedImages[idx];
      } else {
        colorImageMap[col] = defaultFallbackImg;
      }
    }
  });

  return {
    matchedTitle: matched ? matched.title || matched.name : cleanName,
    currentSize,
    currentColor,
    sizes,
    colors,
    colorImageMap,
    colorHexMap,
    hasOptions: Boolean(matched && (sizes.length > 0 || colors.length > 0)),
  };
}

export interface ExchangeEligibility {
  isEligible: boolean;
  isDelivered: boolean;
  deliveredDate: Date | null;
  deliveredDateStr: string;
  diffDays: number;
  daysLeft: number;
  reason: string;
}

/**
 * 배송 완료일 파싱 헬퍼 (delivered_at, deliveredDate, shippedDate, orderDate 등 다양한 포맷 지원)
 */
export function parseDeliveryDate(s: any): Date | null {
  if (!s) return null;
  const raw = s.delivered_at || s.deliveredDate || s.deliveryDate || s.deliveredDateStr;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    const match = String(raw).match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (match) {
      const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  const fallback = s.shippedDate || s.orderDate || s.created_at;
  if (fallback) {
    const d = new Date(fallback);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * 배송완료 후 N일(기본 14일 / 2주) 이내 교환 접수 자격 계산 헬퍼
 */
export function checkExchangeEligibility(
  s: any,
  maxDays: number = 14,
  now: Date = new Date()
): ExchangeEligibility {
  if (!s) {
    return {
      isEligible: false,
      isDelivered: false,
      deliveredDate: null,
      deliveredDateStr: "",
      diffDays: -1,
      daysLeft: 0,
      reason: "주문 정보가 없습니다.",
    };
  }

  const normStatus = String(s.status || s.shippingStatus || "").toLowerCase().trim();
  const isDelivered = normStatus === "delivered" || normStatus === "배송완료";

  if (!isDelivered) {
    return {
      isEligible: false,
      isDelivered: false,
      deliveredDate: null,
      deliveredDateStr: "",
      diffDays: -1,
      daysLeft: 0,
      reason: "배송완료 상태의 주문건만 교환 신청이 가능합니다.",
    };
  }

  const delDate = parseDeliveryDate(s);
  if (!delDate) {
    return {
      isEligible: false,
      isDelivered: true,
      deliveredDate: null,
      deliveredDateStr: "",
      diffDays: -1,
      daysLeft: 0,
      reason: "배송 완료일 정보를 확인할 수 없습니다.",
    };
  }

  const diffMs = now.getTime() - delDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isWithinWindow = diffDays >= 0 && diffDays <= maxDays;
  const daysLeft = Math.max(0, maxDays - diffDays);

  const Y = delDate.getFullYear();
  const M = String(delDate.getMonth() + 1).padStart(2, "0");
  const D = String(delDate.getDate()).padStart(2, "0");
  const deliveredDateStr = `${Y}.${M}.${D}`;

  return {
    isEligible: isWithinWindow,
    isDelivered: true,
    deliveredDate: delDate,
    deliveredDateStr,
    diffDays,
    daysLeft,
    reason: isWithinWindow
      ? `교환 가능 (D-${daysLeft}일 남음)`
      : `배송완료 후 ${maxDays}일(2주) 초과 (${diffDays}일 경과)`,
  };
}

/**
 * 복수 상품이 포함된 주문들을 "단일 제품 1개 단위"로 분해(explode)하여 리스트업하는 헬퍼 함수
 * - 주문에 3개 상품이 들어있는 경우 3개의 개별 제품 카드로 낱개 분리됩니다.
 */
export function explodeOrderToSingleItems(orders: any[]): ExplodedExchangeItem[] {
  const result: ExplodedExchangeItem[] = [];

  orders.forEach((ord, ordIdx) => {
    const rawItems = ord.items;
    const baseOrderId = ord.orderId || ord.orderNumber || ord.id || `ORD-${ordIdx}`;

    // 배송일 정보 보완
    const delInfo = checkExchangeEligibility(ord);
    const delDateStr = ord.deliveredDateStr || (delInfo.isDelivered ? delInfo.deliveredDateStr : undefined);
    const daysAgo = ord.daysAgo !== undefined ? ord.daysAgo : (delInfo.diffDays >= 0 ? delInfo.diffDays : undefined);
    const daysLeft = ord.daysLeft !== undefined ? ord.daysLeft : (delInfo.isEligible ? delInfo.daysLeft : undefined);

    // 1. Array 형태의 상품 목록
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((item: any, iIdx: number) => {
        const itemName = typeof item === "string" ? item : (item.name || item.title || "주문 상품");
        const itemOption = typeof item === "object" ? (item.option || item.selectedOption || "") : "";
        const itemQty = typeof item === "object" ? (item.quantity || item.qty || 1) : 1;
        const itemImage = (typeof item === "object" && item.image) ? item.image : (ord.image || getProductThumbnail(itemName, undefined, itemOption));
        const itemPrice = typeof item === "object" && item.price ? `${Number(item.price).toLocaleString()}원` : (ord.amount || "");

        const displayLabel = itemOption ? `${itemName} (${itemOption})` : itemName;

        const optInfo = resolveProductExchangeOptions(itemName, itemOption);

        result.push({
          id: `${ord.id || baseOrderId}-item-${iIdx}`,
          uniqueSelectId: `${baseOrderId}-item-${iIdx}`,
          orderId: baseOrderId,
          orderNumber: baseOrderId,
          originalOrderId: ord.originalOrderId || baseOrderId,
          items: displayLabel,
          itemName: itemName,
          itemOption: itemOption,
          quantity: itemQty,
          image: itemImage,
          amount: itemPrice,
          recipient: ord.recipient || ord.customerName,
          phone: ord.phone || ord.customerPhone,
          address: ord.address,
          detailAddress: ord.detailAddress,
          zipCode: ord.zipCode,
          trackingNumber: ord.trackingNumber || "-",
          status: ord.status,
          orderDate: ord.orderDate || ord.created_at,
          deliveredDate: ord.deliveredDate || ord.delivered_at,
          deliveredDateStr: delDateStr,
          daysAgo: daysAgo,
          daysLeft: daysLeft,
          availableSizes: optInfo.sizes,
          availableColors: optInfo.colors,
          colorImageMap: optInfo.colorImageMap,
          colorHexMap: optInfo.colorHexMap,
          currentSize: optInfo.currentSize,
          currentColor: optInfo.currentColor,
        });
      });
      return;
    }

    // 2. 문자열 형태의 상품 목록 (콤마 분리 파싱: "오버핏 울 코트 (1개), 테이퍼드 슬랙스 (2개)")
    if (typeof rawItems === "string" && rawItems.trim()) {
      const parts = rawItems.split(/,\s*/);
      if (parts.length > 1) {
        parts.forEach((part: string, pIdx: number) => {
          const trimmed = part.trim();
          if (!trimmed) return;

          // "오버핏 울 코트 (1개)" 또는 "오버핏 울 코트"
          const match = trimmed.match(/^(.*?)(?:\s*\(([0-9]+)개\))?$/);
          const itemName = match ? match[1].trim() : trimmed;
          const itemQty = match && match[2] ? parseInt(match[2], 10) : 1;
          const optInfo = resolveProductExchangeOptions(itemName, trimmed);

          result.push({
            id: `${ord.id || baseOrderId}-item-${pIdx}`,
            uniqueSelectId: `${baseOrderId}-item-${pIdx}`,
            orderId: baseOrderId,
            orderNumber: baseOrderId,
            originalOrderId: ord.originalOrderId || baseOrderId,
            items: trimmed,
            itemName: itemName,
            quantity: itemQty,
            image: getProductThumbnail(itemName, ord.image, trimmed),
            amount: ord.amount || "",
            recipient: ord.recipient || ord.customerName,
            phone: ord.phone || ord.customerPhone,
            address: ord.address,
            detailAddress: ord.detailAddress,
            zipCode: ord.zipCode,
            trackingNumber: ord.trackingNumber || "-",
            status: ord.status,
            orderDate: ord.orderDate || ord.created_at,
            deliveredDate: ord.deliveredDate || ord.delivered_at,
            deliveredDateStr: delDateStr,
            daysAgo: daysAgo,
            daysLeft: daysLeft,
            availableSizes: optInfo.sizes,
            availableColors: optInfo.colors,
            colorImageMap: optInfo.colorImageMap,
            colorHexMap: optInfo.colorHexMap,
            currentSize: optInfo.currentSize,
            currentColor: optInfo.currentColor,
          });
        });
        return;
      }
    }

    // 3. 단일 상품 건
    const singleName = typeof rawItems === "string" ? rawItems : "주문 상품";
    const optInfo = resolveProductExchangeOptions(singleName, (ord as any).option || "");
    result.push({
      id: `${ord.id || baseOrderId}-item-0`,
      uniqueSelectId: `${baseOrderId}-item-0`,
      orderId: baseOrderId,
      orderNumber: baseOrderId,
      originalOrderId: ord.originalOrderId || baseOrderId,
      items: singleName,
      itemName: singleName,
      quantity: ord.quantity || 1,
      image: getProductThumbnail(singleName, ord.image, typeof (ord as any).option === "string" ? (ord as any).option : undefined),
      amount: ord.amount || "",
      recipient: ord.recipient || ord.customerName,
      phone: ord.phone || ord.customerPhone,
      address: ord.address,
      detailAddress: ord.detailAddress,
      zipCode: ord.zipCode,
      trackingNumber: ord.trackingNumber || "-",
      status: ord.status,
      orderDate: ord.orderDate || ord.created_at,
      deliveredDate: ord.deliveredDate || ord.delivered_at,
      deliveredDateStr: delDateStr,
      daysAgo: daysAgo,
      daysLeft: daysLeft,
      availableSizes: optInfo.sizes,
      availableColors: optInfo.colors,
      colorImageMap: optInfo.colorImageMap,
      colorHexMap: optInfo.colorHexMap,
      currentSize: optInfo.currentSize,
      currentColor: optInfo.currentColor,
    });
  });

  return result;
}

export {
  filterOrdersForCustomer,
  type CustomerOrderFilterParams,
} from "./customer-order-filter";


