"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { useParams } from "next/navigation";
import { Collection, Product } from "@/lib/sfcc/types";
import { cn } from "@/lib/utils";

const sortOptions = [
  { label: "낮은 가격순", value: "price-asc" },
  { label: "높은 가격순", value: "price-desc" },
  { label: "최신 등록순", value: "newest" },
  { label: "오래된순", value: "oldest" },
];

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
};

export default function ResultsControls({
  collections,
  products,
  className,
}: {
  collections: Pick<Collection, "handle" | "title">[];
  products: Product[];
  className?: string;
}) {
  const params = useParams<{ collection: string }>();
  const [sort, setSort] = useQueryState("sort", parseAsString);

  const renderCategoryBreadcrumb = () => {
    if (params.collection === undefined) return "전체보기";
    const collection = collections.find((c) => c.handle === params.collection);
    return (
      CATEGORY_KO_MAP[params.collection] ||
      (collection ? CATEGORY_KO_MAP[collection.handle] || CATEGORY_KO_MAP[collection.title] || collection.title : "전체보기")
    );
  };

  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center w-full mb-1 px-4 md:px-0",
        className
      )}
    >
      {/* Breadcrumb - Hidden on mobile, visible on PC */}
      <Breadcrumb className="ml-1 hidden md:block">
        <BreadcrumbList>
          <BreadcrumbItem className="text-foreground/50 cursor-pointer hover:text-foreground/70">
            <BreadcrumbLink href="/shop" className="font-semibold">
              쇼핑몰
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-semibold">
            {renderCategoryBreadcrumb()}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Results count - Hidden on mobile, visible on PC */}
      <span
        className="text-foreground/50 text-sm place-self-center font-medium hidden md:inline-block"
        suppressHydrationWarning
      >
        총 {products.length}개 상품
      </span>

      {/* Sort dropdown */}
      <Select value={sort ?? undefined} onValueChange={setSort}>
        <SelectTrigger className="-mr-3 md:w-[130px] bg-transparent border-none shadow-none hover:bg-muted/50 font-medium justify-self-end text-xs">
          <SelectValue placeholder="정렬 기준" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <div className="flex items-center justify-between pr-1">
              <SelectLabel className="text-xs">정렬</SelectLabel>
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
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
