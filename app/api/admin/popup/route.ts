import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { DEFAULT_POPUP_CONFIG, PopupConfig } from "@/lib/popup/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: 팝업 설정 불러오기
export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, config: DEFAULT_POPUP_CONFIG, fallback: true });
    }

    const { data, error } = await supabaseServer
      .from("site_settings")
      .select("value")
      .eq("key", "popup_config")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (data && data.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      return NextResponse.json({
        success: true,
        config: { ...DEFAULT_POPUP_CONFIG, ...parsed },
      });
    }

    return NextResponse.json({ success: true, config: DEFAULT_POPUP_CONFIG });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: 팝업 설정 저장/동기화하기
export async function POST(req: NextRequest) {
  try {
    const body: PopupConfig = await req.json();
    if (!body) {
      return NextResponse.json({ success: false, error: "설정 데이터가 누락되었습니다." }, { status: 400 });
    }

    const updatedConfig: PopupConfig = {
      ...DEFAULT_POPUP_CONFIG,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseServer
        .from("site_settings")
        .upsert(
          [
            {
              key: "popup_config",
              value: updatedConfig,
              description: "홈화면 및 멤버십 페이지 팝업 배너 설정",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "key" }
        )
        .select();

      if (error) {
        console.error("Supabase popup_config update error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, config: updatedConfig });
    }

    return NextResponse.json({ success: true, config: updatedConfig, fallback: true });
  } catch (err: any) {
    console.error("API /api/admin/popup error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
