import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";

// Fallback in-memory cache for serverless environments with read-only filesystems
const globalForShipments = global as unknown as { serverShipmentsCache?: any[] };

function getShipmentsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "shipments-data.json");
}

// GET: Return authoritative server-stored shipments to any client (PC, Mobile, Deployed App)
export async function GET() {
  try {
    // 1. Check in-memory cache if available
    if (globalForShipments.serverShipmentsCache && Array.isArray(globalForShipments.serverShipmentsCache)) {
      return NextResponse.json(globalForShipments.serverShipmentsCache, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    // 2. Read from disk
    const filePath = getShipmentsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        globalForShipments.serverShipmentsCache = data;
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });
      }
    }

    // 3. Fallback to default mock data
    globalForShipments.serverShipmentsCache = initialShipments;
    return NextResponse.json(initialShipments, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
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

// POST: Save and persist updated shipments directly into the server file & memory cache
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

    // 1. Update in-memory cache immediately
    globalForShipments.serverShipmentsCache = shipments;

    // 2. Persist to disk
    try {
      const filePath = getShipmentsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(shipments, null, 2), "utf-8");
    } catch (fsErr: any) {
      console.warn("Notice: Server filesystem is read-only or not writable (e.g. Serverless). In-memory cache updated:", fsErr.message);
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
