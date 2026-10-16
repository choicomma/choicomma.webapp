/**
 * scripts/migrate-step4-customers.js
 * 
 * [4단계 데이터 이관 스크립트: 회원 정보 (customers)]
 * data/customers.json 과 Supabase `customers` 테이블의 회원 데이터를
 * 양방향 병합(Bi-Directional Merge)하여 데이터 유실 없이 안전하게 완전 동기화합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. .env.local 로드
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('='.repeat(60));
console.log('👥 [4단계] 회원 정보 (customers) Supabase 양방향 동기화');
console.log('='.repeat(60));

// 2. data/customers.json 파일 읽기
const customersFilePath = path.join(__dirname, '..', 'data', 'customers.json');
let localCustomers = [];

if (fs.existsSync(customersFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(customersFilePath, 'utf-8'));
    if (Array.isArray(parsed)) localCustomers = parsed;
  } catch (err) {
    console.error('❌ data/customers.json 파싱 실패:', err.message);
  }
}

console.log(`📄 로컬 customers.json 회원 수: ${localCustomers.length}명`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  process.exit(0);
}

// 3. Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 회원 데이터 조회 중...');
  console.log(`📡 대상 URL: ${supabaseUrl}`);

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    const fetchPromise = supabase.from('customers').select('*');
    const { data: remoteCustomers, error } = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timer);

    if (error) {
      console.warn('⚠️ Supabase 회원 조회 오류:', error.message);
      return;
    }

    console.log(`☁️ Supabase 원격 customers 테이블 회원 수: ${(remoteCustomers || []).length}명`);

    // 4. 양방향 스마트 병합 (ID 및 이메일 기준 단일화)
    const customerMap = new Map();

    // 4-1. Supabase 원격 회원 먼저 맵에 등록
    (remoteCustomers || []).forEach(rc => {
      const key = String(rc.id || rc.email).trim().toLowerCase();
      if (key) {
        customerMap.set(key, {
          id: rc.id,
          name: rc.name,
          email: rc.email,
          phone: rc.phone || '',
          address: rc.address || '',
          grade: rc.grade || 'GENERAL',
          totalSpent: Number(rc.totalSpent || 0),
          points: Number(rc.points || 0),
          couponsCount: Number(rc.couponsCount || 0),
          joinedDate: rc.joinedDate || new Date().toISOString().split('T')[0],
          status: rc.status || 'Active',
          role: rc.role || 'CUSTOMER',
          isAdmin: Boolean(rc.isAdmin),
          created_at: rc.created_at || new Date().toISOString(),
          updated_at: rc.updated_at || new Date().toISOString(),
        });
      }
    });

    // 4-2. 로컬 파일 회원 병합 (로컬의 최신 변경사항 우선 반영)
    localCustomers.forEach(lc => {
      const key = String(lc.id || lc.email).trim().toLowerCase();
      if (key) {
        const existing = customerMap.get(key) || {};
        const fullAddr = [lc.address, lc.detailAddress].filter(Boolean).join(' | ');
        customerMap.set(key, {
          ...existing,
          id: lc.id || existing.id,
          name: lc.name || existing.name,
          email: lc.email || existing.email,
          phone: lc.phone || existing.phone || '',
          address: fullAddr || existing.address || '',
          grade: lc.grade || existing.grade || 'GENERAL',
          totalSpent: lc.totalSpent !== undefined ? Number(lc.totalSpent) : Number(existing.totalSpent || 0),
          points: lc.points !== undefined ? Number(lc.points) : Number(existing.points || 0),
          couponsCount: lc.couponsCount !== undefined ? Number(lc.couponsCount) : Number(existing.couponsCount || 0),
          joinedDate: lc.joinedDate || existing.joinedDate || new Date().toISOString().split('T')[0],
          status: lc.status || existing.status || 'Active',
          role: lc.role || existing.role || 'CUSTOMER',
          isAdmin: Boolean(lc.isAdmin !== undefined ? lc.isAdmin : existing.isAdmin),
          password: lc.password || existing.password || undefined,
          updated_at: new Date().toISOString(),
        });
      }
    });

    const mergedCustomers = Array.from(customerMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 회원 수: ${mergedCustomers.length}명`);
    mergedCustomers.forEach(c => {
      console.log(`  - [${c.id}] ${c.name} (${c.email}) | 등급: ${c.grade} | 적립금: ${c.points.toLocaleString()}P`);
    });

    // 5. 로컬 파일 저장
    fs.writeFileSync(customersFilePath, JSON.stringify(mergedCustomers, null, 2), 'utf-8');
    console.log('\n💾 data/customers.json 파일 갱신 완료');

    // 6. Supabase에 일괄 Upsert
    const supabasePayload = mergedCustomers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      address: c.address || '',
      grade: c.grade || 'GENERAL',
      totalSpent: Number(c.totalSpent || 0),
      points: Number(c.points || 0),
      couponsCount: Number(c.couponsCount || 0),
      joinedDate: c.joinedDate || new Date().toISOString().split('T')[0],
      status: c.status || 'Active',
      role: c.role || 'CUSTOMER',
      isAdmin: Boolean(c.isAdmin),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase.from('customers').upsert(supabasePayload, { onConflict: 'id' });
    if (upsertErr) {
      console.error('❌ Supabase Upsert 실패:', upsertErr.message);
    } else {
      console.log('✅ Supabase customers 테이블 완전 동기화 성공!');
    }

  } catch (err) {
    clearTimeout(timer);
    console.error('⚠️ 동기화 중 오류 발생:', err.message);
  }

  console.log('='.repeat(60));
}

runMigration();
