import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getProductsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "parsed-products.json");
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

      if (!dbError && Array.isArray(dbProducts) && dbProducts.length > 0) {
        let finalProducts = [...dbProducts];
        try {
          const filePath = getProductsFilePath();
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            const heroes = parsed.filter((p: any) => p.isHeroFeatured === true || String(p.id).startsWith("hero-slide-"));
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
          }
        } catch (e) {}

        // Ensure releaseDate, fabricImage, fabricComposition, sizeGuide, and availableForSale are cleanly populated
        let localFabricMap: Record<string, any> = {};
        try {
          const filePath = getProductsFilePath();
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((lp: any) => {
                if (lp.id) {
                  localFabricMap[String(lp.id)] = {
                    fabricImage: lp.fabricImage || lp.fabricTextureImage || "",
                    fabricTextureImage: lp.fabricTextureImage || lp.fabricImage || "",
                    fabricComposition: lp.fabricComposition || "",
                    showFabricInfo: lp.showFabricInfo,
                    showSizeGuide: lp.showSizeGuide,
                    sizeGuideImage: lp.sizeGuideImage || lp.sizeChartImage || "",
                    sizeChartImage: lp.sizeChartImage || lp.sizeGuideImage || "",
                    sizeMeasurements: lp.sizeMeasurements || [],
                  };
                }
              });
            }
          }
        } catch (e) {}

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
          const m = String(p.id).match(/\d+/);
          const num = p.productNo !== undefined && !isNaN(Number(p.productNo)) ? Number(p.productNo) : (m ? parseInt(m[0], 10) : 0);

          const fabImg = p.fabricImage || meta.fabricImage || localFallback.fabricImage || "";
          const fabTexture = p.fabricTextureImage || meta.fabricTextureImage || fabImg;
          const rawComp = p.fabricComposition || meta.fabricComposition || localFallback.fabricComposition || "COTTON 100% (프리미엄 코튼)";
          const fabComp = String(rawComp).replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼");
          const showFab = Boolean(fabImg);

          return {
            ...p,
            productNo: num,
            productCode: p.productCode || (num > 0 ? `CC-${String(num).padStart(3, "0")}` : undefined),
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

        // Ensure locally added products in JSON or cache that are not yet in Supabase are not lost
        try {
          const filePath = getProductsFilePath();
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const localArr = JSON.parse(raw);
            if (Array.isArray(localArr)) {
              const dbIdSet = new Set(finalProducts.map((p: any) => String(p.id)));
              const missingLocal = localArr.filter((lp: any) => lp?.id && !dbIdSet.has(String(lp.id)));
              if (missingLocal.length > 0) {
                console.log(`[Products Sync] Merged ${missingLocal.length} local custom products into response.`);
                finalProducts = [...missingLocal, ...finalProducts];
              }
            }
          }
        } catch (e) {}

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
    const filePath = getProductsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      globalForProducts.serverProductsCache = data;
      return makeResponse(data, req);
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
  const num = p.productNo !== undefined && !isNaN(Number(p.productNo)) ? Number(p.productNo) : (m ? parseInt(m[0], 10) : 0);

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
      ...(Array.isArray(p.tags) ? p.tags.filter((t: any) => typeof t === "string" && !t.startsWith("release_date:")) : []),
      ...(relDate ? [`release_date:${relDate}`] : []),
    ],
    sizes: p.sizes || [],
    colors: p.colors || [],
    stock: p.stock || 100,
    sizeStock: p.sizeStock || {},
    colorHexMap: p.colorHexMap || {},
    productLabel: p.productLabel || "",
    isMainFeatured: Boolean(p.isMainFeatured),
    availableForSale: p.availableForSale !== false,
    isTimeSale: Boolean(p.isTimeSale),
    bulkDiscount: {
      ...(p.bulkDiscount || { enabled: false, rules: [] }),
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
      const pId = String(p.id);

      // Unique handle guarantee
      let safeHandle = (p.handle && String(p.handle).trim()) || pId;
      if (!safeHandle.includes(pId)) {
        safeHandle = `${safeHandle}-${pId}`;
      }
      p.handle = safeHandle;

      const formattedSingle = formatProductForDb(p);

      // 1. Local disk fallback & Memory cache FIRST (Never lost on refresh)
      try {
        const filePath = getProductsFilePath();
        let existingList: any[] = [];
        if (fs.existsSync(filePath)) {
          existingList = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
        const existingIdx = existingList.findIndex((item: any) => String(item.id) === pId);
        if (existingIdx !== -1) {
          existingList[existingIdx] = { ...existingList[existingIdx], ...p };
        } else {
          existingList.unshift(p);
        }
        fs.writeFileSync(filePath, JSON.stringify(existingList, null, 2), "utf-8");
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

    // 1. Immediately update Local disk and In-memory cache FIRST
    // This guarantees that immediate browser refresh gets the exact state without waiting for slow DB roundtrips!
    globalForProducts.serverProductsCache = products;
    try {
      const filePath = getProductsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
    } catch (fsErr) {
      // Ignored on read-only environments
    }

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
            // Resilient fallback: upsert item-by-item so newly added items succeed even if older rows have issues
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

    // 3. Update local JSON file fallback
    try {
      const filePath = getProductsFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data: any[] = JSON.parse(raw);
        const deleteSet = new Set(idsToDelete);
        const updated = data.filter((p: any) => !deleteSet.has(String(p.id)));
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
      }
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
