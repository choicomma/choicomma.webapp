/**
 * 상품 구매 가능 여부 판정 (단일 기준).
 * 서버(결제 전 검증 API)와 화면이 같은 규칙을 쓰도록 한 곳에 모아둔다.
 *
 * 구매 불가 조건
 *  1) availableForSale === false  (관리자 "시간 설정 OFF(구매불가)" / 품절 토글 / 재고 0 자동 품절)
 *  2) releaseDate 가 미래  (오픈 예정)
 *  3) 총 재고(stock)가 0 이하
 *  4) 선택 옵션 재고(sizeStock)가 요청 수량보다 부족
 */

export type PurchaseBlockCode = "NOT_FOUND" | "SOLD_OUT" | "SCHEDULED" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";

export interface PurchaseCheckInput {
  productId: string;
  quantity?: number;
  color?: string;
  size?: string;
}

export interface PurchaseBlock {
  productId: string;
  title: string;
  code: PurchaseBlockCode;
  message: string;
}

export function findProductByKey(products: any[], key: string) {
  const k = String(key || "");
  if (!k) return undefined;
  return products.find((p: any) => String(p?.id) === k || (p?.handle && String(p.handle) === k));
}

function getOptionStock(product: any, color?: string, size?: string): number | null {
  const map = product?.sizeStock;
  if (!map || typeof map !== "object") return null;
  const combo = color && size ? `${color}-${size}` : "";
  if (combo && map[combo] !== undefined) return Number(map[combo]) || 0;
  if (size && map[size] !== undefined) return Number(map[size]) || 0;
  return null;
}

export function getPurchaseBlock(product: any, input: PurchaseCheckInput, now: number = Date.now()): PurchaseBlock | null {
  const productId = String(input.productId || "");
  if (!product) {
    return { productId, title: productId, code: "NOT_FOUND", message: "존재하지 않거나 판매가 종료된 상품입니다." };
  }
  const title = String(product.title || productId);
  const qty = Math.max(1, Number(input.quantity) || 1);

  if (product.releaseDate && new Date(product.releaseDate).getTime() > now) {
    return { productId, title, code: "SCHEDULED", message: `'${title}' 상품은 아직 판매 오픈 전입니다.` };
  }
  if (product.availableForSale === false) {
    return { productId, title, code: "SOLD_OUT", message: `'${title}' 상품은 품절(구매불가) 상태입니다.` };
  }
  if (product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) {
    return { productId, title, code: "OUT_OF_STOCK", message: `'${title}' 상품은 재고가 없습니다.` };
  }
  const optStock = getOptionStock(product, input.color, input.size);
  if (optStock !== null && optStock < qty) {
    const opt = [input.color, input.size].filter(Boolean).join(" / ");
    return {
      productId,
      title,
      code: optStock <= 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
      message:
        optStock <= 0
          ? `'${title}'${opt ? ` (${opt})` : ""} 옵션은 품절되었습니다.`
          : `'${title}'${opt ? ` (${opt})` : ""} 옵션은 재고가 ${optStock}개만 남아 있습니다.`,
    };
  }
  return null;
}

export function validatePurchaseItems(products: any[], items: PurchaseCheckInput[]): PurchaseBlock[] {
  const blocks: PurchaseBlock[] = [];
  for (const item of items) {
    const product = findProductByKey(products, item.productId);
    // 카탈로그에 없는 상품(예: 외부 연동 상품)은 판정할 수 없으므로 차단하지 않는다.
    if (!product) continue;
    const block = getPurchaseBlock(product, item);
    if (block) blocks.push(block);
  }
  return blocks;
}

/**
 * 오픈 예정 상품의 오픈일시를 뱃지에 표시하기 위한 포맷 함수
 * (예: "10월 27일 10:00 오픈 예정", "10월 27일 오픈 예정")
 */
export function formatReleaseDateBadge(dateStr?: string): string {
  if (!dateStr) return "오픈 예정";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "오픈 예정";
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    if (hours !== 0 || minutes !== 0) {
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return `${month}월 ${day}일 ${timeStr} 오픈 예정`;
    }
    return `${month}월 ${day}일 오픈 예정`;
  } catch {
    return "오픈 예정";
  }
}

