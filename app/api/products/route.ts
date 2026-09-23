import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

function getProductsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "parsed-products.json");
}

// In-memory cache for ultra-fast response
const globalForProducts = global as unknown as { serverProductsCache?: any[] };

// GET: Return authoritative products catalog from Supabase (with fallback to local JSON)
export async function GET() {
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

        globalForProducts.serverProductsCache = finalProducts;
        return NextResponse.json(finalProducts, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }

      if (dbError) {
        console.warn("Notice: Supabase products fetch error, using cache/disk fallback:", dbError.message);
      }
    }

    // 2. In-memory cache fallback
    if (globalForProducts.serverProductsCache && Array.isArray(globalForProducts.serverProductsCache)) {
      return NextResponse.json(globalForProducts.serverProductsCache, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // 3. Local disk fallback
    const filePath = getProductsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      globalForProducts.serverProductsCache = data;
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    return NextResponse.json([]);
  } catch (error: any) {
    console.error("Failed to read products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to read products" },
      { status: 500 }
    );
  }
}

// POST: Save updated products directly to Supabase DB and local disk
export async function POST(req: NextRequest) {
  try {
    const products = await req.json();
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 1. Primary: Sync to Supabase (Delete omitted products & Upsert active products)
    if (isSupabaseConfigured) {
      try {
        const incomingIdSet = new Set(products.map((p: any) => String(p.id)));

        // 1-1. Detect and delete products from Supabase that are no longer in the products catalog
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

        // 1-2. Upsert active products with ordered timestamps to guarantee frozen sort order
        const baseTime = Date.now();
        const formatted = products.map((p: any, idx: number) => ({
          id: p.id,
          title: p.title || "",
          handle: p.handle || p.id,
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
          tags: p.tags || [],
          sizes: p.sizes || [],
          colors: p.colors || [],
          stock: p.stock || 100,
          sizeStock: p.sizeStock || {},
          colorHexMap: p.colorHexMap || {},
          productLabel: p.productLabel || "",
          isMainFeatured: Boolean(p.isMainFeatured),
          availableForSale: p.availableForSale !== false,
          isTimeSale: Boolean(p.isTimeSale),
          bulkDiscount: p.bulkDiscount || { enabled: false, rules: [] },
          created_at: new Date(baseTime - idx * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // 배치 분할 Upsert (50개 단위 안정적 처리)
        const batchSize = 50;
        for (let i = 0; i < formatted.length; i += batchSize) {
          const chunk = formatted.slice(i, i + batchSize);
          const { error: dbError } = await supabaseServer
            .from("products")
            .upsert(chunk, { onConflict: "id" });

          if (dbError) {
            console.warn(`Notice: Failed to upsert products chunk (${i}~${i + chunk.length}):`, dbError.message);
          }
        }
      } catch (dbErr: any) {
        console.warn("Supabase products sync error:", dbErr.message);
      }
    }

    // 2. In-memory cache update
    globalForProducts.serverProductsCache = products;

    // 3. Local disk fallback (if writable)
    try {
      const filePath = getProductsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
    } catch (fsErr) {
      // Ignored on Serverless read-only
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
