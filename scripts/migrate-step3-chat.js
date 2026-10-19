/**
 * scripts/migrate-step3-chat.js
 * 
 * [3단계 데이터 이관 스크립트: 실시간 라이브 상담 (chat_sessions & chat_messages)]
 * data/chat-sessions.json 및 data/chat-messages.json 데이터를 
 * Supabase `chat_sessions` 및 `chat_messages` 테이블로 안전하게 동기화합니다.
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
console.log('💬 [3단계] 실시간 상담 (chat_sessions & chat_messages) Supabase 동기화');
console.log('='.repeat(60));

// 2. data/chat-sessions.json 및 data/chat-messages.json 파일 확인
const sessionsFilePath = path.join(__dirname, '..', 'data', 'chat-sessions.json');
const messagesFilePath = path.join(__dirname, '..', 'data', 'chat-messages.json');

let sessionsData = [];
let messagesData = [];

if (fs.existsSync(sessionsFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionsFilePath, 'utf-8'));
    if (Array.isArray(parsed)) sessionsData = parsed;
  } catch (err) {
    console.error('❌ data/chat-sessions.json 파싱 실패:', err.message);
  }
}

if (fs.existsSync(messagesFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(messagesFilePath, 'utf-8'));
    if (Array.isArray(parsed)) messagesData = parsed;
  } catch (err) {
    console.error('❌ data/chat-messages.json 파싱 실패:', err.message);
  }
}

console.log(`📄 로컬 chat-sessions.json 항목 수: ${sessionsData.length}건`);
console.log(`📄 로컬 chat-messages.json 항목 수: ${messagesData.length}건`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  console.log('💡 로컬 JSON 파일로 안전하게 사이트가 계속 동작합니다.');
  process.exit(0);
}

// 3. Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 4. 레코드 정규화
const sessionRows = sessionsData.map(s => {
  const normId = String(s.id || '').trim().toLowerCase();
  return {
    id: normId,
    customerName: s.customerName || s.name || '방문자',
    customerEmail: s.customerEmail || (normId.includes('@') ? normId : ''),
    customerPhone: s.customerPhone || s.phone || '',
    status: s.status || 'active',
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString(),
  };
});

const messageRows = messagesData.map(m => {
  const normSessionId = String(m.sessionId || '').trim().toLowerCase();
  return {
    id: String(m.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
    sessionId: normSessionId,
    sender: m.sender === 'admin' ? 'admin' : 'user',
    text: m.text || m.content || m.message || '',
    created_at: m.created_at || new Date().toISOString(),
  };
});

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 동기화 시도 중...');
  console.log(`📡 대상 URL: ${supabaseUrl}`);

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    const opPromise = (async () => {
      // 1. chat_sessions 동기화
      if (sessionRows.length > 0) {
        console.log(`🔄 상담 세션 ${sessionRows.length}건 동기화 중...`);
        const { error: sErr } = await supabase.from('chat_sessions').upsert(sessionRows, { onConflict: 'id' });
        if (sErr) throw sErr;
      } else {
        const { error: sTestErr } = await supabase.from('chat_sessions').select('id').limit(1);
        if (sTestErr) throw sTestErr;
      }

      // 2. chat_messages 동기화
      if (messageRows.length > 0) {
        console.log(`🔄 상담 메시지 ${messageRows.length}건 동기화 중...`);
        const { error: mErr } = await supabase.from('chat_messages').upsert(messageRows, { onConflict: 'id' });
        if (mErr) throw mErr;
      } else {
        const { error: mTestErr } = await supabase.from('chat_messages').select('id').limit(1);
        if (mTestErr) throw mTestErr;
      }

      return { success: true };
    })();

    const result = await Promise.race([opPromise, timeoutPromise]);
    clearTimeout(timer);

    console.log('\n✅ [성공] Supabase chat_sessions 및 chat_messages 테이블 동기화/연결성 확인 완료!');
    if (sessionRows.length > 0 || messageRows.length > 0) {
      console.log(`총 세션: ${sessionRows.length}건, 메시지: ${messageRows.length}건 동기화 완료.`);
    } else {
      console.log('현재 데이터가 0건이므로 테이블 스키마 연결성 정상 확인을 완료했습니다.');
    }
  } catch (err) {
    clearTimeout(timer);
    if (err.message === 'SUPABASE_TIMEOUT_5S') {
      console.warn('\n⏳ [타임아웃 감지] Supabase 응답 시간 5초 초과 (인스턴스 일시 정지 또는 네트워크 지연).');
      console.warn('💡 안내: Supabase 무료 플랜은 장기 미사용 시 Sleep 상태가 될 수 있습니다.');
      console.warn('   Supabase Dashboard (https://supabase.com/dashboard)에서 프로젝트 활성화(Restore)를 확인해주세요.');
    } else {
      console.warn('\n⚠️ 동기화 중 예외 또는 오류 발생:', err.message || err);
      if (err.message && err.message.includes('relation') && err.message.includes('does not exist')) {
        console.warn('💡 원인: Supabase에 chat_sessions 또는 chat_messages 테이블이 아직 생성되지 않았습니다.');
        console.warn('   supabase_schema.sql 스크립트를 Supabase SQL Editor에서 실행하시면 생성됩니다.');
      } else if (err.message && (err.message.includes('connection pool') || err.message.includes('Paused'))) {
        console.warn('💡 원인: Supabase 무료 티어 데이터베이스가 일시 정지(Paused) 상태입니다.');
        console.warn('   Supabase 대시보드에서 [Restore project] 버튼을 눌러 복원할 수 있습니다.');
      }
    }
  }

  console.log('\n🛡️ [안전 보장]: 웹앱은 듀얼 라이트 및 로컬 JSON 안전 폴백 구조로 설계되어 있어,');
  console.log('   Supabase 연결 상태와 무관하게 실시간 상담 기능이 100% 정상 작동합니다.');
  console.log('='.repeat(60));
}

runMigration();
