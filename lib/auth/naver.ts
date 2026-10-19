/**
 * [네이버 OAuth 2.0 인증 유틸리티]
 * - 네이버 아이디로 로그인(네아로) 프로토콜 구현
 * - 로컬(3001) 및 실제 도메인(choicomma.co.kr 등) 자동 감지 Redirect URI 생성
 */

export interface NaverUserProfile {
  id: string; // 네이버 고유 회원 식별 ID
  nickname?: string;
  name?: string;
  email?: string;
  gender?: string;
  age?: string;
  birthday?: string;
  profile_image?: string;
  birthyear?: string;
  mobile?: string;
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

export function getNaverConfig(req?: Request) {
  const clientId =
    process.env.NAVER_CLIENT_ID ||
    process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ||
    process.env.NAVER_ID ||
    readEnvLocal("NAVER_CLIENT_ID") ||
    readEnvLocal("NEXT_PUBLIC_NAVER_CLIENT_ID") ||
    "";

  const clientSecret =
    process.env.NAVER_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET ||
    process.env.NAVER_SECRET ||
    process.env.NEXT_PUBLIC_NAVER_SECRET ||
    readEnvLocal("NAVER_CLIENT_SECRET") ||
    readEnvLocal("NEXT_PUBLIC_NAVER_CLIENT_SECRET") ||
    readEnvLocal("NAVER_SECRET") ||
    "";

  let redirectUri =
    process.env.NAVER_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI ||
    "";

  if (!redirectUri && req) {
    const rawHost = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001").trim();
    const proto = req.headers.get("x-forwarded-proto") || (rawHost.includes("localhost") ? "http" : "https");

    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(rawHost);
    if (isIpAddress || rawHost.includes("localhost") || rawHost.includes("127.0.0.1")) {
      redirectUri = "http://localhost:3001/api/auth/naver/callback";
    } else {
      redirectUri = `${proto}://${rawHost}/api/auth/naver/callback`;
    }
  } else if (!redirectUri) {
    redirectUri = "http://localhost:3001/api/auth/naver/callback";
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
}

/**
 * 네이버 로그인 인가 요청 URL 생성
 */
export function buildNaverAuthUrl(req: Request, state = "/"): string {
  const { clientId, redirectUri } = getNaverConfig(req);
  if (!clientId) {
    throw new Error("NAVER_CLIENT_ID is not configured.");
  }

  // 네이버는 state 파라미터가 필수입니다.
  const stateVal = state || "/membership";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: stateVal,
  });

  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

/**
 * 네이버 인가 코드로 Access Token 요청
 */
export async function fetchNaverToken(code: string, state: string) {
  const { clientId, clientSecret } = getNaverConfig();
  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured.");
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
  });

  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Naver Token Error]:", errText);
    throw new Error(`Failed to fetch naver token: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Access Token으로 네이버 사용자 프로필 조회
 */
export async function fetchNaverUserInfo(accessToken: string): Promise<NaverUserProfile> {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Naver User Info Error]:", errText);
    throw new Error(`Failed to fetch naver user info: ${res.status} ${errText}`);
  }

  const json = await res.json();
  if (json.resultcode !== "00" || !json.response) {
    throw new Error(`Naver API error: ${json.message || "Unknown error"}`);
  }

  return json.response;
}
