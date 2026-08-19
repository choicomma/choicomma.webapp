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
    <ProductListContent
      products={products}
      collections={collections}
      collectionHandle={collection}
    />
  );
}
