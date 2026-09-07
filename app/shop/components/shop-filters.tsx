"use client";

import React, { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Collection } from "@/lib/sfcc/types";
import { CategoryFilter } from "./category-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";

const sortOptions = [
  { label: "낮은 가격순", value: "price-asc" },
  { label: "높은 가격순", value: "price-desc" },
  { label: "최신 등록순", value: "newest" },
  { label: "오래된순", value: "oldest" },
];

export function DesktopFilters({
  collections,
  className,
}: {
  collections: Collection[];
  className?: string;
}) {
  const [sort, setSort] = useQueryState("sort", parseAsString);

  return (
    <aside
      className={cn(
        "h-fit flex flex-col justify-start pl-sides pt-2 pb-12 bg-white",
        className
      )}
    >
      <div className="flex flex-col gap-3 col-span-2">
        {/* Header: '카테고리' title on Left, '정렬 기준' dropdown in place of reset button on Right */}
        <div className="flex items-center justify-between pl-1 min-h-[28px] mb-1">
          <h2 className="text-lg md:text-xl font-extrabold leading-none text-neutral-950">카테고리</h2>

          {/* Sort Dropdown positioned at the filter header */}
          <Select value={sort ?? undefined} onValueChange={setSort}>
            <SelectTrigger className="w-auto p-0 h-auto bg-transparent border-none shadow-none hover:bg-transparent font-medium text-xs text-neutral-500 hover:text-neutral-950 cursor-pointer focus:ring-0">
              <SelectValue placeholder="정렬 기준" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <div className="flex items-center justify-between pr-1">
                  <SelectLabel className="text-xs font-bold">정렬</SelectLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-1 h-5 text-xs text-muted-foreground"
                    onClick={() => setSort(null)}
                  >
                    초기화
                  </Button>
                </div>
                <SelectSeparator />
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs font-medium cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Suspense fallback={null}>
          <CategoryFilter collections={collections} />
        </Suspense>
      </div>
    </aside>
  );
}
