"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { useCart } from "@/components/cart/cart-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingBag, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface QuickOptionModalProps {
  product: Product;
  trigger?: React.ReactNode;
}

const DEFAULT_COLORS = [
  { id: "black", name: "Black", hex: "#18181b" },
  { id: "ivory", name: "Ivory", hex: "#fef3c7" },
  { id: "camel", name: "Camel", hex: "#b45309" },
  { id: "navy", name: "Navy", hex: "#1e3a8a" },
];

const DEFAULT_SIZES = [
  { id: "1", name: "1" },
  { id: "2", name: "2" },
  { id: "3", name: "3" },
];

export function QuickOptionModal({ product, trigger }: QuickOptionModalProps) {
  const [open, setOpen] = useState(false);
  const { addCartItem } = useCart();

  // Color & Size selection states
  const colors = product.options?.find(
    (opt) => opt.name.toLowerCase() === "color"
  )?.values.map((v) => ({ id: v.id, name: v.name })) || DEFAULT_COLORS;

  const sizes = product.options?.find(
    (opt) => opt.name.toLowerCase() === "size"
  )?.values.map((v) => ({ id: v.id, name: v.name })) || DEFAULT_SIZES;

  const [selectedColor, setSelectedColor] = useState<string>(
    colors[0]?.name || "Black"
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    sizes[0]?.name || "1"
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);

    const variant = {
      id: `${product.id}-${selectedColor.toLowerCase()}-${selectedSize.toLowerCase()}`,
      title: `${product.title} (${selectedColor} / ${selectedSize})`,
      availableForSale: true,
      selectedOptions: [
        { name: "Color", value: selectedColor },
        { name: "Size", value: selectedSize },
      ],
      price: product.priceRange.minVariantPrice,
    };

    addCartItem(variant, product, quantity);

    setTimeout(() => {
      setIsAdding(false);
      setOpen(false);
      toast.success(
        `${product.title} (${selectedColor} / ${selectedSize}) ${quantity}개가 장바구니에 담겼습니다.`
      );
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="p-2 sm:p-2.5 rounded-none bg-neutral-950 hover:bg-black text-white font-extrabold text-xs md:text-sm flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
            aria-label="Add To Cart"
          >
            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-white shrink-0" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-neutral-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-extrabold text-neutral-950">
              옵션 & 수량 선택
            </DialogTitle>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              원하시는 컬러, 사이즈 및 수량을 선택해 주세요.
            </p>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">
          {/* Product Header Card */}
          <div className="flex gap-4 items-center bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80">
            <div className="relative aspect-[4/5] w-16 overflow-hidden rounded-xl bg-neutral-200 shrink-0">
              <Image
                src={product.featuredImage.url}
                alt={product.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-neutral-900 truncate">
                {product.title}
              </h4>
              <p className="text-sm font-extrabold text-neutral-950 mt-1">
                {formatPrice(
                  product.priceRange.minVariantPrice.amount,
                  product.currencyCode
                )}
              </p>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-700">컬러 (Color)</span>
              <span className="text-neutral-950 font-black">{selectedColor}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const isSelected = selectedColor === c.name;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-700">사이즈 (Size)</span>
              <span className="text-neutral-950 font-black">{selectedSize}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const isSelected = selectedSize === s.name;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSize(s.name)}
                    className={`min-w-[48px] py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selection Counter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-700">수량 (Quantity)</span>
              <span className="text-neutral-950 font-black">{quantity}개</span>
            </div>
            <div className="flex items-center gap-3 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-200/80 max-w-[150px]">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="size-7 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center font-black text-xs transition-all cursor-pointer active:scale-95"
              >
                -
              </button>
              <span className="flex-1 text-center font-black text-xs font-mono">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="size-7 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-black text-xs transition-all cursor-pointer hover:bg-black active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Selection Summary Pill & Realtime Total Price */}
          <div className="p-3 bg-neutral-900 text-white border border-neutral-800 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-300 font-extrabold">선택 조합:</span>
              <Badge className="bg-white text-neutral-950 font-black px-2.5 py-0.5 rounded-lg text-[11px]">
                {selectedColor} / {selectedSize} / {quantity}개
              </Badge>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 font-bold block">총 금액</span>
              <span className="text-sm font-black text-white font-mono">
                {formatPrice(
                  (parseFloat(product.priceRange.minVariantPrice.amount) * quantity).toString(),
                  product.currencyCode
                )}
              </span>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full h-12 bg-neutral-950 hover:bg-black text-white font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            {isAdding ? "담는 중..." : `${quantity}개 장바구니에 담기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
