"use client";

import { CartItem } from "@/lib/sfcc/types";
import { DEFAULT_OPTION } from "@/lib/constants";
import { createUrl, getColorHex } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { DeleteItemButton } from "./delete-item-button";
import { EditItemQuantityButton } from "./edit-item-quantity-button";
import { UpdateType } from "./cart-context";
import { formatPrice } from "@/lib/sfcc/utils";
import { ColorSwatch } from "@/components/ui/color-picker";
import { useProductImages } from "../products/variant-selector";
import { translateProductTitle, getCurrentLanguage } from "@/lib/i18n/translation";
import { useState, useEffect } from "react";

type MerchandiseSearchParams = {
  [key: string]: string;
};

interface CartItemProps {
  item: CartItem;
  optimisticUpdate: (merchandiseId: string, updateType: UpdateType) => void;
  onCloseCart: () => void;
}

export function CartItemCard({
  item,
  optimisticUpdate,
  onCloseCart,
}: CartItemProps) {
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    window.addEventListener("language-changed", handleLangChange);
    return () => {
      window.removeEventListener("language_changed", handleLangChange);
      window.removeEventListener("language-changed", handleLangChange);
    };
  }, []);
  const merchandiseSearchParams = {} as MerchandiseSearchParams;

  item.merchandise.selectedOptions.forEach(({ name, value }) => {
    if (value !== DEFAULT_OPTION) {
      merchandiseSearchParams[name.toLowerCase()] = value.toLowerCase();
    }
  });

  const merchandiseUrl = createUrl(
    `/product/${item.merchandise.product.handle}`,
    new URLSearchParams(merchandiseSearchParams)
  );

  const imgs = useProductImages(
    item.merchandise.product,
    item.merchandise.selectedOptions
  );
  const [renderImage] = imgs;

  const validOptions = item.merchandise.selectedOptions.filter(
    (opt) => opt.value !== DEFAULT_OPTION
  );

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3 shadow-sm transition-all">
      <div className="flex flex-row gap-4 items-center">
        <div className="relative w-24 h-24 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700">
          <Image
            className="w-full h-full object-cover"
            width={180}
            height={180}
            blurDataURL={renderImage.url}
            alt={renderImage.altText || item.merchandise.product.title}
            src={renderImage.url}
          />
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0 h-24 py-0.5">
          <div>
            <Link
              href={merchandiseUrl}
              onClick={onCloseCart}
              className="block z-30"
              prefetch
            >
              <span className="text-xs font-black text-neutral-900 dark:text-white line-clamp-1 hover:underline">
                {item.merchandise.product.title}
              </span>
            </Link>
            {validOptions.length > 0 && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5">
                {validOptions.map((opt) => opt.value).join(" / ")}
              </p>
            )}
            <p className="text-xs font-black text-neutral-900 dark:text-white font-mono mt-1">
              {formatPrice(
                item.cost.totalAmount.amount,
                item.cost.totalAmount.currencyCode
              )}
            </p>
          </div>

          <div className="flex justify-between items-center mt-auto">
            <div className="flex h-7 flex-row items-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <EditItemQuantityButton
                item={item}
                type="minus"
                optimisticUpdate={optimisticUpdate}
              />
              <span className="w-7 text-center text-xs font-extrabold text-neutral-900 dark:text-white">
                {item.quantity}
              </span>
              <EditItemQuantityButton
                item={item}
                type="plus"
                optimisticUpdate={optimisticUpdate}
              />
            </div>
            <DeleteItemButton item={item} optimisticUpdate={optimisticUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}
