import { NextRequest, NextResponse } from "next/server";
import { buildKakaoAuthUrl, getKakaoConfig } from "@/lib/auth/kakao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const redirectParam = url.searchParams.get("redirect") || "/";

    const { restApiKey } = getKakaoConfig(req);
    if (!restApiKey) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>카카오 설정 안내 - choicomma</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; }
            .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 480px; text-align: center; border: 1px solid #eaeaea; }
            h2 { margin: 0 0 12px; color: #111; font-size: 20px; }
            p { color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
            code { background: #f3f3f3; padding: 2px 6px; border-radius: 6px; font-size: 13px; color: #d00; font-family: monospace; }
            a { display: inline-block; background: #111; color: white; text-decoration: none; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ 카카오 REST API 키 확인 필요</h2>
            <p>.env.local 파일에 <code>KAKAO_REST_API_KEY=...</code>가 입력되어 저장되었는지 확인해 주세요.</p>
            <a href="/login">로그인 화면으로 돌아가기</a>
          </div>
        </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const kakaoAuthUrl = buildKakaoAuthUrl(req, redirectParam);
    return NextResponse.redirect(kakaoAuthUrl);
  } catch (err: any) {
    console.error("[Kakao Login Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initiate Kakao login" },
      { status: 500 }
    );
  }
}
