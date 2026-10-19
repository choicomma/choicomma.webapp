/**
 * lib/membership/timesales.ts
 * 
 * 시크릿 타임세일 클라이언트 동기화 유틸리티
 * - 브라우저 로컬 캐시(0ms)와 서버 API(/api/admin/timesale) 간의 실시간 양방향 동기화 보장
 * - 기기 변경, 시크릿 모드, 캐시 삭제 시에도 서버에 등록된 시크릿 타임세일 유실 없이 즉시 복구
 */

export interface SecretTimeSale {
  id: string;
  title: string;
  discountRate: number;
  productIds: string[];
  targetCustomerEmails: string[];
  targetGrades?: string[];
  durationHours: number;
  durationMinutes: number;
  status: "active" | "paused";
  createdAt: string;
}

let inMemorySecretSalesCache: SecretTimeSale[] | null = null;
let isFetchingSecretSales = false;

/**
 * 서버 API(/api/admin/timesale)로부터 최신 시크릿 타임세일 목록을 조회하여 로컬에 동기화
 */
export async function syncSecretTimesalesFromServer(): Promise<SecretTimeSale[]> {
  if (typeof window === "undefined") return inMemorySecretSalesCache || [];
  if (isFetchingSecretSales) return getCachedSecretTimesales();

  isFetchingSecretSales = true;
  try {
    const res = await fetch("/api/admin/timesale", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleaned: SecretTimeSale[] = json.data.filter(
          (t: any) => t && t.id
        );
        inMemorySecretSalesCache = cleaned;
        try {
          localStorage.setItem("admin_secret_timesales", JSON.stringify(cleaned));
          window.dispatchEvent(new CustomEvent("secret_timesales_updated"));
        } catch (e) {}
        return cleaned;
      }
    }
  } catch (err) {
    console.warn("[Timesale Sync Warning]:", err);
  } finally {
    isFetchingSecretSales = false;
  }

  return getCachedSecretTimesales();
}

/**
 * 인메모리 캐시 및 로컬스토리지에 저장된 시크릿 타임세일 목록 동기 반환 (0ms)
 */
export function getCachedSecretTimesales(): SecretTimeSale[] {
  if (inMemorySecretSalesCache !== null) {
    return inMemorySecretSalesCache;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("admin_secret_timesales");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemorySecretSalesCache = parsed.filter(
            (t: any) => t && t.id
          );
          return inMemorySecretSalesCache;
        }
      }
    } catch (e) {}
  }
  return [];
}
