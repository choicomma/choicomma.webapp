import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/constants";
import fs from "fs";
import path from "path";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRuntimeProductsFilePath() {
  return path.join(process.cwd(), "data", "products-cache.json");
}

function getInitialMockFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "parsed-products.json");
}

function readLocalProductsBackup(): any[] {
  try {
    const runtimePath = getRuntimeProductsFilePath();
    if (fs.existsSync(runtimePath)) {
      const raw = fs.readFileSync(runtimePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  try {
    const mockPath = getInitialMockFilePath();
    if (fs.existsSync(mockPath)) {
      const raw = fs.readFileSync(mockPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  return [];
}

function safeAtomicWriteJsonFile(targetPath: string, data: any) {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    console.warn("[Atomic Write Warning]:", err);
  }
}

// In-memory cache for ultra-fast response
const globalForProducts = global as unknown as { serverProductsCache?: any[] };

// Helper to generate ETag and Edge caching headers
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

  // Generate lightweight deterministic ETag
  const sampleId = products[0]?.id || "empty";
  const sampleTime = products[0]?.updated_at || products[0]?.created_at || "0";
  const etag = `W/"prod-${products.length}-${sampleId}-${sampleTime}"`;

  const ifNoneMatch = req?.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        ETag: etag,
      },
    });
  }

  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      ETag: etag,
    },
  });
}

// GET: Return authoritative products catalog from Supabase (with fallback to local JSON)
export async function GET(req: NextRequest) {
  try {
    // 1. Primary: Supabase DB 조회
    if (isSupabaseConfigured) {
      const { data: dbProducts, error: dbError } = await supabaseServer
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dbError && Array.isArray(dbProducts)) {
        if (dbProducts.length === 0) {
          globalForProducts.serverProductsCache = [];
          return makeResponse([], req);
        }
        let finalProducts = [...dbProducts];

        const localList = readLocalProductsBackup();
        const localFabricMap: Record<string, any> = {};
        const localCustomItems: any[] = [];

        localList.forEach((lp: any) => {
          if (lp?.id) {
            localFabricMap[String(lp.id)] = {
              fabricImage: lp.fabricImage || lp.fabricTextureImage || "",
              fabricTextureImage: lp.fabricTextureImage || lp.fabricImage || "",
              fabricComposition: lp.fabricComposition || "",
              showFabricInfo: lp.showFabricInfo,
              showSizeGuide: lp.showSizeGuide,
              sizeGuideImage: lp.sizeGuideImage || lp.sizeChartImage || "",
              sizeChartImage: lp.sizeChartImage || lp.sizeGuideImage || "",
              sizeMeasurements: lp.sizeMeasurements || [],
              productNo: lp.productNo,
              productCode: lp.productCode,
            };

            if (String(lp.id).startsWith("custom-prod-") || String(lp.id).startsWith("prod-custom-")) {
              localCustomItems.push(lp);
            }
          }
        });

        // Merge heroes
        const heroes = localList.filter((p: any) => p.isHeroFeatured === true || String(p.id).startsWith("hero-slide-"));
        const standaloneHeroSlides: any[] = [];
        heroes.forEach((h: any) => {
          const matched = finalProducts.find((dbp: any) => String(dbp.id) === String(h.id));
          if (matched) {
            matched.isHeroFeatured = true;
            matched.heroCustomImage = h.heroCustomImage;
          } else {
            standaloneHeroSlides.push(h);
          }
        });
        if (standaloneHeroSlides.length > 0) {
          finalProducts = [...standaloneHeroSlides, ...finalProducts];
        }

        finalProducts = finalProducts.map((p: any) => {
          const meta = p.bulkDiscount || {};
          const localFallback = localFabricMap[String(p.id)] || {};
          const relDate =
            p.releaseDate ||
            meta.releaseDate ||
            (Array.isArray(p.tags)
              ? p.tags.find((t: any) => typeof t === "string" && t.startsWith("release_date:"))?.replace("release_date:", "")
              : "") ||
            "";

          const tagPno = Array.isArray(p.tags) ? p.tags.find((t: any) => typeof t === "string" && t.startsWith("pno:"))?.replace("pno:", "") : null;
          const tagPcode = Array.isArray(p.tags) ? p.tags.find((t: any) => typeof t === "string" && t.startsWith("pcode:"))?.replace("pcode:", "") : null;

          const savedNum = p.productNo !== undefined && p.productNo !== null
            ? p.productNo
            : (meta.productNo !== undefined ? meta.productNo : (tagPno ? parseInt(tagPno, 10) : (localFallback.productNo !== undefined ? localFallback.productNo : null)));

          const m = String(p.id).match(/\d+/);
          const num = savedNum !== null && !isNaN(Number(savedNum))
            ? Number(savedNum)
            : (m && parseInt(m[0], 10) < 100000 ? parseInt(m[0], 10) : 0);

          const code = p.productCode || meta.productCode || tagPcode || localFallback.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : undefined);

          const fabImg = p.fabricImage || meta.fabricImage || localFallback.fabricImage || "";
          const fabTexture = p.fabricTextureImage || meta.fabricTextureImage || fabImg;
          const rawComp = p.fabricComposition || meta.fabricComposition || localFallback.fabricComposition || "COTTON 100% (프리미엄 코튼)";
          const fabComp = String(rawComp).replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼");
          const showFab = Boolean(fabImg);

          const effectivePrice = p.price || (p.priceRange?.minVariantPrice ? {
            amount: String(p.priceRange.minVariantPrice.amount || "0"),
            currencyCode: p.priceRange.minVariantPrice.currencyCode || "KRW",
          } : { amount: "0", currencyCode: "KRW" });

          return {
            ...p,
            price: effectivePrice,
            productNo: num,
            productCode: code,
            releaseDate: relDate,
            availableForSale: p.availableForSale !== false,
            fabricImage: fabImg,
            fabricTextureImage: fabTexture,
            fabricComposition: fabComp,
            showFabricInfo: showFab,
            showSizeGuide: p.showSizeGuide !== undefined ? p.showSizeGuide : (meta.showSizeGuide !== undefined ? meta.showSizeGuide : localFallback.showSizeGuide),
            sizeGuideImage: p.sizeGuideImage || meta.sizeGuideImage || localFallback.sizeGuideImage || "",
            sizeChartImage: p.sizeChartImage || meta.sizeChartImage || localFallback.sizeChartImage || "",
            sizeMeasurements: p.sizeMeasurements || meta.sizeMeasurements || localFallback.sizeMeasurements || [],
          };
        });


        // 4. Authoritative Sequence Ordering:
        // Respect the canonical sequence defined in localList (data/products-cache.json)
        if (localList.length > 0) {
          const orderMap = new Map<string, number>();
          localList.forEach((item: any, idx: number) => {
            orderMap.set(String(item.id), idx);
          });

          finalProducts.sort((a: any, b: any) => {
            const idxA = orderMap.has(String(a.id)) ? orderMap.get(String(a.id))! : 99999;
            const idxB = orderMap.has(String(b.id)) ? orderMap.get(String(b.id))! : 99999;
            return idxA - idxB;
          });
        }

        globalForProducts.serverProductsCache = finalProducts;
        return makeResponse(finalProducts, req);
      }

      if (dbError) {
        console.warn("Notice: Supabase products fetch error, using cache/disk fallback:", dbError.message);
      }
    }

    // 2. In-memory cache fallback
    if (globalForProducts.serverProductsCache && Array.isArray(globalForProducts.serverProductsCache)) {
      return makeResponse(globalForProducts.serverProductsCache, req);
    }

    // 3. Local disk fallback
    const fallbackList = readLocalProductsBackup();
    if (Array.isArray(fallbackList)) {
      globalForProducts.serverProductsCache = fallbackList;
      return makeResponse(fallbackList, req);
    }

    return makeResponse([], req);
  } catch (error: any) {
    console.error("Failed to read products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to read products" },
      { status: 500 }
    );
  }
}

// Helper: Format a product cleanly for Supabase DB
function formatProductForDb(p: any, createdAtIso?: string) {
  const relDate = p.releaseDate || "";
  const m = String(p.id).match(/\d+/);
  const num = p.productNo !== undefined && !isNaN(Number(p.productNo)) ? Number(p.productNo) : (m && parseInt(m[0], 10) < 100000 ? parseInt(m[0], 10) : 0);
  const code = p.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : undefined);

  return {
    id: String(p.id),
    title: p.title || "",
    handle: p.handle || String(p.id),
    categoryId: p.categoryId || "",
    categoryIds: p.categoryIds || [],
    description: p.description || "",
    detailDescription: p.detailDescription || "",
    currencyCode: p.currencyCode || "KRW",
    priceRange: p.priceRange || {},
    featuredImage: p.featuredImage || {},
    images: p.images || [],
    variants: p.variants || [],
    options: p.options || [],
    tags: [
      ...(Array.isArray(p.tags) ? p.tags.filter((t: any) => typeof t === "string" && !t.startsWith("release_date:") && !t.startsWith("pno:") && !t.startsWith("pcode:")) : []),
      ...(relDate ? [`release_date:${relDate}`] : []),
      ...(num > 0 ? [`pno:${num}`] : []),
      ...(code ? [`pcode:${code}`] : []),
    ],
    sizes: p.sizes || [],
    colors: p.colors || [],
    stock: p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock)) ? Number(p.stock) : 0,
    sizeStock: p.sizeStock || {},
    colorHexMap: p.colorHexMap || {},
    productLabel: p.productLabel || "",
    isMainFeatured: Boolean(p.isMainFeatured),
    availableForSale: p.availableForSale !== false,
    isTimeSale: Boolean(p.isTimeSale),
    bulkDiscount: {
      ...(p.bulkDiscount || { enabled: false, rules: [] }),
      productNo: num,
      productCode: code,
      releaseDate: relDate,
      fabricImage: p.fabricImage || p.fabricTextureImage || "",
      fabricTextureImage: p.fabricTextureImage || p.fabricImage || "",
      fabricComposition: p.fabricComposition || "",
      showFabricInfo: Boolean(p.fabricImage || p.fabricTextureImage),
      showSizeGuide: p.showSizeGuide !== undefined ? p.showSizeGuide : false,
      sizeGuideImage: p.sizeGuideImage || p.sizeChartImage || "",
      sizeChartImage: p.sizeChartImage || p.sizeGuideImage || "",
      sizeMeasurements: p.sizeMeasurements || [],
    },
    created_at: createdAtIso || p.createdAt || p.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// POST: Save updated products directly to Supabase DB and local disk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // -------------------------------------------------------------
    // CASE A: Single Product Fast Upsert (High performance 0.1s save)
    // -------------------------------------------------------------
    const singleProduct = body?.product || (!Array.isArray(body) && body?.id ? body : null);
    if (singleProduct) {
      const p = singleProduct;
      const pId = String(p.id || "");
      if (!pId || pId === "undefined" || pId === "null") {
        return NextResponse.json({ success: false, error: "Invalid product id" }, { status: 400 });
      }
      const isNewItem = body?.isNew || !p.created_at;

      // Unique handle guarantee
      let safeHandle = (p.handle && String(p.handle).trim()) || pId;
      if (!safeHandle.includes(pId)) {
        safeHandle = `${safeHandle}-${pId}`;
      }
      p.handle = safeHandle;

      // Top-order guarantee: If new item, assign top timestamp (now + 10s)
      const targetCreatedAt = isNewItem ? new Date(Date.now() + 10000).toISOString() : (p.created_at || p.createdAt || new Date().toISOString());
      const formattedSingle = formatProductForDb(p, targetCreatedAt);

      // 1. Local disk fallback & Memory cache FIRST (Never lost on refresh)
      try {
        let existingList = readLocalProductsBackup();
        const existingIdx = existingList.findIndex((item: any) => String(item.id) === pId);
        if (existingIdx !== -1) {
          existingList[existingIdx] = { ...existingList[existingIdx], ...p, productNo: formattedSingle.bulkDiscount.productNo, productCode: formattedSingle.bulkDiscount.productCode };
        } else {
          existingList.unshift({ ...p, productNo: formattedSingle.bulkDiscount.productNo, productCode: formattedSingle.bulkDiscount.productCode });
        }
        safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), existingList);
        globalForProducts.serverProductsCache = existingList;
      } catch (fsErr) {
        console.warn("Local disk update warning:", fsErr);
      }

      // 2. Supabase DB Upsert
      if (isSupabaseConfigured) {
        try {
          const { error: dbError } = await supabaseServer
            .from("products")
            .upsert(formattedSingle, { onConflict: "id" });

          if (dbError) {
            console.warn("[Single Product Upsert Warning]:", dbError.message);
            // Fallback retry with id as handle if handle collision occurred
            if (dbError.message?.includes("products_handle_key")) {
              formattedSingle.handle = `prod-${pId}`;
              await supabaseServer.from("products").upsert(formattedSingle, { onConflict: "id" });
            }
          }
        } catch (dbErr: any) {
          console.warn("[Single Product DB Error]:", dbErr.message);
        }
      }

      try {
        revalidateTag(TAGS.products);
        revalidatePath("/", "layout");
        if (p.handle) {
          revalidatePath(`/product/${p.handle}`, "page");
          revalidatePath(`/product/${encodeURIComponent(p.handle)}`, "page");
        }
      } catch (revErr) {}

      return NextResponse.json({ success: true, product: p }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // -------------------------------------------------------------
    // CASE B: Full Catalog Array Batch Sync (Re-ordering, bulk save)
    // -------------------------------------------------------------
    const products = body;
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 또는 상품 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 1. Immediately update Local runtime file and In-memory cache FIRST (Atomic write)
    globalForProducts.serverProductsCache = products;
    safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), products);

    // 2. Sync to Supabase (Delete omitted products & Upsert active products with unique handle guarantee)
    if (isSupabaseConfigured) {
      try {
        const incomingIdSet = new Set(products.map((p: any) => String(p.id)));

        // 2-1. Detect and delete omitted products
        const { data: existingRows } = await supabaseServer
          .from("products")
          .select("id");

        if (Array.isArray(existingRows) && existingRows.length > 0) {
          const idsToDelete = existingRows
            .map((r: any) => String(r.id))
            .filter((id) => !incomingIdSet.has(id));

          if (idsToDelete.length > 0) {
            console.log(`[Products Sync] Deleting ${idsToDelete.length} removed products from Supabase...`);
            for (let i = 0; i < idsToDelete.length; i += 50) {
              const delChunk = idsToDelete.slice(i, i + 50);
              await supabaseServer.from("products").delete().in("id", delChunk);
            }
          }
        }

        // 2-2. Deduplicate handles to strictly prevent "products_handle_key" unique constraint crashes
        const seenHandles = new Set<string>();
        const baseTime = Date.now();
        const formatted = products.map((p: any, idx: number) => {
          let h = (p.handle && String(p.handle).trim()) || String(p.id);
          if (seenHandles.has(h)) {
            h = `${h}-${String(p.id)}`;
          }
          seenHandles.add(h);
          p.handle = h;

          return formatProductForDb(p, new Date(baseTime - idx * 1000).toISOString());
        });

        // 2-3. Batch Upsert (50 chunks) with resilient per-row fallback
        const batchSize = 50;
        for (let i = 0; i < formatted.length; i += batchSize) {
          const chunk = formatted.slice(i, i + batchSize);
          const { error: dbError } = await supabaseServer
            .from("products")
            .upsert(chunk, { onConflict: "id" });

          if (dbError) {
            console.warn(`[Batch Upsert Warning] Chunk (${i}~${i + chunk.length}) failed: ${dbError.message}. Retrying row-by-row...`);
            for (const item of chunk) {
              const { error: singleErr } = await supabaseServer
                .from("products")
                .upsert(item, { onConflict: "id" });
              if (singleErr && singleErr.message?.includes("products_handle_key")) {
                item.handle = `prod-${item.id}`;
                await supabaseServer.from("products").upsert(item, { onConflict: "id" });
              }
            }
          }
        }
      } catch (dbErr: any) {
        console.warn("Supabase products sync error:", dbErr.message);
      }
    }

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

// DELETE: Immediately delete one or more products by ID from Supabase and cache
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

    // 1. Delete from Supabase
    if (isSupabaseConfigured) {
      for (let i = 0; i < idsToDelete.length; i += 50) {
        const chunk = idsToDelete.slice(i, i + 50);
        const { error } = await supabaseServer.from("products").delete().in("id", chunk);
        if (error) {
          console.error("Failed to delete products from Supabase:", error);
        }
      }
    }

    // 2. Update in-memory cache
    if (Array.isArray(globalForProducts.serverProductsCache)) {
      const deleteSet = new Set(idsToDelete);
      globalForProducts.serverProductsCache = globalForProducts.serverProductsCache.filter(
        (p: any) => !deleteSet.has(String(p.id))
      );
    }

    // 3. Update local runtime file fallback (Atomic)
    try {
      const existingList = readLocalProductsBackup();
      const deleteSet = new Set(idsToDelete);
      const updated = existingList.filter((p: any) => !deleteSet.has(String(p.id)));
      safeAtomicWriteJsonFile(getRuntimeProductsFilePath(), updated);
    } catch (fsErr) {}

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error("Failed to delete product(s):", error);
    return NextResponse.json(
      { success: false, message: error.message || "상품 삭제 실패" },
      { status: 500 }
    );
  }
}
