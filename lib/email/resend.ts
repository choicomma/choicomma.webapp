import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY?.trim();

// Resend 인스턴스 (API 키가 없더라도 서버리스 실행이 중단되지 않도록 안전하게 초기화)
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const SENDER_EMAIL =
  process.env.RESEND_FROM_EMAIL?.trim() || "초이콤마 <onboarding@resend.dev>";

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string; data?: any }> {
  const customerName = name || "회원";

  // 개발 모드 또는 API 키 미설정 시 콘솔 로그 및 안전 안내
  if (!resend || !resendApiKey) {
    console.warn(
      `⚠️ [Resend Warning] RESEND_API_KEY가 설정되지 않았습니다. 테스트 모드로 동작합니다.\n` +
      `[비밀번호 재설정 링크]: ${resetUrl}\n` +
      `수신자: ${to} (${customerName})`
    );
    return {
      success: true,
      data: {
        mock: true,
        message: "개발/테스트 모드: 이메일 전송 링크가 서버 콘솔에 출력되었습니다.",
      },
    };
  }

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>비밀번호 재설정 안내 - 초이콤마</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Pretendard', sans-serif; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f6f6f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #eaeaea;">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #09090b;">
                CHOICOMMA
              </h1>
              <p style="margin: 4px 0 0; font-size: 11px; letter-spacing: 2px; color: #71717a; text-transform: uppercase;">
                Contemporary Minimalist Fashion
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #09090b; letter-spacing: -0.5px;">
                비밀번호 재설정 안내
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                안녕하세요, <strong>${customerName}</strong> 고객님.<br />
                초이콤마 계정의 비밀번호를 재설정하기 위한 요청이 접수되었습니다.
              </p>
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                본인이 요청하신 것이 맞다면 아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: block; width: 100%; max-width: 320px; padding: 15px 0; background-color: #09090b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; text-align: center; letter-spacing: -0.2px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      비밀번호 재설정하기
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #fbfbfa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #09090b;">
                  🔒 보안 안내사항
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 11px; line-height: 1.6; color: #71717a;">
                  <li>이 링크는 발송 시점으로부터 <strong>1시간 동안만 유효</strong>합니다.</li>
                  <li>본인이 요청하지 않았을 경우 이 메일을 무시해 주세요. 고객님의 비밀번호는 안전하게 유지됩니다.</li>
                </ul>
              </div>

              <!-- Direct URL Fallback -->
              <p style="margin: 0; font-size: 11px; color: #a1a1aa; line-height: 1.5; word-break: break-all;">
                버튼이 작동하지 않을 경우 아래 링크를 복사하여 브라우저 주소창에 입력해 주세요:<br />
                <a href="${resetUrl}" style="color: #71717a; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #71717a;">
                (주)초이콤마 | 대표: 조건 | 고객센터: 02-579-1171
              </p>
              <p style="margin: 0; font-size: 10px; color: #a1a1aa;">
                서울특별시 강남구 개포로22길 12, 6층(개포동) | 본 메일은 발신 전용입니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject: "[초이콤마] 비밀번호 재설정 링크 안내",
      html,
    });

    if (error) {
      console.error("[Resend Send Error]:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[Resend Unexpected Error]:", err);
    return { success: false, error: err?.message || "이메일 발송 중 오류가 발생했습니다." };
  }
}
