import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import seedCustomers from "@/data/customers.json";

export const dynamic = "force-dynamic";

function getCustomersFilePath(): string {
  return path.join(process.cwd(), "data", "customers.json");
}

function readCustomersFile(): any[] {
  try {
    const filePath = getCustomersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("[Reset-By-Identity Customer Read Warning]:", err);
  }
  return Array.isArray(seedCustomers) ? seedCustomers : [];
}

function writeCustomersFile(data: any[]): void {
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
    console.error("[Reset-By-Identity Customer Write Error]:", err);
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

function findMatchingCustomer(customers: any[], identifier: string, name: string, phone: string) {
  const normId = identifier.trim().toLowerCase();
  const normName = name.replace(/\s+/g, "").toLowerCase();
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  return customers.find((c: any) => {
    const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
    const cEmail = (c.email || "").trim().toLowerCase();
    const cId = (c.id || "").trim().toLowerCase();
    const cName = (c.name || "").replace(/\s+/g, "").toLowerCase();
    const cPhone = (c.phone || "").replace(/[^0-9]/g, "");

    const idMatch = cLoginId === normId || cEmail === normId || cId === normId;
    const nameMatch = cName === normName;
    const phoneMatch =
      cPhone === cleanPhone ||
      (cleanPhone.length >= 7 && cPhone.endsWith(cleanPhone)) ||
      (cleanPhone.length === 4 && cPhone.endsWith(cleanPhone));

    return idMatch && nameMatch && phoneMatch;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || "verify"; // "verify" | "reset"
    const identifier = String(body?.identifier || "").trim();
    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "아이디 또는 이메일 주소를 입력해 주세요." },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json(
        { success: false, error: "가입 시 등록하신 성함(이름)을 입력해 주세요." },
        { status: 400 }
      );
    }
    if (!phone || phone.replace(/[^0-9]/g, "").length < 4) {
      return NextResponse.json(
        { success: false, error: "가입 시 등록하신 휴대폰 번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    const customers = readCustomersFile();
    const matched = findMatchingCustomer(customers, identifier, name, phone);

    if (!matched) {
      return NextResponse.json(
        {
          success: false,
          error: "입력하신 정보와 일치하는 회원 정보를 찾을 수 없습니다. 아이디, 성함, 휴대폰 번호를 다시 확인해 주세요.",
        },
        { status: 404 }
      );
    }

    // 1단계: 단순 본인 확인 (Verify)
    if (action === "verify") {
      return NextResponse.json({
        success: true,
        message: "본인 확인이 완료되었습니다.",
        customer: {
          id: matched.id,
          name: matched.name,
          loginId: matched.loginId || matched.login_id || matched.email,
          email: matched.email,
        },
      });
    }

    // 2단계: 새 비밀번호로 변경 (Reset)
    if (action === "reset") {
      const newPassword = String(body?.newPassword || "").trim();
      const validation = validatePasswordComplexity(newPassword);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: validation.message },
          { status: 400 }
        );
      }

      // JSON 파일 내 비밀번호 갱신
      const idx = customers.findIndex((c) => c.id === matched.id || c.email === matched.email);
      if (idx !== -1) {
        customers[idx] = {
          ...customers[idx],
          password: newPassword,
          updated_at: new Date().toISOString(),
        };
        writeCustomersFile(customers);
      }

      // Supabase 비동기 동기화
      if (matched.email) {
        runSafeSupabaseQuery(
          async (supabase) =>
            supabase
              .from("customers")
              .update({
                password: newPassword,
                updated_at: new Date().toISOString(),
              })
              .match({ email: matched.email }),
          2500
        ).catch((err) => console.warn("[Reset-By-Identity Supabase Sync Warning]:", err));
      }

      return NextResponse.json({
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해 주세요.",
        loginIdentifier: matched.loginId || matched.login_id || matched.email,
      });
    }

    return NextResponse.json({ success: false, error: "올바르지 않은 요청입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("[Reset-By-Identity Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
