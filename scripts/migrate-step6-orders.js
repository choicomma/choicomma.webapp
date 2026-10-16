/**
 * scripts/migrate-step6-orders.js
 * 
 * [6단계 데이터 이관 스크립트: 주문 및 결제 내역 (orders, payment_logs)]
 * data/orders.json 및 data/payment-logs.json 과 
 * Supabase `orders`, `payment_logs` 테이블의 데이터를 양방향 스마트 병합(Bi-Directional Merge)하여
 * 데이터 유실 없이 안전하게 완전 동기화합니다.
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

console.log('='.repeat(65));
console.log('📦 [6단계] 주문 및 결제 내역 (orders, payment_logs) Supabase 양방향 동기화');
console.log('='.repeat(65));

const ordersFilePath = path.join(__dirname, '..', 'data', 'orders.json');
const paymentLogsFilePath = path.join(__dirname, '..', 'data', 'payment-logs.json');

let localOrders = [];
let localPaymentLogs = [];

if (fs.existsSync(ordersFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8'));
    if (Array.isArray(parsed)) localOrders = parsed;
  } catch (err) {
    console.error('❌ data/orders.json 파싱 실패:', err.message);
  }
}

if (fs.existsSync(paymentLogsFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(paymentLogsFilePath, 'utf-8'));
    if (Array.isArray(parsed)) localPaymentLogs = parsed;
  } catch (err) {
    console.error('❌ data/payment-logs.json 파싱 실패:', err.message);
  }
}

console.log(`📄 로컬 orders.json 주문 수: ${localOrders.length}건`);
console.log(`📄 로컬 payment-logs.json 결제 로그 수: ${localPaymentLogs.length}건`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeSupabaseOrderToLocal(o) {
  const addrStr = typeof o.shippingAddress === 'string' ? o.shippingAddress : (o.shippingAddress?.address || '');
  const addrDetail = typeof o.shippingAddress === 'object' ? (o.shippingAddress?.detailAddress || '') : '';
  const zip = typeof o.shippingAddress === 'object' ? (o.shippingAddress?.zipCode || '') : '';

  let itemsText = '';
  if (typeof o.items === 'string') {
    itemsText = o.items;
  } else if (Array.isArray(o.items)) {
    itemsText = o.items.map(i => `${i.name || i.title || '상품'} (${i.quantity || i.qty || 1}개)`).join(', ');
  }

  const totalQty = Array.isArray(o.items)
    ? o.items.reduce((sum, it) => sum + (Number(it.quantity || it.qty) || 1), 0)
    : 1;

  const orderKey = String(o.id || o.orderNumber);

  return {
    id: orderKey,
    orderId: orderKey,
    orderNumber: String(o.orderNumber || orderKey),
    customerId: o.customerId || '',
    customer: o.customerName || '고객님',
    customerName: o.customerName || '고객님',
    ordererName: o.customerName || '고객님',
    recipient: o.customerName || '고객님',
    email: o.customerEmail || '',
    customerEmail: o.customerEmail || '',
    phone: o.customerPhone || '',
    customerPhone: o.customerPhone || '',
    zipCode: zip,
    address: addrStr,
    detailAddress: addrDetail,
    shippingAddress: typeof o.shippingAddress === 'object' ? o.shippingAddress : {
      zipCode: zip,
      address: addrStr,
      detailAddress: addrDetail
    },
    shippingMemo: o.orderMemo || '',
    orderMemo: o.orderMemo || '',
    items: itemsText || o.items,
    orderLines: Array.isArray(o.items) ? o.items : [],
    quantity: totalQty,
    totalAmount: Number(o.totalAmount || 0),
    shippingFee: Number(o.shippingFee || 0),
    discountAmount: Number(o.discountAmount || 0),
    pointsUsed: Number(o.pointsUsed || 0),
    paymentMethod: o.paymentMethod || 'CARD',
    paymentStatus: o.paymentStatus || 'PAID',
    status: o.paymentStatus === 'PAID' ? '결제완료' : (o.paymentStatus || '결제대기'),
    created_at: o.created_at || new Date().toISOString(),
    updated_at: o.updated_at || new Date().toISOString(),
    date: (o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
  };
}

function normalizeLocalOrderToSupabase(o) {
  let shippingAddrStr = '';
  if (typeof o.shippingAddress === 'string') {
    shippingAddrStr = o.shippingAddress;
  } else if (typeof o.shippingAddress === 'object' && o.shippingAddress) {
    shippingAddrStr = [o.shippingAddress.address, o.shippingAddress.detailAddress].filter(Boolean).join(' ');
  } else {
    shippingAddrStr = [o.address, o.detailAddress].filter(Boolean).join(' ');
  }

  let itemsPayload = [];
  if (Array.isArray(o.orderLines) && o.orderLines.length > 0) {
    itemsPayload = o.orderLines.map(l => ({
      name: l.merchandise?.product?.title || l.title || l.name || '상품',
      price: Number(l.cost?.totalAmount?.amount || l.price || 0),
      quantity: Number(l.quantity || 1),
      option: l.option || '',
    }));
  } else if (Array.isArray(o.items)) {
    itemsPayload = o.items;
  } else if (typeof o.items === 'string') {
    itemsPayload = [{ name: o.items, quantity: Number(o.quantity || 1), price: Number(o.totalAmount || 0) }];
  }

  return {
    id: String(o.id || o.orderNumber),
    orderNumber: String(o.orderNumber || o.id),
    customerId: String(o.customerId || ''),
    customerName: String(o.customerName || o.customer || o.ordererName || '고객님'),
    customerEmail: String(o.customerEmail || o.email || ''),
    customerPhone: String(o.customerPhone || o.phone || ''),
    totalAmount: Number(o.totalAmount || 0),
    shippingFee: Number(o.shippingFee || 0),
    discountAmount: Number(o.discountAmount || 0),
    pointsUsed: Number(o.pointsUsed || 0),
    paymentMethod: String(o.paymentMethod || o.method || 'CARD'),
    paymentStatus: String(o.paymentStatus || 'PAID'),
    shippingAddress: shippingAddrStr || '-',
    items: itemsPayload,
    orderMemo: String(o.orderMemo || o.shippingMemo || ''),
    created_at: o.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 주문/결제로그 데이터 조회 중...');

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    const fetchOrdersPromise = supabase.from('orders').select('*');
    const fetchLogsPromise = supabase.from('payment_logs').select('*');

    const [ordersRes, logsRes] = await Promise.race([
      Promise.all([fetchOrdersPromise, fetchLogsPromise]),
      timeoutPromise,
    ]);
    clearTimeout(timer);

    if (ordersRes.error) {
      console.warn('⚠️ Supabase orders 조회 오류:', ordersRes.error.message);
      return;
    }
    if (logsRes.error) {
      console.warn('⚠️ Supabase payment_logs 조회 오류:', logsRes.error.message);
      return;
    }

    const remoteOrders = ordersRes.data || [];
    const remoteLogs = logsRes.data || [];

    console.log(`☁️ Supabase 원격 orders 테이블 주문 수: ${remoteOrders.length}건`);
    console.log(`☁️ Supabase 원격 payment_logs 테이블 로그 수: ${remoteLogs.length}건`);

    // ─────────────────────────────────────────────────────────────
    // 1. 주문 (orders) 양방향 스마트 병합
    // ─────────────────────────────────────────────────────────────
    const orderMap = new Map();

    // 1-1. 원격 주문 먼저 맵에 등록
    remoteOrders.forEach(ro => {
      const key = String(ro.id || ro.orderNumber).trim();
      if (key) {
        orderMap.set(key, normalizeSupabaseOrderToLocal(ro));
      }
    });

    // 1-2. 로컬 주문 병합 (로컬 최신 변경사항 우선 반영)
    localOrders.forEach(lo => {
      const key = String(lo.id || lo.orderNumber).trim();
      if (key) {
        const existing = orderMap.get(key) || {};
        orderMap.set(key, {
          ...existing,
          ...lo,
          id: key,
          orderId: key,
          orderNumber: String(lo.orderNumber || existing.orderNumber || key),
          updated_at: new Date().toISOString(),
        });
      }
    });

    const mergedOrders = Array.from(orderMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 주문 수: ${mergedOrders.length}건`);
    mergedOrders.forEach(o => {
      console.log(`  - [${o.orderNumber}] ${o.customerName} | 결제금액: ${o.totalAmount.toLocaleString()}원 | 상태: ${o.paymentStatus}`);
    });

    // 로컬 파일 저장
    fs.writeFileSync(ordersFilePath, JSON.stringify(mergedOrders, null, 2), 'utf-8');
    console.log('💾 data/orders.json 파일 갱신 완료');

    // Supabase에 일괄 Upsert
    if (mergedOrders.length > 0) {
      const supabaseOrdersPayload = mergedOrders.map(normalizeLocalOrderToSupabase);
      const { error: upsertOrderErr } = await supabase.from('orders').upsert(supabaseOrdersPayload, { onConflict: 'id' });
      if (upsertOrderErr) {
        console.error('❌ Supabase orders Upsert 실패:', upsertOrderErr.message);
      } else {
        console.log('✅ Supabase orders 테이블 완전 동기화 성공!');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. 결제 로그 (payment_logs) 양방향 스마트 병합
    // ─────────────────────────────────────────────────────────────
    const logMap = new Map();

    remoteLogs.forEach(rl => {
      const key = String(rl.id).trim();
      if (key) {
        logMap.set(key, {
          id: rl.id,
          orderId: rl.orderId,
          paymentKey: rl.paymentKey,
          amount: Number(rl.amount || 0),
          status: rl.status,
          method: rl.method,
          approvedAt: rl.approvedAt,
          rawResponse: rl.rawResponse,
          created_at: rl.created_at,
        });
      }
    });

    localPaymentLogs.forEach(ll => {
      const key = String(ll.id || `PAY-${ll.orderId}`).trim();
      if (key) {
        const existing = logMap.get(key) || {};
        logMap.set(key, {
          ...existing,
          ...ll,
          id: key,
          orderId: ll.orderId || existing.orderId,
          paymentKey: ll.paymentKey || existing.paymentKey,
          amount: ll.amount !== undefined ? Number(ll.amount) : existing.amount,
          status: ll.status || existing.status || 'DONE',
          method: ll.method || existing.method,
          approvedAt: ll.approvedAt || existing.approvedAt || new Date().toISOString(),
          rawResponse: ll.rawResponse || existing.rawResponse || null,
          created_at: ll.created_at || existing.created_at || new Date().toISOString(),
        });
      }
    });

    const mergedLogs = Array.from(logMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 결제 로그 수: ${mergedLogs.length}건`);
    mergedLogs.forEach(l => {
      console.log(`  - [${l.id}] 주문: ${l.orderId} | 금액: ${l.amount.toLocaleString()}원 | 수단: ${l.method} | 상태: ${l.status}`);
    });

    // 로컬 파일 저장
    fs.writeFileSync(paymentLogsFilePath, JSON.stringify(mergedLogs, null, 2), 'utf-8');
    console.log('💾 data/payment-logs.json 파일 갱신 완료');

    // Supabase에 일괄 Upsert
    if (mergedLogs.length > 0) {
      const supabaseLogsPayload = mergedLogs.map(l => ({
        id: String(l.id),
        orderId: String(l.orderId || ''),
        paymentKey: String(l.paymentKey || ''),
        amount: Number(l.amount || 0),
        status: String(l.status || 'DONE'),
        method: String(l.method || ''),
        approvedAt: l.approvedAt || l.created_at || new Date().toISOString(),
        rawResponse: l.rawResponse || null,
        created_at: l.created_at || new Date().toISOString(),
      }));

      const { error: upsertLogErr } = await supabase.from('payment_logs').upsert(supabaseLogsPayload, { onConflict: 'id' });
      if (upsertLogErr) {
        console.error('❌ Supabase payment_logs Upsert 실패:', upsertLogErr.message);
      } else {
        console.log('✅ Supabase payment_logs 테이블 완전 동기화 성공!');
      }
    }

  } catch (err) {
    clearTimeout(timer);
    console.error('⚠️ 동기화 중 오류 발생:', err.message);
  }

  console.log('='.repeat(65));
}

runMigration();
