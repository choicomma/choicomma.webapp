import { Product } from "../types";
import parsedProducts from "./parsed-products.json";

export const mockProducts: Product[] = parsedProducts as unknown as Product[];
