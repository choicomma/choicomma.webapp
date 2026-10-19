import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export type JourneyEventType =
  | "PAGE_VIEW"
  | "VIEW_PRODUCT"
  | "ADD_TO_CART"
  | "BEGIN_CHECKOUT"
  | "PURCHASE_SUCCESS"
  | "PURCHASE_FAIL"
  | "ABANDON";

export type AuditDomainType =
  | "PRODUCT"
  | "TIMESALE"
  | "ORDER"
  | "SHIPMENT"
  | "COUPON"
  | "SETTINGS"
  | "POPUP";

export type AuditActionType = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export interface JourneyLogItem {
  id: string;
  sessionId: string;
  visitorId: string;
  userId?: string;
  userName?: string;
  eventType: JourneyEventType;
  eventLabel: string;
  path: string;
  referrer: string;
  device: "PC" | "Mobile";
  metadata: Record<string, any>;
  ip?: string;
  timestamp: string;
  created_at?: string;
}

export interface AdminAuditLogItem {
  id: string;
  adminId: string;
  adminName: string;
  actionType: AuditActionType;
  domain: AuditDomainType;
  targetId: string;
  targetName: string;
  description: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  ipAddress: string;
  timestamp: string;
  created_at?: string;
}

interface LocalActivityStore {
  journeyLogs: JourneyLogItem[];
  auditLogs: AdminAuditLogItem[];
  updatedAt: string;
}

const DATA_FILE_PATH = path.join(process.cwd(), "data", "activity-logs.json");

// 날짜 포맷팅 헬퍼 (YYYY-MM-DD HH:mm:ss)
export function formatKstTimestamp(date: Date = new Date()): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = kstDate.getUTCFullYear();
  const mm = pad(kstDate.getUTCMonth() + 1);
  const dd = pad(kstDate.getUTCDate());
  const hh = pad(kstDate.getUTCHours());
  const min = pad(kstDate.getUTCMinutes());
  const ss = pad(kstDate.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// 로컬 폴백 파일 읽기
function readLocalStore(): LocalActivityStore {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        journeyLogs: Array.isArray(parsed.journeyLogs) ? parsed.journeyLogs : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn("⚠️ Failed to read local activity store:", err);
  }
  return { journeyLogs: [], auditLogs: [], updatedAt: new Date().toISOString() };
}

// 로컬 폴백 파일 저장 (최대 2,000건 링버퍼 유지)
function writeLocalStore(store: LocalActivityStore): void {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store.journeyLogs = store.journeyLogs.slice(0, 2000);
    store.auditLogs = store.auditLogs.slice(0, 2000);
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Failed to write local activity store:", err);
  }
}

/**
 * 1. 고객 구매 여정 (User Journey) 이벤트 기록
 * Supabase Pro 클라우드 DB와 로컬 안전망에 동시 기록 (Safe Dual-Write)
 */
export async function recordCustomerJourney(
  input: Omit<JourneyLogItem, "id" | "timestamp"> & { timestamp?: string }
): Promise<JourneyLogItem> {
  const id = `jnl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const timestamp = input.timestamp || formatKstTimestamp(now);
  const isoDate = now.toISOString();

  const record: JourneyLogItem = {
    id,
    sessionId: input.sessionId,
    visitorId: input.visitorId,
    userId: input.userId,
    userName: input.userName,
    eventType: input.eventType,
    eventLabel: input.eventLabel,
    path: input.path,
    referrer: input.referrer || "",
    device: input.device || "Mobile",
    metadata: input.metadata || {},
    ip: input.ip || "",
    timestamp,
    created_at: isoDate,
  };

  // 1) 로컬 안전망 즉시 저장 (0ms 보존 보장)
  const local = readLocalStore();
  local.journeyLogs.unshift(record);
  writeLocalStore(local);

  // 2) Supabase Pro 클라우드 비동기 Safe-Write
  runSafeSupabaseQuery(async (client) => {
    return client.from("customer_journey_logs").insert([
      {
        id: record.id,
        sessionId: record.sessionId,
        visitorId: record.visitorId,
        userId: record.userId || null,
        userName: record.userName || null,
        eventType: record.eventType,
        eventLabel: record.eventLabel,
        path: record.path,
        referrer: record.referrer,
        device: record.device,
        ip: record.ip || "",
        metadata: record.metadata,
        created_at: record.created_at,
      },
    ]);
  }).catch((err) => {
    console.warn("Notice: Supabase customer_journey_logs write skipped or pending:", err?.message || err);
  });

  return record;
}

/**
 * 2. 관리자 작업 감사 로그 (Admin Audit Log) 기록
 * Supabase Pro 클라우드 DB와 로컬 안전망에 동시 기록 (Safe Dual-Write)
 */
export async function recordAdminAudit(
  input: Omit<AdminAuditLogItem, "id" | "timestamp"> & { timestamp?: string }
): Promise<AdminAuditLogItem> {
  const id = `adt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const timestamp = input.timestamp || formatKstTimestamp(now);
  const isoDate = now.toISOString();

  const record: AdminAuditLogItem = {
    id,
    adminId: input.adminId || "admin",
    adminName: input.adminName || "관리자",
    actionType: input.actionType,
    domain: input.domain,
    targetId: String(input.targetId || ""),
    targetName: input.targetName || "",
    description: input.description,
    beforeData: input.beforeData,
    afterData: input.afterData,
    ipAddress: input.ipAddress || "",
    timestamp,
    created_at: isoDate,
  };

  // 1) 로컬 안전망 즉시 저장
  const local = readLocalStore();
  local.auditLogs.unshift(record);
  writeLocalStore(local);

  // 2) Supabase Pro 클라우드 비동기 Safe-Write
  runSafeSupabaseQuery(async (client) => {
    return client.from("admin_audit_logs").insert([
      {
        id: record.id,
        adminId: record.adminId,
        adminName: record.adminName,
        actionType: record.actionType,
        domain: record.domain,
        targetId: record.targetId,
        targetName: record.targetName,
        description: record.description,
        beforeData: record.beforeData || null,
        afterData: record.afterData || null,
        ipAddress: record.ipAddress,
        created_at: record.created_at,
      },
    ]);
  }).catch((err) => {
    console.warn("Notice: Supabase admin_audit_logs write skipped or pending:", err?.message || err);
  });

  return record;
}

/**
 * 3. 활동 로그 센터 통합 조회 (Supabase 우선, 로컬 폴백)
 */
export async function getActivityLogs(options?: {
  tab?: "journey" | "audit" | "all";
  domain?: string;
  eventType?: string;
  limit?: number;
}): Promise<{ journeyLogs: JourneyLogItem[]; auditLogs: AdminAuditLogItem[] }> {
  const limit = Math.min(options?.limit || 150, 500);
  const fetchTab = options?.tab || "all";

  let journeyLogs: JourneyLogItem[] = [];
  let auditLogs: AdminAuditLogItem[] = [];

  // [1] Supabase 시도
  if (fetchTab === "journey" || fetchTab === "all") {
    const { data, error } = await runSafeSupabaseQuery<any[]>(async (client) => {
      let q = client.from("customer_journey_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (options?.eventType && options.eventType !== "ALL") {
        q = q.eq("eventType", options.eventType);
      }
      return q;
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      journeyLogs = data.map((d) => ({
        id: d.id,
        sessionId: d.sessionId || d.session_id || "",
        visitorId: d.visitorId || d.visitor_id || "",
        userId: d.userId || d.user_id || undefined,
        userName: d.userName || d.user_name || undefined,
        eventType: d.eventType || d.event_type || "PAGE_VIEW",
        eventLabel: d.eventLabel || d.event_label || "",
        path: d.path || "",
        referrer: d.referrer || "",
        device: d.device || "Mobile",
        metadata: typeof d.metadata === "object" && d.metadata !== null ? d.metadata : {},
        ip: d.ip || "",
        timestamp: d.timestamp || formatKstTimestamp(new Date(d.created_at || Date.now())),
        created_at: d.created_at,
      }));
    }
  }

  if (fetchTab === "audit" || fetchTab === "all") {
    const { data, error } = await runSafeSupabaseQuery<any[]>(async (client) => {
      let q = client.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (options?.domain && options.domain !== "ALL") {
        q = q.eq("domain", options.domain);
      }
      return q;
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      auditLogs = data.map((d) => ({
        id: d.id,
        adminId: d.adminId || d.admin_id || "admin",
        adminName: d.adminName || d.admin_name || "관리자",
        actionType: d.actionType || d.action_type || "UPDATE",
        domain: d.domain || "PRODUCT",
        targetId: d.targetId || d.target_id || "",
        targetName: d.targetName || d.target_name || "",
        description: d.description || "",
        beforeData: d.beforeData || d.before_data || undefined,
        afterData: d.afterData || d.after_data || undefined,
        ipAddress: d.ipAddress || d.ip_address || "",
        timestamp: d.timestamp || formatKstTimestamp(new Date(d.created_at || Date.now())),
        created_at: d.created_at,
      }));
    }
  }

  // [2] Supabase 데이터가 없거나 에러인 경우 로컬 안전망에서 병합/조회
  const local = readLocalStore();
  if (journeyLogs.length === 0 && (fetchTab === "journey" || fetchTab === "all")) {
    journeyLogs = local.journeyLogs.slice(0, limit);
    if (options?.eventType && options.eventType !== "ALL") {
      journeyLogs = journeyLogs.filter((l) => l.eventType === options.eventType);
    }
  }

  if (auditLogs.length === 0 && (fetchTab === "audit" || fetchTab === "all")) {
    auditLogs = local.auditLogs.slice(0, limit);
    if (options?.domain && options.domain !== "ALL") {
      auditLogs = auditLogs.filter((l) => l.domain === options.domain);
    }
  }

  return { journeyLogs, auditLogs };
}
