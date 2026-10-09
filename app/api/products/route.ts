import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/constants";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRuntimeProductsFilePath() {
  return path.join(process.cwd(), "data", "products-cache.json");
}

function readLocalProductsBackup(): any[] {
  try {
    const runtimePath = getRuntimeProductsFilePath();
    if (fs.existsSync(runtimePath)) {
      const raw = fs.readFileSync(runtimePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn("[Products File Read Warning]:", e);
  }

  return [];
}

function safeAtomicWriteJsonFile(targetPath: string, data: any) {
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
    } catch (renameErr) {
      // Windows fallback if target file is locked during atomic rename
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error("[Atomic Write Error]:", err);
  }
}

// In-memory cache for ultra-fast response
const globalForProducts = global as unknown as { serverProductsCache?: any[] };

function makeResponse(products: any[], req?: NextRequest) {
  const isFresh = req?.nextUrl.searchParams.get("fresh") === "1";
  if (isFresh) {
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  }

  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

// GET: Return authoritative products catalog directly from local JSON file
export async function GET(req: NextRequest) {
  try {
    const isFresh = req?.nextUrl.searchParams.get("fresh") === "1";
    if (isFresh || !globalForProducts.serverProductsCache || globalForProducts.serverProductsCache.length === 0) {
      const localList = readLocalProductsBackup();
      globalForProducts.serverProductsCache = localList;
    }

    return makeResponse(globalForProducts.serverProductsCache || [], req);
  } catch (error: any) {
    console.error("Failed to read products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to read products" },
      { status: 500 }
    );
  }
}

// POST: Save updated products directly to local disk JSON file
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // -------------------------------------------------------------
    // CASE A: Single Product Fast Upsert
    // -------------------------------------------------------------
    const singleProduct = body?.product || (!Array.isArray(body) && body?.id ? body : null);
    if (singleProduct) {
      const p = singleProduct;
      const pId = String(p.id || "");
      if (!pId || pId === "undefined" || pId === "null") {
        return NextResponse.json({ success: false, error: "Invalid product id" }, { status: 400 });
      }
      const isNewItem = Boolean(body?.isNew);

      let safeHandle = (p.handle && String(p.handle).trim()) || pId;
      if (isNewItem && !safeHandle.includes(pId)) {
        safeHandle = `${safeHandle}-${pId}`;
      }
      p.handle = safeHandle;

      const m = String(p.id).match(/\d+/);
      const num = p.productNo !== undefined && !isNaN(Number(p.productNo)) ? Number(p.productNo) : (m && parseInt(m[0], 10) < 100000 ? parseInt(m[0], 10) : 0);
      const code = p.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : undefined);
      const relDate = p.releaseDate || "";
      const tsRate = p.timeSaleDiscountRate !== undefined && p.timeSaleDiscountRate !== null && !isNaN(Number(p.timeSaleDiscountRate))
        ? Number(p.timeSaleDiscountRate)
        : undefined;

      const itemToSave = {
        ...p,
        handle: safeHandle,
        productNo: num,
        productCode: code,
        timeSaleDiscountRate: tsRate,
        isTimeSale: Boolean(p.isTimeSale),
        updated_at: new Date().toISOString(),
        created_at: p.created_at || p.createdAt || new Date().toISOString(),
      };

      let existingList = readLocalProductsBackup();
      const existingIdx = existingList.findIndex((item: any) => String(item.id) === pId);
      if (existingIdx !== -1) {
        existingList[existingIdx] = { ...existingList[existingIdx], ...itemToSave };
      } else {
        existingList.unshift(itemToSave);
      }

      safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), existingList);
      globalForProducts.serverProductsCache = existingList;

      try {
        revalidateTag(TAGS.products);
        revalidatePath("/", "layout");
        if (p.handle) {
          revalidatePath(`/product/${p.handle}`, "page");
          revalidatePath(`/product/${encodeURIComponent(p.handle)}`, "page");
        }
      } catch (revErr) {}

      return NextResponse.json({
        success: true,
        product: itemToSave,
      }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // -------------------------------------------------------------
    // CASE B: Full Catalog Array Batch Sync (Re-ordering, bulk save, file restore)
    // -------------------------------------------------------------
    const products = body;
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 또는 상품 형식이 아닙니다." },
        { status: 400 }
      );
    }

    globalForProducts.serverProductsCache = products;
    safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), products);

    try {
      revalidateTag(TAGS.products);
      revalidatePath("/", "layout");
      revalidatePath("/product/[handle]", "page");
    } catch (revErr) {}

    return NextResponse.json({ success: true, count: products.length }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Failed to save products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 파일 저장 실패" },
      { status: 500 }
    );
  }
}

// DELETE: Delete product(s) directly from local JSON file
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let idsToDelete: string[] = [];

    const idParam = url.searchParams.get("id");
    if (idParam) {
      idsToDelete.push(idParam);
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids.map(String);
        } else if (body.id) {
          idsToDelete.push(String(body.id));
        }
      } catch (e) {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, message: "삭제할 상품 ID가 지정되지 않았습니다." }, { status: 400 });
    }

    const deleteSet = new Set(idsToDelete);
    const existingList = readLocalProductsBackup();
    const updated = existingList.filter((p: any) => !deleteSet.has(String(p.id)));

    safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), updated);
    globalForProducts.serverProductsCache = updated;

    try {
      revalidateTag(TAGS.products);
      revalidatePath("/", "layout");
    } catch (revErr) {}

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error("Failed to delete product(s):", error);
    return NextResponse.json(
      { success: false, message: error.message || "상품 삭제 실패" },
      { status: 500 }
    );
  }
}
