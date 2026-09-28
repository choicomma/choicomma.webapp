import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch all customers from Supabase
export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: false, customers: [] });
    }

    const { data, error } = await supabaseServer
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customers: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Register or sync customer to Supabase with service role key
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id || !body.name) {
      return NextResponse.json(
        { success: false, error: "회원 고유 식별자(id)와 성명(name)은 필수입니다." },
        { status: 400 }
      );
    }

    // Supabase customers 테이블에 실제로 존재하는 컬럼만 선별하여 전송
    const cleanCustomer = {
      id: String(body.id).trim(),
      name: String(body.name).trim(),
      email: String(body.email || "-").trim().toLowerCase(),
      phone: String(body.phone || "-").trim(),
      address: String(body.address || "-").trim(),
      grade: String(body.grade || "GENERAL").toUpperCase(),
      totalSpent: Number(body.totalSpent || 0),
      points: Number(body.points || 0),
      couponsCount: Number(body.couponsCount || 0),
      joinedDate: body.joinedDate || new Date().toISOString().split("T")[0],
      status: body.status || "Active",
      role: body.role || "CUSTOMER",
      isAdmin: Boolean(body.isAdmin),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseServer
        .from("customers")
        .upsert([cleanCustomer], { onConflict: "id" })
        .select();

      if (error) {
        console.error("Supabase server customer upsert error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, customer: data?.[0] || cleanCustomer });
    }

    return NextResponse.json({ success: true, customer: cleanCustomer, localOnly: true });
  } catch (err: any) {
    console.error("API /api/admin/customers error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
