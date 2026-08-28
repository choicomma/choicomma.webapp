import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCollection, getProduct } from "@/lib/sfcc";
import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { AddToCart } from "@/components/cart/add-to-cart";
import { storeCatalog } from "@/lib/sfcc/constants";
import Prose from "@/components/prose";
import { formatPrice } from "@/lib/sfcc/utils";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { VariantSelectorSlots } from "./components/variant-selector-slots";
import { MobileGallerySlider } from "./components/mobile-gallery-slider";
import { DesktopGallery } from "./components/desktop-gallery";
import { ProductDetailHeader } from "./components/product-detail-header";
import { ProductDetailAccordions } from "./components/product-detail-accordions";
import { RelatedProducts } from "./components/related-products";
import { ProductPageClientWrapper } from "./components/product-page-client-wrapper";

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) {
    return {
      title: "Product Detail",
      description: "Product detail page",
    };
  }

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags?.includes(HIDDEN_PRODUCT_TAG);

  return {
    title: product.seo?.title || product.title,
    description: product.seo?.description || product.description,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
    openGraph: url
      ? {
        images: [
          {
            url,
            width,
            height,
            alt,
          },
        ],
      }
      : null,
  };
}

import { ClientProductFallback } from "./components/client-product-fallback";

export default async function ProductPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) {
    return <ClientProductFallback handle={params.handle} />;
  }

  const collection = product.categoryId
    ? await getCollection(product.categoryId)
    : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.featuredImage.url,
    offers: {
      "@type": "AggregateOffer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.currencyCode,
      highPrice: product.priceRange.maxVariantPrice.amount,
      lowPrice: product.priceRange.minVariantPrice.amount,
    },
  };

  const [rootParentCategory] = collection?.parentCategoryTree.filter(
    (c) => c.id !== storeCatalog.rootCategoryId
  ) ?? [undefined];

  const hasVariants = (product?.variants?.length ?? 0) > 1;

  return (
    <PageLayout className="bg-white" hideFooter={false}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />

      {/* Main PDP Client Wrapper */}
      <ProductPageClientWrapper initialProduct={product} />

      <RelatedProducts />
    </PageLayout>
  );
}
