"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/sfcc/types";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { useFilterCount } from "../hooks/use-filter-count";
import { useProducts } from "../providers/products-provider";
import ResultsControls from "./results-controls";

interface MobileFiltersProps {
  collections: Collection[];
  className?: string;
}

export function MobileFilters({ collections, className }: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterCount = useFilterCount();
  const { products } = useProducts();

  return (
    <div className="pt-16 sm:pt-20 bg-white sticky top-0 z-30 md:hidden overflow-visible w-full border-b border-neutral-200/80 -mt-px">
      <div className={cn("relative w-full", className)}>
        {/* Single Line Header on Mobile: Filters Button on Left, Sort Dropdown on Right */}
        <div className="flex items-center justify-between px-4 py-2.5 w-full bg-white">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="font-bold text-xs text-neutral-900 hover:bg-neutral-100 p-1.5 h-auto rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <span>필터</span>
            {filterCount > 0 && (
              <span className="text-neutral-500 font-normal">({filterCount})</span>
            )}
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-600" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
            )}
          </Button>

          <div className="flex items-center">
            <ResultsControls
              className="p-0 m-0 grid-cols-1"
              collections={collections}
              products={products}
            />
          </div>
        </div>

        {/* Dropdown Content with Clean UI & Top-Right Reset Button */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-200 px-4 py-4 space-y-4 z-40 shadow-2xl max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Category Filter with Top-Right Reset Button */}
            <div className="relative">
              <div className="absolute top-0 right-0 z-10">
                <Link
                  href="/shop"
                  prefetch
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>초기화</span>
                </Link>
              </div>

              <CategoryFilter collections={collections} hideCategoryTitle={true} />
            </div>

            <ColorFilter products={products} />
          </div>
        )}
      </div>
    </div>
  );
}
