/**
 * 상품 카탈로그/삭제 목록의 영구 저장소 (Supabase site_settings 테이블, key/value).
 *
 * 배포 환경(Vercel 등)은 파일 시스템이 읽기 전용이라 관리자 변경이 서버 메모리에만 남아 사라진다.
 * 그래서 Supabase 접속 키가 설정되어 있으면 원격 저장소를 "기준"으로 삼는다.
 *  - 저장: 상품 목록 / 삭제 목록을 site_settings 의 catalog_products / catalog_deleted 행에 기록
 *  - 조회: 다른 서버 인스턴스의 저장분을 (짧은 주기로) 가져와 서버 메모리에 반영
 *  - 최초 1회: 원격에 행이 없으면 현재 번들된 data/*.json 으로 채운다
 * Supabase 키가 없거나 테이블이 없으면 모든 함수는 아무 일도 하지 않아 기존 파일 방식 그대로 동작한다.
 */
import fs from "fs";
import path from "path";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { markMemorySyncedWithDisk } from "@/lib/products-disk-sync";

const PRODUCTS_KEY = "catalog_products";
const DELETED_KEY = "catalog_deleted";
const CHECK_INTERVAL_MS = 10000;

type RemoteGlobals = {
  serverProductsCache?: any[];
  serverProductsDirty?: boolean;
  __remoteDeleted?: string[];
  __remoteProductsStamp?: string;
  __remoteDeletedStamp?: string;
  __remoteCheckedAt?: number;
  __remoteSyncing?: Promise<void> | null;
  __remoteWriteChain?: Promise<void>;
  __remoteBroken?: boolean;
  __remoteBrokenUntil?: number;
  __remoteLastSaveOk?: boolean;
};
const g = global as unknown as RemoteGlobals;

export const isRemoteCatalogEnabled = isSupabaseConfigured;

/** 원격 저장소가 정상 동작 중이고 이미 한 번 동기화되었으면 true (이때 서버 메모리 목록이 기준이다) */
export function remoteIsAuthoritative(): boolean {
  const isHealthy = !g.__remoteBroken || Date.now() >= (g.__remoteBrokenUntil || 0);
  return isRemoteCatalogEnabled && isHealthy && g.__remoteProductsStamp !== undefined;
}

function readJsonFile(name: string): any {
  try {
    const p = path.join(process.cwd(), "data", name);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return null;
}

/** 원격에서 가져온 삭제 목록 (원격 미사용/미조회 시 undefined) */
export function getRemoteDeletedList(): string[] | undefined {
  return isRemoteCatalogEnabled ? g.__remoteDeleted : undefined;
}

export function setRemoteDeletedListInMemory(ids: string[]) {
  if (!isRemoteCatalogEnabled) return;
  g.__remoteDeleted = Array.from(new Set(ids.map(String)));
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Supabase request timeout")), ms)),
  ]);
}

async function upsertRow(key: string, value: any): Promise<string | null> {
  try {
    const { data, error } = await withTimeout(
      supabaseServer
        .from("site_settings")
        .upsert(
          { key, value, description: key === PRODUCTS_KEY ? "상품 카탈로그 (관리자 저장)" : "삭제된 상품 식별자 목록", updated_at: new Date().toISOString() },
          { onConflict: "key" }
        )
        .select("updated_at"),
      10000
    );
    if (error) {
      g.__remoteBroken = true;
      g.__remoteBrokenUntil = Date.now() + 60000;
      console.warn(`[Remote Catalog] save failed (${key}):`, error.message);
      return null;
    }
    const stamp = Array.isArray(data) && data[0]?.updated_at ? String(data[0].updated_at) : new Date().toISOString();
    g.__remoteBroken = false;
    g.__remoteBrokenUntil = 0;
    return stamp;
  } catch (e: any) {
    g.__remoteBroken = true;
    g.__remoteBrokenUntil = Date.now() + 60000;
    console.warn(`[Remote Catalog] save error (${key}):`, e?.message || e);
    return null;
  }
}

/** 원격 저장을 순서대로 처리하도록 큐에 넣는다. flushRemoteWrites() 로 완료를 기다린다. */
export function queueRemoteSave(kind: "products" | "deleted", value: any[]) {
  if (!isRemoteCatalogEnabled) return;
  if (g.__remoteBroken && Date.now() < (g.__remoteBrokenUntil || 0)) return;
  const snapshot = Array.isArray(value) ? value : [];
  const run = async () => {
    try {
      if (kind === "products") {
        if (snapshot.length === 0) return; // 빈 목록으로 원격을 덮어쓰지 않는다
        const stamp = await upsertRow(PRODUCTS_KEY, snapshot);
        g.__remoteLastSaveOk = Boolean(stamp);
        if (stamp) g.__remoteProductsStamp = stamp;
      } else {
        const stamp = await upsertRow(DELETED_KEY, snapshot.map(String));
        g.__remoteLastSaveOk = Boolean(stamp);
        if (stamp) g.__remoteDeletedStamp = stamp;
      }
    } catch (e: any) {
      g.__remoteLastSaveOk = false;
      g.__remoteBroken = true;
      g.__remoteBrokenUntil = Date.now() + 60000;
      console.warn("[Remote Catalog] save error:", e?.message || e);
    }
  };
  g.__remoteWriteChain = (g.__remoteWriteChain || Promise.resolve()).then(run, run);
}

export async function flushRemoteWrites(): Promise<boolean> {
  if (!isRemoteCatalogEnabled) return false;
  if (g.__remoteBroken && Date.now() < (g.__remoteBrokenUntil || 0)) return false;
  try {
    await (g.__remoteWriteChain || Promise.resolve());
  } catch {}
  return g.__remoteLastSaveOk !== false;
}

async function doSync() {
  try {
    const { data: rows, error } = await withTimeout(
      supabaseServer
        .from("site_settings")
        .select("key, updated_at")
        .in("key", [PRODUCTS_KEY, DELETED_KEY]),
      3000
    );
    if (error) {
      g.__remoteBroken = true;
      g.__remoteBrokenUntil = Date.now() + 60000;
      console.warn("[Remote Catalog] sync skipped:", error.message);
      return;
    }
    g.__remoteBroken = false;
    g.__remoteBrokenUntil = 0;

    const prodRow = rows?.find((r: any) => r.key === PRODUCTS_KEY);
    const delRow = rows?.find((r: any) => r.key === DELETED_KEY);

    // 최초 1회: 원격이 비어 있으면 번들된 파일 내용으로 채운다
    if (!prodRow) {
      const fileList = readJsonFile("products-cache.json");
      if (Array.isArray(fileList) && fileList.length > 0) {
        const stamp = await upsertRow(PRODUCTS_KEY, fileList);
        if (stamp) g.__remoteProductsStamp = stamp;
      }
    } else if (prodRow.updated_at !== g.__remoteProductsStamp) {
      const { data, error: e2 } = await withTimeout(
        supabaseServer.from("site_settings").select("value, updated_at").eq("key", PRODUCTS_KEY).maybeSingle(),
        10000
      );
      if (!e2 && data && Array.isArray(data.value) && data.value.length > 0) {
        g.serverProductsCache = data.value;
        g.serverProductsDirty = false;
        g.__remoteProductsStamp = String(data.updated_at);
        markMemorySyncedWithDisk();
      }
    }

    if (!delRow) {
      const fileDeleted = readJsonFile("deleted-products.json");
      const list = Array.isArray(fileDeleted) ? fileDeleted.map(String) : [];
      const stamp = await upsertRow(DELETED_KEY, list);
      if (stamp) g.__remoteDeletedStamp = stamp;
      g.__remoteDeleted = list;
    } else if (delRow.updated_at !== g.__remoteDeletedStamp || g.__remoteDeleted === undefined) {
      const { data, error: e3 } = await withTimeout(
        supabaseServer.from("site_settings").select("value, updated_at").eq("key", DELETED_KEY).maybeSingle(),
        1200
      );
      if (!e3 && data && Array.isArray(data.value)) {
        g.__remoteDeleted = data.value.map(String);
        g.__remoteDeletedStamp = String(data.updated_at);
      }
    }
  } catch (err: any) {
    g.__remoteBroken = true;
    g.__remoteBrokenUntil = Date.now() + 60000;
    console.warn("[Remote Catalog] sync error:", err?.message || err);
  }
}

/**
 * 다른 서버 인스턴스(또는 관리자 저장)가 원격에 기록한 최신 카탈로그를 이 인스턴스 메모리에 반영한다.
 * force=false 면 주기(10초) 안의 중복 조회는 건너뛴다.
 */
export async function syncCatalogFromRemote(force: boolean = false): Promise<void> {
  if (!isRemoteCatalogEnabled) return;
  const isBrokenCooldown = g.__remoteBroken && Date.now() < (g.__remoteBrokenUntil || 0);
  if (isBrokenCooldown && !force) return;

  const now = Date.now();
  if (!force && g.__remoteCheckedAt && now - g.__remoteCheckedAt < CHECK_INTERVAL_MS && g.__remoteDeleted !== undefined) return;
  if (g.__remoteSyncing) {
    await g.__remoteSyncing;
    if (!force) return;
  }
  g.__remoteSyncing = (async () => {
    try {
      await flushRemoteWrites();
      await doSync();
    } catch (e: any) {
      console.warn("[Remote Catalog] sync error:", e?.message || e);
    } finally {
      g.__remoteCheckedAt = Date.now();
      g.__remoteSyncing = null;
    }
  })();
  await g.__remoteSyncing;
}
