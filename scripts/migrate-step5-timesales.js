/**
 * scripts/migrate-step5-timesales.js
 * 
 * [5단계 데이터 이관 스크립트: 타임세일 프로모션 (timesales)]
 * data/timesales.json 과 Supabase `timesales` 테이블의 타임세일 데이터를
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
console.log('⚡ [5단계] 타임세일 프로모션 (timesales) Supabase 양방향 동기화');
console.log('='.repeat(60));

// 2. data/timesales.json 파일 읽기
const timesalesFilePath = path.join(__dirname, '..', 'data', 'timesales.json');
let localTimesales = [];

if (fs.existsSync(timesalesFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(timesalesFilePath, 'utf-8'));
    if (Array.isArray(parsed)) {
      localTimesales = parsed.filter(t => t && t.id !== 'SECRET-TS-001');
    }
  } catch (err) {
    console.error('❌ data/timesales.json 파싱 실패:', err.message);
  }
}

console.log(`📄 로컬 timesales.json 프로모션 수: ${localTimesales.length}개`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  process.exit(0);
}

// 3. Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 타임세일 데이터 조회 중...');
  console.log(`📡 대상 URL: ${supabaseUrl}`);

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    const fetchPromise = supabase.from('timesales').select('*');
    const { data: remoteTimesales, error } = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timer);

    if (error) {
      console.warn('⚠️ Supabase 타임세일 조회 오류:', error.message);
      return;
    }

    const filteredRemote = (remoteTimesales || []).filter(t => t && t.id !== 'SECRET-TS-001');
    console.log(`☁️ Supabase 원격 timesales 테이블 프로모션 수: ${filteredRemote.length}개`);

    // 4. 양방향 스마트 병합 (ID 기준 단일화)
    const timesaleMap = new Map();

    // 4-1. Supabase 원격 프로모션 먼저 맵에 등록
    filteredRemote.forEach(rt => {
      const key = String(rt.id).trim();
      if (key) {
        timesaleMap.set(key, {
          id: rt.id,
          title: rt.title || '시크릿 타임세일',
          discountRate: Number(rt.discountRate) || 30,
          productIds: Array.isArray(rt.productIds) ? rt.productIds.map(String) : [],
          targetCustomerEmails: Array.isArray(rt.targetCustomerEmails) ? rt.targetCustomerEmails.map(String) : [],
          targetGrades: Array.isArray(rt.targetGrades) ? rt.targetGrades.map(String) : [],
          durationHours: Number(rt.durationHours) || 24,
          durationMinutes: Number(rt.durationMinutes) || 0,
          status: rt.status || 'active',
          startTime: rt.startTime || rt.created_at || new Date().toISOString(),
          endTime: rt.endTime || null,
          createdAt: rt.created_at || new Date().toISOString(),
          created_at: rt.created_at || new Date().toISOString(),
          updated_at: rt.updated_at || new Date().toISOString(),
        });
      }
    });

    // 4-2. 로컬 파일 프로모션 병합 (로컬의 최신 변경사항 우선 반영)
    localTimesales.forEach(lt => {
      const key = String(lt.id).trim();
      if (key) {
        const existing = timesaleMap.get(key) || {};
        timesaleMap.set(key, {
          ...existing,
          id: lt.id || existing.id,
          title: lt.title || existing.title || '시크릿 타임세일',
          discountRate: lt.discountRate !== undefined ? Number(lt.discountRate) : (existing.discountRate || 30),
          productIds: Array.isArray(lt.productIds) ? lt.productIds.map(String) : (existing.productIds || []),
          targetCustomerEmails: Array.isArray(lt.targetCustomerEmails) ? lt.targetCustomerEmails.map(String) : (existing.targetCustomerEmails || []),
          targetGrades: Array.isArray(lt.targetGrades) ? lt.targetGrades.map(String) : (existing.targetGrades || []),
          durationHours: lt.durationHours !== undefined ? Number(lt.durationHours) : (existing.durationHours || 24),
          durationMinutes: lt.durationMinutes !== undefined ? Number(lt.durationMinutes) : (existing.durationMinutes || 0),
          status: lt.status || existing.status || 'active',
          startTime: lt.startTime || existing.startTime || new Date().toISOString(),
          endTime: lt.endTime || existing.endTime || null,
          createdAt: lt.createdAt || existing.createdAt || new Date().toISOString(),
          created_at: lt.created_at || existing.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    const mergedTimesales = Array.from(timesaleMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 타임세일 프로모션 수: ${mergedTimesales.length}개`);
    mergedTimesales.forEach(ts => {
      console.log(`  - [${ts.id}] ${ts.title} | 할인율: ${ts.discountRate}% | 대상상품: ${ts.productIds.length}개 | 상태: ${ts.status}`);
    });

    // 5. 로컬 파일 저장
    fs.writeFileSync(timesalesFilePath, JSON.stringify(mergedTimesales, null, 2), 'utf-8');
    console.log('\n💾 data/timesales.json 파일 갱신 완료');

    // 6. Supabase에 일괄 Upsert
    if (mergedTimesales.length > 0) {
      const supabasePayload = mergedTimesales.map(ts => ({
        id: ts.id,
        title: ts.title,
        discountRate: Number(ts.discountRate) || 30,
        productIds: ts.productIds,
        targetCustomerEmails: ts.targetCustomerEmails,
        targetGrades: ts.targetGrades,
        durationHours: Number(ts.durationHours) || 24,
        durationMinutes: Number(ts.durationMinutes) || 0,
        status: ts.status,
        startTime: ts.startTime,
        endTime: ts.endTime,
        created_at: ts.created_at,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase.from('timesales').upsert(supabasePayload, { onConflict: 'id' });
      if (upsertErr) {
        console.error('❌ Supabase Upsert 실패:', upsertErr.message);
      } else {
        console.log('✅ Supabase timesales 테이블 완전 동기화 성공!');
      }
    } else {
      console.log('ℹ️ 동기화할 타임세일 항목이 없습니다.');
    }

  } catch (err) {
    clearTimeout(timer);
    console.error('⚠️ 동기화 중 오류 발생:', err.message);
  }

  console.log('='.repeat(60));
}

runMigration();
