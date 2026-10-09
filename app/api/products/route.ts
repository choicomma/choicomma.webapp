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

function getSeedProductsFilePath() {
  return path.join(process.cwd(), "data", "default-products-seed.json");
}

function ensureSeedBackupExists() {
  const seedPath = getSeedProductsFilePath();
  const masterPath = getRuntimeProductsFilePath();
  if (!fs.existsSync(seedPath) && fs.existsSync(masterPath)) {
    try {
      const content = fs.readFileSync(masterPath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length >= 50) {
        fs.writeFileSync(seedPath, content, "utf-8");
      }
    } catch (e) {
      console.warn("Failed to create seed backup:", e);
    }
  }
}

function readSeedCatalog(): any[] {
  ensureSeedBackupExists();
  const seedPath = getSeedProductsFilePath();
  if (fs.existsSync(seedPath)) {
    try {
      const raw = fs.readFileSync(seedPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
  }
  const masterPath = getRuntimeProductsFilePath();
  if (fs.existsSync(masterPath)) {
    try {
      const raw = fs.readFileSync(masterPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
  }
  return [];
}

// In-memory cache for ultra-fast response & fail-safe fallback
const globalForProducts = global as unknown as { serverProductsCache?: any[] };

function readLocalProductsBackup(): any[] {
  ensureSeedBackupExists();
  const runtimePath = getRuntimeProductsFilePath();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (fs.existsSync(runtimePath)) {
        const raw = fs.readFileSync(runtimePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn(`[Products File Read Attempt ${attempt} Warning]:`, e);
      if (attempt < 2) {
        // Synchronous brief backoff for Windows / OneDrive file locks
        const start = Date.now();
        while (Date.now() - start < 30) {}
      }
    }
  }

  // Safety fallback: if reading from disk failed or file was temporarily locked,
  // do NOT wipe memory cache; use global in-memory catalog
  if (globalForProducts.serverProductsCache !== undefined && Array.isArray(globalForProducts.serverProductsCache)) {
    return globalForProducts.serverProductsCache;
  }

  return readSeedCatalog();
}

function safeAtomicWriteJsonFile(targetPath: string, data: any) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const jsonStr = JSON.stringify(data, null, 2);
  let lastError: any = null;

  // Retry up to 3 times to gracefully overcome Windows / OneDrive file lock collisions
  for (let attempt = 1; attempt <= 3; attempt++) {
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      try {
        fs.renameSync(tempPath, targetPath);
      } catch (renameErr) {
        // Windows fallback if atomic rename fails due to lock/OneDrive sync
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
        fs.writeFileSync(targetPath, jsonStr, "utf-8");
      }
      return;
    } catch (err: any) {
      lastError = err;
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      if (attempt < 3) {
        const start = Date.now();
        while (Date.now() - start < 40) {}
      }
    }
  }

  console.error("[Atomic Write Error after 3 attempts]:", lastError);
  throw lastError || new Error("Failed to write products JSON file");
}

function revalidateAllProductPaths(handle?: string) {
  try {
    revalidateTag(TAGS.products);
    revalidatePath("/", "layout");
    revalidatePath("/shop", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/order", "layout");
    revalidatePath("/product/[handle]", "page");
    if (handle) {
      revalidatePath(`/product/${handle}`, "page");
      revalidatePath(`/product/${encodeURIComponent(handle)}`, "page");
    }
  } catch (revErr) {
    console.warn("[Revalidation Warning]:", revErr);
  }
}

function makeResponse(products: any[], req?: NextRequest) {
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// GET: Return authoritative products catalog directly from local JSON file
export async function GET(req: NextRequest) {
  try {
    const isFresh = req?.nextUrl.searchParams.get("fresh") === "1";
    if (isFresh || globalForProducts.serverProductsCache === undefined) {
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
    ensureSeedBackupExists();
    const action = req.nextUrl.searchParams.get("action");

    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      body = null;
    }

    // -------------------------------------------------------------
    // CASE 0: Explicit Restore to Official Seed Catalog (50 items)
    // -------------------------------------------------------------
    if (action === "restore" || body?.action === "restore") {
      const seedProducts = readSeedCatalog();
      if (!seedProducts || seedProducts.length === 0) {
        return NextResponse.json(
          { success: false, message: "초기 카탈로그 원본 데이터를 찾을 수 없습니다." },
          { status: 500 }
        );
      }

      globalForProducts.serverProductsCache = seedProducts;
      safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), seedProducts);
      revalidateAllProductPaths();

      return NextResponse.json({
        success: true,
        restored: true,
        count: seedProducts.length,
        products: seedProducts,
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      });
    }

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
      const code = p.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : `CC-${pId}`);
      const relDate = p.releaseDate ? String(p.releaseDate).trim() : null;
      const tsRate = p.timeSaleDiscountRate !== undefined && p.timeSaleDiscountRate !== null && !isNaN(Number(p.timeSaleDiscountRate))
        ? Number(p.timeSaleDiscountRate)
        : undefined;

      const itemToSave: any = {
        ...p,
        handle: safeHandle,
        productNo: num,
        productCode: code,
        timeSaleDiscountRate: tsRate,
        isTimeSale: Boolean(p.isTimeSale),
        updated_at: new Date().toISOString(),
        created_at: p.created_at || p.createdAt || new Date().toISOString(),
      };

      if (relDate) {
        itemToSave.releaseDate = relDate;
      } else {
        delete itemToSave.releaseDate;
      }

      let existingList = readLocalProductsBackup();
      if (existingList.length === 0 && globalForProducts.serverProductsCache && globalForProducts.serverProductsCache.length > 0) {
        existingList = [...globalForProducts.serverProductsCache];
      }

      const existingIdx = existingList.findIndex((item: any) => String(item.id) === pId);
      if (existingIdx !== -1) {
        if (!relDate) {
          delete existingList[existingIdx].releaseDate;
        }
        existingList[existingIdx] = { ...existingList[existingIdx], ...itemToSave };
      } else {
        existingList.unshift(itemToSave);
      }

      safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), existingList);
      globalForProducts.serverProductsCache = existingList;

      revalidateAllProductPaths(p.handle);

      return NextResponse.json({
        success: true,
        product: itemToSave,
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
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

    revalidateAllProductPaths();

    return NextResponse.json({ success: true, count: products.length }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
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
    let existingList = readLocalProductsBackup();
    if (existingList.length === 0 && globalForProducts.serverProductsCache && globalForProducts.serverProductsCache.length > 0) {
      existingList = [...globalForProducts.serverProductsCache];
    }

    const updated = existingList.filter((p: any) => !deleteSet.has(String(p.id)));

    safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), updated);
    globalForProducts.serverProductsCache = updated;

    revalidateAllProductPaths();

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Failed to delete product(s):", error);
    return NextResponse.json(
      { success: false, message: error.message || "상품 삭제 실패" },
      { status: 500 }
    );
  }
}
