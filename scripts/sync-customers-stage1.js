/**
 * scripts/sync-customers-stage1.js
 * 
 * [초이콤마 회원 전수 조사 및 동기화: 1단계 (1번 ~ 500번 회원)]
 * 1. 1~500번 회원 데이터 전수 검사 (필드 누락, 결측치, 이상치 분석)
 * 2. 누락된 데이터 보정 및 정규화 (전화번호 하이픈 포맷팅, 주소 통합, 등급 매핑)
 * 3. Supabase Pro customers 테이블로 100건씩 안전 분할 Upsert
 * 4. 검증 결과 리포트 출력 및 저장 (data/stage1_inspection_report.json)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. .env 또는 .env.local 로드 (환경변수 로드)
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  }
}
loadEnv();

console.log('='.repeat(70));
console.log('🔍 [1단계 작업] 회원 1번 ~ 500번 (500명) 정밀 전수 검사 및 동기화');
console.log('='.repeat(70));

// 2. data/customers.json 로드
const customersPath = path.join(__dirname, '..', 'data', 'customers.json');
if (!fs.existsSync(customersPath)) {
  console.error('❌ data/customers.json 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const allCustomers = JSON.parse(fs.readFileSync(customersPath, 'utf-8'));
console.log(`📊 전체 회원 DB 총 인원: ${allCustomers.length}명`);

const START_INDEX = 0;   // 1번 회원
const END_INDEX = 500;   // 500번 회원
const stage1Customers = allCustomers.slice(START_INDEX, END_INDEX);

console.log(`🎯 1단계 검토 대상: 1번 ~ ${stage1Customers.length}번 회원 (총 ${stage1Customers.length}명)\n`);

function formatPhoneNumber(phone) {
  if (!phone || phone === '-' || phone === 'null') return '-';
  const cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function normalizeGrade(grade, rawGrade) {
  const g = String(grade || '').toUpperCase();
  if (['VVIP', 'PLATINUM', 'GOLD', 'SILVER', 'GENERAL'].includes(g)) return g;
  const raw = String(rawGrade || grade || '');
  if (raw.includes('VVIP') || raw.includes('최고')) return 'VVIP';
  if (raw.includes('플래티넘') || raw.includes('PLATINUM')) return 'PLATINUM';
  if (raw.includes('골드') || raw.includes('GOLD')) return 'GOLD';
  if (raw.includes('실버') || raw.includes('SILVER')) return 'SILVER';
  return 'GENERAL';
}

// 3. 500명 전수 정밀 결측치 및 누락 데이터 분석
const analysis = {
  total: stage1Customers.length,
  missingName: [],
  missingPhone: [],
  missingAddress: [],
  zeroOrders: 0,
  buyers: 0,
  totalSpentSum: 0,
  gradeCounts: { VVIP: 0, PLATINUM: 0, GOLD: 0, SILVER: 0, GENERAL: 0 },
};

const normalizedRows = [];

stage1Customers.forEach((c, idx) => {
  const no = idx + 1;
  const id = String(c.id || c.imwebUid || c.loginId || `CUST-${no}`).trim();
  
  // 1. 이름 누락 보정
  let name = String(c.name || '').trim();
  if (!name || name === 'null' || name === '-' || name === '무명회원') {
    if (c.email && c.email.includes('@')) {
      name = c.email.split('@')[0];
    } else if (c.loginId) {
      name = c.loginId;
    } else {
      name = `고객_${no}`;
    }
    analysis.missingName.push({ no, id, email: c.email });
  }

  // 2. 전화번호 정규화 (하이픈 자동 부여)
  const rawPhone = String(c.phone || '-').trim();
  const phone = formatPhoneNumber(rawPhone);
  if (!phone || phone === '-' || phone === '010-0000-0000') {
    analysis.missingPhone.push({ no, name, email: c.email });
  }

  // 3. 주소 통합 및 누락 보정
  const fullAddr = [c.address, c.detailAddress].filter(a => a && a !== '-').join(' | ').trim();
  const address = fullAddr || (c.address && c.address !== '-' ? c.address : '-');
  if (!address || address === '-') {
    analysis.missingAddress.push({ no, name, phone });
  }

  // 4. 이메일 정규화
  const email = String(c.email || c.loginId || '-').trim().toLowerCase();

  const grade = normalizeGrade(c.grade, c.rawGrade);
  const totalSpent = Number(c.totalSpent || 0);
  const points = Number(c.points || 0);
  const totalOrders = Number(c.totalOrders || 0);

  if (totalSpent > 0 || totalOrders > 0) {
    analysis.buyers++;
    analysis.totalSpentSum += totalSpent;
  } else {
    analysis.zeroOrders++;
  }

  if (analysis.gradeCounts[grade] !== undefined) {
    analysis.gradeCounts[grade]++;
  } else {
    analysis.gradeCounts['GENERAL']++;
  }

  normalizedRows.push({
    id,
    name,
    email,
    phone,
    address,
    postcode: c.postcode || '',
    grade,
    totalSpent,
    totalOrders,
    points,
    couponsCount: Number(c.couponsCount || 0),
    joinedDate: c.joinedDate || (c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    status: c.status || 'Active',
    role: c.role || (c.isAdmin ? 'ADMIN' : 'CUSTOMER'),
    isAdmin: Boolean(c.isAdmin),
    updated_at: new Date().toISOString(),
  });
});

console.log('📋 [1단계 500명 전수 검사 결과]');
console.log(`  - 검사 완료 인원: ${analysis.total}명`);
console.log(`  - 성명 누락(결측치): ${analysis.missingName.length}명`);
console.log(`  - 전화번호 미등록: ${analysis.missingPhone.length}명`);
console.log(`  - 배송지 주소 미등록: ${analysis.missingAddress.length}명`);
console.log(`  - 구매 실적 회원(구매고객): ${analysis.buyers}명 (누적 결제총액: ${analysis.totalSpentSum.toLocaleString()}원)`);
console.log(`  - 미구매/단순가입 회원: ${analysis.zeroOrders}명`);
console.log('  - 등급 분포:', analysis.gradeCounts);

console.log('\n🔍 [1단계 대표 샘플 회원 검증]');
console.log('  1) 1번 회원 (시작):', {
  no: 1,
  id: normalizedRows[0].id,
  name: normalizedRows[0].name,
  email: normalizedRows[0].email,
  phone: normalizedRows[0].phone,
  grade: normalizedRows[0].grade,
});
console.log('  2) 250번 회원 (중간):', {
  no: 250,
  id: normalizedRows[249].id,
  name: normalizedRows[249].name,
  email: normalizedRows[249].email,
  phone: normalizedRows[249].phone,
  grade: normalizedRows[249].grade,
});
console.log('  3) 500번 회원 (마지막):', {
  no: 500,
  id: normalizedRows[499].id,
  name: normalizedRows[499].name,
  email: normalizedRows[499].email,
  phone: normalizedRows[499].phone,
  grade: normalizedRows[499].grade,
});

// 4. Supabase 연동 시도 (100건씩 안전 분할)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function syncToSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('\n⚠️ 로컬 환경에 Supabase 환경변수가 없어 클라우드 직접 전송은 건너뜁니다.');
    console.log('ℹ️ Vercel 배포 시에는 API(/api/admin/customers/sync-batch)를 통해 자동으로 안전하게 반영됩니다.');
    return;
  }

  console.log(`\n🚀 Supabase (${supabaseUrl}) 1단계 500명 안전 전송 시작...`);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const CHUNK_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < normalizedRows.length; i += CHUNK_SIZE) {
    const chunk = normalizedRows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`❌ 청크 ${Math.floor(i / CHUNK_SIZE) + 1} 전송 오류:`, error.message);
    } else {
      successCount += chunk.length;
      console.log(`  ✅ 청크 ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length}명) 전송 완료 (누적: ${successCount}/500)`);
    }
  }

  console.log(`\n🎉 [1단계 완료] 총 ${successCount}명 Supabase 저장 완료!`);
}

syncToSupabase().then(() => {
  // 결과 파일 저장 (검토 기록 보관)
  const reportPath = path.join(__dirname, '..', 'data', 'stage1_inspection_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    stage: 1,
    range: "1 ~ 500번",
    analysis,
    sampleFirst: normalizedRows[0],
    sampleMiddle: normalizedRows[249],
    sampleLast: normalizedRows[499],
    completedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`📄 1단계 검토 리포트 저장 완료: data/stage1_inspection_report.json`);
});
