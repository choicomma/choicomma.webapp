import { DesktopFilters } from "./components/shop-filters";
import { Suspense } from "react";
import { getCollections } from "@/lib/sfcc";
import { PageLayout } from "@/components/layout/page-layout";
import { MobileFilters } from "./components/mobile-filters";
import { ProductsProvider } from "./providers/products-provider";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collections = await getCollections();

  return (
    <PageLayout className="bg-white min-h-screen">
      <ProductsProvider>
        <div className="w-full flex flex-col md:grid grid-cols-12 md:gap-sides pt-16 md:pt-36 pb-20 md:pb-32 bg-white relative">
          <div className="col-span-3 max-md:hidden sticky top-36 md:top-40 self-start z-20">
            <Suspense fallback={null}>
              <DesktopFilters
                collections={collections}
                className="bg-white"
              />
            </Suspense>
          </div>
          <div className="w-full col-span-9 min-h-screen pb-16 md:pb-24">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </ProductsProvider>
    </PageLayout>
  );
}
