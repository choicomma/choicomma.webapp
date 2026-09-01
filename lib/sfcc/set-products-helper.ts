import { Product } from "./types";
import { mockProducts } from "./mock/products";

export interface SetSaleItemConfig {
  productId: string;
  quantity: number;
}

export interface SetSaleBundle {
  id: string;
  title: string;
  items: SetSaleItemConfig[];
  discountRate: number;
  status: "active" | "ended";
  createdAt?: string;
}

export const INITIAL_SET_SALES: SetSaleBundle[] = [
  {
    id: "SET-1",
    title: "[초이콤마 룩북 세트 1]",
    items: [
      { productId: "outer-product-1", quantity: 1 },
      { productId: "outer-product-27", quantity: 1 },
    ],
    discountRate: 25,
    status: "active",
  },
  {
    id: "SET-2",
    title: "[초이콤마 럭셔리 무드 세트 2]",
    items: [
      { productId: "outer-product-38", quantity: 1 },
      { productId: "outer-product-14", quantity: 2 },
    ],
    discountRate: 30,
    status: "active",
  },
];

/**
 * Convert a SetSaleBundle configuration into a full Product object
 * so it can be registered as a standalone set item in the product catalog.
 */
export function convertSetBundleToProduct(
  setBundle: SetSaleBundle,
  extraProducts: Product[] = []
): Product {
  const catalog = [...extraProducts, ...mockProducts].filter(
    (p, idx, self) => idx === self.findIndex((t) => t.id === p.id)
  );

  const resolvedItems = (setBundle.items || [])
    .map((ic) => {
      const p = catalog.find((prod) => prod.id === ic.productId);
      return { config: ic, product: p };
    })
    .filter((item): item is { config: SetSaleItemConfig; product: Product } => item.product != null);

  const originalTotal = resolvedItems.reduce((sum, item) => {
    return (
      sum +
      parseFloat(item.product.priceRange?.minVariantPrice?.amount || (item.product as any).price || "0") *
        item.config.quantity
    );
  }, 0);

  const discountRate = setBundle.discountRate || 20;
  const setDiscountedTotal = Math.round(
    originalTotal * (1 - discountRate / 100)
  );

  const featuredImg =
    resolvedItems[0]?.product?.featuredImage || {
      url: "/product_1.webp",
      altText: setBundle.title,
      width: 1200,
      height: 1200,
    };

  const allImages = resolvedItems
    .map((i) => i.product.featuredImage)
    .filter((img): img is NonNullable<typeof img> => img != null && Boolean(img.url));

  const uniqueImages = allImages.filter(
    (img, index, self) => index === self.findIndex((t) => t.url === img.url)
  );

  const bundleDesc = resolvedItems
    .map((i) => `${i.product.title} (${i.config.quantity}개)`)
    .join(" + ");

  return {
    id: `set-product-${setBundle.id}`,
    handle: `set-bundle-${setBundle.id.toLowerCase()}`,
    title: setBundle.title,
    description: `${setBundle.title} [${discountRate}% OFF 세트특가] - 구성: ${bundleDesc}`,
    descriptionHtml: `<p><strong>${setBundle.title}</strong></p><p>세트 구성: ${bundleDesc}</p><p>개별 정가 합계: ₩${originalTotal.toLocaleString()} ➔ <strong>세트할인가: ₩${setDiscountedTotal.toLocaleString()} (${discountRate}% OFF)</strong></p>`,
    categoryId: "timesale",
    tags: ["SET_SALE", "SPECIAL", "TIMESALE", "CHOI.ce", "SET_BUNDLE", `${discountRate}% OFF`],
    featuredImage: featuredImg,
    images: uniqueImages.length > 0 ? uniqueImages : [featuredImg],
    availableForSale: setBundle.status === "active",
    currencyCode: "KRW",
    priceRange: {
      minVariantPrice: {
        amount: setDiscountedTotal.toString(),
        currencyCode: "KRW",
      },
      maxVariantPrice: {
        amount: setDiscountedTotal.toString(),
        currencyCode: "KRW",
      },
    },
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          { id: "black", name: "Black" },
          { id: "ivory", name: "Ivory" },
          { id: "camel", name: "Camel" },
        ],
      },
      {
        id: "size",
        name: "Size",
        values: [
          { id: "1", name: "1" },
          { id: "2", name: "2" },
          { id: "3", name: "3" },
        ],
      },
    ],
    variants: [],
    seo: {
      title: setBundle.title,
      description: bundleDesc,
    },
  };
}

/**
 * Reads admin_set_sales from localStorage and converts all active sets to registered Product objects.
 */
export function getRegisteredSetProducts(extraProducts: Product[] = []): Product[] {
  if (typeof window === "undefined") return [];

  let setSales = INITIAL_SET_SALES;
  const saved = localStorage.getItem("admin_set_sales");
  if (saved) {
    try {
      setSales = JSON.parse(saved);
    } catch (e) {}
  }

  return setSales
    .filter((s) => s.status === "active")
    .map((setBundle) => convertSetBundleToProduct(setBundle, extraProducts));
}
