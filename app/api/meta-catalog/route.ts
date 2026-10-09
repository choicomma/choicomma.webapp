import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_BASE_URL = "https://choicomma.shop";
const BRAND_NAME = "CHOICOMMA";

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
    console.warn("[Meta Catalog] Failed reading runtime products cache:", e);
  }

  return [];
}

async function getProductsCatalog(): Promise<any[]> {
  return readLocalProductsBackup();
}

function cleanHtmlToText(rawHtml: string): string {
  if (!rawHtml) return "";
  let text = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function resolveImageUrl(p: any, baseUrl: string): string {
  let rawUrl = "";

  if (p.featuredImage) {
    if (typeof p.featuredImage === "string") rawUrl = p.featuredImage;
    else if (p.featuredImage.url) rawUrl = p.featuredImage.url;
  }

  if ((!rawUrl || rawUrl.startsWith("data:image")) && Array.isArray(p.images) && p.images.length > 0) {
    for (const img of p.images) {
      const cand = typeof img === "string" ? img : img?.url;
      if (cand && !cand.startsWith("data:image")) {
        rawUrl = cand;
        break;
      }
    }
  }

  if (!rawUrl || rawUrl.startsWith("data:image")) {
    return `${baseUrl}/choicomma_main_logo.png`;
  }

  if (rawUrl.startsWith("//")) {
    return `https:${rawUrl}`;
  }
  if (rawUrl.startsWith("/")) {
    return `${baseUrl}${rawUrl}`;
  }
  if (rawUrl.startsWith("http://")) {
    return rawUrl.replace("http://", "https://");
  }
  return rawUrl;
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXml(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: NextRequest) {
  try {
    const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

    const allProducts = await getProductsCatalog();

    // Exclude banner items and hero-slide items that are not actual products
    const validProducts = allProducts.filter((p: any) => {
      if (!p || !p.id) return false;
      const strId = String(p.id);
      if (strId.startsWith("hero-slide-")) return false;
      if (p.categoryId === "main_banner" || (Array.isArray(p.categoryIds) && p.categoryIds.includes("main_banner"))) {
        return false;
      }
      return true;
    });

    const items = validProducts.map((p: any) => {
      const id = String(p.id);
      const title = (p.title || `초이콤마 상품 ${id}`).trim();

      let desc = cleanHtmlToText(p.description || p.detailDescription || "");
      if (!desc || desc.length < 5) {
        desc = `${title} | CHOICOMMA 디자이너 감성의 프리미엄 패션 브랜드 초이콤마`;
      }
      if (desc.length > 4500) {
        desc = desc.substring(0, 4500) + "...";
      }

      // In stock vs out of stock
      const isAvailable = p.availableForSale !== false;
      const isStockPositive = p.stock === undefined || p.stock === null || Number(p.stock) > 0;
      const availability = isAvailable && isStockPositive ? "in stock" : "out of stock";
      const condition = "new";

      // Price calculation
      let rawPrice = 0;
      if (p.price?.amount !== undefined) {
        rawPrice = Number(p.price.amount) || 0;
      } else if (p.priceRange?.minVariantPrice?.amount !== undefined) {
        rawPrice = Number(p.priceRange.minVariantPrice.amount) || 0;
      } else if (Array.isArray(p.variants) && p.variants[0]?.price?.amount !== undefined) {
        rawPrice = Number(p.variants[0].price.amount) || 0;
      }
      const priceNum = Math.max(0, Math.round(rawPrice));
      const price = `${priceNum} KRW`;

      // Sale Price (Time sale or promotion discount)
      let salePrice = "";
      if (p.isTimeSale) {
        let discountPriceNum = 0;
        if (p.timeSaleDiscountPrice && Number(p.timeSaleDiscountPrice) > 0) {
          discountPriceNum = Math.round(Number(p.timeSaleDiscountPrice));
        } else if (p.timeSaleDiscountRate && Number(p.timeSaleDiscountRate) > 0 && priceNum > 0) {
          discountPriceNum = Math.round(priceNum * (1 - Number(p.timeSaleDiscountRate) / 100));
        }
        if (discountPriceNum > 0 && discountPriceNum < priceNum) {
          salePrice = `${discountPriceNum} KRW`;
        }
      }

      const link = `${siteUrl}/product/${encodeURIComponent(p.handle || id)}`;
      const image_link = resolveImageUrl(p, siteUrl);
      const brand = BRAND_NAME;

      return {
        id,
        title,
        description: desc,
        availability,
        condition,
        price,
        sale_price: salePrice,
        link,
        image_link,
        brand,
      };
    });

    // 1. XML (Google / Meta RSS 2.0 Feed)
    if (format === "xml" || format === "rss") {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
      xml += `  <channel>\n`;
      xml += `    <title>${BRAND_NAME} Meta Catalog</title>\n`;
      xml += `    <link>${siteUrl}</link>\n`;
      xml += `    <description>${BRAND_NAME} Meta Commerce Data Feed</description>\n`;

      for (const item of items) {
        xml += `    <item>\n`;
        xml += `      <g:id>${escapeXml(item.id)}</g:id>\n`;
        xml += `      <g:title><![CDATA[${item.title}]]></g:title>\n`;
        xml += `      <g:description><![CDATA[${item.description}]]></g:description>\n`;
        xml += `      <g:availability>${item.availability}</g:availability>\n`;
        xml += `      <g:condition>${item.condition}</g:condition>\n`;
        xml += `      <g:price>${item.price}</g:price>\n`;
        if (item.sale_price) {
          xml += `      <g:sale_price>${item.sale_price}</g:sale_price>\n`;
        }
        xml += `      <g:link>${escapeXml(item.link)}</g:link>\n`;
        xml += `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>\n`;
        xml += `      <g:brand>${BRAND_NAME}</g:brand>\n`;
        xml += `    </item>\n`;
      }

      xml += `  </channel>\n`;
      xml += `</rss>\n`;

      return new NextResponse(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    // 2. CSV (Default - Recommended for Meta Commerce Manager)
    const headers = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "sale_price",
      "link",
      "image_link",
      "brand",
    ];

    const csvLines = [headers.join(",")];

    for (const item of items) {
      const line = [
        escapeCsvField(item.id),
        escapeCsvField(item.title),
        escapeCsvField(item.description),
        escapeCsvField(item.availability),
        escapeCsvField(item.condition),
        escapeCsvField(item.price),
        escapeCsvField(item.sale_price),
        escapeCsvField(item.link),
        escapeCsvField(item.image_link),
        escapeCsvField(item.brand),
      ].join(",");
      csvLines.push(line);
    }

    // Add UTF-8 BOM so Excel and Meta parser handle Korean characters flawlessly
    const csvContent = "\uFEFF" + csvLines.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'inline; filename="meta-catalog.csv"',
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("[Meta Catalog] Generation error:", error);
    return new NextResponse(`Error generating meta catalog: ${error?.message || "Unknown error"}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
