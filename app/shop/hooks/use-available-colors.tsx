"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Product } from "@/lib/sfcc/types";
import { Color } from "@/components/ui/color-picker";
import { COLOR_MAP } from "@/lib/constants";
import { useEffect } from "react";

const allColors: Color[] = [
  { name: "Olive", value: COLOR_MAP["olive"] },
  { name: "Beige", value: COLOR_MAP["beige"] },
  { name: "White", value: COLOR_MAP["white"] },
  { name: "Blue", value: COLOR_MAP["blue"] },
  { name: "Brown", value: COLOR_MAP["brown"] },
  { name: "Sand", value: COLOR_MAP["sand"] },
  { name: "Green", value: COLOR_MAP["green"] },
  { name: "Black", value: COLOR_MAP["black"] },
  { name: "Orange", value: COLOR_MAP["orange"] },
  { name: "Dark Brown", value: COLOR_MAP["dark-brown"] },
];

const getColorName = (color: Color | [Color, Color]) => {
  if (Array.isArray(color)) {
    const [color1, color2] = color;
    return `${color1.name}/${color2.name}`;
  }
  return color.name;
};

export function useAvailableColors(products: Product[]) {
  const [color, setColor] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // Extract available colors from products
  const availableColorNames = new Set<string>();

  products.forEach((product) => {
    const colorOption = product.options.find(
      (option) => option.name.toLowerCase() === "color"
    );

    if (colorOption) {
      colorOption.values.forEach((value) => {
        // Map product color values to our color names
        const colorName = value.name.toLowerCase();
        const matchingColor = allColors.find(
          (c) => c.name.toLowerCase() === colorName
        );
        if (matchingColor) {
          availableColorNames.add(matchingColor.name);
        }
      });
    }
  });

  // Filter to only show available colors
  const availableColors = allColors.filter((c) =>
    availableColorNames.has(c.name)
  );

  // Auto-remove unavailable color filters
  useEffect(() => {
    if (color.length > 0) {
      const validColors = color.filter((colorName) =>
        availableColorNames.has(colorName)
      );

      if (validColors.length !== color.length) {
        setColor(validColors);
      }
    }
  }, [products, color, setColor, availableColorNames]);

  const toggleColor = (colorInput: Color | [Color, Color]) => {
    const colorName = getColorName(colorInput);
    setColor(
      color.includes(colorName)
        ? color.filter((c) => c !== colorName)
        : [...color, colorName]
    );
  };

  const selectedColors = availableColors.filter((c) => color.includes(c.name));

  return {
    availableColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
  };
}
