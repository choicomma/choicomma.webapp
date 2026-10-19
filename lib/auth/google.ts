/**
 * [구글 OAuth 2.0 인증 유틸리티]
 * - 다양한 환경변수 이름 유연 지원 (GOOGLE_CLIENT_ID, GOOGLE_ID, GOOGLE_CLIENT_SECRET 등)
 * - 로컬(3001) 및 운영 환경 자동 감지 Redirect URI 생성
 */

export interface GoogleUserProfile {
  sub: string; // 구글 고유 회원 ID
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: string;
}

export function getGoogleConfig(req?: Request) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    "";

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET ||
    process.env.GOOGLE_PASSWORD ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    "";

  let redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    "";

  if (!redirectUri && req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    redirectUri = `${proto}://${host}/api/auth/google/callback`;
  } else if (!redirectUri) {
    redirectUri = "http://localhost:3001/api/auth/google/callback";
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
}

/**
 * 구글 로그인 인가 요청 URL 생성
 */
export function buildGoogleAuthUrl(req: Request, state = "/"): string {
  const { clientId, redirectUri } = getGoogleConfig(req);
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: state || "/",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 구글 인가 코드로 Access Token 요청
 */
export async function fetchGoogleToken(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Google Token Error]:", errText);
    throw new Error(`Failed to fetch google token: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Access Token으로 구글 사용자 프로필 정보 조회
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Google User Info Error]:", errText);
    throw new Error(`Failed to fetch google user info: ${res.status} ${errText}`);
  }

  return await res.json();
}
