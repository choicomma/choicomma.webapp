import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";
import { supabaseServer } from "@/lib/supabase/server";

// Fallback in-memory cache for serverless environments
const globalForShipments = global as unknown as { serverShipmentsCache?: any[] };

function getShipmentsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "shipments-data.json");
}

// GET: Return authoritative server-stored shipments to any client (PC, Mobile, Deployed App)
export async function GET() {
  try {
    // 1. Primary Source of Truth: Supabase PostgreSQL DB
    const { data: dbShipments, error: dbError } = await supabaseServer
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbError && Array.isArray(dbShipments) && dbShipments.length > 0) {
      globalForShipments.serverShipmentsCache = dbShipments;
      return NextResponse.json(dbShipments, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    if (dbError) {
      console.warn("Notice: Supabase fetch error or table not yet initialized, falling back to cache/disk:", dbError.message);
    }

    // 2. Fallback: In-memory cache
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      return NextResponse.json(globalForShipments.serverShipmentsCache, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // 3. Fallback: Local JSON file
    const filePath = getShipmentsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        globalForShipments.serverShipmentsCache = data;
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }
    }

    // 4. Default Fallback
    globalForShipments.serverShipmentsCache = initialShipments;
    return NextResponse.json(initialShipments, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("Failed to read server shipments:", error);
    return NextResponse.json(initialShipments || [], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}

// POST: Save and persist updated shipments directly into Supabase and local cache
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const shipments = Array.isArray(payload) ? payload : payload?.shipments;

    if (!Array.isArray(shipments)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 1. Primary: Save to Supabase (Upsert)
    try {
      const { error: dbError } = await supabaseServer
        .from("shipments")
        .upsert(shipments, { onConflict: "id" });

      if (dbError) {
        console.warn("Notice: Failed to upsert shipments to Supabase:", dbError.message);
      }
    } catch (dbErr: any) {
      console.warn("Supabase upsert exception:", dbErr.message);
    }

    // 2. In-memory cache update
    globalForShipments.serverShipmentsCache = shipments;

    // 3. Persist to disk (if writable environment e.g. local dev)
    try {
      const filePath = getShipmentsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(shipments, null, 2), "utf-8");
    } catch (fsErr: any) {
      // Ignored in read-only serverless environment
    }

    return NextResponse.json(
      { success: true, count: shipments.length, data: shipments },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to save server shipments:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 데이터 저장 실패" },
      { status: 500 }
    );
  }
}
