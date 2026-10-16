/**
 * [SUPABASE PRO HYBRID ARCHITECTURE]
 * 초이콤마 Supabase Pro 클라우드 DB 연동 서버 클라이언트.
 * - 원격 저장소: Supabase Pro (24/7 Always-On, 자동 백업, 영구 보존)
 * - 로컬 안전망: Git JSON (data/*.json 원자적 쓰기 & 0ms 초고속 캐시)
 * - Safe Dual-Write & Fallback 패턴 적용
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 환경변수가 누락되었을 때 createClient()가 즉시 에러를 던지지 않도록 방어 (0% 의존성)
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

/**
 * 안전한 Supabase 쿼리 실행 헬퍼 (타임아웃 및 폴백 방어막)
 * Supabase가 일시 정지(Paused) 상태이거나 네트워크 지연이 발생해도
 * 지정된 시간(기본 3초) 내에 응답이 없으면 즉시 안전하게 반환하여 웹앱이 멈추지 않도록 보장합니다.
 */
export async function runSafeSupabaseQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
  timeoutMs = 3000
): Promise<{ data: T | null; error: any; timedOut?: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error("Supabase is not configured"), timedOut: false };
  }

  try {
    const result = await Promise.race([
      queryFn(supabaseServer),
      new Promise<{ data: null; error: Error; timedOut: true }>((_, reject) =>
        setTimeout(() => reject(new Error(`Supabase query timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
    return result;
  } catch (err: any) {
    return { data: null, error: err, timedOut: true };
  }
}
