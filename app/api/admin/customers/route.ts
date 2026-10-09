import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    console.warn("[Customers File Read Warning]:", err);
  }
  return [];
}

function writeCustomersFile(data: any[]) {
  try {
    const targetPath = getCustomersFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
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
    console.error("[Customers File Write Error]:", err);
  }
}

// GET: 회원 목록 조회 (Git data/customers.json 기준)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.toLowerCase();
    const id = url.searchParams.get("id");
    const email = url.searchParams.get("email")?.toLowerCase();

    let list = readCustomersFile();

    if (id) {
      const found = list.find((c) => c.id === id || c.loginId === id);
      return NextResponse.json({ success: true, customer: found || null });
    }

    if (email) {
      const found = list.find((c) => c.email?.toLowerCase() === email);
      return NextResponse.json({ success: true, customer: found || null });
    }

    if (query) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.id?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ success: true, count: list.length, customers: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: 회원 등록 또는 정보 수정 (Git data/customers.json에 영속화)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      writeCustomersFile(body);
      return NextResponse.json({ success: true, count: body.length, customers: body });
    }

    if (!body || (!body.id && !body.email)) {
      return NextResponse.json(
        { success: false, error: "회원 식별자(id 또는 email)는 필수입니다." },
        { status: 400 }
      );
    }

    const current = readCustomersFile();
    const targetId = body.id ? String(body.id).trim() : "";
    const targetEmail = body.email ? String(body.email).trim().toLowerCase() : "";

    const idx = current.findIndex(
      (c) =>
        (targetId && (c.id === targetId || c.loginId === targetId)) ||
        (targetEmail && c.email?.toLowerCase() === targetEmail)
    );

    let updatedRecord: any;

    if (idx !== -1) {
      // 부분 업데이트 허용 (비밀번호 변경, 주소 변경, 포인트 변경 등)
      updatedRecord = {
        ...current[idx],
        ...body,
        updated_at: new Date().toISOString(),
      };
      if (body.points !== undefined) updatedRecord.points = Number(body.points);
      if (body.totalSpent !== undefined) updatedRecord.totalSpent = Number(body.totalSpent);
      current[idx] = updatedRecord;
    } else {
      // 신규 회원 생성 시에는 name 필수
      if (!body.name) {
        return NextResponse.json(
          { success: false, error: "신규 회원 생성 시 성명(name)은 필수입니다." },
          { status: 400 }
        );
      }
      updatedRecord = {
        id: targetId || `CUST-${Date.now()}`,
        name: String(body.name).trim(),
        email: targetEmail || "-",
        phone: String(body.phone || "-").trim(),
        address: String(body.address || "-").trim(),
        detailAddress: String(body.detailAddress || "").trim(),
        postcode: String(body.postcode || body.zipCode || "").trim(),
        grade: String(body.grade || "GENERAL").toUpperCase(),
        totalSpent: Number(body.totalSpent || 0),
        points: Number(body.points || 0),
        couponsCount: Number(body.couponsCount || 0),
        joinedDate: body.joinedDate || new Date().toISOString().split("T")[0],
        status: body.status || "Active",
        role: body.role || (body.isAdmin ? "ADMIN" : "CUSTOMER"),
        isAdmin: Boolean(body.isAdmin),
        password: body.password || undefined,
        loginId: body.loginId || undefined,
        updated_at: new Date().toISOString(),
      };
      current.push(updatedRecord);
    }

    writeCustomersFile(current);
    return NextResponse.json({ success: true, customer: updatedRecord, customers: current });
  } catch (err: any) {
    console.error("API /api/admin/customers error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: 회원 삭제 (탈퇴 처리)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const email = url.searchParams.get("email")?.toLowerCase();
    const phone = url.searchParams.get("phone");

    if (!id && !email && !phone) {
      return NextResponse.json({ success: false, message: "회원 식별자 누락" }, { status: 400 });
    }

    const current = readCustomersFile();
    const filtered = current.filter((c) => {
      if (id && (c.id === id || c.loginId === id)) return false;
      if (email && c.email?.toLowerCase() === email) return false;
      if (phone && (c.phone === phone || c.phone?.replace(/[^0-9]/g, "") === phone.replace(/[^0-9]/g, ""))) return false;
      return true;
    });

    writeCustomersFile(filtered);
    return NextResponse.json({ success: true, count: filtered.length, customers: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
