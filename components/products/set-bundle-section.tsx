"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { useCart } from "@/components/cart/cart-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, Gift, Percent } from "lucide-react";
import { toast } from "sonner";

import { mockProducts } from "@/lib/sfcc/mock/products";

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
}

const DEFAULT_SET_SALES: SetSaleBundle[] = [
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

interface SetBundleSectionProps {
  products: Product[];
}

export function SetBundleSection({ products }: SetBundleSectionProps) {
  const [setSales, setSetSales] = useState<SetSaleBundle[]>([]);
  const [mounted, setMounted] = useState(false);
  const { addCartItem } = useCart();

  // Combine provided products with full mockProducts to guarantee resolving any product ID
  const allProducts = [...products, ...mockProducts].filter(
    (p, index, self) => index === self.findIndex((t) => t.id === p.id)
  );

  const loadSetSales = () => {
    const saved = localStorage.getItem("admin_set_sales");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSetSales(parsed.filter((s: SetSaleBundle) => s.status === "active"));
        return;
      } catch (e) {}
    }
    setSetSales(DEFAULT_SET_SALES.filter((s) => s.status === "active"));
  };

  useEffect(() => {
    setMounted(true);
    loadSetSales();
    window.addEventListener("storage", loadSetSales);
    return () => window.removeEventListener("storage", loadSetSales);
  }, []);

  if (!mounted || setSales.length === 0) return null;

  const handleAddSetToCart = (setBundle: SetSaleBundle) => {
    let setOriginalTotal = 0;
    let addedItemCount = 0;

    setBundle.items.forEach((itemConfig) => {
      const prod = allProducts.find((p) => p.id === itemConfig.productId);
      if (!prod) return;

      const singlePrice = parseFloat(prod.priceRange.minVariantPrice.amount);
      const discountedSinglePrice = Math.round(
        singlePrice * (1 - setBundle.discountRate / 100)
      );

      setOriginalTotal += singlePrice * itemConfig.quantity;
      addedItemCount += itemConfig.quantity;

      const variant = {
        id: `${prod.id}-set-${setBundle.id}`,
        title: `${prod.title} [${setBundle.discountRate}% 세트할인가]`,
        availableForSale: true,
        selectedOptions: [
          { name: "Set", value: setBundle.title },
          { name: "Discount", value: `${setBundle.discountRate}% OFF` },
        ],
        price: {
          amount: discountedSinglePrice.toString(),
          currencyCode: prod.currencyCode || "KRW",
        },
      };

      addCartItem(variant, prod, itemConfig.quantity);
    });

    const setFinalPrice = Math.round(
      setOriginalTotal * (1 - setBundle.discountRate / 100)
    );

    toast.success(
      `${setBundle.title} ${setBundle.discountRate}% 할인 세트 패키지(${formatPrice(
        setFinalPrice.toString()
      )})가 장바구니에 담겼습니다!`
    );
  };

  return (
    <div className="w-full mb-10 p-5 md:p-7 bg-neutral-950 text-white border border-neutral-800 rounded-3xl space-y-6 shadow-md">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-white text-neutral-950 flex items-center justify-center shadow-sm shrink-0">
            <Gift className="size-6 text-neutral-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-neutral-800 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-neutral-700">
                ADMIN 연동 기획전
              </Badge>
              <span className="text-xs font-bold text-neutral-300">
                {setSales.length}개 세트 할인가 진행 중
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mt-0.5">
              세트 아이템 할인 기획전 (Set Bundle Sale)
            </h3>
          </div>
        </div>
        <p className="text-xs text-neutral-300 font-medium">
          2개 이상의 상품을 함께 구매 시 <strong>특가 세트 할인가</strong>가 적용됩니다.
        </p>
      </div>

      {/* Set Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {setSales.map((setBundle) => {
          // Resolve items
          const resolvedItems = setBundle.items
            .map((ic) => {
              const p = allProducts.find((prod) => prod.id === ic.productId);
              return { config: ic, product: p };
            })
            .filter((item): item is { config: SetSaleItemConfig; product: Product } => item.product != null);

          const originalSum = resolvedItems.reduce((sum, item) => {
            return (
              sum +
              parseFloat(item.product.priceRange.minVariantPrice.amount) *
                item.config.quantity
            );
          }, 0);

          const setDiscountedSum = Math.round(
            originalSum * (1 - setBundle.discountRate / 100)
          );

          // Build descriptive text
          const bundleDescStr = resolvedItems
            .map((item) => `${item.product.title} (${item.config.quantity}개)`)
            .join(" + ");

          return (
            <div
              key={setBundle.id}
              className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-extrabold text-neutral-950 bg-neutral-100 border border-neutral-300 px-3 py-1 rounded-xl">
                    {setBundle.title}
                  </span>
                  <Badge className="bg-neutral-950 text-white font-black text-xs px-2.5 py-1 rounded-xl">
                    {setBundle.discountRate}% OFF
                  </Badge>
                </div>
                <p className="text-xs font-bold text-neutral-800 leading-snug line-clamp-2">
                  {bundleDescStr}
                </p>
              </div>

              {/* Items Images Row with Plus connectors */}
              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {resolvedItems.map((item, idx) => (
                  <div key={item.product.id} className="flex items-center gap-2 shrink-0">
                    {idx > 0 && <span className="font-black text-neutral-950 text-base">+</span>}
                    <div className="flex items-center gap-2.5 p-2 bg-neutral-50 rounded-2xl border border-neutral-200">
                      <div className="relative aspect-[4/5] w-12 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                        <Image
                          src={item.product.featuredImage.url}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                        {item.config.quantity > 1 && (
                          <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-black px-1.5 py-0.2 rounded-md">
                            x{item.config.quantity}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 max-w-[120px]">
                        <p className="text-[11px] font-bold text-neutral-900 truncate">
                          {item.product.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-semibold">
                          {formatPrice(item.product.priceRange.minVariantPrice.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation Footer */}
              <div className="pt-3 border-t border-neutral-100 space-y-3">
                <div className="flex items-baseline justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <span>개별 정가 합계</span>
                    <span className="line-through font-mono">
                      {formatPrice(originalSum.toString())}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">세트가</span>
                    <span className="text-lg font-black text-neutral-950 font-mono">
                      {formatPrice(setDiscountedSum.toString())}
                    </span>
                  </div>
                </div>

                {/* Add Set Package Button */}
                <Button
                  onClick={() => handleAddSetToCart(setBundle)}
                  className="w-full h-11 bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                  {setBundle.discountRate}% 할인 세트가 ({formatPrice(setDiscountedSum.toString())}) 장바구니 담기
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
