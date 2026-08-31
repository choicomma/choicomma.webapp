import { PageLayout } from "@/components/layout/page-layout";
import { getCollectionProducts } from "@/lib/sfcc";
import { HomeLayout } from "@/components/home/home-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [allProducts] = await Promise.all([
    getCollectionProducts({ collection: "top-seller" }),
  ]);

  const mainFeaturedProducts = allProducts.filter((p: any) => p.isMainFeatured === true);

  return (
    <PageLayout className="w-full">
      <div className="w-full mx-auto">
        <HomeLayout products={mainFeaturedProducts} />
      </div>
    </PageLayout>
  );
}
