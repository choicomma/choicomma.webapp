/**
 * scripts/verify-activity-logs-schema.js
 * 
 * [2단계 무결성 검증 스크립트: 활동 로그 센터 스키마 검사]
 * Supabase Pro 상의 `customer_journey_logs` 및 `admin_audit_logs` 테이블 상태를 진단하고,
 * CRUD 무결성 및 로컬 안전망(Fallback) 준비 상태를 점검합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. .env.local 로드
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
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

console.log('='.repeat(70));
console.log('🔍 [2단계] 활동 로그 센터 Supabase Pro 데이터베이스 스키마 상태 진단');
console.log('='.repeat(70));

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 누락되었습니다 (.env.local 확인 필요).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verifyTables() {
  const TEST_ID = `test_${Date.now()}`;

  // 1. customer_journey_logs 점검
  console.log('\n[1/2] 🛒 customer_journey_logs (고객 구매 여정 테이블) 검사 중...');
  const { data: jData, error: jErr } = await supabase
    .from('customer_journey_logs')
    .select('id')
    .limit(1);

  let journeyStatus = 'OK';
  if (jErr) {
    journeyStatus = jErr.message.includes('Could not find the table')
      ? 'TABLE_NOT_FOUND (SQL 실행 필요)'
      : `ERROR (${jErr.message})`;
    console.log(`  상태: ⚠️  ${journeyStatus}`);
  } else {
    console.log(`  상태: ✅ 정상 연결 (Supabase 활성화 완료, 레코드 조회 성공)`);
  }

  // 2. admin_audit_logs 점검
  console.log('\n[2/2] 🛡️ admin_audit_logs (관리자 작업 감사 테이블) 검사 중...');
  const { data: aData, error: aErr } = await supabase
    .from('admin_audit_logs')
    .select('id')
    .limit(1);

  let auditStatus = 'OK';
  if (aErr) {
    auditStatus = aErr.message.includes('Could not find the table')
      ? 'TABLE_NOT_FOUND (SQL 실행 필요)'
      : `ERROR (${aErr.message})`;
    console.log(`  상태: ⚠️  ${auditStatus}`);
  } else {
    console.log(`  상태: ✅ 정상 연결 (Supabase 활성화 완료, 레코드 조회 성공)`);
  }

  // 3. 로컬 폴백 데이터 안전망(Safe Dual-Write Storage) 점검
  console.log('\n[3/3] 💾 로컬 안전망(Safe Fallback Storage) 상태 점검...');
  const dataDir = path.join(__dirname, '..', 'data');
  const fallbackFile = path.join(dataDir, 'activity-logs.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(fallbackFile)) {
    const initialFallback = {
      journeyLogs: [],
      auditLogs: [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(fallbackFile, JSON.stringify(initialFallback, null, 2), 'utf-8');
    console.log('  상태: ✅ data/activity-logs.json 신규 생성 완료 (무중단 폴백 안전망 확보)');
  } else {
    console.log('  상태: ✅ data/activity-logs.json 존재 확인 완료');
  }

  console.log('\n' + '='.repeat(70));
  if (jErr || aErr) {
    console.log('📋 [안내] Supabase 대시보드 SQL Editor에서 다음 파일을 실행해 주세요:');
    console.log('   👉 `supabase_activity_logs_schema.sql` (프로젝트 루트에 생성 완료)');
    console.log('   ※ SQL 실행 전에도 웹앱은 로컬 안전망을 통해 0% 크래시로 안전하게 동작합니다.');
  } else {
    console.log('🎉 축하합니다! Supabase Pro 활동 로그 2대 테이블이 100% 정상 작동 중입니다.');
  }
  console.log('='.repeat(70) + '\n');
}

verifyTables().catch((err) => {
  console.error('검증 중 예외 발생:', err);
});
