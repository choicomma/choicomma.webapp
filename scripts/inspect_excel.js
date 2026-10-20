const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const p = path.join(process.cwd(), 'docs', '상품_4개_전체_2026_10_20_KR.xlsx');
console.log('File path:', p);
console.log('Exists:', fs.existsSync(p));

if (!fs.existsSync(p)) {
  console.error('File does not exist!');
  process.exit(1);
}

const wb = xlsx.readFile(p);
console.log('Sheet names:', wb.SheetNames);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);
console.log('Total rows:', rows.length);

rows.forEach((r, idx) => {
  const strVal = String(r['상품상세정보'] || '');
  const matches = [...strVal.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log(`\n[Row ${idx + 1}] PNO: ${r['상품번호']} | TITLE: ${r['상품명']} | PRICE: ${r['판매가']} | OPT_NAME: ${JSON.stringify(r['필수옵션명'])} | OPT_VAL: ${JSON.stringify(r['필수옵션값'])} | STOCK: ${r['필수옵션재고수량합계']}`);
  console.log(`  REP_IMG: ${r['대표이미지URL']}`);
  console.log(`  DETAIL_IMGS (${matches.length}):`, matches);
  console.log(`  CATEGORY: ${r['카테고리ID']}`);
  console.log(`  MIN_QTY: ${r['최소 구매수량'] || 1}`);
});

