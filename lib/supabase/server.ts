import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 환경변수가 누락되었을 때 createClient()가 즉시 에러(supabaseUrl is required)를 던지며
// 전체 웹앱이 다운되는 것을 방지하기 위한 방어 코드
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

export const isSupabaseConfigured = Boolean(rawUrl && rawKey && rawUrl.startsWith("http"));

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ [Supabase Server Warning] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. 로컬 캐시/폴백 모드로 동작합니다."
  );
}

// 안전한 Fallback 클라이언트 생성 (서버리스 크래시 방지)
const effectiveUrl = isSupabaseConfigured ? rawUrl! : "https://placeholder-choicomma.supabase.co";
const effectiveKey = isSupabaseConfigured ? rawKey! : "placeholder-service-key";

export const supabaseServer: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
