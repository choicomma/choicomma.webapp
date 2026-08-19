"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/sfcc/types";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    <div className="pt-top-spacing bg-background sticky top-0 z-10 md:hidden overflow-x-clip">
      <ResultsControls
        className="px-sides"
        collections={collections}
        products={products}
      />

      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("relative", className)}
      >
        {/* Always visible header */}
        <div className="flex items-center justify-between px-4 py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="font-semibold text-foreground">
              Filters{" "}
              {filterCount > 0 && (
                <span className="text-foreground/50">({filterCount})</span>
              )}
              {isOpen ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <Button
            size="sm"
            variant="ghost"
            className="font-medium text-foreground/50 hover:text-foreground/60"
            asChild
          >
            <Link href="/shop" prefetch>
              Clear
            </Link>
          </Button>
        </div>

        {/* Collapsible content */}
        <CollapsibleContent className="absolute top-full left-0 right-0 bg-background border-b px-4 pb-4 space-y-4 z-20">
          <CategoryFilter collections={collections} />
          <ColorFilter products={products} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
