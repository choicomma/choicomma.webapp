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
  { label: "Price-Low", value: "price-asc" },
  { label: "Price-High", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

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
    if (params.collection === undefined) return "All";
    const collection = collections.find((c) => c.handle === params.collection);
    return collection?.title;
  };

  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center w-full mb-1 pr-sides",
        className
      )}
    >
      {/* Breadcrumb */}
      <Breadcrumb className="ml-1">
        <BreadcrumbList>
          <BreadcrumbItem className="text-foreground/50 cursor-pointer hover:text-foreground/70">
            <BreadcrumbLink href="/shop" className="font-semibold">
              Shop
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-semibold">
            {renderCategoryBreadcrumb()}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Results count */}
      <span
        className="text-foreground/50 text-sm place-self-center"
        suppressHydrationWarning
      >
        {products.length} results
      </span>

      {/* Sort dropdown */}
      <Select value={sort ?? undefined} onValueChange={setSort}>
        <SelectTrigger className="-mr-3 md:w-[120px] bg-transparent border-none shadow-none hover:bg-muted/50 font-medium justify-self-end">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <div className="flex items-center justify-between pr-1">
              <SelectLabel className="text-xs">Sort</SelectLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-1 h-5 text-xs text-muted-foreground"
                onClick={() => setSort(null)}
              >
                Clear
              </Button>
            </div>
            <SelectSeparator />
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
