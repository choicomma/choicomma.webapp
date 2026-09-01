"use client";

import { ColorPicker } from "@/components/ui/color-picker";
import { ColorSwatchSkeleton } from "@/components/ui/color-swatch-skeleton";
import { Product } from "@/lib/sfcc/types";
import { cn } from "@/lib/utils";
import { useAvailableColors } from "../hooks/use-available-colors";
import { AnimatePresence, motion } from "motion/react";

interface ColorFilterProps {
  products?: Product[];
  className?: string;
}

export function ColorFilter({ products = [], className }: ColorFilterProps) {
  const { availableColors, selectedColors, toggleColor } =
    useAvailableColors(products);

  const isLoading = products.length === 0;
  const atLeastOneColor = availableColors.length > 0;

  if (!atLeastOneColor && !isLoading) {
    return null;
  }

  return (
    <div className={cn("bg-muted rounded-md py-4 px-3", className)}>
      <h3 className="mb-4 font-semibold text-xs uppercase tracking-wider text-neutral-900">컬러 (Color)</h3>
      {isLoading ? (
        <ColorSwatchSkeleton count={4} />
      ) : (
        <ColorPicker
          colors={availableColors}
          selectedColors={selectedColors}
          onColorChange={toggleColor}
        />
      )}
    </div>
  );
}
