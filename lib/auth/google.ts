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

import fs from "fs";
import path from "path";

function readEnvLocal(key: string): string {
  try {
    const candidatePaths = [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), ".env"),
      path.resolve(".env.local"),
      path.resolve(".env"),
    ];
    for (const envPath of candidatePaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
        if (match && match[1]) {
          return match[1].trim().replace(/^['"]|['"]$/g, "");
        }
      }
    }
  } catch (e) {}
  return "";
}

export function getGoogleConfig(req?: Request) {
  let clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    readEnvLocal("GOOGLE_CLIENT_ID") ||
    readEnvLocal("NEXT_PUBLIC_GOOGLE_CLIENT_ID") ||
    readEnvLocal("GOOGLE_ID") ||
    "";

  // 혹시 클라이언트 ID 뒤에 _ID.apps... 가 중복 붙었을 경우 자동 보정
  if (clientId.includes(".apps.googleusercontent.com_")) {
    clientId = clientId.split("_")[0];
  }

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET ||
    process.env.GOOGLE_PASSWORD ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    readEnvLocal("GOOGLE_CLIENT_SECRET") ||
    readEnvLocal("GOOGLE_SECRET") ||
    "";

  let redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    "";

  if (!redirectUri && req) {
    const rawHost = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001").trim();
    const proto = req.headers.get("x-forwarded-proto") || (rawHost.includes("localhost") ? "http" : "https");

    // 구글 OAuth 정책: 사설 IP(172.x, 192.168.x 등)는 차단되므로 로컬에서는 localhost로 고정
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(rawHost);
    if (isIpAddress || rawHost.includes("localhost") || rawHost.includes("127.0.0.1")) {
      redirectUri = "http://localhost:3001/api/auth/google/callback";
    } else {
      redirectUri = `${proto}://${rawHost}/api/auth/google/callback`;
    }
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
