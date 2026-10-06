export const getCjApiBaseUrl = () => {
  const env = process.env.CJ_API_ENV?.trim()?.toLowerCase();
  if (env === "dev" || env === "development" || env === "test") {
    return "https://dxapi-dev.cjlogistics.com:5054";
  }
  // 기본값: 실운영(Production) 환경
  return "https://dxapi.cjlogistics.com:5052";
};

type TokenData = {
  token: string;
  env: string;
  expiresAt: number;
};

// Next.js 개발 환경에서 핫리로딩 시 캐시가 날아가는 것을 방지하기 위해 global 객체 사용
const globalForCjToken = global as unknown as { cjTokenCache?: TokenData };

export const clearCachedCjToken = () => {
  globalForCjToken.cjTokenCache = undefined;
};

export const getCachedCjToken = (): string | null => {
  const cache = globalForCjToken.cjTokenCache;
  if (!cache) return null;
  
  const currentEnv = process.env.CJ_API_ENV?.trim()?.toLowerCase() || "prod";
  if (cache.env !== currentEnv) {
    globalForCjToken.cjTokenCache = undefined;
    return null;
  }

  // 현재 시간이 만료 시간보다 지나면 만료된 것으로 간주
  if (Date.now() > cache.expiresAt) {
    globalForCjToken.cjTokenCache = undefined;
    return null;
  }
  
  return cache.token;
};

export const setCachedCjToken = (token: string, expiresInMs: number = 24 * 60 * 60 * 1000) => {
  const currentEnv = process.env.CJ_API_ENV?.trim()?.toLowerCase() || "prod";
  globalForCjToken.cjTokenCache = {
    token,
    env: currentEnv,
    expiresAt: Date.now() + expiresInMs,
  };
};
