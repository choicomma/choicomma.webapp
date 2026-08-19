"use client";

import { Collection } from "@/lib/sfcc/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface CategoryFilterProps {
  collections: Collection[];
  className?: string;
}

export function CategoryFilter({
  collections,
  className,
}: CategoryFilterProps) {
  const params = useParams<{ collection: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryVal = searchParams?.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(queryVal);

  useEffect(() => {
    setSearchTerm(queryVal);
  }, [queryVal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/shop");
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    router.push("/shop");
  };

  return (
    <div className={cn("bg-muted rounded-lg py-4 px-3 flex flex-col gap-4", className)}>
      <div>
        <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-neutral-900">Categories</h3>
        <ul className="flex flex-col gap-1.5">
          {collections.map((cat) => {
            const isSelected = params.collection === cat.handle;
            return (
              <li key={cat.handle}>
                <Link
                  className={cn(
                    "text-left w-full text-xs font-semibold cursor-pointer transition-all transform hover:translate-x-1 uppercase tracking-wider block py-0.5",
                    isSelected ? "font-extrabold text-neutral-950 translate-x-1" : "text-neutral-600 hover:text-neutral-900"
                  )}
                  href={`/shop/${cat.handle}`}
                  aria-pressed={isSelected}
                  aria-label={`Filter by category: ${cat.title}`}
                  prefetch
                >
                  {cat.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Search Input Box */}
      <div className="pt-3 border-t border-neutral-200/80">
        <h3 className="font-semibold mb-2 text-xs uppercase tracking-wider text-neutral-900">Search</h3>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품 검색어..."
              className="w-full h-8.5 pl-8 pr-7 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 text-neutral-400 hover:text-neutral-950 p-1 cursor-pointer"
                title="검색어 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
