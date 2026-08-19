import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/sfcc/types";
import { Suspense } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/sfcc/utils";
import { QuickOptionModal } from "./quick-option-modal";

// Returns badge config by productLabel value
function getLabelBadge(label?: string) {
  switch (label) {
    case "BLACK_LABEL":
      return { text: "BLACK LABEL", className: "bg-neutral-950 text-white" };
    case "PREMIUM":
      return { text: "PREMIUM", className: "bg-neutral-950 text-white" };
    case "ESSENTIAL":
      return { text: "ESSENTIAL", className: "bg-neutral-950 text-white" };
    default:
      return null;
  }
}

export function FeaturedProductLabel({
  product,
  principal = false,
  className,
}: {
  product: Product;
  principal?: boolean;
  className?: string;
}) {
  const isSetProduct =
    product.tags?.includes("SET_SALE") || product.id.startsWith("set-product-");

  const labelBadge = getLabelBadge((product as any).productLabel);

  if (principal) {
    return (
      <div
        className={cn(
          "p-5 md:p-6 bg-white border border-neutral-100 rounded-none shadow-xl w-full flex flex-col justify-between gap-3.5 text-neutral-950",
          className
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-start w-full">
          {/* Left Column: Badge, Title */}
          <div className="flex flex-col items-start min-w-0">
            <div className="mb-2">
              {isSetProduct ? (
                <Badge className="font-extrabold rounded-none text-xs px-3.5 py-1 bg-neutral-950 text-white border-none">
                  SET SALE
                </Badge>
              ) : labelBadge ? (
                <Badge className={`font-black rounded-none text-xs px-3.5 py-1 border-none tracking-wider ${labelBadge.className}`}>
                  {labelBadge.text}
                </Badge>
              ) : null}
            </div>

            <Link
              href={`/product/${product.handle}`}
              className="block text-xl md:text-2xl font-bold text-neutral-950 hover:underline leading-snug tracking-tight line-clamp-2"
            >
              {product.title}
            </Link>
          </div>

          {/* Right Column: Description */}
          <div className="text-xs md:text-sm font-medium text-neutral-700 leading-relaxed line-clamp-3">
            {product.description || "The Verde Lounge Chair is a bold blend of sculptural form and deep comfort."}
          </div>
        </div>

        {/* Bottom Row: Price on Left, Add To Cart Button on Right */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-100/80">
          <p className="text-2xl md:text-3xl font-extrabold text-neutral-950 font-mono leading-none">
            {formatPrice(
              product.priceRange.minVariantPrice.amount,
              product.currencyCode
            )}
          </p>

          <Suspense fallback={null}>
            <QuickOptionModal product={product} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3.5 md:p-4 bg-white w-full rounded-none flex flex-col justify-between gap-3 border border-neutral-200/80 shadow-2xs transition-all",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 min-w-0 w-full">
        <div>
          {isSetProduct ? (
            <Badge className="bg-neutral-950 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-none uppercase inline-block border-none">
              SET SALE
            </Badge>
          ) : labelBadge ? (
            <Badge className={`font-black text-[10px] px-2.5 py-0.5 rounded-none uppercase inline-block border-none tracking-widest ${labelBadge.className}`}>
              {labelBadge.text}
            </Badge>
          ) : null}
        </div>
        <Link
          href={`/product/${product.handle}`}
          className="block text-sm md:text-base font-bold text-neutral-950 hover:underline leading-tight tracking-tight line-clamp-2"
        >
          {product.title}
        </Link>
      </div>

      {/* Bottom Row: Price & Add To Cart Button */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-neutral-100">
        <p className="text-sm sm:text-base font-extrabold text-neutral-950 font-mono tracking-tight shrink-0">
          {formatPrice(
            product.priceRange.minVariantPrice.amount,
            product.currencyCode
          )}
        </p>

        <Suspense fallback={null}>
          <QuickOptionModal product={product} />
        </Suspense>
      </div>
    </div>
  );
}
