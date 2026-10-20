"use client";

export interface ReorderResult {
  success: boolean;
  movedProduct?: any;
  targetProduct?: any;
  updatedList?: any[];
  error?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

const matchProduct = (p: any, id: string) => {
  if (!p || !id) return false;
  const target = String(id).trim();
  return (
    String(p.id).trim() === target ||
    String(p.productCode || "").trim() === target ||
    String(p.handle || "").trim() === target
  );
};

/**
 * 쇼핑몰 및 관리자페이지 전체 상품 카탈로그에서 상품 순서를 앞/뒤로 이동하고
 * localStorage 및 서버(POST /api/products?mode=replace)에 영구 저장하는 유틸리티
 *
 * @param productId 이동할 대상 상품의 ID, 코드, 또는 핸들
 * @param direction "prev" (앞으로 가기) | "next" (뒤로 가기)
 * @param currentVisibleList 현재 화면에 표시 중인 상품 목록 (있을 경우 보이는 순서 기준으로 이웃 상품과 교환)
 */
export async function reorderProduct(
  productId: string,
  direction: "prev" | "next",
  currentVisibleList?: any[]
): Promise<ReorderResult> {
  if (typeof window === "undefined") {
    return { success: false, error: "브라우저 환경이 아닙니다." };
  }

  try {
    // 1. 전체 상품 목록 가져오기 (localStorage 우선, 없거나 부족하면 API 조회)
    let baseList: any[] = [];
    const saved = localStorage.getItem("admin_products");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed;
        }
      } catch (e) {}
    }

    // 대상 상품이 baseList에 없거나 baseList가 비어있으면 서버에서 전체 카탈로그 로드
    const hasTargetInBase = baseList.some((p) => matchProduct(p, productId));
    if (baseList.length === 0 || !hasTargetInBase) {
      try {
        const res = await fetch(`/api/products?fresh=1&_t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            baseList = data;
          }
        }
      } catch (e) {}
    }

    if (baseList.length === 0 && currentVisibleList && currentVisibleList.length > 0) {
      baseList = [...currentVisibleList];
    }

    if (baseList.length === 0) {
      return { success: false, error: "상품 목록을 불러올 수 없습니다." };
    }

    // 2. 현재 baseList 정렬 기준 정리 (displayOrder 기준 또는 기존 배열 순서)
    baseList = [...baseList].sort((a: any, b: any) => {
      const ordA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : null;
      const ordB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : null;
      if (ordA !== null && ordB !== null) return ordA - ordB;
      if (ordA !== null) return -1;
      if (ordB !== null) return 1;
      return 0;
    });

    let fromIdx = -1;
    let toIdx = -1;
    let movedProduct: any = null;
    let targetProduct: any = null;

    // 3. 화면에 보이는 목록(currentVisibleList)이 주어진 경우: 보이는 순서 기준으로 이웃과 교환
    if (currentVisibleList && currentVisibleList.length > 0) {
      const vIdx = currentVisibleList.findIndex((p) => matchProduct(p, productId));
      if (vIdx !== -1) {
        if (direction === "prev") {
          if (vIdx <= 0) {
            return {
              success: false,
              error: "이미 목록의 첫 번째 상품입니다.",
              isFirst: true,
            };
          }
          targetProduct = currentVisibleList[vIdx - 1];
        } else {
          if (vIdx >= currentVisibleList.length - 1) {
            return {
              success: false,
              error: "이미 목록의 마지막 상품입니다.",
              isLast: true,
            };
          }
          targetProduct = currentVisibleList[vIdx + 1];
        }

        movedProduct = currentVisibleList[vIdx];
        fromIdx = baseList.findIndex((p) => matchProduct(p, productId));
        if (targetProduct) {
          toIdx = baseList.findIndex((p) => matchProduct(p, targetProduct.id));
        }
      }
    }

    // fallback: 전체 목록에서 직접 인덱스 계산
    if (fromIdx === -1 || toIdx === -1 || !targetProduct) {
      fromIdx = baseList.findIndex((p) => matchProduct(p, productId));
      if (fromIdx === -1) {
        return { success: false, error: "상품을 찾을 수 없습니다." };
      }
      toIdx = direction === "prev" ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0) {
        return {
          success: false,
          error: "이미 목록의 첫 번째 상품입니다.",
          isFirst: true,
        };
      }
      if (toIdx >= baseList.length) {
        return {
          success: false,
          error: "이미 목록의 마지막 상품입니다.",
          isLast: true,
        };
      }
      movedProduct = baseList[fromIdx];
      targetProduct = baseList[toIdx];
    }

    // 4. 순서 이동 적용
    const updated = [...baseList];
    const [item] = updated.splice(fromIdx, 1);

    if (targetProduct) {
      const newTargetIdx = updated.findIndex((p) => matchProduct(p, targetProduct.id));
      if (newTargetIdx !== -1) {
        const insertIdx = direction === "prev" ? newTargetIdx : newTargetIdx + 1;
        updated.splice(insertIdx, 0, item);
      } else {
        const safeIdx = Math.max(0, Math.min(updated.length, toIdx));
        updated.splice(safeIdx, 0, item);
      }
    } else {
      const safeIdx = Math.max(0, Math.min(updated.length, toIdx));
      updated.splice(safeIdx, 0, item);
    }

    // 5. 모든 상품에 순차적인 1부터 시작하는 displayOrder 부여
    const ordered = updated.map((p, idx) => ({
      ...p,
      displayOrder: idx + 1,
      updated_at: p.id === item.id ? new Date().toISOString() : p.updated_at,
    }));

    // 6. localStorage에 즉시 영구 저장 및 정렬 기준을 'custom'으로 설정
    // (관리자 페이지에서도 항상 이 순서가 최우선으로 반영되도록 함)
    localStorage.setItem("admin_products", JSON.stringify(ordered));
    localStorage.setItem("admin_product_sort_order", "custom");
    localStorage.setItem("admin_products_synced_at", String(Date.now()));

    // 7. 서버 파일 영구 저장 (POST /api/products?mode=replace)
    try {
      fetch("/api/products?mode=replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ordered),
      }).catch((err) => {
        console.warn("Failed to persist reordered products to server file:", err);
      });
    } catch (e) {}

    // 8. 전역 동기화 이벤트 브로드캐스트
    window.dispatchEvent(new CustomEvent("admin_products_updated", { detail: { ordered, movedId: item.id } }));
    window.dispatchEvent(new CustomEvent("products_updated", { detail: { ordered, movedId: item.id } }));
    window.dispatchEvent(new CustomEvent("storage"));

    return {
      success: true,
      movedProduct: item,
      targetProduct,
      updatedList: ordered,
    };
  } catch (err: any) {
    console.error("reorderProduct error:", err);
    return {
      success: false,
      error: err?.message || "상품 순서 변경 중 오류가 발생했습니다.",
    };
  }
}
