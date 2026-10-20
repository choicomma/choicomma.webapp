async function test() {
  const res = await fetch('http://localhost:3001/api/products?fresh=1');
  const data = await res.json();
  console.log('Total products:', data.length);
  const first4 = data.slice(0, 4);
  first4.forEach((p, idx) => {
    console.log(`[${idx+1}] ${p.title}`);
    console.log(`    ID: ${p.id} | Code: ${p.productCode} | No: ${p.productNo}`);
    console.log(`    Category: ${p.categoryId} | Price: ${p.price?.amount || p.priceRange?.minVariantPrice?.amount}원 | Stock: ${p.stock}`);
    console.log(`    Available: ${p.availableForSale} | Featured: ${p.isMainFeatured} | TimeSale: ${p.isTimeSale} (${p.timeSaleDiscountRate}%)`);
    console.log(`    Colors: ${p.colors?.join(', ')} | Sizes: ${p.sizes?.join(', ')}`);
    console.log(`    Images: ${p.images?.length} | FeaturedImage: ${p.featuredImage?.url?.substring(0, 60)}...`);
  });
}
test().catch(console.error);
