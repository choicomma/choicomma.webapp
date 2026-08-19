"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useParams } from "next/navigation";

export function useFilterCount() {
  const params = useParams<{ collection: string }>();
  const [color] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // Count active filters
  let count = 0;

  // Count color filters
  if (color.length > 0) {
    count += color.length;
  }

  // Count collection filter (if not on "all" products)
  if (params.collection && params.collection !== undefined) {
    count += 1;
  }

  return count;
}
