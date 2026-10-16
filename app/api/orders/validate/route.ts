import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { validatePurchaseItems } from "@/lib/product-availability";
import { syncCatalogFromRemote } from "@/lib/products-remote-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 서버가 가진 최신 카탈로그 (메모리 캐시 우선 -> 디스크 파일)
function readCatalog(): any[] {
  const g = global as unknown as { serverProductsCache?: any[] };
  if (Array.isArray(g.serverProductsCache) && g.serverProductsCache.length > 0) {
    return g.serverProductsCache;
  }
  try {
    const filePath = path.join(process.cwd(), "data", "products-cache.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Order Validate Read Warning]:", err);
  }
  return [];
}

// POST: 결제 직전 구매 가능 여부 서버 검증 (품절 / 구매불가 / 오픈예정 / 재고 부족)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ success: false, message: "검증할 상품이 없습니다." }, { status: 400 });
    }

    await syncCatalogFromRemote();
    const catalog = readCatalog();
    // 카탈로그를 읽지 못한 경우 정상 주문을 막지 않도록 통과시키되 로그만 남긴다.
    if (catalog.length === 0) {
      console.warn("[Order Validate] 카탈로그를 읽지 못해 검증을 건너뜁니다.");
      return NextResponse.json({ success: true, valid: true, skipped: true, blocks: [] });
    }

    const blocks = validatePurchaseItems(catalog, items);
    return NextResponse.json({ success: true, valid: blocks.length === 0, blocks });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
