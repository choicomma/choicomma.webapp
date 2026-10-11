import { PageLayout } from "@/components/layout/page-layout";
import { getCollectionProducts } from "@/lib/sfcc";
import { HomeLayout } from "@/components/home/home-layout";
import { slimProductsForList } from "@/lib/products-slim";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [allProducts] = await Promise.all([
    getCollectionProducts({ collection: "all" }),
  ]);

  return (
    <PageLayout className="w-full">
      <div className="w-full mx-auto">
        <HomeLayout products={slimProductsForList(allProducts)} />
      </div>
    </PageLayout>
  );
}
