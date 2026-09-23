// scripts/audit-supabase-integrity.js
// Supabase 11개 전체 테이블 전수 스키마 및 CRUD 무결성 자동 검사 도구

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 로드
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_TIMESTAMP = Date.now();

// 11개 테이블 정의 및 테스트 페이로드
const TABLE_TEST_CONFIGS = [
  {
    table: 'customers',
    description: '회원 원장',
    testId: `AUDIT-CUST-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-CUST-${TEST_TIMESTAMP}`,
      name: '감사용 회원',
      email: `audit_${TEST_TIMESTAMP}@choicomma.com`,
      phone: '010-9999-8888',
      address: '(06306) 서울 강남구 개포로22길 12 | 6층 본사',
      grade: 'GENERAL',
      totalSpent: 0,
      points: 1000,
      couponsCount: 0,
      joinedDate: '2026-09-23',
      status: 'Active',
      role: 'CUSTOMER',
      isAdmin: false,
    },
    primaryKey: 'id',
  },
  {
    table: 'orders',
    description: '주문 원장',
    testId: `AUDIT-ORD-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-ORD-${TEST_TIMESTAMP}`,
      orderNumber: `ORD-TEST-${TEST_TIMESTAMP}`,
      customerId: `AUDIT-CUST-${TEST_TIMESTAMP}`,
      customerName: '감사 주문자',
      customerEmail: 'audit@choicomma.com',
      customerPhone: '010-9999-8888',
      totalAmount: 50000,
      shippingFee: 0,
      discountAmount: 0,
      pointsUsed: 0,
      paymentMethod: '카드결제 (토스)',
      paymentStatus: 'PAID',
      shippingAddress: '서울 강남구 개포로22길 12 6층',
      items: [{ id: 'test-item', title: '감사용 상품', price: 50000, quantity: 1 }],
      orderMemo: '무결성 점검 테스트',
    },
    primaryKey: 'id',
  },
  {
    table: 'payment_logs',
    description: '토스 결제 승인 로그',
    testId: `AUDIT-PAY-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-PAY-${TEST_TIMESTAMP}`,
      orderId: `AUDIT-ORD-${TEST_TIMESTAMP}`,
      paymentKey: `test_payment_key_${TEST_TIMESTAMP}`,
      amount: 50000,
      status: 'DONE',
      method: '간편결제',
      rawResponse: { receipt: { url: 'https://dashboard.tosspayments.com/receipt/test' } },
    },
    primaryKey: 'id',
  },
  {
    table: 'shipments',
    description: '배송 및 송장 원장',
    testId: `AUDIT-SHIP-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-SHIP-${TEST_TIMESTAMP}`,
      orderId: `AUDIT-ORD-${TEST_TIMESTAMP}`,
      recipient: '감사 수령인',
      phone: '010-9999-8888',
      zipCode: '06306',
      address: '서울시 강남구 개포로22길 12',
      detailAddress: '6층',
      items: '감사용 상품 1개',
      quantity: 1,
      carrier: 'CJ대한통운',
      trackingNumber: '-',
      status: 'Pending',
    },
    primaryKey: 'id',
  },
  {
    table: 'products',
    description: '상품 카탈로그',
    testId: `AUDIT-PROD-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-PROD-${TEST_TIMESTAMP}`,
      title: '감사용 테스트 의류',
      handle: `audit-test-prod-${TEST_TIMESTAMP}`,
      description: '무결성 점검용',
      currencyCode: 'KRW',
      priceRange: { maxVariantPrice: { amount: '100000', currencyCode: 'KRW' }, minVariantPrice: { amount: '100000', currencyCode: 'KRW' } },
      stock: 10,
      availableForSale: true,
    },
    primaryKey: 'id',
  },
  {
    table: 'timesales',
    description: '타임세일 프로모션',
    testId: `AUDIT-TS-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-TS-${TEST_TIMESTAMP}`,
      title: '감사용 타임세일',
      discountRate: 20,
      productIds: [`AUDIT-PROD-${TEST_TIMESTAMP}`],
      targetCustomerEmails: [],
      targetGrades: ['VVIP'],
      durationHours: 24,
      durationMinutes: 0,
      status: 'active',
    },
    primaryKey: 'id',
  },
  {
    table: 'site_settings',
    description: '사이트 설정 및 통계',
    testId: `audit_setting_${TEST_TIMESTAMP}`,
    payload: {
      key: `audit_setting_${TEST_TIMESTAMP}`,
      value: { test: true, timestamp: TEST_TIMESTAMP },
      description: '무결성 점검용 임시 설정',
    },
    primaryKey: 'key',
  },
  {
    table: 'inbound_schedules',
    description: '물류 입고 스케줄',
    testId: `AUDIT-INB-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-INB-${TEST_TIMESTAMP}`,
      title: '감사용 입고 일정',
      date: '2026-09-30',
      quantity: 100,
      supplier: '감사 거래처',
      warehouse: '제1물류센터 A구역',
      notes: '테스트',
      status: 'Scheduled',
    },
    primaryKey: 'id',
  },
  {
    table: 'inquiries',
    description: '고객 1:1 문의',
    testId: `AUDIT-INQ-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-INQ-${TEST_TIMESTAMP}`,
      customerName: '감사 문의자',
      customerEmail: 'audit@choicomma.com',
      customerPhone: '010-9999-8888',
      category: '배송문의',
      title: '배송지 변경 문의',
      content: '무결성 점검용 문의 내용입니다.',
      status: 'pending',
    },
    primaryKey: 'id',
  },
  {
    table: 'chat_sessions',
    description: '라이브채팅 세션',
    testId: `AUDIT-CSESS-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-CSESS-${TEST_TIMESTAMP}`,
      customerName: '감사 채팅고객',
      customerEmail: 'audit@choicomma.com',
      customerPhone: '010-9999-8888',
      status: 'active',
    },
    primaryKey: 'id',
  },
  {
    table: 'chat_messages',
    description: '라이브채팅 메시지',
    testId: `AUDIT-CMSG-${TEST_TIMESTAMP}`,
    payload: {
      id: `AUDIT-CMSG-${TEST_TIMESTAMP}`,
      sessionId: `AUDIT-CSESS-${TEST_TIMESTAMP}`,
      sender: 'user',
      text: '안녕하세요, 무결성 테스트입니다.',
    },
    primaryKey: 'id',
  },
];

async function runAudit() {
  console.log('=============================================================================');
  console.log('🔍 [초이콤마 choicomma_webapp] Supabase 11개 테이블 전수 무결성 정밀 진단');
  console.log(`⏰ 점검 시각: ${new Date().toISOString()}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log('=============================================================================\n');

  const results = [];

  for (const cfg of TABLE_TEST_CONFIGS) {
    const itemResult = {
      table: cfg.table,
      description: cfg.description,
      currentCount: 0,
      insertStatus: 'PENDING',
      selectStatus: 'PENDING',
      deleteStatus: 'PENDING',
      schemaMismatch: false,
      errorMsg: null,
    };

    process.stdout.write(`👉 [${cfg.table.padEnd(18)}] (${cfg.description}): `);

    // 1. 현재 레코드 수 조회
    try {
      const { count, error: countErr } = await supabase
        .from(cfg.table)
        .select('*', { count: 'exact', head: true });

      if (countErr) {
        itemResult.errorMsg = `조회 에러: ${countErr.message}`;
        itemResult.insertStatus = 'FAIL';
        console.log(`❌ 조회 실패 (${countErr.message})`);
        results.push(itemResult);
        continue;
      }
      itemResult.currentCount = count || 0;
    } catch (e) {
      itemResult.errorMsg = `네트워크/연결 오류: ${e.message}`;
      console.log(`❌ 연결 실패 (${e.message})`);
      results.push(itemResult);
      continue;
    }

    // 2. 가상 데이터 Insert 테스트
    try {
      if (cfg.table === 'chat_messages') {
        // FK 제약 충족을 위해 부모 chat_sessions 생성
        await supabase.from('chat_sessions').insert([{
          id: cfg.payload.sessionId,
          customerName: '감사 부모세션',
          status: 'active'
        }]);
      }

      const { error: insErr } = await supabase.from(cfg.table).insert([cfg.payload]);
      if (insErr) {
        itemResult.insertStatus = 'FAIL';
        itemResult.errorMsg = `Insert 실패: [${insErr.code}] ${insErr.message}`;
        if (insErr.code === 'PGRST204' || insErr.message.includes('column') || insErr.message.includes('schema')) {
          itemResult.schemaMismatch = true;
        }
        console.log(`❌ INSERT 실패: ${insErr.message}`);
        results.push(itemResult);
        continue;
      }
      itemResult.insertStatus = 'PASS';
    } catch (e) {
      itemResult.insertStatus = 'FAIL';
      itemResult.errorMsg = `Insert 예외: ${e.message}`;
      console.log(`❌ INSERT 예외: ${e.message}`);
      results.push(itemResult);
      continue;
    }

    // 3. 삽입된 데이터 Select 검증
    try {
      const { data: selData, error: selErr } = await supabase
        .from(cfg.table)
        .select('*')
        .eq(cfg.primaryKey, cfg.testId)
        .maybeSingle();

      if (selErr || !selData) {
        itemResult.selectStatus = 'FAIL';
        itemResult.errorMsg = `Select 실패: ${selErr ? selErr.message : '데이터 미검색'}`;
        console.log(`❌ SELECT 실패`);
      } else {
        itemResult.selectStatus = 'PASS';
      }
    } catch (e) {
      itemResult.selectStatus = 'FAIL';
      itemResult.errorMsg = `Select 예외: ${e.message}`;
      console.log(`❌ SELECT 예외`);
    }

    // 4. 가상 테스트 데이터 Clean-up (Delete)
    try {
      const { error: delErr } = await supabase
        .from(cfg.table)
        .delete()
        .eq(cfg.primaryKey, cfg.testId);

      if (cfg.table === 'chat_messages') {
        await supabase.from('chat_sessions').delete().eq('id', cfg.payload.sessionId);
      }

      if (delErr) {
        itemResult.deleteStatus = 'FAIL';
        console.log(`⚠️ DELETE 실패: ${delErr.message}`);
      } else {
        itemResult.deleteStatus = 'PASS';
      }
    } catch (e) {
      itemResult.deleteStatus = 'FAIL';
      console.log(`⚠️ DELETE 예외`);
    }

    if (itemResult.insertStatus === 'PASS' && itemResult.selectStatus === 'PASS' && itemResult.deleteStatus === 'PASS') {
      console.log(`✅ 무결성 100% 정상 (기존 데이터: ${itemResult.currentCount}건)`);
    }
    results.push(itemResult);
  }

  console.log('\n=============================================================================');
  console.log('📊 [전수 정밀 진단 종합 리포트]');
  console.log('=============================================================================');
  console.table(
    results.map((r) => ({
      테이블: r.table,
      용도: r.description,
      기존건수: `${r.currentCount}건`,
      'CRUD 무결성': r.insertStatus === 'PASS' && r.selectStatus === 'PASS' && r.deleteStatus === 'PASS' ? '✅ 정상' : '❌ 불일치',
      비고: r.errorMsg || '정상 통과',
    }))
  );

  return results;
}

runAudit();
