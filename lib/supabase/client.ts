/**
 * @deprecated [MIGRATION COMPLETED]
 * 초이콤마의 모든 운영 데이터는 이제 로컬 Git JSON(data/*.json) 파일로 완전 이전되었습니다.
 * 본 파일은 하위 호환성 보존을 위한 스텁(Stub)이며, 런타임 앱 코드에서 직접 호출되지 않습니다.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 클라이언트 사이드 환경변수 방어 코드 (0% 의존성)
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseClientConfigured = Boolean(rawUrl && rawKey && rawUrl.startsWith("http"));

if (!isSupabaseClientConfigured && typeof window !== "undefined") {
  console.warn(
    "⚠️ [Supabase Client Warning] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다."
  );
}

const effectiveUrl = isSupabaseClientConfigured ? rawUrl! : "https://placeholder-choicomma.supabase.co";
const effectiveKey = isSupabaseClientConfigured ? rawKey! : "placeholder-anon-key";

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
