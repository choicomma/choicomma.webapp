import { Product } from "../types";
import productsCache from "@/data/products-cache.json";

export const mockProducts: Product[] = productsCache as unknown as Product[];
