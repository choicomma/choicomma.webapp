import { Product } from "@/lib/sfcc/types";
import { mockProducts } from "@/lib/sfcc/mock/products";

export function getProductBaseTitle(title?: string): string {
  if (!title) return "";
  let s = title.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim();
  // Protect F/W and S/S from slash splitting
  s = s.replace(/F\/W/gi, "__FW__").replace(/S\/S/gi, "__SS__");
  // Split on / or -
  s = s.split(/[\/\-]/)[0];
  s = s.replace(/__FW__/gi, "F/W").replace(/__SS__/gi, "S/S").trim();
  return s;
}

export function getProductDirectColor(product: Product): string {
  if (!product) return "";
  
  // 1. Title / COLOR check: e.g. "MERINO WOOL-SPAN SHIRTS / BLACK"
  if (product.title && product.title.includes("/")) {
    const parts = product.title.split("/");
    const colorPart = parts[parts.length - 1].trim();
    if (
      colorPart &&
      colorPart.length < 15 &&
      !colorPart.includes("개") &&
      !colorPart.includes("세트")
    ) {
      return colorPart;
    }
  }

  // 2. Direct colors array on product
  if (Array.isArray(product.colors) && product.colors.length > 0) {
    const c: any = product.colors[0];
    const val = typeof c === "object" && c != null ? c.name || c.value || c.id || String(c) : String(c);
    if (val && val.trim()) return val.trim();
  }

  // 3. Options (Color)
  if (product.options && Array.isArray(product.options)) {
    const cOpt = product.options.find(
      (o: any) => o.name?.toLowerCase() === "color" || o.name === "색상"
    );
    if (cOpt && Array.isArray(cOpt.values) && cOpt.values.length > 0) {
      const v = String(cOpt.values[0]).trim();
      if (v) return v;
    }
  }

  // 4. colorImages keys
  if ((product as any).colorImages && typeof (product as any).colorImages === "object") {
    const keys = Object.keys((product as any).colorImages);
    if (keys.length > 0 && keys[0] && keys[0].trim()) {
      return keys[0].trim();
    }
  }

  return "";
}

export interface ExtractedProductOptions {
  colors: string[];
  sizes: string[];
  colorImageMap: Record<string, string>;
  colorHandleMap: Record<string, string>;
  sisterProducts: any[];
}

export function getAllProductOptions(
  product: Product,
  extraProducts?: any[]
): ExtractedProductOptions {
  if (!product) {
    return { colors: [], sizes: ["FREE"], colorImageMap: {}, colorHandleMap: {}, sisterProducts: [] };
  }

  // Combine mockProducts with extraProducts
  let allList: any[] = mockProducts;

  if (extraProducts && extraProducts.length > 0) {
    allList = [
      ...extraProducts,
      ...allList.filter((item) => !extraProducts.some((ep) => ep.id === item.id)),
    ];
  }

  const baseTitle = getProductBaseTitle(product.title);

  // Find sister products (products sharing the exact base title)
  const sisterProducts = allList.filter((p) => {
    if (!p) return false;
    if (p.id === product.id || p.handle === product.handle) return true;
    if (!baseTitle) return false;
    const otherBase = getProductBaseTitle(p.title);
    return otherBase && otherBase === baseTitle;
  });

  const colorsSet = new Set<string>();
  const sizesSet = new Set<string>();
  const colorImageMap: Record<string, string> = {};
  const colorHandleMap: Record<string, string> = {};

  // 1. Direct colorImages on current product
  if ((product as any).colorImages && typeof (product as any).colorImages === "object") {
    Object.entries((product as any).colorImages).forEach(([c, img]) => {
      if (c && img) {
        const trimmed = c.trim();
        colorsSet.add(trimmed);
        colorImageMap[trimmed] = String(img);
        colorHandleMap[trimmed] = product.handle || String(product.id);
      }
    });
  }

  // 2. Iterate sister products (including self)
  sisterProducts.forEach((sp) => {
    const spImg =
      sp.featuredImage?.url ||
      (sp.images && sp.images[0]?.url) ||
      (product.images && product.images[0]?.url);
    const spHandle = sp.handle || (sp.id ? String(sp.id) : "");
    const isCurrent = sp.id === product.id || sp.handle === product.handle;

    // Title / [color] check - Highest priority for sister product mapping
    if (sp.title && sp.title.includes("/")) {
      const parts = sp.title.split("/");
      const colorPart = parts[parts.length - 1].trim();
      if (
        colorPart &&
        colorPart.length < 15 &&
        !colorPart.includes("개") &&
        !colorPart.includes("세트")
      ) {
        colorsSet.add(colorPart);
        if (spImg && !colorImageMap[colorPart]) {
          colorImageMap[colorPart] = spImg;
        }
        // Directly maps this dedicated color sister product
        colorHandleMap[colorPart] = spHandle;
      }
    }

    // Raw colors
    const rawC = Array.isArray(sp.colors) ? sp.colors : [];
    rawC.forEach((c: any) => {
      let val = "";
      if (typeof c === "object" && c != null) {
        val = c.name || c.value || c.title || c.label || c.color || c.id || "";
      } else {
        val = String(c ?? "");
      }
      val = val.trim();
      if (val && !val.includes("[object") && val !== "undefined" && val !== "null") {
        colorsSet.add(val);
        if (spImg && !colorImageMap[val]) {
          colorImageMap[val] = spImg;
        }
        if (!colorHandleMap[val] || isCurrent) {
          colorHandleMap[val] = spHandle;
        }
      }
    });

    // Options (Color)
    if (sp.options && Array.isArray(sp.options)) {
      const cOpt = sp.options.find(
        (o: any) => o.name?.toLowerCase() === "color" || o.name === "색상"
      );
      if (cOpt && Array.isArray(cOpt.values)) {
        cOpt.values.forEach((v: any) => {
          let val = "";
          if (typeof v === "object" && v != null) {
            val = v.name || v.value || v.title || v.label || v.color || v.id || "";
          } else {
            val = String(v ?? "");
          }
          val = val.trim();
          if (val && !val.includes("[object") && val !== "undefined" && val !== "null") {
            colorsSet.add(val);
            if (spImg && !colorImageMap[val]) {
              colorImageMap[val] = spImg;
            }
            if (!colorHandleMap[val] || isCurrent) {
              colorHandleMap[val] = spHandle;
            }
          }
        });
      }
    }

    // Sizes
    let spSizes: any[] = Array.isArray(sp.sizes) ? sp.sizes : [];
    if (spSizes.length === 0 && sp.options && Array.isArray(sp.options)) {
      const sOpt = sp.options.find(
        (o: any) => o.name?.toLowerCase() === "size" || o.name === "사이즈"
      );
      if (sOpt && Array.isArray(sOpt.values)) spSizes = sOpt.values;
    }
    spSizes.forEach((s: any) => {
      const val =
        typeof s === "object" && s != null ? s.name || s.value || s.id || String(s) : String(s);
      if (val && val.trim()) {
        sizesSet.add(val.trim());
      }
    });
  });

  const finalColors = Array.from(colorsSet);
  const finalSizes = Array.from(sizesSet);

  // Fallback handle for any unmapped color
  finalColors.forEach((c) => {
    if (!colorHandleMap[c]) {
      colorHandleMap[c] = product.handle || String(product.id);
    }
  });

  return {
    colors: finalColors.length > 0 ? finalColors : ["ONE COLOR"],
    sizes: finalSizes.length > 0 ? finalSizes : ["FREE"],
    colorImageMap,
    colorHandleMap,
    sisterProducts,
  };
}
