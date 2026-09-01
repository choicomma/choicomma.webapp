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
    <PageLayout>
      <ProductsProvider>
        <div className="w-full flex flex-col md:grid grid-cols-12 md:gap-sides items-start pb-20 md:pb-32">
          <DesktopFilters
            collections={collections}
            className="col-span-3 max-md:hidden"
          />
          <Suspense fallback={null}>
            <MobileFilters collections={collections} />
          </Suspense>
          <div className="w-full col-span-9 h-full md:pt-top-spacing pb-16 md:pb-24">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </ProductsProvider>
    </PageLayout>
  );
}
