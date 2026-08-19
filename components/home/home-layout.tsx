"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeLayout({ products = [] }: { products?: any[] }) {
  // Use first 4 products for the grid, or mock data if not enough
  const gridProducts = products.slice(0, 4);

  const [heroImages, setHeroImages] = React.useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  // Pagination and all products state - strictly filter isMainFeatured === true
  const initialMainFeatured = (products || []).filter((p: any) => p.isMainFeatured === true);
  const [allProducts, setAllProducts] = React.useState<any[]>(initialMainFeatured);
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 9;

  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const updateHomeData = () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("admin_products");
          if (saved) {
            const parsed = JSON.parse(saved);
            
            // Helper to match admin page sorting
            const getProductNo = (product: any): number => {
              if (product.productNo !== undefined && !isNaN(Number(product.productNo))) {
                return Number(product.productNo);
              }
              const match = String(product.id || "").match(/\d+/);
              if (match) return parseInt(match[0], 10);
              return 0;
            };

            // Filter strictly for products where main display is checked (isMainFeatured === true)
            const featuredProducts = parsed.filter((p: any) => p.isMainFeatured === true);

            // Sort products to match the 'productNoDesc' order used in Admin
            const sortedProducts = [...featuredProducts].sort((a, b) => getProductNo(b) - getProductNo(a));
            
            // Update all products for grid
            setAllProducts(sortedProducts);

            // Update hero image ONLY if explicitly set in Admin
            const heroProducts = parsed.filter((p: any) => p.isHeroFeatured === true);
            const urls = heroProducts.map((p: any) => p.heroCustomImage || p.featuredImage?.url).filter(Boolean);
            
            if (urls.length > 0) {
              setHeroImages(urls);
              setCurrentSlideIndex(0);
            } else {
              setHeroImages([]);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Initial load
    updateHomeData();
    setIsHydrated(true);

    // Listen for storage events & same-tab admin updates
    window.addEventListener("storage", updateHomeData);
    window.addEventListener("admin_products_updated", updateHomeData);
    return () => {
      window.removeEventListener("storage", updateHomeData);
      window.removeEventListener("admin_products_updated", updateHomeData);
    };
  }, []);

  React.useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  if (!isHydrated) {
    return (
      <div className="w-full flex flex-col bg-white min-h-screen animate-pulse">
        <section className="relative w-full h-[95vh] md:h-[105vh] min-h-[800px] border-b border-neutral-200 bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-white">
      {/* SECTION 1: Auto Slider Hero Image (Only rendered if explicit hero images exist) */}
      {heroImages.length > 0 && (
        <section className="relative w-full h-[95vh] md:h-[105vh] min-h-[800px] border-b border-neutral-200 bg-white overflow-hidden">
          <div 
            className="flex w-full h-full transition-transform duration-1000 ease-in-out"
            style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
          >
            {heroImages.map((src, idx) => (
              <div key={`${src}-${idx}`} className="relative min-w-full h-full">
                <Image
                  src={src}
                  alt={`Main Hero ${idx + 1}`}
                  fill
                  quality={100}
                  unoptimized={src.startsWith('data:')}
                  className="object-cover object-center"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: 3x3 Paginated Grid */}
      <section className="w-full bg-white">
        <div className="grid grid-cols-2 md:grid-cols-3">
          {allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((product, idx) => {
            return (
              <Link 
                key={product.id || idx} 
                href={`/product/${product.handle || "item"}`} 
                className="group relative flex flex-col items-center justify-center aspect-[4/5] overflow-hidden border-b border-r border-neutral-200 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(3n)]:border-r-0"
              >
                <Image
                  src={product.featuredImage?.url || `/product_${(idx % 4) + 1}.webp`}
                  alt={product.title || `Product ${idx}`}
                  fill
                  className="object-contain p-4 md:p-8 transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Product Name & Label (Bottom Left) */}
                <div className="absolute bottom-0 left-0 p-3 flex flex-col items-start z-10 w-full md:w-auto">
                  {product.productLabel && (
                    <span className={`mb-1 text-[8px] md:text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-sm ${
                      product.productLabel === 'BLACK_LABEL' ? 'bg-black text-white' :
                      product.productLabel === 'PREMIUM' ? 'bg-neutral-600 text-white' :
                      'bg-neutral-200 text-neutral-800'
                    }`}>
                      {product.productLabel.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-[10px] md:text-xs font-medium text-neutral-900 uppercase tracking-widest truncate md:pr-0 w-full">
                    {product.title || "Product Name"}
                  </span>
                  <span className="text-[10px] font-medium text-neutral-600 uppercase leading-tight md:hidden mt-0.5">
                    {product.priceRange?.minVariantPrice?.amount 
                      ? `${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode || 'KRW'}`
                      : "5990 KRW"}
                  </span>
                </div>

                {/* Product Price (Bottom Right) - Only visible on PC */}
                <div className="hidden md:flex absolute bottom-0 right-0 p-3 flex-col z-10">
                  <span className="text-xs font-medium text-neutral-900 uppercase">
                    {product.priceRange?.minVariantPrice?.amount 
                      ? `${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode || 'KRW'}`
                      : "5990 KRW"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {allProducts.length > PAGE_SIZE && (
          <div className="flex justify-center items-center py-12 gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
            >
              &lt; Prev
            </button>
            <span className="text-xs text-neutral-900">
              {currentPage} / {Math.ceil(allProducts.length / PAGE_SIZE)}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(allProducts.length / PAGE_SIZE), p + 1))}
              disabled={currentPage >= Math.ceil(allProducts.length / PAGE_SIZE)}
              className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
            >
              Next &gt;
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
