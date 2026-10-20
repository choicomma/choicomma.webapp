const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function main() {
  const excelPath = path.join(process.cwd(), 'docs', '상품_4개_전체_2026_10_20_KR.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`Excel loaded: ${rows.length} rows.`);

  // 1. Remove from deleted-products.json if present
  const delPath = path.join(process.cwd(), 'data', 'deleted-products.json');
  if (fs.existsSync(delPath)) {
    let delList = JSON.parse(fs.readFileSync(delPath, 'utf8'));
    const beforeCount = delList.length;
    delList = delList.filter(d => !['469', '470', '471', '473'].some(p => String(d).includes(p)));
    if (beforeCount !== delList.length) {
      console.log(`Unblacklisted deleted products: ${beforeCount} -> ${delList.length}`);
      fs.writeFileSync(delPath, JSON.stringify(delList, null, 2), 'utf8');
    }
  }

  const customHexMap = {
    'BLACK': '#000000',
    'CREAM': '#FDFBF7',
    'CHARCOAL': '#36454F',
    'NAVY': '#000080',
    'BEIGE': '#F5F5DC',
    'WHITE': '#FFFFFF',
    'BROWN': '#8B4513',
    'RED': '#DC2626',
    'BLUE': '#2563EB',
    'GREEN': '#16A34A',
    'KHAKI': '#708090',
    'PINK': '#EC4899',
    '모카': '#8B5A2B',
    '블랙': '#000000',
    '차콜': '#36454F',
    '딥 차콜': '#2A2D34',
    '카멜': '#C19A6B',
    '토프': '#483C32',
    '베이지': '#F5F5DC',
    '오트밀': '#D8C7B5',
    '오트밀베이지': '#E0D4C3',
    '화이트': '#FFFFFF',
    '아이보리': '#FFFFF0',
    '쿨그레이': '#8E9CA3',
    '라이트 회베이지': '#D8D1C7',
    '다크 회베이지': '#ADA398',
    '다크 코코아': '#4A3728'
  };

  const productsToRegister = [];

  for (const row of rows) {
    const pNo = Number(row['상품번호']);
    const code = 'CC-' + pNo;
    const id = 'excel-product-' + pNo;
    const handle = 'product-' + pNo;
    let title = String(row['상품명']).trim();
    const price = Number(row['판매가']) || 270000;
    const repImg = String(row['대표이미지URL']).trim();
    const detailHtml = String(row['상품상세정보'] || '').trim();
    const minQty = Number(row['최소 구매수량']) || 1;

    // Distinguish 473 bundle/bulk product in title
    if (pNo === 473 && !title.includes('3개')) {
      title = `${title} (3개 이상)`;
    }

    let colors = [];
    let sizes = [];
    let categoryId = 'outer';
    let discountRate = 25;
    let fabricComposition = 'WOOL 100%';

    if (pNo === 470) {
      colors = ['오트밀베이지'];
      sizes = ['FREE(44-77)'];
      categoryId = 'outer';
      discountRate = 25;
      fabricComposition = '캐시미어 10%, 울 90%, 폭스퍼 100%';
    } else if (pNo === 469) {
      colors = ['딥 차콜'];
      sizes = ['FREE(44-77)'];
      categoryId = 'outer';
      discountRate = 25;
      fabricComposition = '캐시미어 10%, 울 90%, 폭스퍼 100%';
    } else if (pNo === 471) {
      colors = ['라이트 회베이지', '다크 회베이지', '다크 코코아', '블랙'];
      sizes = ['1(44-마른66)', '2(66-77)', '3(88)'];
      categoryId = 'bottom';
      discountRate = 30;
      fabricComposition = '폴리에스터 65%, 레이온 30%, 스판 5%';
    } else if (pNo === 473) {
      colors = ['라이트 회베이지', '다크 회베이지', '다크 코코아', '블랙'];
      sizes = ['1(44-마른66)', '2(66-77)', '3(88)'];
      categoryId = 'bottom';
      discountRate = 38;
      fabricComposition = '폴리에스터 65%, 레이온 30%, 스판 5%';
    }

    const totalStock = Number(row['필수옵션재고수량합계']) || 10;
    const sizeStock = {};
    const totalCombos = colors.length * sizes.length;
    const perStock = Math.floor(totalStock / totalCombos);
    let remainder = totalStock % totalCombos;

    colors.forEach(c => {
      sizes.forEach(s => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        sizeStock[`${c}-${s}`] = perStock + extra;
      });
    });

    const variants = [];
    colors.forEach(c => {
      sizes.forEach(s => {
        variants.push({
          id: `var-${pNo}-${encodeURIComponent(c)}-${encodeURIComponent(s)}`,
          title: `${c} / ${s}`,
          availableForSale: true,
          price: { amount: String(price), currencyCode: 'KRW' },
          selectedOptions: [
            { name: 'Color', value: c },
            { name: 'Size', value: s }
          ],
          image: {
            url: repImg,
            altText: `${title} - ${c} / ${s}`
          }
        });
      });
    });

    const options = [
      {
        id: 'color',
        name: 'Color',
        values: colors
      },
      {
        id: 'size',
        name: 'Size',
        values: sizes
      }
    ];

    const prodObj = {
      id,
      productNo: pNo,
      productCode: code,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      handle,
      title,
      categoryId,
      categoryIds: [categoryId],
      productLabel: 'PREMIUM',
      isMainFeatured: true,
      availableForSale: true,
      stock: totalStock,
      sizeStock,
      stockMap: sizeStock,
      description: title,
      detailDescription: detailHtml,
      descriptionHtml: detailHtml,
      price: { amount: String(price), currencyCode: 'KRW' },
      priceRange: {
        minVariantPrice: { amount: String(price), currencyCode: 'KRW' },
        maxVariantPrice: { amount: String(price), currencyCode: 'KRW' }
      },
      featuredImage: {
        url: repImg,
        altText: title,
        width: 1200,
        height: 1600
      },
      images: [
        {
          url: repImg,
          altText: title,
          width: 1200,
          height: 1600
        }
      ],
      colors,
      sizes,
      colorHexMap: customHexMap,
      options,
      variants,
      isTimeSale: true,
      timeSaleDiscountRate: discountRate,
      timeSaleAllowCoupon: true,
      timeSaleAllowPoints: true,
      tags: [
        'NEW',
        'PREMIUM',
        `pno:${pNo}`,
        `pcode:${code}`,
        'TIMESALE',
        `tsrate:${discountRate}`,
        'top-seller'
      ],
      fabricComposition,
      elasticity: categoryId === 'bottom' ? '약간 있음' : '보통',
      sheerness: '없음',
      thickness: '적당함',
      lining: categoryId === 'outer' ? '있음' : '없음'
    };

    if (minQty > 1) {
      prodObj.minOrderQuantity = minQty;
      prodObj.bulkDiscount = {
        enabled: true,
        rules: [{ qty: minQty, rate: discountRate }],
        productNo: pNo,
        productCode: code
      };
      prodObj.tags.push(`min:${minQty}`);
    }

    productsToRegister.push(prodObj);
  }

  // Desired order at top: 470, 469, 471, 473
  // Sort productsToRegister: [470, 469, 471, 473]
  const orderPno = [470, 469, 471, 473];
  productsToRegister.sort((a, b) => orderPno.indexOf(a.productNo) - orderPno.indexOf(b.productNo));

  console.log('Registering 4 products in order:', productsToRegister.map(p => `${p.productCode} (${p.title})`));

  // Load existing cache
  const cachePath = path.join(process.cwd(), 'data', 'products-cache.json');
  let cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : [];

  // Remove any previous versions of these 4 products
  const regNos = new Set(productsToRegister.map(p => p.productNo));
  cache = cache.filter(p => !regNos.has(p.productNo));

  // Prepend to top of cache
  const fullList = [...productsToRegister, ...cache];

  // Re-assign displayOrder sequentially 1..N
  fullList.forEach((p, idx) => {
    p.displayOrder = idx + 1;
  });

  fs.writeFileSync(cachePath, JSON.stringify(fullList, null, 2), 'utf8');
  console.log(`Updated ${cachePath} with total ${fullList.length} products.`);

  // Also update default-products-seed.json
  const seedPath = path.join(process.cwd(), 'data', 'default-products-seed.json');
  fs.writeFileSync(seedPath, JSON.stringify(fullList, null, 2), 'utf8');
  console.log(`Updated seed backup ${seedPath}.`);

  // Detect active dev server port
  let activePort = 3001;
  try {
    const res = await fetch('http://localhost:3001/api/products?fresh=1&slim=1');
    if (res.ok) activePort = 3001;
  } catch (e) {
    try {
      const res0 = await fetch('http://localhost:3000/api/products?fresh=1&slim=1');
      if (res0.ok) activePort = 3000;
    } catch (e2) {}
  }

  console.log(`Sending API updates to http://localhost:${activePort}...`);
  for (const item of productsToRegister) {
    try {
      const res = await fetch(`http://localhost:${activePort}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: item, isNew: false })
      });
      const data = await res.json();
      console.log(`API response for ${item.productCode}: success=${data.success}`);
    } catch (err) {
      console.warn(`Failed to post ${item.productCode} to API:`, err.message);
    }
  }

  // Refresh API cache
  try {
    await fetch(`http://localhost:${activePort}/api/products?fresh=1`);
    console.log('Successfully refreshed server cache with ?fresh=1');
  } catch (e) {}

  console.log('All 4 products registered and prioritized successfully!');
}

main().catch(console.error);
