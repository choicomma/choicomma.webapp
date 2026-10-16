import { NextRequest, NextResponse } from "next/server";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";
import seedCustomers from "@/data/customers.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BATCH_SIZE = 500;
const TOTAL_CUSTOMERS = (seedCustomers as any[]).length;
const TOTAL_STAGES = Math.ceil(TOTAL_CUSTOMERS / BATCH_SIZE); // 5714 / 500 = 12단계

function formatPhoneNumber(phone: string): string {
  if (!phone || phone === "-" || phone === "null") return "-";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    if (cleaned.startsWith("02")) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function normalizeGrade(grade: any, rawGrade?: string): string {
  const g = String(grade || "").toUpperCase();
  if (["VVIP", "PLATINUM", "GOLD", "SILVER", "GENERAL"].includes(g)) return g;
  const raw = String(rawGrade || grade || "");
  if (raw.includes("VVIP") || raw.includes("최고")) return "VVIP";
  if (raw.includes("플래티넘") || raw.includes("PLATINUM")) return "PLATINUM";
  if (raw.includes("골드") || raw.includes("GOLD")) return "GOLD";
  if (raw.includes("실버") || raw.includes("SILVER")) return "SILVER";
  return "GENERAL";
}

function normalizeCustomerForSupabase(c: any, index: number) {
  const id = String(c.id || c.imwebUid || c.loginId || `CUST-${index + 1}`).trim();
  
  // 1. 이름 누락 보정 (무명회원 또는 공백인 경우 이메일/로그인ID에서 지능적 추출)
  let name = String(c.name || "").trim();
  if (!name || name === "null" || name === "-" || name === "무명회원") {
    if (c.email && c.email.includes("@")) {
      name = c.email.split("@")[0];
    } else if (c.loginId) {
      name = c.loginId;
    } else {
      name = `고객_${index + 1}`;
    }
  }

  // 2. 전화번호 정규화 (하이픈 누락 시 자동 보충)
  const rawPhone = String(c.phone || "-").trim();
  const phone = formatPhoneNumber(rawPhone);

  // 3. 주소 통합 및 누락 보정
  const fullAddr = [c.address, c.detailAddress].filter((a) => a && a !== "-").join(" | ").trim();
  const address = fullAddr || (c.address && c.address !== "-" ? c.address : "-");

  // 4. 이메일 정규화
  const email = String(c.email || c.loginId || "-").trim().toLowerCase();

  return {
    id,
    name,
    email,
    phone,
    address,
    postcode: c.postcode || "",
    grade: normalizeGrade(c.grade, c.rawGrade),
    totalSpent: Number(c.totalSpent || 0),
    totalOrders: Number(c.totalOrders || 0),
    points: Number(c.points || 0),
    couponsCount: Number(c.couponsCount || 0),
    joinedDate: c.joinedDate || (c.created_at ? c.created_at.split("T")[0] : new Date().toISOString().split("T")[0]),
    status: c.status || "Active",
    role: c.role || (c.isAdmin ? "ADMIN" : "CUSTOMER"),
    isAdmin: Boolean(c.isAdmin),
    updated_at: new Date().toISOString(),
  };
}

// GET: 현재 동기화 단계 상태 조회 및 특정 단계 정보 미리보기 / 전수 분석
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stage = parseInt(url.searchParams.get("stage") || "1", 10);

  if (stage < 1 || stage > TOTAL_STAGES) {
    return NextResponse.json({
      success: false,
      error: `유효하지 않은 단계입니다. (1단계 ~ ${TOTAL_STAGES}단계 사이)`,
    }, { status: 400 });
  }

  const startIndex = (stage - 1) * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, TOTAL_CUSTOMERS);
  const targetSlice = (seedCustomers as any[]).slice(startIndex, endIndex);

  // 전수 조사 및 누락/결측치 분석
  let missingPhoneCount = 0;
  let missingAddressCount = 0;
  let buyersCount = 0;
  let totalSpentSum = 0;
  const samplesWithMissingPhone: any[] = [];
  const samplesWithMissingAddress: any[] = [];

  targetSlice.forEach((c, idx) => {
    const no = startIndex + idx + 1;
    const phone = String(c.phone || "").trim();
    const address = String(c.address || "").trim();
    const spent = Number(c.totalSpent || 0);

    if (!phone || phone === "-" || phone === "010-0000-0000") {
      missingPhoneCount++;
      if (samplesWithMissingPhone.length < 5) {
        samplesWithMissingPhone.push({ no, name: c.name, email: c.email });
      }
    }
    if (!address || address === "-") {
      missingAddressCount++;
      if (samplesWithMissingAddress.length < 5) {
        samplesWithMissingAddress.push({ no, name: c.name });
      }
    }
    if (spent > 0) {
      buyersCount++;
      totalSpentSum += spent;
    }
  });

  return NextResponse.json({
    success: true,
    stage,
    totalStages: TOTAL_STAGES,
    totalCustomers: TOTAL_CUSTOMERS,
    batchSize: BATCH_SIZE,
    startIndex: startIndex + 1,
    endIndex,
    count: targetSlice.length,
    inspection: {
      total: targetSlice.length,
      missingNameCount: 0,
      missingPhoneCount,
      missingAddressCount,
      buyersCount,
      totalSpentSum,
      samplesWithMissingPhone,
      samplesWithMissingAddress,
    },
    firstCustomer: targetSlice[0] ? {
      no: startIndex + 1,
      name: targetSlice[0].name,
      email: targetSlice[0].email,
      phone: targetSlice[0].phone,
      grade: targetSlice[0].grade,
      totalSpent: targetSlice[0].totalSpent,
    } : null,
    middleCustomer: targetSlice[Math.floor(targetSlice.length / 2)] ? {
      no: startIndex + Math.floor(targetSlice.length / 2) + 1,
      name: targetSlice[Math.floor(targetSlice.length / 2)].name,
      email: targetSlice[Math.floor(targetSlice.length / 2)].email,
      phone: targetSlice[Math.floor(targetSlice.length / 2)].phone,
    } : null,
    lastCustomer: targetSlice[targetSlice.length - 1] ? {
      no: endIndex,
      name: targetSlice[targetSlice.length - 1].name,
      email: targetSlice[targetSlice.length - 1].email,
      phone: targetSlice[targetSlice.length - 1].phone,
      grade: targetSlice[targetSlice.length - 1].grade,
      totalSpent: targetSlice[targetSlice.length - 1].totalSpent,
    } : null,
  });
}

// POST: 특정 단계(500명)를 Supabase로 안전하게 전송 (Upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const stage = parseInt(body.stage || "1", 10);

    if (stage < 1 || stage > TOTAL_STAGES) {
      return NextResponse.json({
        success: false,
        error: `유효하지 않은 단계입니다. (1단계 ~ ${TOTAL_STAGES}단계 사이)`,
      }, { status: 400 });
    }

    const startIndex = (stage - 1) * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, TOTAL_CUSTOMERS);
    const targetSlice = (seedCustomers as any[]).slice(startIndex, endIndex);

    const supabaseRows = targetSlice.map((c, idx) => normalizeCustomerForSupabase(c, startIndex + idx));

    // Supabase로 100건씩 분할 upsert (타임아웃 방지)
    const SUB_CHUNK_SIZE = 100;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < supabaseRows.length; i += SUB_CHUNK_SIZE) {
      const chunk = supabaseRows.slice(i, i + SUB_CHUNK_SIZE);
      const res = await runSafeSupabaseQuery(
        async (supabase) => supabase.from("customers").upsert(chunk, { onConflict: "id" }),
        5000
      );
      if (res.error) {
        errors.push(`Chunk ${Math.floor(i / SUB_CHUNK_SIZE) + 1} Error: ${res.error.message || String(res.error)}`);
      } else {
        successCount += chunk.length;
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      stage,
      totalStages: TOTAL_STAGES,
      startIndex: startIndex + 1,
      endIndex,
      requestedCount: targetSlice.length,
      successCount,
      errors: errors.length > 0 ? errors : undefined,
      firstCustomer: supabaseRows[0],
      middleCustomer: supabaseRows[Math.floor(supabaseRows.length / 2)],
      lastCustomer: supabaseRows[supabaseRows.length - 1],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
