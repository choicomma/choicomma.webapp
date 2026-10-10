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

function getDeletedProductsFilePath() {
  return path.join(process.cwd(), "data", "deleted-products.json");
}

function readDeletedProductsList(): string[] {
  try {
    const filePath = getDeletedProductsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data.map(String);
    }
  } catch (e) {}
  return [];
}

function writeDeletedProductsList(ids: string[]) {
  try {
    const filePath = getDeletedProductsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Array.from(new Set(ids)), null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write deleted products list:", e);
  }
}

function filterOutDeletedServerProducts(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const deletedIds = readDeletedProductsList();
  if (deletedIds.length === 0) return list;
  const delSet = new Set(deletedIds.map(String));
  return list.filter((p: any) => {
    if (!p) return false;
    const id = String(p.id || "");
    const code = String(p.productCode || "");
    const handle = String(p.handle || "");
    return !delSet.has(id) && !delSet.has(code) && !delSet.has(handle);
  });
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
      if (Array.isArray(data) && data.length > 0) return filterOutDeletedServerProducts(data);
    } catch (e) {}
  }
  const masterPath = getRuntimeProductsFilePath();
  if (fs.existsSync(masterPath)) {
    try {
      const raw = fs.readFileSync(masterPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return filterOutDeletedServerProducts(data);
    } catch (e) {}
  }
  return [];
}

// In-memory cache for ultra-fast response & fail-safe fallback
const globalForProducts = global as unknown as { serverProductsCache?: any[] };

// Process-level write mutex queue to serialize all disk writes and eliminate EBUSY write lock collisions
let fileWriteChain = Promise.resolve();

function readLocalProductsBackup(): any[] {
  ensureSeedBackupExists();
  const runtimePath = getRuntimeProductsFilePath();
  let diskData: any[] | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (fs.existsSync(runtimePath)) {
        const raw = fs.readFileSync(runtimePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          diskData = filterOutDeletedServerProducts(data);
          break;
        }
      }
    } catch (e) {
      console.warn(`[Products File Read Attempt ${attempt} Warning]:`, e);
      if (attempt < 3) {
        const start = Date.now();
        while (Date.now() - start < 40) {}
      }
    }
  }

  // Reconciliation: if in-memory cache has newer product updates, NEVER downgrade memory with stale disk data!
  if (globalForProducts.serverProductsCache && Array.isArray(globalForProducts.serverProductsCache) && globalForProducts.serverProductsCache.length > 0) {
    if (!diskData || diskData.length === 0) {
      return filterOutDeletedServerProducts(globalForProducts.serverProductsCache);
    }
    const memMap = new Map(globalForProducts.serverProductsCache.map((p: any) => [String(p?.id || ""), p]));
    const reconciled = diskData.map((dp: any) => {
      const mp = memMap.get(String(dp?.id || ""));
      if (!mp) return dp;
      const memTime = (mp.updated_at || mp.updatedAt) ? new Date(mp.updated_at || mp.updatedAt).getTime() : 0;
      const diskTime = (dp.updated_at || dp.updatedAt) ? new Date(dp.updated_at || dp.updatedAt).getTime() : 0;
      return memTime >= diskTime ? mp : dp;
    });

    return filterOutDeletedServerProducts(reconciled);
  }

  if (diskData && diskData.length > 0) {
    return diskData;
  }

  return readSeedCatalog();
}

async function safeAtomicWriteJsonFile(targetPath: string, data: any): Promise<boolean> {
  const writeOp = async (): Promise<boolean> => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;

    // 1. Write to temporary file
    let tmpWritten = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        fs.writeFileSync(tmpPath, jsonStr, "utf-8");
        tmpWritten = true;
        break;
      } catch (tmpErr) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 40 * attempt));
        }
      }
    }

    if (!tmpWritten) {
      // Fallback: direct write
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          fs.writeFileSync(targetPath, jsonStr, "utf-8");
          return true;
        } catch (directErr) {
          if (attempt < 5) await new Promise((r) => setTimeout(r, 60 * attempt));
        }
      }
      return false;
    }

    // 2. Atomic swap with retries for Windows / OneDrive file locks
    let replaced = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        fs.renameSync(tmpPath, targetPath);
        replaced = true;
        break;
      } catch (renameErr) {
        try {
          fs.copyFileSync(tmpPath, targetPath);
          try { fs.unlinkSync(tmpPath); } catch {}
          replaced = true;
          break;
        } catch (copyErr) {
          if (attempt < 10) {
            await new Promise((r) => setTimeout(r, 60 * attempt));
          }
        }
      }
    }

    if (!replaced) {
      try {
        fs.writeFileSync(targetPath, jsonStr, "utf-8");
        replaced = true;
      } catch (finalErr) {
        console.warn("[Safe Atomic Write Notice after retries]:", finalErr);
      }
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
    }

    return replaced;
  };

  const nextChain = fileWriteChain.then(writeOp, writeOp);
  fileWriteChain = nextChain.then(() => {}, () => {});
  return nextChain;
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
  const deletedIds = readDeletedProductsList();
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Access-Control-Expose-Headers": "X-Deleted-Product-Ids",
      "X-Deleted-Product-Ids": JSON.stringify(deletedIds),
    },
  });
}

// GET: Return authoritative products catalog directly from local JSON file
export async function GET(req: NextRequest) {
  try {
    const action = req?.nextUrl.searchParams.get("action");
    if (action === "deleted") {
      const deletedIds = readDeletedProductsList();
      return NextResponse.json(deletedIds, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    const isFresh = req?.nextUrl.searchParams.get("fresh") === "1";
    if (isFresh || globalForProducts.serverProductsCache === undefined) {
      const localList = readLocalProductsBackup();
      globalForProducts.serverProductsCache = filterOutDeletedServerProducts(localList);
    } else if (Array.isArray(globalForProducts.serverProductsCache)) {
      globalForProducts.serverProductsCache = filterOutDeletedServerProducts(globalForProducts.serverProductsCache);
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
      // Clear persistent deleted products blacklist on explicit restore
      writeDeletedProductsList([]);

      const seedProducts = readSeedCatalog();
      if (!seedProducts || seedProducts.length === 0) {
        return NextResponse.json(
          { success: false, message: "초기 카탈로그 원본 데이터를 찾을 수 없습니다." },
          { status: 500 }
        );
      }

      globalForProducts.serverProductsCache = seedProducts;
      try {
        safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), seedProducts);
      } catch (writeErr: any) {
        console.warn("[Restore Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
      }
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
    // CASE 0.5: Sync Client Deleted Product IDs to Central Server
    // -------------------------------------------------------------
    if (action === "sync-deleted" || body?.action === "sync-deleted") {
      const idsToSync: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
      if (idsToSync.length > 0) {
        const currentDeleted = readDeletedProductsList();
        const updatedDeletedSet = new Set([...currentDeleted, ...idsToSync]);
        writeDeletedProductsList(Array.from(updatedDeletedSet));

        const diskList = readLocalProductsBackup();
        if (diskList.length > 0) {
          const cleaned = diskList.filter((p: any) => {
            if (!p) return false;
            const id = String(p.id || "");
            const code = String(p.productCode || "");
            const handle = String(p.handle || "");
            return !updatedDeletedSet.has(id) && !updatedDeletedSet.has(code) && !updatedDeletedSet.has(handle);
          });
          if (cleaned.length !== diskList.length) {
            globalForProducts.serverProductsCache = cleaned;
            await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), cleaned);
          }
        }
        revalidateAllProductPaths();
      }
      return NextResponse.json({ success: true, count: idsToSync.length }, {
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

      // If this product was previously in deleted list, un-blacklist it
      const currentDeleted = readDeletedProductsList();
      if (currentDeleted.length > 0) {
        const nextDeleted = currentDeleted.filter(
          (d) => d !== pId && d !== code && d !== safeHandle
        );
        if (nextDeleted.length !== currentDeleted.length) {
          writeDeletedProductsList(nextDeleted);
        }
      }

      let existingList = readLocalProductsBackup();
      if (existingList.length === 0 && globalForProducts.serverProductsCache && globalForProducts.serverProductsCache.length > 0) {
        existingList = [...globalForProducts.serverProductsCache];
      }

      const existingIdx = existingList.findIndex((item: any) => String(item.id) === pId);
      if (existingIdx !== -1) {
        const prevCreatedAt = existingList[existingIdx].created_at || existingList[existingIdx].createdAt;
        existingList[existingIdx] = {
          ...itemToSave,
          created_at: itemToSave.created_at || prevCreatedAt || new Date().toISOString(),
          createdAt: itemToSave.createdAt || prevCreatedAt || new Date().toISOString(),
          updated_at: itemToSave.updated_at || new Date().toISOString(),
          updatedAt: itemToSave.updatedAt || new Date().toISOString(),
        };
      } else {
        existingList.unshift(itemToSave);
      }

      globalForProducts.serverProductsCache = existingList;
      try {
        await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), existingList);
      } catch (writeErr: any) {
        console.warn("[Single Product Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
      }

      revalidateAllProductPaths(p.handle);

      return NextResponse.json({
        success: true,
        product: existingList[existingIdx !== -1 ? existingIdx : 0],
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

    // Any products present in the batch are active; un-blacklist them from deleted-products.json
    const activeIds = new Set<string>();
    products.forEach((p: any) => {
      if (p?.id) activeIds.add(String(p.id));
      if (p?.productCode) activeIds.add(String(p.productCode));
      if (p?.handle) activeIds.add(String(p.handle));
    });
    const currentDeleted = readDeletedProductsList();
    if (currentDeleted.length > 0) {
      const nextDeleted = currentDeleted.filter((d) => !activeIds.has(d));
      if (nextDeleted.length !== currentDeleted.length) {
        writeDeletedProductsList(nextDeleted);
      }
    }

    globalForProducts.serverProductsCache = products;
    try {
      await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), products);
    } catch (writeErr: any) {
      console.warn("[Batch Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
    }

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

    let existingList = readLocalProductsBackup();
    if (existingList.length === 0 && globalForProducts.serverProductsCache && globalForProducts.serverProductsCache.length > 0) {
      existingList = [...globalForProducts.serverProductsCache];
    }

    // Collect all associated identifiers (id, productCode, handle)
    const allIdentifiersToDelete = new Set<string>(idsToDelete);
    existingList.forEach((p: any) => {
      const match = idsToDelete.some(
        (target) =>
          String(p.id) === target ||
          String(p.productCode) === target ||
          String(p.handle) === target
      );
      if (match) {
        if (p.id) allIdentifiersToDelete.add(String(p.id));
        if (p.productCode) allIdentifiersToDelete.add(String(p.productCode));
        if (p.handle) allIdentifiersToDelete.add(String(p.handle));
      }
    });

    // 1. Record permanently in deleted-products.json
    const existingDeleted = readDeletedProductsList();
    const updatedDeletedSet = new Set([...existingDeleted, ...Array.from(allIdentifiersToDelete)]);
    writeDeletedProductsList(Array.from(updatedDeletedSet));

    // 2. Filter from catalog
    const updated = existingList.filter((p: any) => {
      if (!p) return false;
      const id = String(p.id || "");
      const code = String(p.productCode || "");
      const handle = String(p.handle || "");
      return (
        !allIdentifiersToDelete.has(id) &&
        !allIdentifiersToDelete.has(code) &&
        !allIdentifiersToDelete.has(handle)
      );
    });

    globalForProducts.serverProductsCache = updated;
    try {
      await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), updated);
    } catch (writeErr: any) {
      console.warn("[Delete Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
    }

    revalidateAllProductPaths();

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length, deletedIds: Array.from(allIdentifiersToDelete) }, {
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
