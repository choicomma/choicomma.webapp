export const getCjApiBaseUrl = () => {
  const env = process.env.CJ_API_ENV?.trim()?.toLowerCase();
  if (env === "prod" || env === "production") {
    return "https://dxapi.cjlogistics.com:5052";
  }
  return "https://dxapi-dev.cjlogistics.com:5054";
};

type TokenData = {
  token: string;
  expiresAt: number;
};

// Next.js 개발 환경에서 핫리로딩 시 캐시가 날아가는 것을 방지하기 위해 global 객체 사용
const globalForCjToken = global as unknown as { cjTokenCache?: TokenData };

export const getCachedCjToken = (): string | null => {
  const cache = globalForCjToken.cjTokenCache;
  if (!cache) return null;
  
  // 현재 시간이 만료 시간보다 지나면 만료된 것으로 간주
  if (Date.now() > cache.expiresAt) {
    globalForCjToken.cjTokenCache = undefined;
    return null;
  }
  
  return cache.token;
};

export const setCachedCjToken = (token: string, expiresInMs: number = 24 * 60 * 60 * 1000) => {
  globalForCjToken.cjTokenCache = {
    token,
    expiresAt: Date.now() + expiresInMs,
  };
};
