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
  hideCategoryTitle?: boolean;
}

const CATEGORY_KO_MAP: Record<string, string> = {
  "all": "전체보기",
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

export function CategoryFilter({
  collections,
  className,
  hideCategoryTitle = false,
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
    <div className={cn("space-y-6", className)}>
      {/* Category List */}
      <div>
        {!hideCategoryTitle && (
          <h3 className="font-extrabold mb-3.5 text-xs md:text-sm uppercase tracking-wider text-neutral-950">카테고리</h3>
        )}
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              className={cn(
                "text-left w-full text-sm font-bold cursor-pointer transition-all transform hover:translate-x-1.5 uppercase tracking-wide block py-1",
                params.collection === undefined && !queryVal
                  ? "font-black text-neutral-950 translate-x-1.5 underline underline-offset-4"
                  : "text-neutral-600 hover:text-neutral-950 font-semibold"
              )}
              href="/shop"
              aria-label="카테고리: 전체보기"
              prefetch
            >
              전체보기
            </Link>
          </li>
          {collections.map((cat) => {
            const isSelected = params.collection === cat.handle;
            const displayName = CATEGORY_KO_MAP[cat.handle] || CATEGORY_KO_MAP[cat.title] || cat.title;
            return (
              <li key={cat.handle}>
                <Link
                  className={cn(
                    "text-left w-full text-sm cursor-pointer transition-all transform hover:translate-x-1.5 uppercase tracking-wide block py-1",
                    isSelected ? "font-black text-neutral-950 translate-x-1.5 underline underline-offset-4" : "text-neutral-600 hover:text-neutral-950 font-semibold"
                  )}
                  href={`/shop/${cat.handle}`}
                  aria-pressed={isSelected}
                  aria-label={`카테고리: ${displayName}`}
                  prefetch
                >
                  {displayName}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Search Input Box */}
      <div className="pt-4 border-t border-neutral-200/80">
        <h3 className="font-extrabold mb-2.5 text-xs md:text-sm uppercase tracking-wider text-neutral-950">검색</h3>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품 검색어 입력..."
              className="w-full h-10 pl-9 pr-8 bg-white border border-neutral-300 rounded-xl text-xs md:text-sm font-semibold text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-950 p-1 cursor-pointer"
                title="검색어 초기화"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
