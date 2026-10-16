import { Suspense } from "react";
import { getCollectionProducts, getCollections } from "@/lib/sfcc";
import { ProductListContent } from "./product-list-content";

export default async function ProductList({
  collection,
}: {
  collection: string;
}) {
  const products = await getCollectionProducts({ collection });
  const collections = await getCollections();

  return (
    <Suspense fallback={<div className="w-full py-20 text-center text-sm text-neutral-400 font-medium">상품 목록을 불러오는 중입니다...</div>}>
      <ProductListContent
        products={products}
        collections={collections}
        collectionHandle={collection}
      />
    </Suspense>
  );
}
