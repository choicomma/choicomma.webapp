import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/constants";
import fs from "fs";
import path from "path";
import { adoptDiskIfNewer, markMemorySyncedWithDisk } from "@/lib/products-disk-sync";
import { slimProductsForList } from "@/lib/products-slim";
import {
  isRemoteCatalogEnabled,
  remoteIsAuthoritative,
  getRemoteDeletedList,
  setRemoteDeletedListInMemory,
  queueRemoteSave,
  flushRemoteWrites,
  syncCatalogFromRemote,
} from "@/lib/products-remote-store";
import { logAdminActivity } from "@/lib/logging/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRuntimeProductsFilePath() {
  return path.join(process.cwd(), "data", "products-cache.json");
}

// 진단용 로그: 상품 저장/디스크 기록/파일 읽기 결과를 .next/products-sync.log 에 남긴다 (터미널 로그를 직접 볼 수 없는 경우 용).
function logSync(message: string) {
  try {
    const logPath = path.join(process.cwd(), ".next", "products-sync.log");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf-8");
  } catch {}
}

function getSeedProductsFilePath() {
  return path.join(process.cwd(), "data", "default-products-seed.json");
}

function getDeletedProductsFilePath() {
  return path.join(process.cwd(), "data", "deleted-products.json");
}

function readDeletedProductsList(): string[] {
  // 원격 저장소(Supabase)가 설정된 배포 환경에서는 원격 삭제 목록이 기준이다
  const remoteDeleted = getRemoteDeletedList();
  if (remoteDeleted) return remoteDeleted;
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
  // 원격 저장소: 메모리에 즉시 반영하고 저장을 대기열에 넣는다 (응답 전 flushRemoteWrites 로 완료 대기)
  if (isRemoteCatalogEnabled) {
    const unique = Array.from(new Set(ids.map(String)));
    setRemoteDeletedListInMemory(unique);
    queueRemoteSave("deleted", unique);
  }
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

function saveBase64ImageToUploads(dataUrl: string, prefix: string = "prod"): string {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }
  try {
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return dataUrl;
    let ext = `.${match[1].toLowerCase()}`;
    if (ext === ".jpeg") ext = ".jpg";
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${prefix}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error("[Save Base64 Image Error]:", err);
    return dataUrl;
  }
}

function persistAndNormalizeProductImages(product: any): any {
  if (!product || typeof product !== "object") return product;
  const p = { ...product };
  const pId = String(p.id || "item");

  // 1. featuredImage
  if (p.featuredImage?.url && typeof p.featuredImage.url === "string") {
    if (p.featuredImage.url.startsWith("data:image/")) {
      p.featuredImage = {
        ...p.featuredImage,
        url: saveBase64ImageToUploads(p.featuredImage.url, `${pId}-feat`),
      };
    }
  }

  // 2. images array
  if (Array.isArray(p.images)) {
    p.images = p.images.map((img: any, idx: number) => {
      const u = typeof img === "string" ? img : img?.url;
      if (typeof u === "string" && u.startsWith("data:image/")) {
        const savedUrl = saveBase64ImageToUploads(u, `${pId}-img${idx + 1}`);
        return typeof img === "string" ? savedUrl : { ...img, url: savedUrl };
      }
      return img;
    });
  }

  // 3. colorImages (옵션별 제품컷)
  if (p.colorImages && typeof p.colorImages === "object") {
    const nextColorImages: Record<string, string> = {};
    Object.entries(p.colorImages).forEach(([colorKey, imgVal]) => {
      if (typeof imgVal === "string") {
        if (imgVal.startsWith("data:image/")) {
          const cleanKey = colorKey.replace(/[^a-zA-Z0-9가-힣_-]/g, "");
          nextColorImages[colorKey] = saveBase64ImageToUploads(imgVal, `${pId}-color-${cleanKey || "cut"}`);
        } else if (imgVal !== "/product_1.webp") {
          nextColorImages[colorKey] = imgVal;
        }
      }
    });
    p.colorImages = nextColorImages;
  }

  // 4. fabricImage
  if (typeof p.fabricImage === "string" && p.fabricImage.startsWith("data:image/")) {
    p.fabricImage = saveBase64ImageToUploads(p.fabricImage, `${pId}-fabric`);
  }
  if (typeof p.fabricTextureImage === "string" && p.fabricTextureImage.startsWith("data:image/")) {
    p.fabricTextureImage = saveBase64ImageToUploads(p.fabricTextureImage, `${pId}-fabric-tex`);
  }

  // 5. sizeGuideImage
  if (typeof p.sizeGuideImage === "string" && p.sizeGuideImage.startsWith("data:image/")) {
    p.sizeGuideImage = saveBase64ImageToUploads(p.sizeGuideImage, `${pId}-sizeguide`);
  }

  return p;
}

// In-memory cache for ultra-fast response & fail-safe fallback
const globalForProducts = global as unknown as { serverProductsCache?: any[]; serverProductsDirty?: boolean };

// Process-level write mutex queue to serialize all disk writes and eliminate EBUSY write lock collisions
let fileWriteChain = Promise.resolve();

function readLocalProductsBackup(): any[] {
  ensureSeedBackupExists();
  // 원격 저장소가 기준이면 오래된 번들 파일을 섞지 않고 서버 메모리(=원격 최신)만 사용한다
  if (
    remoteIsAuthoritative() &&
    Array.isArray(globalForProducts.serverProductsCache) &&
    globalForProducts.serverProductsCache.length > 0
  ) {
    return filterOutDeletedServerProducts(globalForProducts.serverProductsCache);
  }
  const runtimePath = getRuntimeProductsFilePath();
  let diskData: any[] | null = null;
  let lastReadError: unknown = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      if (fs.existsSync(runtimePath)) {
        const raw = fs.readFileSync(runtimePath, "utf-8");
        const data = JSON.parse(raw);
        lastReadError = null;
        if (Array.isArray(data) && data.length > 0) {
          diskData = filterOutDeletedServerProducts(data);
          break;
        }
      }
      break;
    } catch (e) {
      lastReadError = e;
      logSync(`READ FAIL attempt=${attempt}: ${(e as any)?.message || e}`);
      console.warn(`[Products File Read Attempt ${attempt} Warning]:`, e);
      if (attempt < 5) {
        const start = Date.now();
        while (Date.now() - start < 60) {}
      }
    }
  }
  const diskReadFailed = diskData === null && lastReadError !== null;

  // Reconciliation: if in-memory cache has newer product updates, NEVER downgrade memory with stale disk data!
  if (globalForProducts.serverProductsCache && Array.isArray(globalForProducts.serverProductsCache) && globalForProducts.serverProductsCache.length > 0) {
    // 디스크 저장이 아직 진행 중이거나 실패한 상태라면 메모리가 최신(순서 포함)이므로 그대로 사용한다.
    // (오래된 디스크 순서에 최신 값만 섞어 돌려주면 상품 순서가 이전으로 되돌아가 보인다)
    if (globalForProducts.serverProductsDirty) {
      return filterOutDeletedServerProducts(globalForProducts.serverProductsCache);
    }
    if (!diskData || diskData.length === 0) {
      return filterOutDeletedServerProducts(globalForProducts.serverProductsCache);
    }
    // 순서는 항상 메모리(가장 최근 저장) 기준으로 유지한다. 디스크 순서를 따르면 관리자가 바꾼 순서가 되돌아간다.
    // 상품별 값은 updated_at 이 더 최신인 쪽을 사용하고, 디스크에만 있는 상품(다른 경로로 추가됨)은 뒤에 붙인다.
    const diskMap = new Map(diskData.map((p: any) => [String(p?.id || ""), p]));
    const memIds = new Set<string>();
    const reconciled: any[] = [];
    for (const mp of globalForProducts.serverProductsCache) {
      const id = String(mp?.id || "");
      memIds.add(id);
      const dp = diskMap.get(id);
      if (!dp) {
        reconciled.push(mp);
        continue;
      }
      const memTime = (mp.updated_at || mp.updatedAt) ? new Date(mp.updated_at || mp.updatedAt).getTime() : 0;
      const diskTime = (dp.updated_at || dp.updatedAt) ? new Date(dp.updated_at || dp.updatedAt).getTime() : 0;
      reconciled.push(diskTime > memTime ? dp : mp);
    }
    for (const dp of diskData) {
      if (!memIds.has(String(dp?.id || ""))) reconciled.push(dp);
    }

    return filterOutDeletedServerProducts(reconciled);
  }

  if (diskData && diskData.length > 0) {
    return diskData;
  }

  // 파일은 존재하지만 읽지 못한 경우(OneDrive 잠금 등)에는 초기 원본(seed)으로 대체하지 않는다.
  // seed 가 "최신 목록"이 되어 관리자가 바꾼 순서/품절 상태를 덮어쓰는 롤백을 막기 위해 오류로 처리한다.
  if (diskReadFailed) {
    throw new Error("상품 파일을 일시적으로 읽을 수 없습니다. 잠시 후 다시 시도해주세요.");
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

// 메모리 캐시를 먼저 갱신하고 디스크에 저장한다. 저장이 끝나기 전/실패한 동안은 dirty 로 표시해
// 최신 목록 조회가 메모리(최신 순서)를 기준으로 응답하도록 한다.
async function persistProducts(list: any[]): Promise<boolean> {
  globalForProducts.serverProductsCache = list;
  globalForProducts.serverProductsDirty = true;
  let ok = false;
  try {
    ok = await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), list);
  } catch (writeErr: any) {
    console.warn("[Products Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
  }
  // 원격 저장소(Supabase) 설정 시: 파일 저장이 막히는 배포 환경에서도 영구 저장이 되도록 함께 기록한다
  let remoteOk = false;
  if (isRemoteCatalogEnabled) {
    queueRemoteSave("products", list);
    remoteOk = await flushRemoteWrites();
  }
  const persisted = ok || remoteOk;
  // 더 최신 저장이 이미 메모리를 바꿨다면(다른 요청) dirty 상태를 그대로 둔다
  logSync(`PERSIST ok=${persisted} file=${ok} remote=${remoteOk} count=${list.length} first=${list.slice(0, 5).map((p: any) => p?.id).join(",")}`);
  if (globalForProducts.serverProductsCache === list) {
    globalForProducts.serverProductsDirty = !persisted;
    // 내가 방금 쓴 파일이므로 이 인스턴스의 메모리는 디스크와 같은 상태 (다음 요청에서 자기 저장분을 다시 읽지 않도록 기록)
    if (ok || remoteOk) markMemorySyncedWithDisk();
  }
  return persisted;
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
  const slim = req?.nextUrl.searchParams.get("slim") === "1";
  return NextResponse.json(slim ? slimProductsForList(products) : products, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Access-Control-Expose-Headers": "X-Deleted-Product-Ids",
      "X-Deleted-Product-Ids": encodeURIComponent(JSON.stringify(deletedIds)),
    },
  });
}

// GET: Return authoritative products catalog directly from local JSON file
export async function GET(req: NextRequest) {
  try {
    // 다른 서버 인스턴스가 더 최근에 저장한 순서/삭제를 먼저 반영 (오래된 메모리 목록으로 응답하는 롤백 방지)
    await syncCatalogFromRemote();
    adoptDiskIfNewer();
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

    // 디스크 저장이 실패해 메모리에만 최신 목록이 남아있다면(dirty) 조회할 때마다 다시 디스크에 저장을 시도한다.
    // (재시작/코드 다시 로드 시 오래된 파일 상태로 되돌아가는 롤백 방지)
    if (
      globalForProducts.serverProductsDirty &&
      Array.isArray(globalForProducts.serverProductsCache) &&
      globalForProducts.serverProductsCache.length > 0
    ) {
      await persistProducts(globalForProducts.serverProductsCache);
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
    await syncCatalogFromRemote(true);
    adoptDiskIfNewer();
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
      if (isRemoteCatalogEnabled) {
        queueRemoteSave("products", seedProducts);
        await flushRemoteWrites();
      }
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
            if (isRemoteCatalogEnabled) queueRemoteSave("products", cleaned);
            await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), cleaned);
          }
        }
        if (isRemoteCatalogEnabled) await flushRemoteWrites();
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
      let num = p.productNo !== undefined && !isNaN(Number(p.productNo)) ? Number(p.productNo) : (m && parseInt(m[0], 10) < 100000 ? parseInt(m[0], 10) : 0);
      let code = p.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : `CC-${pId}`);

      // 신규 등록 상품: 기존/삭제된 상품이 쓰던 번호와 겹치지 않는 다음 CC-NNN 번호를 서버가 확정한다
      if (isNewItem) {
        const toNo = (v: any): number => {
          const mm = String(v ?? "").match(/(\d+)\s*$/);
          const n = mm ? parseInt(mm[1], 10) : 0;
          return n > 0 && n < 100000 ? n : 0;
        };
        const usedNos = new Set<number>();
        let maxNo = 0;
        for (const item of readLocalProductsBackup()) {
          if (String(item?.id) === pId) continue;
          const n = Number(item?.productNo) > 0 && Number(item?.productNo) < 100000 ? Number(item.productNo) : toNo(item?.productCode) || toNo(item?.id);
          if (n > 0) {
            usedNos.add(n);
            if (n > maxNo) maxNo = n;
          }
        }
        for (const d of readDeletedProductsList()) {
          const n = toNo(d);
          if (n > 0) {
            usedNos.add(n);
            if (n > maxNo) maxNo = n;
          }
        }
        if (!(num > 0) || usedNos.has(num)) {
          num = maxNo + 1;
          code = `CC-${String(num).padStart(3, "0")}`;
        } else if (!p.productCode) {
          code = `CC-${String(num).padStart(3, "0")}`;
        }
        p.productNo = num;
        p.productCode = code;
      }
      const relDate = p.releaseDate ? String(p.releaseDate).trim() : null;
      const tsRate = p.timeSaleDiscountRate !== undefined && p.timeSaleDiscountRate !== null && !isNaN(Number(p.timeSaleDiscountRate))
        ? Number(p.timeSaleDiscountRate)
        : undefined;

      const baseItemToSave: any = {
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
        baseItemToSave.releaseDate = relDate;
      } else {
        delete baseItemToSave.releaseDate;
      }

      const itemToSave = persistAndNormalizeProductImages(baseItemToSave);

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
        const prevDisplayOrder = existingList[existingIdx].displayOrder;
        existingList[existingIdx] = {
          ...itemToSave,
          displayOrder: itemToSave.displayOrder !== undefined ? itemToSave.displayOrder : prevDisplayOrder,
          created_at: itemToSave.created_at || prevCreatedAt || new Date().toISOString(),
          createdAt: itemToSave.createdAt || prevCreatedAt || new Date().toISOString(),
          updated_at: itemToSave.updated_at || new Date().toISOString(),
          updatedAt: itemToSave.updatedAt || new Date().toISOString(),
        };
      } else {
        existingList.unshift(itemToSave);
      }

      logSync(`POST single id=${pId} availableForSale=${p.availableForSale} stock=${p.stock}`);
      const persistedSingle = await persistProducts(existingList);

      // 관리자 상품 작업 감사 로그 기록
      const isNew = existingIdx === -1;
      const prevItem = existingIdx !== -1 ? existingList[existingIdx] : undefined;
      const savedProd = existingList[existingIdx !== -1 ? existingIdx : 0];
      logAdminActivity({
        adminId: "admin_master",
        adminName: "상품 관리자",
        actionType: isNew ? "CREATE" : "UPDATE",
        domain: "PRODUCT",
        targetId: pId,
        targetName: savedProd?.title || pId,
        description: isNew
          ? `신규 상품 [${savedProd?.title || pId}] 등록 (가격: ${(savedProd?.priceRange?.minVariantPrice?.amount || 0).toLocaleString()}원, 재고: ${savedProd?.stock || 0}개)`
          : `상품 [${savedProd?.title || pId}] 정보 수정 (가격: ${(savedProd?.priceRange?.minVariantPrice?.amount || 0).toLocaleString()}원, 재고: ${savedProd?.stock || 0}개, 상태: ${savedProd?.availableForSale !== false ? "판매중" : "품절/중지"})`,
        beforeData: prevItem ? { title: prevItem.title, price: prevItem.priceRange?.minVariantPrice?.amount, stock: prevItem.stock, availableForSale: prevItem.availableForSale } : undefined,
        afterData: { title: savedProd?.title, price: savedProd?.priceRange?.minVariantPrice?.amount, stock: savedProd?.stock, availableForSale: savedProd?.availableForSale },
      }).catch(() => {});

      revalidateAllProductPaths(p.handle);

      return NextResponse.json({
        success: true,
        persisted: persistedSingle,
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
    // mode:
    //  - "merge"   (기본): 서버에 더 최신(updated_at) 상품이 있으면 서버 값을 유지, 클라이언트 목록에 없는 서버 상품은 보존,
    //                      서버에서 삭제된 상품은 오래된 스냅샷으로 되살리지 않음 → 다른 기기/탭의 오래된 화면이 서버를 되돌리지 못함
    //  - "add"            : merge + 목록에 포함된 상품은 삭제 목록에서 해제 (엑셀 일괄 등록 등)
    //  - "replace"        : 전달한 목록으로 전체 교체 (백업 복원, 히어로 슬라이드 삭제 등 의도적 제거가 필요한 경우)
    const rawMode = req.nextUrl.searchParams.get("mode");
    const mode: "merge" | "add" | "replace" =
      rawMode === "replace" ? "replace" : rawMode === "add" ? "add" : "merge";

    const products = body;
    logSync(`POST batch mode=${mode} isArray=${Array.isArray(products)} count=${Array.isArray(products) ? products.length : -1} first=${Array.isArray(products) ? products.slice(0, 5).map((p: any) => p?.id).join(",") : ""}`);
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 또는 상품 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // replace / add 모드: 목록에 포함된 상품은 활성 상품이므로 deleted-products.json 에서 해제
    if (mode === "replace" || mode === "add") {
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
    }

    let finalList: any[] = products;
    let keptServerCount = 0;

    if (mode !== "replace") {
      const getTime = (p: any): number => {
        const v = p?.updated_at || p?.updatedAt;
        const t = v ? new Date(v).getTime() : 0;
        return isNaN(t) ? 0 : t;
      };

      let existingList = readLocalProductsBackup();
      if (existingList.length === 0 && globalForProducts.serverProductsCache && globalForProducts.serverProductsCache.length > 0) {
        existingList = [...globalForProducts.serverProductsCache];
      }
      const existingMap = new Map<string, any>(existingList.map((p: any) => [String(p?.id || ""), p]));

      const deletedSet = new Set(readDeletedProductsList().map(String));
      const isDeletedProduct = (p: any) =>
        deletedSet.has(String(p?.id || "")) ||
        (p?.productCode ? deletedSet.has(String(p.productCode)) : false) ||
        (p?.handle ? deletedSet.has(String(p.handle)) : false);

      const incomingIds = new Set<string>();
      const merged: any[] = [];
      for (const p of products) {
        if (!p) continue;
        // 서버에서 이미 삭제된 상품이 오래된 클라이언트 스냅샷에 남아 있어도 되살리지 않는다
        if (isDeletedProduct(p)) continue;
        const id = String(p.id || "");
        incomingIds.add(id);
        const serverItem = existingMap.get(id);
        // 브라우저 저장 용량 절약본은 업로드 이미지를 /product_1.webp 로 바꿔 둔다. 그런 스냅샷이 서버의 실제 이미지를 덮어쓰지 않게 한다.
        const hasPlaceholderImg = (x: any): boolean => {
          try {
            if (x?.featuredImage?.url === "/product_1.webp") return true;
            if (Array.isArray(x?.images) && x.images.some((im: any) => (typeof im === "string" ? im : im?.url) === "/product_1.webp")) return true;
            const d = String(x?.detailDescription || "") + String(x?.descriptionHtml || "");
            return d.includes("/product_1.webp");
          } catch {
            return false;
          }
        };
        const clientIsStrippedCopy = Boolean(serverItem) && Boolean(p?._lightStripped) && !hasPlaceholderImg(serverItem);
        const clientHasPlaceholderOverReal = Boolean(serverItem) && hasPlaceholderImg(p) && !hasPlaceholderImg(serverItem);
        if (serverItem && (clientIsStrippedCopy || clientHasPlaceholderOverReal || getTime(serverItem) > getTime(p))) {
          merged.push({ ...serverItem, displayOrder: p?.displayOrder !== undefined ? p.displayOrder : serverItem.displayOrder });
          keptServerCount++;
        } else {
          merged.push(p);
        }
      }
      // 클라이언트 목록에 없는 서버 상품(다른 기기에서 새로 등록 등)은 보존
      for (const serverItem of existingList) {
        const id = String(serverItem?.id || "");
        if (!incomingIds.has(id)) merged.push(serverItem);
      }
      finalList = merged;
    }

    finalList = finalList.map((p) => persistAndNormalizeProductImages(p));
    const persistedBatch = await persistProducts(finalList);

    revalidateAllProductPaths();

    return NextResponse.json({ success: true, persisted: persistedBatch, count: finalList.length, mode, keptServerCount }, {
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
    await syncCatalogFromRemote(true);
    adoptDiskIfNewer();
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

    // 관리자 상품 삭제 감사 로그 기록
    const deletedProducts = existingList.filter((p: any) =>
      idsToDelete.some((target) => String(p.id) === target || String(p.productCode) === target || String(p.handle) === target)
    );
    for (const dp of deletedProducts) {
      logAdminActivity({
        adminId: "admin_master",
        adminName: "상품 관리자",
        actionType: "DELETE",
        domain: "PRODUCT",
        targetId: dp.id,
        targetName: dp.title || dp.id,
        description: `상품 [${dp.title || dp.id}] 완전 삭제 처리`,
        beforeData: { title: dp.title, handle: dp.handle, price: dp.priceRange?.minVariantPrice?.amount },
      }).catch(() => {});
    }

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
    if (isRemoteCatalogEnabled) queueRemoteSave("products", updated);
    try {
      await safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), updated);
    } catch (writeErr: any) {
      console.warn("[Delete Disk Write Skipped (Serverless Environment)]:", writeErr?.message);
    }

    if (isRemoteCatalogEnabled) await flushRemoteWrites();

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
