import Link from "next/link";
import { Collection } from "@/lib/sfcc/types";

interface ShopLinksProps {
  collections: Collection[];
  align?: "left" | "right";
  label?: string;
  colorClass?: string;
  includeShopAll?: boolean;
}

export function ShopLinks({
  collections,
  label = "Category",
  align = "left",
  colorClass,
  includeShopAll = false,
}: ShopLinksProps) {
  const textColor =
    colorClass ||
    (align === "right"
      ? "text-white"
      : "text-neutral-900 dark:text-neutral-100");

  return (
    <div className={align === "right" ? "text-right text-white" : "text-left"}>


      <ul className="flex flex-col gap-2 leading-relaxed mt-3">
        {includeShopAll && (
          <li>
            <Link
              href="/shop"
              prefetch
              className={`text-sm md:text-base font-bold uppercase hover:underline transition-all block text-black dark:text-white ${textColor}`}
            >
              SHOP ALL
            </Link>
          </li>
        )}
        {collections.map((item) => (
          <li key={item.handle}>
            <Link
              href={`/shop/${item.handle}`}
              prefetch
              className={`text-sm md:text-base font-normal hover:underline transition-all block ${textColor}`}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
