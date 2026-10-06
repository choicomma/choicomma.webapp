import { getProductThumbnail } from "@/lib/products/thumbnail-helper";

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

    // 1. Array 형태의 상품 목록
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((item: any, iIdx: number) => {
        const itemName = typeof item === "string" ? item : (item.name || item.title || "주문 상품");
        const itemOption = typeof item === "object" ? (item.option || item.selectedOption || "") : "";
        const itemQty = typeof item === "object" ? (item.quantity || item.qty || 1) : 1;
        const itemImage = (typeof item === "object" && item.image) ? item.image : (ord.image || getProductThumbnail(itemName));
        const itemPrice = typeof item === "object" && item.price ? `${Number(item.price).toLocaleString()}원` : (ord.amount || "");

        const displayLabel = itemOption ? `${itemName} (${itemOption})` : itemName;

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

          result.push({
            id: `${ord.id || baseOrderId}-item-${pIdx}`,
            uniqueSelectId: `${baseOrderId}-item-${pIdx}`,
            orderId: baseOrderId,
            orderNumber: baseOrderId,
            originalOrderId: ord.originalOrderId || baseOrderId,
            items: trimmed,
            itemName: itemName,
            quantity: itemQty,
            image: getProductThumbnail(itemName, ord.image),
            amount: ord.amount || "",
            recipient: ord.recipient || ord.customerName,
            phone: ord.phone || ord.customerPhone,
            address: ord.address,
            detailAddress: ord.detailAddress,
            zipCode: ord.zipCode,
            trackingNumber: ord.trackingNumber || "-",
            status: ord.status,
            orderDate: ord.orderDate || ord.created_at,
          });
        });
        return;
      }
    }

    // 3. 단일 상품 건
    const singleName = typeof rawItems === "string" ? rawItems : "주문 상품";
    result.push({
      id: `${ord.id || baseOrderId}-item-0`,
      uniqueSelectId: `${baseOrderId}-item-0`,
      orderId: baseOrderId,
      orderNumber: baseOrderId,
      originalOrderId: ord.originalOrderId || baseOrderId,
      items: singleName,
      itemName: singleName,
      quantity: ord.quantity || 1,
      image: getProductThumbnail(singleName, ord.image),
      amount: ord.amount || "",
      recipient: ord.recipient || ord.customerName,
      phone: ord.phone || ord.customerPhone,
      address: ord.address,
      detailAddress: ord.detailAddress,
      zipCode: ord.zipCode,
      trackingNumber: ord.trackingNumber || "-",
      status: ord.status,
      orderDate: ord.orderDate || ord.created_at,
    });
  });

  return result;
}
