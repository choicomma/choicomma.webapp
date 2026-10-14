const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function main() {
  const excelPath = path.join(process.cwd(), 'docs', '상품_2개_전체_2026_10_11_KR.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets['Sheet1'];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`Excel parsed successfully: ${rows.length} rows.`);

  // 1. Remove 468 and 463 from deleted-products.json
  const delPath = path.join(process.cwd(), 'data', 'deleted-products.json');
  if (fs.existsSync(delPath)) {
    let delList = JSON.parse(fs.readFileSync(delPath, 'utf8'));
    const beforeCount = delList.length;
    delList = delList.filter(d => !d.includes('468') && !d.includes('463'));
    console.log(`Removed 468 & 463 from deleted blacklist: ${beforeCount} -> ${delList.length}`);
    fs.writeFileSync(delPath, JSON.stringify(delList, null, 2), 'utf8');
  }

  function extractImagesFromHtml(html) {
    const matches = [...(html || '').matchAll(/src=["']([^"']+)["']/g)];
    return matches.map(m => m[1]);
  }

  const colorHexMap = {
    'RED': '#DC2626', 'BLUE': '#2563EB', 'NAVY': '#000080', 'PINK': '#EC4899', 'BEIGE': '#F5F5DC',
    'BLACK': '#000000', 'BROWN': '#8B4513', 'CREAM': '#FDFBF7', 'GREEN': '#16A34A', 'KHAKI': '#708090',
    'WHITE': '#FFFFFF', '모카': '#8B5A2B', '블랙': '#000000', '차콜': '#36454F', 'A타입': '#1C1C1C',
    'B타입': '#2B2B2B', 'CHARCOAL': '#36454F', '아이보리': '#FFFFF0', '쿨그레이': '#8E9CA3'
  };

  function buildProduct(row, colorName) {
    const pNo = Number(row['상품번호']);
    const code = 'CC-' + pNo;
    const id = 'excel-product-' + pNo;
    const handle = 'product-' + pNo;
    const title = String(row['상품명']).trim();
    const price = Number(row['판매가']) || 490000;
    const repImg = String(row['대표이미지URL']).trim();
    const detailHtml = String(row['상품상세정보'] || '').trim();
    const detailImgs = extractImagesFromHtml(detailHtml);

    const allImgs = Array.from(new Set([repImg, ...detailImgs])).map(url => ({
      url,
      altText: title,
      width: 1200,
      height: 1600
    }));

    const rawOptionVals = String(row['필수옵션값'] || '').trim();
    const sizes = rawOptionVals ? rawOptionVals.split(',').map(s => s.trim()).filter(Boolean) : ['1(44-55)', '2(66-88)'];
    const colors = [colorName];

    const sizeStock = {};
    sizes.forEach(s => {
      sizeStock[`${colorName}-${s}`] = 15;
    });

    const variants = sizes.map(s => ({
      id: `var-${pNo}-${colorName}-${s.replace(/[^a-zA-Z0-9]/g, '-')}`,
      title: `${title} - ${colorName} / ${s}`,
      availableForSale: true,
      inventoryQuantity: 15,
      selectedOptions: [
        { name: 'Color', value: colorName },
        { name: 'Size', value: s }
      ],
      price: { amount: String(price), currencyCode: 'KRW' },
      image: { url: repImg, altText: `${title} - ${colorName} / ${s}` }
    }));

    return {
      id,
      productNo: pNo,
      productCode: code,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      handle,
      title,
      categoryId: 'top',
      categoryIds: ['top'],
      description: title,
      detailDescription: detailHtml,
      descriptionHtml: detailHtml,
      priceRange: {
        minVariantPrice: { amount: String(price), currencyCode: 'KRW' },
        maxVariantPrice: { amount: String(price), currencyCode: 'KRW' }
      },
      price: { amount: String(price), currencyCode: 'KRW' },
      featuredImage: {
        url: repImg,
        altText: title,
        width: 1200,
        height: 1600
      },
      images: allImgs,
      colors,
      colorHexMap,
      sizes,
      stock: 30,
      sizeStock,
      stockMap: sizeStock,
      availableForSale: true,
      isMainFeatured: true,
      productLabel: 'BLACK_LABEL',
      options: [
        { id: 'color', name: 'Color', values: [{ id: colorName, name: colorName }] },
        { id: 'size', name: 'Size', values: sizes.map(s => ({ id: s, name: s })) }
      ],
      variants,
      tags: ['NEW', 'BLACK_LABEL', `pno:${pNo}`, `pcode:${code}`, 'tsrate:25'],
      isTimeSale: true,
      timeSaleDiscountRate: 25,
      releaseDate: '',
      bulkDiscount: {
        enabled: false,
        rules: [],
        productNo: pNo,
        productCode: code,
        releaseDate: ''
      },
      fabricComposition: 'SILK 100%',
      elasticity: '보통',
      sheerness: '없음',
      thickness: '적당함',
      lining: '없음',
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const p468Row = rows.find(r => r['상품번호'] == 468);
  const p463Row = rows.find(r => r['상품번호'] == 463);

  const p468 = buildProduct(p468Row, 'B타입');
  const p463 = buildProduct(p463Row, 'A타입');

  console.log('Built CC-468:', p468.title);
  console.log('Built CC-463:', p463.title);

  // Determine active port
  let activePort = 3001;
  try {
    const check3001 = await fetch('http://localhost:3001/api/products?fresh=1&slim=1');
    if (check3001.ok) activePort = 3001;
  } catch (e) {
    activePort = 3000;
  }
  console.log(`Using active port: ${activePort}`);

  // Post each product to the API
  for (const item of [p468, p463]) {
    const res = await fetch(`http://localhost:${activePort}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: item, isNew: true })
    });
    const data = await res.json();
    console.log(`Saved ${item.productCode} -> success: ${data.success}, persisted: ${data.persisted}`);
  }

  console.log('Import completed successfully!');
}

main().catch(console.error);
