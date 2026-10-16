// scripts/seed-supabase.js
// 기존 로컬 mock 데이터(배송, 상품, 고객)를 Supabase DB로 초기 적재하는 스크립트
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');


// .env.local 직접 파싱
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

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase 환경 변수가 누락되었습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("🚀 Supabase 데이터 시딩을 시작합니다...");

  // 1. Shipments 시딩
  try {
    const shipmentsPath = path.join(__dirname, '..', 'lib', 'sfcc', 'mock', 'shipments-data.json');
    if (fs.existsSync(shipmentsPath)) {
      const shipments = JSON.parse(fs.readFileSync(shipmentsPath, 'utf-8'));
      if (Array.isArray(shipments) && shipments.length > 0) {
        console.log(`📦 배송 데이터 ${shipments.length}건 적재 중...`);
        const { error } = await supabase.from('shipments').upsert(shipments, { onConflict: 'id' });
        if (error) console.error("❌ 배송 적재 실패:", error.message);
        else console.log("✅ 배송 데이터 적재 완료!");
      }
    }
  } catch (e) {
    console.error("배송 시딩 오류:", e);
  }

  // 2. Customers 시딩
  try {
    const defaultAdmin = {
      id: "ADMIN-001",
      name: "최고관리자 (Admin)",
      email: "admin@choicomma.com",
      phone: "02-579-1171",
      address: "서울특별시 강남구 개포로22길 12 6층 (주)초이콤마 본사",
      grade: "VVIP",
      totalSpent: 25000000,
      points: 100000,
      couponsCount: 5,
      joinedDate: "2026-01-01",
      status: "Active",
      role: "ADMIN",
      isAdmin: true,
    };
    console.log("👤 기본 관리자 및 고객 데이터 적재 중...");
    const { error } = await supabase.from('customers').upsert([defaultAdmin], { onConflict: 'id' });
    if (error) console.error("❌ 고객 적재 실패:", error.message);
    else console.log("✅ 기본 관리자 계정 적재 완료!");
  } catch (e) {
    console.error("고객 시딩 오류:", e);
  }

  // 3. Products 시딩
  try {
    const productsPath = path.join(__dirname, '..', 'lib', 'sfcc', 'mock', 'parsed-products.json');
    if (fs.existsSync(productsPath)) {
      const rawProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        console.log(`👗 상품 데이터 ${rawProducts.length}건 적재 중 (배치 20개씩 분할)...`);
        const batchSize = 20;
        for (let i = 0; i < rawProducts.length; i += batchSize) {
          const chunk = rawProducts.slice(i, i + batchSize).map(p => ({
            id: p.id,
            title: p.title || '',
            handle: p.handle || p.id,
            categoryId: p.categoryId || '',
            categoryIds: p.categoryIds || [],
            description: p.description || '',
            detailDescription: p.detailDescription || '',
            currencyCode: p.currencyCode || 'KRW',
            priceRange: p.priceRange || {},
            featuredImage: p.featuredImage || {},
            images: p.images || [],
            variants: p.variants || [],
            options: p.options || [],
            tags: p.tags || [],
            sizes: p.sizes || [],
            colors: p.colors || [],
            stock: p.stock || 100,
            sizeStock: p.sizeStock || {},
            colorHexMap: p.colorHexMap || {},
            productLabel: p.productLabel || '',
            isMainFeatured: Boolean(p.isMainFeatured),
            availableForSale: p.availableForSale !== false,
            isTimeSale: Boolean(p.isTimeSale),
            bulkDiscount: p.bulkDiscount || { enabled: false, rules: [] },
          }));
          const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
          if (error) {
            console.error(`❌ 상품 배치 (${i + 1}~${i + chunk.length}) 적재 실패:`, error.message);
          } else {
            console.log(`✅ 상품 (${i + 1}~${i + chunk.length}) 적재 완료`);
          }
        }
      }
    }
  } catch (e) {
    console.error("상품 시딩 오류:", e);
  }

  // 4. Site Settings 시딩 (CJ 환경설정 및 배송 정책)
  try {
    console.log("⚙️ 기본 사이트 운영 설정 적재 중...");
    const defaultSettings = [
      {
        key: 'cj_logistics',
        value: {
          clientCode: 'choicomma',
          contractNo: '7108803854',
          senderName: '주식회사 초이콤마',
          senderTel: '02-579-1171',
          senderZip: '06307',
          senderAddr1: '서울특별시 강남구 개포로22길 12',
          senderAddr2: '6층(개포동)',
        },
        description: 'CJ대한통운 계약 및 발송지 설정'
      },
      {
        key: 'shipping_policy',
        value: {
          defaultShippingFee: 3000,
          freeShippingThreshold: 50000,
          remoteAreaFee: 3000,
        },
        description: '기본 배송비 및 무료배송 기준 정책'
      }
    ];
    const { error } = await supabase.from('site_settings').upsert(defaultSettings, { onConflict: 'key' });
    if (error) console.error("❌ 설정 적재 실패:", error.message);
    else console.log("✅ 사이트 기본 설정 적재 완료!");
  } catch (e) {
    console.error("설정 시딩 오류:", e);
  }

  console.log("\n🎉 모든 초기 데이터 적재 작업이 완료되었습니다!");
}

seed();
