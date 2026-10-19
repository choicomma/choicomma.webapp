import fs from "fs";
import path from "path";

export interface KakaoUserAccount {
  id: number;
  connected_at?: string;
  kakao_account?: {
    profile_nickname_needs_agreement?: boolean;
    profile?: {
      nickname?: string;
      thumbnail_image_url?: string;
      profile_image_url?: string;
      is_default_image?: boolean;
    };
    has_email?: boolean;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    email?: string;
    has_phone_number?: boolean;
    phone_number_needs_agreement?: boolean;
    phone_number?: string;
    has_name?: boolean;
    name_needs_agreement?: boolean;
    name?: string;
  };
}

function readEnvLocal(key: string): string {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (match && match[1]) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (e) {}
  return "";
}

export function getKakaoConfig(req?: Request) {
  // 사용자가 입력할 수 있는 다양한 환경변수 키 이름 지원 + 파일 직접 읽기 안전망
  const restApiKey =
    process.env.KAKAO_REST_API_KEY ||
    process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ||
    process.env.KAKAO_CLIENT_ID ||
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ||
    process.env.KAKAO_API_KEY ||
    process.env.NEXT_PUBLIC_KAKAO_API_KEY ||
    readEnvLocal("KAKAO_REST_API_KEY") ||
    readEnvLocal("NEXT_PUBLIC_KAKAO_REST_API_KEY") ||
    readEnvLocal("KAKAO_CLIENT_ID") ||
    "";

  const clientSecret =
    process.env.KAKAO_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_SECRET ||
    "";

  let redirectUri =
    process.env.KAKAO_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ||
    "";

  // 설정된 Redirect URI가 없을 경우 요청 헤더(Host)를 기반으로 동적 생성
  if (!redirectUri && req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    redirectUri = `${proto}://${host}/api/auth/kakao/callback`;
  } else if (!redirectUri) {
    redirectUri = "http://localhost:3001/api/auth/kakao/callback";
  }

  return {
    restApiKey: restApiKey.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
}

/**
 * 카카오 로그인 인가 요청 URL 생성
 */
export function buildKakaoAuthUrl(req: Request, state = "/"): string {
  const { restApiKey, redirectUri } = getKakaoConfig(req);
  if (!restApiKey) {
    throw new Error("KAKAO_REST_API_KEY is not configured.");
  }

  const params = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: redirectUri,
    response_type: "code",
    state: state || "/",
  });

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

/**
 * 카카오 인가 코드로 Access Token 요청
 */
export async function fetchKakaoToken(code: string, redirectUri: string) {
  const { restApiKey, clientSecret } = getKakaoConfig();
  if (!restApiKey) {
    throw new Error("KAKAO_REST_API_KEY is not configured.");
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    redirect_uri: redirectUri,
    code,
  });

  if (clientSecret) {
    params.append("client_secret", clientSecret);
  }

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Kakao Token Error]:", errText);
    throw new Error(`Failed to fetch kakao token: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Access Token으로 카카오 사용자 프로필 정보 조회
 */
export async function fetchKakaoUserInfo(accessToken: string): Promise<KakaoUserAccount> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Kakao User Info Error]:", errText);
    throw new Error(`Failed to fetch kakao user info: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * 한국 전화번호 형식 정규화 (+82 10-1234-5678 -> 010-1234-5678)
 */
export function formatKoreanPhoneNumber(phoneRaw?: string): string {
  if (!phoneRaw) return "";
  let clean = phoneRaw.trim();
  if (clean.startsWith("+82")) {
    clean = "0" + clean.slice(3).trim();
  }
  clean = clean.replace(/[^0-9]/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  return clean;
}
