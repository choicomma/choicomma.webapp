import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetToken } from "@/lib/auth/password-reset-token";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const result = verifyPasswordResetToken(token);

  if (!result.valid) {
    let message = "유효하지 않은 링크입니다.";
    if (result.reason === "expired") {
      message = "비밀번호 재설정 링크의 유효시간(1시간)이 만료되었습니다. 다시 요청해 주세요.";
    } else if (result.reason === "already_used") {
      message = "이미 사용 완료된 링크입니다. 새로운 링크를 요청해 주세요.";
    }
    return NextResponse.json({ valid: false, reason: result.reason, message }, { status: 400 });
  }

  function maskEmail(email: string): string {
    if (!email || !email.includes("@")) return email;
    const [user, domain] = email.split("@");
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    const visible = user.slice(0, 2);
    const stars = "*".repeat(Math.min(user.length - 2, 4));
    return `${visible}${stars}@${domain}`;
  }

  return NextResponse.json({
    valid: true,
    email: result.record?.email,
    maskedEmail: result.record?.email ? maskEmail(result.record.email) : "",
    name: result.record?.name || "회원",
  });
}
