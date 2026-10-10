import { storeCatalog } from "@/lib/sfcc/constants";
import ProductList from "@/app/shop/components/product-list";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "choicomma | Shop",
  description: "choicomma official store",
};

export default async function Shop() {
  return <ProductList collection="all" />;
}
