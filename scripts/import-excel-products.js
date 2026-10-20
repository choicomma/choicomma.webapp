const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DEFAULT_COLOR_HEX_MAP = {
  '블랙': '#111111',
  '화이트': '#FFFFFF',
  '아이보리': '#FDFBF7',
  '베이지': '#E8DCCA',
  '오트밀': '#E3DAC9',
  '오트밀베이지': '#DBCBB6',
  '차콜': '#333333',
  '딥 차콜': '#222222',
  '다크 차콜': '#262626',
  '그레이': '#888888',
  '라이트 그레이': '#D1D5DB',
  '라이트 회베이지': '#D6CFCE',
  '다크 회베이지': '#8C827A',
  '다크 코코아': '#3D2B1F',
  '코코아': '#5C4033',
  '네이비': '#0A192F',
  '브라운': '#5A3825'
};

const DEFAULT_SIZE_MEASUREMENTS = [
  { name: '총기장', values: { '1': 102, '2': 103, '3': 104, 'FREE': 75 } },
  { name: '허리단면', values: { '1': 32, '2': 34.5, '3': 37, 'FREE': 0 } },
  { name: '엉덩이단면', values: { '1': 48, '2': 50.5, '3': 53, 'FREE': 0 } },
  { name: '허벅지단면', values: { '1': 30, '2': 31.5, '3': 33, 'FREE': 0 } },
  { name: '밑위', values: { '1': 29, '2': 30, '3': 31, 'FREE': 0 } },
  { name: '밑단단면', values: { '1': 26, '2': 27, '3': 28, 'FREE': 0 } }
];

async function main() {
  const excelPath = path.join(process.cwd(), 'docs', '상품_4개_전체_2026_10_20_KR.xlsx');
  const wb = xlsx.readFile(excelPath);
  const worksheet = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  console.log('Total rows in Excel:', json.length);

  const parsedItems = [];

  json.forEach((row, idx) => {
    const getVal = (keys) => {
      for (const key of keys) {
        const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
      }
      for (const key of keys) {
        const foundKey = Object.keys(row).find(k => k.trim().toLowerCase().includes(key.toLowerCase()));
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
      }
      return '';
    };

    const title = String(getVal(['상품명', 'title', 'name', '상품 이름'])).trim();
    if (!title) return;

    // 카테고리 판별 (슬랙스/팬츠는 bottom, 케이프/아우터는 outer)
    let categoryId = 'outer';
    let categoryIds = ['outer'];
    if (title.includes('슬랙스') || title.includes('팬츠') || title.includes('바지')) {
      categoryId = 'bottom';
      categoryIds = ['bottom'];
    } else if (title.includes('케이프') || title.includes('코트') || title.includes('자켓')) {
      categoryId = 'outer';
      categoryIds = ['outer'];
    }

    const priceRaw = getVal(['판매가', '판매가(원)', 'price', 'amount', '가격']);
    const priceNum = typeof priceRaw === 'number' ? priceRaw : parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10) || 0;

    const description = String(getVal(['상품 간단설명', '간단설명', 'description', '설명'])).trim();
    const detailDescription = String(getVal(['상품상세정보', '상품 상세설명', '상세설명', 'detailDescription', 'detailedInfo'])).trim();

    const extractedImgs = [];
    if (detailDescription) {
      const regex = /<img[^>]+src=["']([^"']+)["']/gi;
      let m;
      while ((m = regex.exec(detailDescription)) !== null) {
        if (m[1] && !m[1].startsWith('data:')) extractedImgs.push(m[1]);
      }
    }

    const imageUrl = String(getVal(['대표이미지URL', '대표 이미지 URL', 'image', 'imageUrl', '대표이미지'])).trim() || extractedImgs[0] || '/product_1.webp';
    const addImagesRaw = String(getVal(['추가 이미지 URLs', '추가 이미지', 'images', 'additionalImages'])).trim();
    let allImages = [imageUrl];
    if (addImagesRaw) {
      const addUrls = addImagesRaw.split(/[,|]/).map(u => u.trim()).filter(Boolean);
      allImages = Array.from(new Set([imageUrl, ...addUrls, ...extractedImgs]));
    } else if (extractedImgs.length > 0) {
      allImages = Array.from(new Set([imageUrl, ...extractedImgs]));
    }

    const reqOptNamesRaw = String(getVal(['필수옵션명', 'optionNames'])).trim();
    const reqOptValsRaw = String(getVal(['필수옵션값', 'optionValues'])).trim();

    let colors = [];
    let sizes = [];

    if (reqOptNamesRaw) {
      const names = reqOptNamesRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const valLines = reqOptValsRaw.split('\n').map(s => s.trim()).filter(Boolean);

      names.forEach((name, i) => {
        const lower = name.toLowerCase();
        if (lower.includes('안내') || lower.includes('공지') || lower.includes('유의') || lower.includes('배송') || lower.includes('기간') || lower.includes('제작') || lower.includes('동의')) return;
        const vals = (valLines[i] || '').split(',').map(v => v.trim().replace(/^[_-\s]+|[_-\s]+$/g, '')).filter(Boolean);

        if (lower.includes('색상') || lower.includes('컬러') || lower.includes('color')) {
          colors = vals;
        } else if (lower.includes('사이즈') || lower.includes('size')) {
          sizes = vals;
        } else {
          if (vals.some(v => v.includes('44') || v.includes('55') || v.includes('66') || v.includes('77') || v.includes('88') || v.includes('FREE') || v.includes('S') || v.includes('M') || v.includes('L') || /^[1-3]$/.test(v))) {
            sizes = vals;
          } else {
            colors = vals;
          }
        }
      });
    }

    // 케이프의 경우 슬래시 뒤가 컬러 (오트밀베이지, 딥 차콜)
    if (colors.length === 0 && title.includes('폭스퍼 케이프')) {
      if (title.includes('오트밀베이지')) colors = ['오트밀베이지'];
      else if (title.includes('딥 차콜') || title.includes('차콜')) colors = ['딥 차콜'];
    }

    if (colors.length === 0) {
      const colorsRaw = String(getVal(['색상', 'color', 'colors'])).trim();
      colors = colorsRaw ? colorsRaw.split(/[,/|]/).map(c => c.trim()).filter(Boolean) : ['ONE COLOR'];
    }
    if (sizes.length === 0) {
      const sizesRaw = String(getVal(['사이즈', 'size', 'sizes'])).trim();
      sizes = sizesRaw ? sizesRaw.split(/[,/|]/).map(s => s.trim()).filter(Boolean) : ['FREE'];
    }

    const stockRaw = getVal(['현재 재고수량', '필수옵션재고수량합계', '총 재고수량', '초기 재고수량', '재고수량', 'stock', 'quantity', '재고']);
    const stockNum = typeof stockRaw === 'number' ? stockRaw : parseInt(String(stockRaw).replace(/[^0-9]/g, ''), 10) || 0;

    const label = title.includes('[BLACK LABEL]') ? 'BLACK_LABEL' : (title.includes('[PREMIUM]') || title.includes('프리미엄') ? 'PREMIUM' : 'ESSENTIAL');

    const rawNo = getVal(['상품번호', 'productNo', '번호']);
    const assignedNo = rawNo ? parseInt(String(rawNo).replace(/[^0-9]/g, ''), 10) : (470 - idx);

    const rawCode = String(getVal(['자체 상품코드', '자체상품코드', '상품코드', 'productCode', 'code'])).trim();
    const assignedCode = rawCode || ('CC-' + String(assignedNo).padStart(3, '0'));
    const prodId = 'excel-product-' + assignedNo;

    const sizeStockMap = {};
    const totalVariants = Math.max(1, colors.length * sizes.length);
    const baseStockPerVariant = Math.floor(stockNum / totalVariants);
    let remainder = stockNum % totalVariants;

    colors.forEach(c => {
      sizes.forEach(s => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        sizeStockMap[`${c}-${s}`] = baseStockPerVariant + extra;
      });
    });

    const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'product';
    const safeHandle = `${baseSlug}-${prodId}`;

    // 할인금액 파싱 (타임세일 자동 연동)
    const discountAmtRaw = getVal(['할인금액', 'discountAmount']);
    const discountUnit = String(getVal(['할인금액단위', 'discountUnit'])).trim();
    let isTimeSale = false;
    let timeSaleDiscountRate = undefined;
    let timeSaleDiscountPrice = undefined;

    if (discountAmtRaw) {
      const firstPart = String(discountAmtRaw).split(/[,/]/)[0].trim();
      const amtNum = typeof discountAmtRaw === 'number' ? discountAmtRaw : parseInt(firstPart.replace(/[^0-9]/g, ''), 10) || 0;
      if (amtNum > 0) {
        isTimeSale = true;
        if (discountUnit.includes('%') || amtNum <= 90) {
          timeSaleDiscountRate = amtNum;
          timeSaleDiscountPrice = String(Math.round(priceNum * (1 - amtNum / 100)));
        } else {
          timeSaleDiscountPrice = String(Math.max(0, priceNum - amtNum));
          timeSaleDiscountRate = Math.round((amtNum / Math.max(1, priceNum)) * 100);
        }
      }
    }

    // 대량구매 (최소 구매수량 등)
    const minQtyRaw = getVal(['최소 구매수량', '최소구매수량']);
    const minQty = parseInt(String(minQtyRaw).replace(/[^0-9]/g, ''), 10) || 1;
    const bulkDiscount = minQty > 1 ? {
      enabled: true,
      rules: [{ qty: minQty, rate: timeSaleDiscountRate || 38 }]
    } : undefined;

    const fabricComp = title.includes('슬랙스')
      ? 'POLYESTER 70%, RAYON 25%, SPAN 5%'
      : 'CASHMERE 30%, WOOL 70%, FOX FUR 100%';

    const item = {
      id: prodId,
      productNo: assignedNo,
      productCode: assignedCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      handle: safeHandle,
      title,
      categoryId,
      categoryIds,
      description: description || `${title} 신규 등록 상품`,
      detailDescription: detailDescription || description || `${title} 상세설명`,
      descriptionHtml: detailDescription || `<p>${title}</p>`,
      price: { amount: String(priceNum), currencyCode: 'KRW' },
      priceRange: {
        minVariantPrice: { amount: String(priceNum), currencyCode: 'KRW' },
        maxVariantPrice: { amount: String(priceNum), currencyCode: 'KRW' }
      },
      featuredImage: { url: imageUrl, altText: title, width: 1200, height: 1600 },
      images: allImages.map((url, i) => ({ url, altText: `${title} ${i + 1}`, width: 1200, height: 1600 })),
      colors,
      colorHexMap: DEFAULT_COLOR_HEX_MAP,
      sizes,
      sizeMeasurements: DEFAULT_SIZE_MEASUREMENTS,
      stock: stockNum,
      sizeStock: sizeStockMap,
      stockMap: sizeStockMap,
      availableForSale: true, // "노출되게 설정 (구매 가능 ON)"
      isMainFeatured: true, // "메인화면 및 전체 카탈로그 진열 노출 ON"
      productLabel: label,
      options: [
        { id: 'color', name: 'Color', values: colors },
        { id: 'size', name: 'Size', values: sizes }
      ],
      optionNames: { color: 'Color', size: 'Size' },
      variants: colors.flatMap(c => sizes.map(s => ({
        id: `${prodId}-${c}-${s}`,
        title: `${title} - ${c} / ${s}`,
        availableForSale: true,
        selectedOptions: [
          { name: 'Color', value: c },
          { name: 'Size', value: s }
        ],
        price: { amount: String(priceNum), currencyCode: 'KRW' }
      }))),
      fabricComposition: fabricComp,
      elasticity: title.includes('슬랙스') ? '약간 있음' : '보통',
      sheerness: '없음',
      thickness: title.includes('슬랙스') ? '적당함' : '두꺼움',
      lining: title.includes('슬랙스') ? '없음' : '있음',
      tags: ['NEW', 'top-seller'],
      isTimeSale,
      timeSaleDiscountPrice: isTimeSale ? timeSaleDiscountPrice : undefined,
      timeSaleDiscountRate: isTimeSale ? timeSaleDiscountRate : undefined,
      timeSaleStartDate: isTimeSale ? '2026-10-20T09:00:00+09:00' : undefined,
      timeSaleEndDate: isTimeSale ? '2026-10-27T23:59:00+09:00' : undefined,
      timeSaleAllowCoupon: true,
      timeSaleAllowPoints: true,
      bulkDiscount
    };

    parsedItems.push(item);
  });

  console.log(`Parsed ${parsedItems.length} products.`);

  // 1. Remove from deleted-products.json if any ID matches
  const delPath = path.join(process.cwd(), 'data', 'deleted-products.json');
  if (fs.existsSync(delPath)) {
    try {
      const delList = JSON.parse(fs.readFileSync(delPath, 'utf8'));
      const toRemove = new Set();
      parsedItems.forEach(p => {
        toRemove.add(p.id);
        toRemove.add(p.productCode);
        toRemove.add(p.handle);
      });
      const filteredDel = delList.filter(id => !toRemove.has(id));
      if (filteredDel.length !== delList.length) {
        fs.writeFileSync(delPath, JSON.stringify(filteredDel, null, 2), 'utf8');
        console.log('Un-blacklisted products from deleted-products.json');
      }
    } catch (e) {
      console.warn('Error cleaning deleted-products.json:', e);
    }
  }

  // 2. Read existing products-cache.json
  const cachePath = path.join(process.cwd(), 'data', 'products-cache.json');
  let currentList = [];
  if (fs.existsSync(cachePath)) {
    currentList = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  // Prepend new products, replace if already exists by id
  const newIds = new Set(parsedItems.map(p => p.id));
  const filteredCurrent = currentList.filter(p => !newIds.has(p.id));

  // Set displayOrder: 1, 2, 3, 4 for the 4 new products, then subsequent for the rest
  const orderedNew = parsedItems.map((p, idx) => ({ ...p, displayOrder: idx + 1 }));
  const updatedFullList = [...orderedNew, ...filteredCurrent.map((p, idx) => ({
    ...p,
    displayOrder: idx + orderedNew.length + 1
  }))];

  // Write directly to products-cache.json
  fs.writeFileSync(cachePath, JSON.stringify(updatedFullList, null, 2), 'utf8');
  console.log(`Successfully updated ${cachePath} (total: ${updatedFullList.length} products).`);

  // Also update default-products-seed.json
  const seedPath = path.join(process.cwd(), 'data', 'default-products-seed.json');
  if (fs.existsSync(seedPath)) {
    fs.writeFileSync(seedPath, JSON.stringify(updatedFullList, null, 2), 'utf8');
    console.log(`Successfully updated seed backup ${seedPath}.`);
  }

  // 3. Post to dev server API on port 3001 to sync in-memory & remote Supabase if active
  try {
    const res = await fetch('http://localhost:3001/api/products?mode=add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderedNew)
    });
    const result = await res.json();
    console.log('Dev server API response:', result);
  } catch (apiErr) {
    console.warn('Dev server API call skipped:', apiErr.message);
  }

  console.log('Import and exposure setup completed successfully!');
}

main().catch(console.error);
