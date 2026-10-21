import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import seedCustomers from "@/data/customers.json";

export const dynamic = "force-dynamic";

function getCustomers(): any[] {
  try {
    const filePath = path.join(process.cwd(), "data", "customers.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    console.warn("[Forgot-Password Customer Read Warning]:", err);
  }
  return Array.isArray(seedCustomers) ? seedCustomers : [];
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  const visible = user.slice(0, 2);
  const stars = "*".repeat(Math.min(user.length - 2, 4));
  return `${visible}${stars}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body?.emailOrLoginId || body?.email || body?.loginId || "").trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "가입하신 아이디 또는 이메일 주소를 입력해 주세요." },
        { status: 400 }
      );
    }

    const customers = getCustomers();
    const queryLower = query.toLowerCase();
    const cleanDigits = query.replace(/[^0-9]/g, "");

    // 1. 회원 매칭 (이메일, 로그인 ID, 회원 ID, 휴대폰 번호)
    const matched = customers.find((c: any) => {
      const cEmail = (c.email || "").trim().toLowerCase();
      const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
      const cId = (c.id || "").trim().toLowerCase();
      const cPhone = (c.phone || "").replace(/[^0-9]/g, "");

      return (
        cEmail === queryLower ||
        cLoginId === queryLower ||
        cId === queryLower ||
        (cleanDigits.length >= 8 && cPhone === cleanDigits)
      );
    });

    if (!matched) {
      return NextResponse.json(
        {
          success: false,
          error: "입력하신 정보와 일치하는 회원 정보를 찾을 수 없습니다. 아이디를 다시 확인해 주세요.",
        },
        { status: 404 }
      );
    }

    const customerEmail = (matched.email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail) || customerEmail.endsWith("@example.com")) {
      return NextResponse.json(
        {
          success: false,
          error: "해당 회원 계정에 등록된 유효한 이메일 주소가 없습니다. 고객센터(02-579-1171)로 문의해 주세요.",
        },
        { status: 400 }
      );
    }

    const customerId = matched.id || matched.loginId || customerEmail;
    const customerName = matched.name || "고객";

    // 2. 일회용 보안 토큰 생성
    const tokenRecord = createPasswordResetToken(customerId, customerEmail, customerName);

    // 3. 베이스 URL 결정
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${tokenRecord.token}`;

    // 4. Resend 이메일 발송
    const sendResult = await sendPasswordResetEmail({
      to: customerEmail,
      name: customerName,
      resetUrl,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || "이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "비밀번호 재설정 링크가 이메일로 발송되었습니다.",
      maskedEmail: maskEmail(customerEmail),
      // 개발 환경이거나 키가 없는 경우 테스트 편의를 위해 mock 정보 제공
      debugUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (err: any) {
    console.error("[Forgot-Password Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
