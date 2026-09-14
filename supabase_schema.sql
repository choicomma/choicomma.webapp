-- =============================================================================
-- [초이콤마 choicomma_webapp] Supabase PostgreSQL 초기 통합 스키마 (DDL)
-- Supabase 대시보드 -> SQL Editor에 붙여넣고 [RUN] 버튼을 눌러 실행해 주세요.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. shipments (주문 배송 및 CJ대한통운 송장 추적)
-- 프론트엔드/관리자 페이지 상태 키와 100% 호환되도록 필드 매핑
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipments (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    recipient TEXT NOT NULL,
    phone TEXT NOT NULL,
    "altPhone" TEXT DEFAULT '',
    "zipCode" TEXT NOT NULL,
    address TEXT NOT NULL,
    "detailAddress" TEXT DEFAULT '',
    items TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    carrier TEXT DEFAULT 'CJ대한통운' NOT NULL,
    "trackingNumber" TEXT DEFAULT '-' NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    "shippingMemo" TEXT DEFAULT '',
    "orderDate" TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    "shippedDate" TEXT DEFAULT NULL,
    "estimatedDelivery" TEXT DEFAULT NULL,
    packages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. products (상품 카탈로그 및 옵션/재고)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    "categoryId" TEXT DEFAULT '',
    "categoryIds" JSONB DEFAULT '[]'::jsonb,
    description TEXT DEFAULT '',
    "detailDescription" TEXT DEFAULT '',
    "currencyCode" TEXT DEFAULT 'KRW',
    "priceRange" JSONB DEFAULT '{"maxVariantPrice": {"amount": "0", "currencyCode": "KRW"}, "minVariantPrice": {"amount": "0", "currencyCode": "KRW"}}'::jsonb,
    "featuredImage" JSONB DEFAULT '{}'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    stock INTEGER DEFAULT 100,
    "sizeStock" JSONB DEFAULT '{}'::jsonb,
    "colorHexMap" JSONB DEFAULT '{}'::jsonb,
    "productLabel" TEXT DEFAULT '',
    "isMainFeatured" BOOLEAN DEFAULT false,
    "availableForSale" BOOLEAN DEFAULT true,
    "isTimeSale" BOOLEAN DEFAULT false,
    "bulkDiscount" JSONB DEFAULT '{"enabled": false, "rules": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. orders (고객 주문 원장 및 결제 상태)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "customerId" TEXT DEFAULT '',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT DEFAULT '',
    "customerPhone" TEXT NOT NULL,
    "totalAmount" NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    "shippingFee" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    "discountAmount" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    "pointsUsed" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    "paymentMethod" TEXT DEFAULT 'CARD',
    "paymentStatus" TEXT DEFAULT 'PAID' NOT NULL, -- PENDING, PAID, CANCELLED, REFUNDED
    "shippingAddress" JSONB DEFAULT '{}'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    "orderMemo" TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. payment_logs (토스페이먼츠 승인 트랜잭션 기록)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "paymentKey" TEXT NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    method TEXT DEFAULT '카드',
    "approvedAt" TIMESTAMPTZ,
    "rawResponse" JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. customers (회원 및 마스터 관리자 계정)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    grade TEXT DEFAULT 'Silver' NOT NULL,
    "totalSpent" NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    points NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    "couponsCount" INTEGER DEFAULT 0 NOT NULL,
    "joinedDate" TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') NOT NULL,
    status TEXT DEFAULT 'Active' NOT NULL,
    role TEXT DEFAULT 'USER' NOT NULL,
    "isAdmin" BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. inbound_schedules (물류센터 입고 일정)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inbound_schedules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    supplier TEXT DEFAULT '',
    warehouse TEXT DEFAULT '제1물류센터 A구역',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'Scheduled' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. timesales (타임세일 및 VIP 시크릿 세일)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timesales (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    "discountRate" NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    "productIds" JSONB DEFAULT '[]'::jsonb,
    "targetCustomerEmails" JSONB DEFAULT '[]'::jsonb,
    "targetGrades" JSONB DEFAULT '[]'::jsonb,
    "durationHours" INTEGER DEFAULT 24 NOT NULL,
    "durationMinutes" INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    "startTime" TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    "endTime" TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. inquiries (고객 1:1 문의)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT DEFAULT '',
    "customerPhone" TEXT DEFAULT '',
    category TEXT DEFAULT '일반',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    "imageUrl" TEXT DEFAULT NULL,
    reply TEXT DEFAULT NULL,
    "repliedAt" TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. site_settings (공지 띠배너, 배송비 정책, CJ 환경설정)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. chat_sessions & chat_messages (실시간 1:1 라이브 상담)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id TEXT PRIMARY KEY,
    "customerName" TEXT DEFAULT '방문자',
    "customerEmail" TEXT DEFAULT '',
    "customerPhone" TEXT DEFAULT '',
    status TEXT DEFAULT 'active' NOT NULL, -- active, closed
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    "sessionId" TEXT REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'user' or 'admin'
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- Row Level Security (RLS) 활성화 및 전체 접근 허용 정책
-- =============================================================================
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to shipments" ON public.shipments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment_logs" ON public.payment_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inbound_schedules" ON public.inbound_schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to timesales" ON public.timesales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inquiries" ON public.inquiries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to site_settings" ON public.site_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chat_sessions" ON public.chat_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chat_messages" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- Supabase Realtime (실시간 동기화 채널) 등록
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
