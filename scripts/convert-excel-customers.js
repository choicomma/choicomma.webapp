const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '../public/회원2026_08_03_1.xls');
const outputPath = path.join(__dirname, '../lib/sfcc/mock/customers-data.json');

console.log('Reading Excel file from:', excelPath);
const wb = xlsx.readFile(excelPath);
const sheetName = wb.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

const mapped = rows.map((row, idx) => {
  const rawGrade = String(row['회원 등급'] || row['회원 그룹'] || 'REGULAR').trim();
  let grade = 'REGULAR';
  if (rawGrade.includes('BLACK') || rawGrade.includes('블랙')) grade = 'BLACK VIP';
  else if (rawGrade.includes('GOLD') || rawGrade.includes('골드')) grade = 'GOLD VIP';
  else if (rawGrade.includes('SILVER') || rawGrade.includes('실버')) grade = 'SILVER VIP';
  else if (rawGrade.includes('VIP') || rawGrade.includes('우수')) grade = 'GOLD VIP';
  else if (parseFloat(row['구매금액(KRW)']) >= 1000000) grade = 'GOLD VIP';
  else if (parseFloat(row['구매금액(KRW)']) >= 500000) grade = 'SILVER VIP';

  const rawPhone = String(row['연락처'] || '').trim();
  const phone = rawPhone ? rawPhone : '-';

  const rawDate = String(row['가입일'] || '').trim();
  const joinedDate = rawDate ? rawDate.split(' ')[0] : '2026-01-01';

  const zipCode = String(row['우편번호'] || '').trim();
  const mainAddr = String(row['주소'] || '').trim();
  const detailAddr = String(row['상세주소'] || '').trim();
  const fullAddrParts = [];
  if (zipCode) fullAddrParts.push(`(${zipCode})`);
  if (mainAddr) fullAddrParts.push(mainAddr);
  if (detailAddr) fullAddrParts.push(detailAddr);
  const address = fullAddrParts.join(' ').trim() || '-';

  return {
    id: String(row['고유키'] || `CUST-${1000 + idx + 1}`),
    name: String(row['이름'] || '무명 회원').trim(),
    email: String(row['이메일'] || row['아이디'] || '-').trim(),
    phone: phone,
    address: address,
    grade: grade,
    rawGrade: rawGrade,
    totalSpent: parseFloat(row['구매금액(KRW)']) || 0,
    points: parseInt(row['보유 적립금 포인트']) || 0,
    couponsCount: parseInt(row['작성 게시물 개수']) || 1,
    joinedDate: joinedDate,
    status: 'Active',
  };
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(mapped, null, 2), 'utf-8');
console.log(`Successfully imported ${mapped.length} customers into ${outputPath}`);
