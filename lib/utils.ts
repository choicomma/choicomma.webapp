import { clsx, type ClassValue } from "clsx";
import { ReadonlyURLSearchParams } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { COLOR_MAP } from "./constants";

export const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const createUrl = (
  pathname: string,
  params: URLSearchParams | ReadonlyURLSearchParams
) => {
  const paramsString = params.toString();
  const queryString = `${paramsString.length ? "?" : ""}${paramsString}`;

  return `${pathname}${queryString}`;
};

export const ensureStartsWith = (stringToCheck: string, startsWith: string) =>
  stringToCheck.startsWith(startsWith)
    ? stringToCheck
    : `${startsWith}${stringToCheck}`;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getColorHex = (colorName: string): string | [string, string] => {
  // Check if colorName contains a slash for split colors
  if (colorName.includes("/")) {
    const parts = colorName.split("/");
    if (parts.length === 2) {
      const firstColor = parts[0].toLowerCase().replace(/[^a-z-]/g, "");
      const secondColor = parts[1].toLowerCase().replace(/[^a-z-]/g, "");
      return [
        COLOR_MAP[firstColor] || "#9ca3af",
        COLOR_MAP[secondColor] || "#9ca3af",
      ];
    }
  }

  // Handle single color case
  const normalizedName = colorName.toLowerCase().replace(/[^a-z-]/g, "");
  return COLOR_MAP[normalizedName] || "#9ca3af"; // Default to gray if not found
};

export const getLabelPosition = (
  index: number
): "top-left" | "top-right" | "bottom-left" | "bottom-right" => {
  const positions = [
    "top-left",
    "bottom-right",
    "top-right",
    "bottom-left",
  ] as const;
  return positions[index % positions.length];
};
