/**
 * [초이콤마 choicomma_webapp] 주문서번호 생성 및 파싱 유틸리티
 * 
 * 주문번호 표준 규칙: CH + 날짜(YYYYMMDD) + '-' + 주문순서(001, 002...)
 * 예시: CH20260916-001, CH20260916-002, CH20260916-042
 */

/**
 * 한국 표준시(KST, Asia/Seoul) 기준 YYYYMMDD 날짜 문자열 반환
 */
export function getTodayKSTDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const yyyy = parts.find((p) => p.type === "year")?.value || String(date.getFullYear());
    const mm = parts.find((p) => p.type === "month")?.value || String(date.getMonth() + 1).padStart(2, "0");
    const dd = parts.find((p) => p.type === "day")?.value || String(date.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  } catch {
    // Fallback if Intl is unavailable
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 3600000));
    const yyyy = kst.getFullYear();
    const mm = String(kst.getMonth() + 1).padStart(2, "0");
    const dd = String(kst.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }
}

/**
 * 날짜와 일련번호를 기반으로 주문서번호 포맷팅
 * @param dateStr 8자리 날짜 (YYYYMMDD)
 * @param seq 일별 주문 순서 (1부터 시작)
 * @returns 예: CH20260916-001
 */
export function formatOrderId(dateStr: string, seq: number): string {
  const paddedSeq = String(Math.max(1, seq)).padStart(3, "0");
  return `CH${dateStr}-${paddedSeq}`;
}

/**
 * 주문번호에서 날짜와 일련번호 파싱
 */
export function parseOrderId(orderId: string): { prefix: string; date: string; seq: number } | null {
  if (!orderId) return null;
  const match = orderId.trim().match(/^(CH|ORD)[-_]?(\d{8})[-_]?(\d+)/i);
  if (!match) return null;
  return {
    prefix: match[1].toUpperCase(),
    date: match[2],
    seq: parseInt(match[3], 10),
  };
}

/**
 * 오늘 날짜 기준 다음 주문서번호 생성
 * - 인자로 전달된 주문 목록 및 로컬 스토리지의 주문들을 검사하여 오늘 날짜의 가장 높은 순번 + 1을 부여합니다.
 */
export function generateNextOrderId(existingOrders?: any[], targetDate?: string): string {
  const today = targetDate || getTodayKSTDateString();
  let maxSeq = 0;

  const checkItem = (item: any) => {
    if (!item) return;
    const ordId = item.orderId || item.id;
    if (typeof ordId === "string") {
      const parsed = parseOrderId(ordId);
      if (parsed && parsed.date === today) {
        if (parsed.seq > maxSeq) {
          maxSeq = parsed.seq;
        }
      }
    }
  };

  // 1. 전달받은 목록 검사
  if (Array.isArray(existingOrders)) {
    for (const ord of existingOrders) {
      checkItem(ord);
    }
  }

  // 2. 브라우저 로컬 스토리지 검사
  if (typeof window !== "undefined") {
    try {
      const savedOrders = localStorage.getItem("admin_orders");
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed)) {
          parsed.forEach(checkItem);
        }
      }
    } catch {}

    try {
      const savedShipments = localStorage.getItem("admin_shipments");
      if (savedShipments) {
        const parsed = JSON.parse(savedShipments);
        if (Array.isArray(parsed)) {
          parsed.forEach(checkItem);
        }
      }
    } catch {}

    // 로컬 스퀀스 카운터도 확인
    const key = `choicomma_last_order_seq_${today}`;
    try {
      const cachedSeq = parseInt(localStorage.getItem(key) || "0", 10);
      if (!isNaN(cachedSeq) && cachedSeq > maxSeq) {
        maxSeq = cachedSeq;
      }
    } catch {}

    const nextSeq = maxSeq + 1;
    try {
      localStorage.setItem(key, String(nextSeq));
    } catch {}

    return formatOrderId(today, nextSeq);
  }

  return formatOrderId(today, maxSeq + 1);
}
