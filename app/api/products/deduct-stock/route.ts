import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/constants";
import fs from "fs";
import path from "path";
import { adoptDiskIfNewer, markMemorySyncedWithDisk } from "@/lib/products-disk-sync";

export const dynamic = "force-dynamic";

function getRuntimeProductsFilePath() {
  return path.join(process.cwd(), "data", "products-cache.json");
}

function safeAtomicWriteJsonFile(targetPath: string, data: any): boolean {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
    return true;
  } catch (err) {
    console.error("[Stock Deduct Write Error]:", err);
    return false;
  }
}

// POST: Deduct stock automatically upon successful customer checkout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Array<{
      productId: string;
      quantity: number;
      color?: string;
      size?: string;
    }> = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "No items to deduct" }, { status: 400 });
    }

    const filePath = getRuntimeProductsFilePath();
    const globalForProducts = global as unknown as { serverProductsCache?: any[]; serverProductsDirty?: boolean };

    // 서버 메모리 캐시가 가장 최신(관리자 순서/품절 변경 포함)이므로 우선 사용한다.
    // 오래된 파일을 기준으로 덮어쓰면 아직 디스크에 반영되지 않은 관리자 변경이 롤백된다.
    adoptDiskIfNewer();
    let products: any[];
    if (Array.isArray(globalForProducts.serverProductsCache) && globalForProducts.serverProductsCache.length > 0) {
      products = JSON.parse(JSON.stringify(globalForProducts.serverProductsCache));
    } else {
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, message: "Products file not found" }, { status: 404 });
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      products = JSON.parse(raw);
    }
    if (!Array.isArray(products)) {
      return NextResponse.json({ success: false, message: "Invalid products catalog" }, { status: 500 });
    }

    let modified = false;

    items.forEach((item) => {
      const pId = String(item.productId || "");
      const qty = Math.max(1, Number(item.quantity) || 1);

      const target = products.find(
        (p: any) => String(p.id) === pId || (p.handle && String(p.handle) === pId)
      );

      if (!target) return;

      modified = true;

      // 1. Deduct total numeric stock
      const currentTotal = target.stock !== undefined && target.stock !== null ? Number(target.stock) : 50;
      const newTotal = Math.max(0, currentTotal - qty);
      target.stock = newTotal;

      // 2. Deduct option-specific sizeStock
      if (target.sizeStock && typeof target.sizeStock === "object") {
        const comboKey = item.color && item.size ? `${item.color}-${item.size}` : "";
        if (comboKey && target.sizeStock[comboKey] !== undefined) {
          const optStock = Number(target.sizeStock[comboKey]) || 0;
          target.sizeStock[comboKey] = Math.max(0, optStock - qty);
        } else if (item.size && target.sizeStock[item.size] !== undefined) {
          const optStock = Number(target.sizeStock[item.size]) || 0;
          target.sizeStock[item.size] = Math.max(0, optStock - qty);
        }
      }

      // 3. Automatically toggle to Sold Out if total stock is 0
      if (newTotal === 0) {
        target.availableForSale = false;
        if (Array.isArray(target.variants)) {
          target.variants = target.variants.map((v: any) => ({ ...v, availableForSale: false }));
        }
      }
      target.updated_at = new Date().toISOString();
    });

    if (modified) {
      const written = safeAtomicWriteJsonFile(filePath, products);
      globalForProducts.serverProductsCache = products;
      // 디스크 기록에 실패했다면 메모리가 최신이라는 표시를 남겨 다음 저장/조회에서 다시 기록되게 한다.
      globalForProducts.serverProductsDirty = !written;
      if (written) markMemorySyncedWithDisk();

      // Revalidate cache across site
      try {
        revalidateTag(TAGS.products);
        revalidatePath("/", "layout");
        revalidatePath("/shop", "layout");
      } catch {}
    }

    return NextResponse.json({
      success: true,
      deductedItemsCount: items.length,
    });
  } catch (error: any) {
    console.error("Failed to deduct stock:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to deduct stock" },
      { status: 500 }
    );
  }
}
