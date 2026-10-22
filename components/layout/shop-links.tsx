"use client";

import Link from "next/link";
import { Collection } from "@/lib/sfcc/types";
import { useTranslation } from "@/lib/i18n/translation";

interface ShopLinksProps {
  collections: Collection[];
  align?: "left" | "right";
  label?: string;
  colorClass?: string;
  includeShopAll?: boolean;
}

const CATEGORY_KO_MAP: Record<string, string> = {
  "SHOP ALL": "전체보기",
  "timesale": "타임세일",
  "TIMESALE": "타임세일",
  "outer": "아우터",
  "OUTER": "아우터",
  "top": "상의",
  "TOP": "상의",
  "bottom": "하의",
  "BOTTOM": "하의",
  "bag": "가방",
  "BAG": "가방",
  "shoes": "신발",
  "SHOES": "신발",
  "accessory": "악세사리",
  "ACCESSORY": "악세사리",
  "top-seller": "베스트",
  "Top Seller": "베스트",
};

export function ShopLinks({
  collections,
  label = "카테고리",
  align = "left",
  colorClass,
  includeShopAll = false,
}: ShopLinksProps) {
  const { currentLang, t } = useTranslation();

  const textColor =
    colorClass ||
    (align === "right"
      ? "text-white"
      : "text-neutral-900 dark:text-neutral-100");

  const shopAllDisplay = t("전체보기") || "SHOP ALL";

  return (
    <div className={align === "right" ? "text-right text-white" : "text-left"}>
      <ul className="flex flex-col gap-3.5 leading-relaxed mt-3">
        {includeShopAll && (
          <li>
            <Link
              href="/shop"
              prefetch
              className={`text-base md:text-lg font-black uppercase hover:underline transition-all block text-black dark:text-white tracking-wide ${textColor}`}
            >
              {shopAllDisplay}
            </Link>
          </li>
        )}
        {collections.map((item) => {
          const koName = CATEGORY_KO_MAP[item.handle] || CATEGORY_KO_MAP[item.title] || item.title;
          const translated = t(koName);
          const displayTitle = currentLang === "ko" ? koName : (translated !== koName ? translated : (item.title || item.handle));

          return (
            <li key={item.handle}>
              <Link
                href={`/shop/${item.handle}`}
                prefetch
                className={`text-base md:text-lg font-medium hover:underline transition-all block tracking-wide ${textColor}`}
              >
                {displayTitle}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

