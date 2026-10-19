/**
 * scripts/migrate-step7-logistics.js
 * 
 * [7단계 데이터 이관 스크립트: 배송 관리 및 입고 스케줄 (shipments, inbound_schedules)]
 * data/shipments.json 및 data/inbound-schedules.json 과
 * Supabase `shipments`, `inbound_schedules` 테이블을 양방향 스마트 병합(Bi-Directional Merge)하여
 * 데이터 유실 없이 완전 동기화합니다.
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
console.log('🚚 [7단계] 배송 관리 및 입고 스케줄 (shipments, inbound_schedules) Supabase 동기화');
console.log('='.repeat(65));

const shipmentsFilePath = path.join(__dirname, '..', 'data', 'shipments.json');
const inboundFilePath = path.join(__dirname, '..', 'data', 'inbound-schedules.json');

let localShipments = [];
let localInbound = [];

if (fs.existsSync(shipmentsFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(shipmentsFilePath, 'utf-8'));
    if (Array.isArray(parsed)) localShipments = parsed;
  } catch (err) {
    console.error('❌ data/shipments.json 파싱 실패:', err.message);
  }
}

if (fs.existsSync(inboundFilePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(inboundFilePath, 'utf-8'));
    if (Array.isArray(parsed)) localInbound = parsed;
  } catch (err) {
    console.error('❌ data/inbound-schedules.json 파싱 실패:', err.message);
  }
}

console.log(`📄 로컬 shipments.json 배송 건수: ${localShipments.length}건`);
console.log(`📄 로컬 inbound-schedules.json 입고 스케줄 수: ${localInbound.length}건`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('\n⚠️ Supabase 환경 변수가 없습니다 (.env.local 확인 필요).');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeShipmentForSupabase(s) {
  let itemsStr = '';
  if (typeof s.items === 'string') {
    itemsStr = s.items;
  } else if (Array.isArray(s.items)) {
    itemsStr = s.items.map(i => `${i.name || i.title || '상품'} (${i.quantity || 1}개)`).join(', ');
  }

  return {
    id: String(s.id || s.orderId),
    orderId: String(s.orderId || s.id),
    recipient: String(s.recipient || s.ordererName || s.customerName || '고객님'),
    phone: String(s.phone || s.customerPhone || '-'),
    altPhone: String(s.altPhone || s.alt_phone || ''),
    zipCode: String(s.zipCode || s.zip_code || s.shippingAddress?.zipCode || ''),
    address: String(s.address || s.shippingAddress?.address || '-'),
    detailAddress: String(s.detailAddress || s.detail_address || s.shippingAddress?.detailAddress || ''),
    items: itemsStr || '-',
    quantity: Number(s.quantity || 1),
    carrier: String(s.carrier || 'CJ대한통운'),
    trackingNumber: String(s.trackingNumber || s.tracking_number || '-'),
    status: String(s.status || 'Pending'),
    shippingMemo: String(s.shippingMemo || s.shipping_memo || ''),
    orderDate: s.orderDate || s.order_date || s.created_at || new Date().toISOString(),
    shippedDate: s.shippedDate || s.shipped_date || null,
    estimatedDelivery: s.estimatedDelivery || s.estimated_delivery || null,
    packages: Array.isArray(s.packages) ? s.packages : [],
    created_at: s.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeInboundForSupabase(item) {
  return {
    id: String(item.id || `INB-${Date.now()}`),
    title: String(item.title || '입고 일정'),
    date: item.date || new Date().toISOString().split('T')[0],
    quantity: Number(item.quantity || 0),
    supplier: String(item.supplier || ''),
    warehouse: String(item.warehouse || '기본 물류창고'),
    notes: String(item.notes || ''),
    status: String(item.status || 'Scheduled'),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function runMigration() {
  console.log('\n🌐 Supabase 클라우드 연결 및 배송/입고 스케줄 데이터 조회 중...');

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT_5S')), 5000);
  });

  try {
    const fetchShipmentsPromise = supabase.from('shipments').select('*');
    const fetchInboundPromise = supabase.from('inbound_schedules').select('*');

    const [shipmentsRes, inboundRes] = await Promise.race([
      Promise.all([fetchShipmentsPromise, fetchInboundPromise]),
      timeoutPromise,
    ]);
    clearTimeout(timer);

    if (shipmentsRes.error) {
      console.warn('⚠️ Supabase shipments 조회 오류:', shipmentsRes.error.message);
      return;
    }
    if (inboundRes.error) {
      console.warn('⚠️ Supabase inbound_schedules 조회 오류:', inboundRes.error.message);
      return;
    }

    const remoteShipments = shipmentsRes.data || [];
    const remoteInbound = inboundRes.data || [];

    console.log(`☁️ Supabase 원격 shipments 테이블 건수: ${remoteShipments.length}건`);
    console.log(`☁️ Supabase 원격 inbound_schedules 테이블 건수: ${remoteInbound.length}건`);

    // ─────────────────────────────────────────────────────────────
    // 1. 배송 (shipments) 양방향 스마트 병합
    // ─────────────────────────────────────────────────────────────
    const shipmentMap = new Map();

    remoteShipments.forEach(rs => {
      const key = String(rs.id || rs.orderId).trim();
      if (key) {
        shipmentMap.set(key, { ...rs });
      }
    });

    localShipments.forEach(ls => {
      const key = String(ls.id || ls.orderId).trim();
      if (key) {
        const existing = shipmentMap.get(key) || {};
        shipmentMap.set(key, {
          ...existing,
          ...ls,
          id: key,
          orderId: String(ls.orderId || existing.orderId || key),
          updated_at: new Date().toISOString(),
        });
      }
    });

    const mergedShipments = Array.from(shipmentMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 배송 건수: ${mergedShipments.length}건`);
    mergedShipments.forEach(s => {
      console.log(`  - [${s.id}] 수령인: ${s.recipient} | 택배사: ${s.carrier} | 송장: ${s.trackingNumber} | 상태: ${s.status}`);
    });

    // 로컬 파일 저장
    fs.writeFileSync(shipmentsFilePath, JSON.stringify(mergedShipments, null, 2), 'utf-8');
    console.log('💾 data/shipments.json 파일 갱신 완료');

    // Supabase에 일괄 Upsert
    if (mergedShipments.length > 0) {
      const supabaseShipmentsPayload = mergedShipments.map(normalizeShipmentForSupabase);
      const { error: upsertShipErr } = await supabase.from('shipments').upsert(supabaseShipmentsPayload, { onConflict: 'id' });
      if (upsertShipErr) {
        console.error('❌ Supabase shipments Upsert 실패:', upsertShipErr.message);
      } else {
        console.log('✅ Supabase shipments 테이블 완전 동기화 성공!');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. 입고 스케줄 (inbound_schedules) 양방향 스마트 병합
    // ─────────────────────────────────────────────────────────────
    const inboundMap = new Map();

    remoteInbound.forEach(ri => {
      const key = String(ri.id).trim();
      if (key) {
        inboundMap.set(key, { ...ri });
      }
    });

    localInbound.forEach(li => {
      const key = String(li.id).trim();
      if (key) {
        const existing = inboundMap.get(key) || {};
        inboundMap.set(key, {
          ...existing,
          ...li,
          id: key,
          updated_at: new Date().toISOString(),
        });
      }
    });

    const mergedInbound = Array.from(inboundMap.values());
    console.log(`\n🔄 양방향 병합 완료 총 입고 스케줄 건수: ${mergedInbound.length}건`);
    mergedInbound.forEach(ib => {
      console.log(`  - [${ib.id}] ${ib.title} | 일자: ${ib.date} | 수량: ${ib.quantity}개 | 상태: ${ib.status}`);
    });

    // 로컬 파일 저장
    fs.writeFileSync(inboundFilePath, JSON.stringify(mergedInbound, null, 2), 'utf-8');
    console.log('💾 data/inbound-schedules.json 파일 갱신 완료');

    // Supabase에 일괄 Upsert
    if (mergedInbound.length > 0) {
      const supabaseInboundPayload = mergedInbound.map(normalizeInboundForSupabase);
      const { error: upsertInboundErr } = await supabase.from('inbound_schedules').upsert(supabaseInboundPayload, { onConflict: 'id' });
      if (upsertInboundErr) {
        console.error('❌ Supabase inbound_schedules Upsert 실패:', upsertInboundErr.message);
      } else {
        console.log('✅ Supabase inbound_schedules 테이블 완전 동기화 성공!');
      }
    }

  } catch (err) {
    clearTimeout(timer);
    console.error('⚠️ 동기화 중 오류 발생:', err.message);
  }

  console.log('='.repeat(65));
}

runMigration();
