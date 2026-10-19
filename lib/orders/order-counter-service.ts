import fs from "fs";
import path from "path";
import { getTodayKSTDateString, formatOrderId, parseOrderId } from "@/lib/shipping/order-id";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";

function getDataFilePath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
}

function safeAtomicWriteJson(targetPath: string, data: any): boolean {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
    return true;
  } catch (err) {
    console.error(`[Safe Write Error: ${targetPath}]:`, err);
    return false;
  }
}

function readJsonFileSafe<T>(filename: string, fallback: T): T {
  try {
    const filePath = getDataFilePath(filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed !== undefined && parsed !== null) return parsed as T;
    }
  } catch (err) {
    console.warn(`[Read Warning: ${filename}]:`, err);
  }
  return fallback;
}

export interface DayCounterData {
  lastSeq: number;
  reservations: Record<string, {
    seq: number;
    reservedAt: string;
    status: "RESERVED" | "CONFIRMED" | "CANCELLED";
  }>;
}

// In-memory mutex for server-side concurrency serialization
let counterLockPromise: Promise<void> = Promise.resolve();

/**
 * 서버 측 주문번호 원자적 채번 및 예약 락 함수
 * 동시 주문 시에도 동일한 주문번호가 발급되지 않도록 완벽 직렬화 보장
 */
export async function reserveNextOrderId(targetDate?: string): Promise<{
  orderId: string;
  seq: number;
  date: string;
}> {
  let releaseLock: () => void = () => {};
  const currentLock = counterLockPromise;
  counterLockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await currentLock;

  try {
    const today = targetDate || getTodayKSTDateString();
    let maxSeq = 0;

    const checkSeq = (idStr: any) => {
      if (!idStr || typeof idStr !== "string") return;
      const parsed = parseOrderId(idStr);
      if (parsed && parsed.date === today && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    };

    // 1. data/order-counters.json (채번 예약 원장) 검사
    const counters = readJsonFileSafe<Record<string, DayCounterData>>("order-counters.json", {});
    const dayData = counters[today] || { lastSeq: 0, reservations: {} };
    if (dayData.lastSeq > maxSeq) {
      maxSeq = dayData.lastSeq;
    }
    Object.values(dayData.reservations || {}).forEach((r) => {
      if (r && r.seq > maxSeq) maxSeq = r.seq;
    });

    // 2. data/orders.json (확정 주문서) 검사
    const orders = readJsonFileSafe<any[]>("orders.json", []);
    orders.forEach((o) => checkSeq(o.id || o.orderNumber));

    // 3. data/shipments.json (배송 목록) 검사
    const shipments = readJsonFileSafe<any[]>("shipments.json", []);
    shipments.forEach((s) => checkSeq(s.id || s.orderId));

    // 4. data/pending-orders.json (보류 주문 임시 원장) 검사
    const pendingOrders = readJsonFileSafe<Record<string, any>>("pending-orders.json", {});
    Object.keys(pendingOrders).forEach(checkSeq);

    // 5. Fallback mock data 검사
    if (Array.isArray(initialShipments)) {
      initialShipments.forEach((s) => checkSeq(s.id || s.orderId));
    }

    // 6. 다음 순번 확정 (+1)
    const nextSeq = maxSeq + 1;
    const nextOrderId = formatOrderId(today, nextSeq);

    // 7. 예약 원장에 즉시 영속 기록 (다음 호출 시 무조건 이 다음 번호가 채번됨)
    if (!dayData.reservations) dayData.reservations = {};
    dayData.lastSeq = nextSeq;
    dayData.reservations[nextOrderId] = {
      seq: nextSeq,
      reservedAt: new Date().toISOString(),
      status: "RESERVED",
    };

    counters[today] = dayData;
    safeAtomicWriteJson(getDataFilePath("order-counters.json"), counters);

    return {
      orderId: nextOrderId,
      seq: nextSeq,
      date: today,
    };
  } finally {
    releaseLock();
  }
}

/**
 * 결제 승인 완료 시 예약 상태를 CONFIRMED로 전환
 */
export function confirmOrderReservation(orderId: string): void {
  try {
    const parsed = parseOrderId(orderId);
    if (!parsed) return;
    const today = parsed.date;
    const counters = readJsonFileSafe<Record<string, DayCounterData>>("order-counters.json", {});
    if (counters[today]?.reservations?.[orderId]) {
      counters[today].reservations[orderId].status = "CONFIRMED";
      safeAtomicWriteJson(getDataFilePath("order-counters.json"), counters);
    }
  } catch (err) {
    console.warn("[confirmOrderReservation Warning]:", err);
  }
}
