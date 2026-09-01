"use client";

import React, { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/sfcc/types";
import Link from "next/link";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { CategoryFilter } from "./category-filter";

export function DesktopFilters({
  collections,
  className,
}: {
  collections: Collection[];
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 h-fit flex flex-col justify-start pl-sides pt-6 md:pt-top-spacing self-start z-10",
        className
      )}
    >
      <div className="flex flex-col gap-3 col-span-2">
        <div className="flex items-center justify-between pl-1 min-h-[28px] mb-1">
          <h2 className="text-lg md:text-xl font-extrabold leading-none text-neutral-950">필터</h2>
          <Button
            size={"sm"}
            variant="ghost"
            aria-label="Clear all filters"
            className="font-bold text-xs text-neutral-400 hover:text-neutral-950 h-auto py-1 px-1.5"
            asChild
          >
            <Link href="/shop" prefetch>
              초기화
            </Link>
          </Button>
        </div>
        <Suspense fallback={null}>
          <CategoryFilter collections={collections} />
        </Suspense>
      </div>
    </aside>
  );
}
