export interface BundleGroup {
  id: string; // group identifier (hash or key)
  recipient: string;
  phone: string;
  address: string;
  detailAddress?: string;
  zipCode?: string;
  shipmentIds: string[];
  orders: any[];
  earliestDate: string;
  latestDate: string;
  timeDiffText: string;
  totalItemsCount: number;
  combinedItemsText: string;
  refundableShippingFee: number; // 초과 배송비 환급액 (기본 3,000원 * (주문건수 - 1))
  matchedCustomer?: any;
}

/**
 * 전화번호 정규화 (숫자만 추출)
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/**
 * 주소 정규화 (공백 및 특수문자 정돈)
 */
export function normalizeAddress(addr?: string): string {
  if (!addr) return "";
  return addr
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.-]/g, "")
    .toLowerCase();
}

/**
 * 수령인 이름 정규화 (공백 제거)
 */
export function normalizeName(name?: string): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, "");
}

/**
 * 두 일시 간격 문자열 포맷팅 (예: "14시간 30분 간격 결제")
 */
export function formatTimeDifference(date1: string, date2: string): string {
  const t1 = new Date(date1).getTime();
  const t2 = new Date(date2).getTime();
  if (isNaN(t1) || isNaN(t2)) return "48시간 이내 주문";

  const diffMs = Math.abs(t2 - t1);
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}분 간격 결제`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) {
    return `${hours}시간 간격 결제`;
  }
  return `${hours}시간 ${minutes}분 간격 결제`;
}

/**
 * 48시간 이내 동일 고객/주소지 합배송 가능 대상 감지 유틸리티
 */
export function detectBundleCandidates(
  shipments: any[],
  customers: any[] = []
): BundleGroup[] {
  if (!Array.isArray(shipments) || shipments.length < 2) return [];

  // 1. 배송 대기 중이며 송장이 미발급된 건만 필터링
  const candidates = shipments.filter((s) => {
    // 이미 합배송으로 흡수된 자식 주문이거나, 이미 합배송 완료된 부모 주문은 추가 묶음 대상에서 기본 제외 (추후 재통합도 가능)
    if (s.isMergedChild || s.mergedIntoId || s.isMergedParent) return false;

    // 배송 준비 중(Pending) 상태의 미발송 건
    const isPending = !s.status || s.status === "Pending";
    
    // 운송장 번호가 아직 발급되지 않은 건만 대상
    const noTracking = !s.trackingNumber || s.trackingNumber === "-" || s.trackingNumber.trim() === "";

    return isPending && noTracking;
  });

  if (candidates.length < 2) return [];

  // 2. 고유 키 생성 (정규화된 수령인 + 전화번호 뒤 8자리 + 정규화된 주소)
  const map = new Map<string, any[]>();

  candidates.forEach((s) => {
    const normName = normalizeName(s.recipient);
    const rawPhone = normalizePhone(s.phone);
    const phoneSuffix = rawPhone.length >= 8 ? rawPhone.slice(-8) : rawPhone;
    const normAddr = normalizeAddress(s.address);

    if (!normName || !phoneSuffix || !normAddr) return;

    // 식별 그룹 키 (동일 수령인 + 연락처 뒤 8자리 + 기본 주소)
    const groupKey = `${normName}_${phoneSuffix}_${normAddr}`;

    if (!map.has(groupKey)) {
      map.set(groupKey, []);
    }
    map.get(groupKey)!.push(s);
  });

  const bundleGroups: BundleGroup[] = [];

  // 3. 그룹별 48시간 이내 결제 건 분석 및 묶음 그룹 생성
  map.forEach((items, key) => {
    if (items.length < 2) return;

    // 시간 순 정렬 (오래된 주문 우선)
    const sorted = [...items].sort((a, b) => {
      const timeA = new Date(a.orderDate || a.created_at || 0).getTime();
      const timeB = new Date(b.orderDate || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // 48시간(48 * 60 * 60 * 1000 ms) 윈도우 검사
    const windowMs = 48 * 60 * 60 * 1000;
    const matchedClusters: any[][] = [];
    let currentCluster: any[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentCluster[currentCluster.length - 1];
      const curr = sorted[i];

      const tPrev = new Date(prev.orderDate || prev.created_at || 0).getTime();
      const tCurr = new Date(curr.orderDate || curr.created_at || 0).getTime();

      // 날짜 파싱이 유효하지 않은 경우(0인 경우)도 고려: 같은 날짜 문자열이면 매칭 허용
      const diffMs = Math.abs(tCurr - tPrev);
      const isWithin48h = isNaN(diffMs) || diffMs === 0 || diffMs <= windowMs;

      if (isWithin48h) {
        currentCluster.push(curr);
      } else {
        if (currentCluster.length >= 2) {
          matchedClusters.push(currentCluster);
        }
        currentCluster = [curr];
      }
    }
    if (currentCluster.length >= 2) {
      matchedClusters.push(currentCluster);
    }

    // 각 클러스터를 BundleGroup 객체로 변환
    matchedClusters.forEach((cluster, clusterIdx) => {
      const representative = cluster[0];
      const shipmentIds = cluster.map((c) => c.id);

      // 전체 품목 문자열 합치기
      const allItemTokens: string[] = [];
      let totalQty = 0;
      cluster.forEach((c) => {
        if (c.items) {
          allItemTokens.push(c.items);
        }
        totalQty += Number(c.quantity) || 1;
      });

      // 중복 배송비 계산 (기본 배송비 3,000원 기준: N건 묶음 시 (N-1) * 3,000원 환급)
      const standardShippingFee = 3000;
      const refundableShippingFee = (cluster.length - 1) * standardShippingFee;

      // 고객 매칭
      const targetPhone = normalizePhone(representative.phone);
      const targetName = normalizeName(representative.recipient);
      const matchedCustomer = customers.find((cust) => {
        const cPhone = normalizePhone(cust.phone);
        const cName = normalizeName(cust.name);
        return (
          (targetPhone && targetPhone.length >= 8 && cPhone.endsWith(targetPhone.slice(-8))) ||
          (targetName && cName === targetName)
        );
      });

      const earliestDate = cluster[0].orderDate || cluster[0].created_at || "";
      const latestDate = cluster[cluster.length - 1].orderDate || cluster[cluster.length - 1].created_at || "";

      bundleGroups.push({
        id: `bundle-${key}-${clusterIdx}`,
        recipient: representative.recipient,
        phone: representative.phone,
        address: representative.address,
        detailAddress: representative.detailAddress,
        zipCode: representative.zipCode,
        shipmentIds,
        orders: cluster,
        earliestDate,
        latestDate,
        timeDiffText: formatTimeDifference(earliestDate, latestDate),
        totalItemsCount: totalQty,
        combinedItemsText: allItemTokens.join(", "),
        refundableShippingFee,
        matchedCustomer,
      });
    });
  });

  return bundleGroups;
}

/**
 * 합배송 통합 실행 유틸리티
 * primaryOrder에 childOrders의 품목/수량을 병합하고, 자식 주문 상태를 갱신합니다.
 */
export function executeOrderMerge(
  allShipments: any[],
  primaryOrderId: string,
  childOrderIds: string[],
  refundAmount: number
): any[] {
  const primaryIndex = allShipments.findIndex((s) => s.id === primaryOrderId || s.orderId === primaryOrderId);
  if (primaryIndex === -1) return allShipments;

  const primary = allShipments[primaryIndex];
  const children = allShipments.filter((s) => childOrderIds.includes(s.id) || childOrderIds.includes(s.orderId));
  if (children.length === 0) return allShipments;

  // 품목 및 수량 병합
  const combinedItemsList: string[] = [primary.items];
  let combinedQuantity = Number(primary.quantity) || 1;

  children.forEach((child) => {
    if (child.items) combinedItemsList.push(child.items);
    combinedQuantity += Number(child.quantity) || 1;
  });

  const combinedItemsStr = combinedItemsList.join(", ");
  const childOrderNumbers = children.map((c) => c.orderId || c.id);

  // 통합된 대표 주문 객체 생성
  const mergedPrimary = {
    ...primary,
    items: combinedItemsStr,
    quantity: combinedQuantity,
    isMergedParent: true,
    isMergedChild: false,
    bundledShipmentIds: children.map((c) => c.id),
    bundledOrderNumbers: childOrderNumbers,
    bundledRefundPoints: refundAmount,
    bundledDate: new Date().toISOString(),
    originalItems: primary.originalItems || primary.items,
    originalQuantity: primary.originalQuantity || primary.quantity,
    shippingMemo: primary.shippingMemo
      ? `${primary.shippingMemo} [합배송: ${childOrderNumbers.join(", ")} 통합]`
      : `[합배송: ${childOrderNumbers.join(", ")} 통합 (초과배송비 ₩${refundAmount.toLocaleString()} 적립금 환급)]`,
    packages: [
      {
        id: `PKG-${primary.id}-MERGED`,
        pkgIndex: 1,
        items: combinedItemsStr,
        quantity: combinedQuantity,
        carrier: primary.carrier || "CJ대한통운",
        trackingNumber: primary.trackingNumber || "-",
        status: primary.status || "Pending",
      },
    ],
  };

  // 자식 주문 객체들 갱신
  const childSet = new Set(children.map((c) => c.id));
  return allShipments.map((s) => {
    if (s.id === primary.id) {
      return mergedPrimary;
    }
    if (childSet.has(s.id)) {
      return {
        ...s,
        isMergedChild: true,
        isMergedParent: false,
        mergedIntoId: primary.id,
        mergedIntoOrderId: primary.orderId,
        mergedAt: new Date().toISOString(),
        shippingMemo: `[합배송 완료] ${primary.orderId} 번 주문에 통합 포장되어 함께 발송됩니다.`,
      };
    }
    return s;
  });
}

/**
 * 합배송 분리 (언번들/복원) 실행 유틸리티
 */
export function undoOrderMerge(
  allShipments: any[],
  primaryOrderId: string
): any[] {
  const primary = allShipments.find((s) => s.id === primaryOrderId || s.orderId === primaryOrderId);
  if (!primary || !primary.isMergedParent) return allShipments;

  const childIds = new Set(primary.bundledShipmentIds || []);

  return allShipments.map((s) => {
    if (s.id === primary.id) {
      return {
        ...s,
        items: s.originalItems || s.items,
        quantity: s.originalQuantity || s.quantity,
        isMergedParent: false,
        bundledShipmentIds: [],
        bundledOrderNumbers: [],
        bundledRefundPoints: 0,
        shippingMemo: (s.shippingMemo || "").replace(/\[합배송:[^\]]+\]/g, "").trim(),
        packages: [
          {
            id: `PKG-${s.id}-1`,
            pkgIndex: 1,
            items: s.originalItems || s.items,
            quantity: s.originalQuantity || s.quantity,
            carrier: s.carrier || "CJ대한통운",
            trackingNumber: s.trackingNumber || "-",
            status: s.status || "Pending",
          },
        ],
      };
    }
    if (childIds.has(s.id)) {
      return {
        ...s,
        isMergedChild: false,
        mergedIntoId: undefined,
        mergedIntoOrderId: undefined,
        mergedAt: undefined,
        shippingMemo: (s.shippingMemo || "").replace(/\[합배송 완료\][^.]+\./g, "").trim(),
      };
    }
    return s;
  });
}
