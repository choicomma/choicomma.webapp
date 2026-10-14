-- =============================================================================
-- [초이콤마 choicomma_webapp] 활동 로그 센터 (Activity Logs & Audit Trail)
-- 1) customer_journey_logs: 고객 구매 여정 및 행동 퍼널 로그
-- 2) admin_audit_logs: 관리자 작업 감사 로그 (Before/After 스냅샷 포함)
-- Supabase 대시보드 -> SQL Editor에 붙여넣고 [RUN] 버튼을 눌러 실행해 주세요.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. customer_journey_logs (고객 구매 여정 및 행동 퍼널 로그)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_journey_logs (
    id TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT DEFAULT NULL,
    "userName" TEXT DEFAULT NULL,
    "eventType" TEXT NOT NULL, -- 'PAGE_VIEW', 'VIEW_PRODUCT', 'ADD_TO_CART', 'BEGIN_CHECKOUT', 'PURCHASE_SUCCESS', 'PURCHASE_FAIL', 'ABANDON'
    "eventLabel" TEXT NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT DEFAULT '',
    device TEXT DEFAULT 'Mobile',
    ip TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 검색 성능 극대화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_journey_session ON public.customer_journey_logs ("sessionId");
CREATE INDEX IF NOT EXISTS idx_journey_visitor ON public.customer_journey_logs ("visitorId");
CREATE INDEX IF NOT EXISTS idx_journey_user ON public.customer_journey_logs ("userId");
CREATE INDEX IF NOT EXISTS idx_journey_event ON public.customer_journey_logs ("eventType");
CREATE INDEX IF NOT EXISTS idx_journey_created ON public.customer_journey_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_audit_logs (관리자 작업 감사 로그 & 변경 스냅샷)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "actionType" TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
    domain TEXT NOT NULL, -- 'PRODUCT', 'TIMESALE', 'ORDER', 'SHIPMENT', 'COUPON', 'SETTINGS', 'POPUP'
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    description TEXT NOT NULL,
    "beforeData" JSONB DEFAULT NULL,
    "afterData" JSONB DEFAULT NULL,
    "ipAddress" TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 검색 성능 극대화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_domain ON public.admin_audit_logs (domain);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_logs ("actionType");
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.admin_audit_logs ("targetId");
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs ("adminId");
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS) 활성화 및 접근 정책 설정
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.customer_journey_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customer_journey_logs" ON public.customer_journey_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to admin_audit_logs" ON public.admin_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Supabase Realtime (실시간 활동 로그 구독) 활성화
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_journey_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_logs;
