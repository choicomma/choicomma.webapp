/**
 * 서버 메모리 상품 목록과 디스크 파일(data/products-cache.json)의 동기화 헬퍼.
 *
 * 문제: 서버 인스턴스(개발 서버 2개, 서버리스 함수 여러 개 등)마다 메모리 캐시가 따로 있어서,
 * 한 인스턴스가 저장한 순서/삭제를 다른 인스턴스가 영원히 반영하지 못하고 오래된 목록을 계속 보여줬다.
 *
 * 해결: 파일 수정 시각(mtime)을 함께 기억해, 이 인스턴스가 마지막으로 동기화한 이후
 * 파일이 더 새로워졌고(= 다른 쪽이 저장함) 아직 디스크에 못 쓴 내 변경(dirty)이 없다면
 * 파일 내용을 순서/구성 그대로 채택한다.
 */
import fs from "fs";
import path from "path";

type SyncGlobals = {
  serverProductsCache?: any[];
  serverProductsDirty?: boolean;
  serverProductsDiskMtime?: number;
};
const g = global as unknown as SyncGlobals;

function productsFilePath() {
  return path.join(process.cwd(), "data", "products-cache.json");
}

export function getProductsDiskMtime(): number {
  try {
    return fs.statSync(productsFilePath()).mtimeMs;
  } catch {
    return 0;
  }
}

// 이 인스턴스의 메모리가 현재 디스크 파일과 같은 상태임을 기록 (내가 저장을 끝낸 직후에 호출)
export function markMemorySyncedWithDisk() {
  g.serverProductsDiskMtime = getProductsDiskMtime();
}

// 다른 인스턴스/프로세스가 파일을 더 최근에 저장했다면 그 내용을 메모리로 채택한다. 채택했으면 true.
export function adoptDiskIfNewer(): boolean {
  // 아직 디스크에 저장하지 못한 내 변경이 메모리에 있으면 덮어쓰지 않는다
  if (g.serverProductsDirty) return false;

  const mtime = getProductsDiskMtime();
  if (!mtime) return false;

  const hasCache = Array.isArray(g.serverProductsCache) && g.serverProductsCache.length > 0;
  if (hasCache && g.serverProductsDiskMtime !== undefined && mtime <= g.serverProductsDiskMtime) {
    return false; // 파일이 내 메모리보다 새롭지 않음
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = JSON.parse(fs.readFileSync(productsFilePath(), "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        g.serverProductsCache = data;
        g.serverProductsDiskMtime = mtime;
        return true;
      }
      return false;
    } catch {
      // OneDrive/Windows 파일 잠금 또는 쓰기 도중 읽기: 잠시 후 재시도
      const start = Date.now();
      while (Date.now() - start < 50) {}
    }
  }
  return false;
}
