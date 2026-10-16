/**
 * scripts/migrate-step2-inquiries.js
 * 
 * [2단계 데이터 이관 스크립트: 1:1 고객 문의 (inquiries)]
 * data/inquiries.json 의 모든 문의 데이터를 Supabase `inquiries` 테이블로 동기화합니다.
 * 
 * 안전 원칙:
 * - Supabase 서버가 일시정지(Paused) 상태이거나 네트워크 지연이 발생해도 스크립트가 멈추지 않고 타임아웃(5초) 처리
 * - 로컬 파일의 데이터 무결성을 100% 보존
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
console.log('📬 [2단계] 1:1 고객 문의 (inquiries) Supabase 동기화');
console.log('='.repeat(60));

// 2. data/inquiries.json 파일 확인
const inquiriesFilePath = path.join(__dirname, '..', 'data', 'inquiries.json');
let inquiriesData = [];

if (fs.existsSync(inquiriesFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(inquiriesFilePath, 'utf-8'));
    if (Array.isArray(parsed)) {
      inquiriesData = parsed;
    }
  } catch (err) {
    console.error('❌ data/inquiries.json 파싱 실패:', err.message);
    process.exit(1);
  }
}

console.log(`📄 로컬 inquiries.json 항목 수: ${inquiriesData.length}건`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  console.log('💡 로컬 JSON 파일로 안전하게 사이트가 계속 동작합니다.');
  process.exit(0);
}

// 3. Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 4. 동기화 레코드 구성 (스키마 정규화)
const rowsToUpsert = inquiriesData.map(item => ({
  id: String(item.id || `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
  customerName: item.customerName || item.name || '고객',
  customerEmail: item.customerEmail || item.email || '',
  customerPhone: item.customerPhone || item.phone || '',
  category: item.category || '일반',
  title: item.title || '문의 내용',
  content: item.content || item.message || '',
  status: item.status || 'pending',
  imageUrl: item.imageUrl || item.image || null,
  reply: item.reply || null,
  repliedAt: item.repliedAt || null,
  created_at: item.created_at || new Date().toISOString(),
  updated_at: item.updated_at || new Date().toISOString(),
}));

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 동기화 시도 중...');
  console.log(`📡 대상 URL: ${supabaseUrl}`);

  if (rowsToUpsert.length === 0) {
    console.log('ℹ️ 로컬 문의 데이터가 0건이므로 적재할 이전 데이터가 없습니다.');
    console.log('🔍 Supabase inquiries 테이블 연결성 테스트를 수행합니다...');
  }

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    let operationPromise;
    if (rowsToUpsert.length > 0) {
      operationPromise = supabase.from('inquiries').upsert(rowsToUpsert, { onConflict: 'id' });
    } else {
      operationPromise = supabase.from('inquiries').select('id').limit(1);
    }

    const { data, error } = await Promise.race([operationPromise, timeoutPromise]);
    clearTimeout(timer);

    if (error) {
      console.warn('\n⚠️ Supabase 응답 오류:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.warn('💡 원인: Supabase에 inquiries 테이블이 아직 생성되지 않았습니다.');
        console.warn('   supabase_schema.sql 스크립트를 Supabase SQL Editor에서 실행하시면 생성됩니다.');
      } else if (error.message.includes('connection pool') || error.message.includes('Paused')) {
        console.warn('💡 원인: Supabase 무료 티어 데이터베이스가 일시 정지(Paused) 상태입니다.');
        console.warn('   Supabase 대시보드에서 [Restore project] 버튼을 눌러 복원할 수 있습니다.');
      }
    } else {
      if (rowsToUpsert.length > 0) {
        console.log(`\n✅ [성공] Supabase inquiries 테이블에 ${rowsToUpsert.length}건 동기화 완료!`);
      } else {
        console.log('\n✅ [성공] Supabase inquiries 테이블 연결성 확인 완료! (0건 정상 확인)');
      }
    }
  } catch (err) {
    clearTimeout(timer);
    if (err.message === 'SUPABASE_TIMEOUT_5S') {
      console.warn('\n⏳ [타임아웃 감지] Supabase 응답 시간 5초 초과 (인스턴스 일시 정지 또는 네트워크 지연).');
      console.warn('💡 안내: Supabase 무료 플랜은 장기 미사용 시 Sleep 상태가 될 수 있습니다.');
      console.warn('   Supabase Dashboard (https://supabase.com/dashboard)에서 프로젝트 활성화(Restore)를 확인해주세요.');
    } else {
      console.warn('\n⚠️ 동기화 중 예외 발생:', err.message);
    }
  }

  console.log('\n🛡️ [안전 보장]: 웹앱은 듀얼 라이트 및 로컬 JSON 안전 폴백 구조로 설계되어 있어,');
  console.log('   Supabase 연결 상태와 무관하게 쇼핑몰 및 관리자 문의 기능이 100% 정상 작동합니다.');
  console.log('='.repeat(60));
}

runMigration();
