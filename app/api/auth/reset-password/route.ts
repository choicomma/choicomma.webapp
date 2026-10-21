import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyPasswordResetToken, markTokenAsUsed } from "@/lib/auth/password-reset-token";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getCustomersFilePath() {
  return path.join(process.cwd(), "data", "customers.json");
}

function readCustomersFile(): any[] {
  try {
    const filePath = getCustomersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Reset-Password Customer Read Warning]:", err);
  }
  return [];
}

function writeCustomersFile(data: any[]) {
  try {
    const targetPath = getCustomersFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error("[Reset-Password Customer Write Error]:", err);
  }
}

function validatePasswordComplexity(pwd: string): { isValid: boolean; message?: string } {
  if (!pwd || pwd.length < 8) {
    return { isValid: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  if (!hasLetter || !hasNumber || !hasSpecial) {
    return {
      isValid: false,
      message: "영문, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다.",
    };
  }
  return { isValid: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = (body?.token || "").trim();
    const newPassword = (body?.newPassword || "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "재설정 토큰 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const verification = verifyPasswordResetToken(token);
    if (!verification.valid || !verification.record) {
      let error = "유효하지 않은 링크입니다.";
      if (verification.reason === "expired") {
        error = "비밀번호 재설정 링크의 유효시간(1시간)이 만료되었습니다. 다시 요청해 주세요.";
      } else if (verification.reason === "already_used") {
        error = "이미 사용 완료된 링크입니다. 새로운 재설정 링크를 요청해 주세요.";
      }
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { customerId, email } = verification.record;

    const validation = validatePasswordComplexity(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 }
      );
    }

    // 1. JSON 파일 내 비밀번호 갱신
    const customers = readCustomersFile();
    const customerIndex = customers.findIndex(
      (c) =>
        (c.id && c.id === customerId) ||
        (c.loginId && c.loginId === customerId) ||
        (c.email && c.email.toLowerCase() === email.toLowerCase())
    );

    let updatedTargetId = customerId;
    let updatedCustomerRecord: any = null;

    if (customerIndex !== -1) {
      customers[customerIndex] = {
        ...customers[customerIndex],
        password: newPassword,
        updated_at: new Date().toISOString(),
      };
      updatedCustomerRecord = customers[customerIndex];
      updatedTargetId = customers[customerIndex].id || customerId;
      writeCustomersFile(customers);
    }

    // 2. Supabase 비동기 동기화
    runSafeSupabaseQuery(
      async (supabase) =>
        supabase
          .from("customers")
          .update({
            password: newPassword,
            updated_at: new Date().toISOString(),
          })
          .match({ email }),
      2500
    ).catch((err) => console.warn("[Reset-Password Supabase Sync Warning]:", err));

    // 3. 토큰 사용 완료 처리 (1회용 보장)
    markTokenAsUsed(token);

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
      loginIdentifier: updatedCustomerRecord?.loginId || email,
    });
  } catch (err: any) {
    console.error("[Reset-Password Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "비밀번호 재설정 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
