import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getProductsFilePath() {
  return path.join(process.cwd(), "lib", "sfcc", "mock", "parsed-products.json");
}

// GET: Return the authoritative server-stored products catalog to any client (PC, Mobile)
export async function GET() {
  try {
    const filePath = getProductsFilePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Failed to read server products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to read products" },
      { status: 500 }
    );
  }
}

// POST: Save and persist updated products list from Admin directly into the server file
export async function POST(req: NextRequest) {
  try {
    const products = await req.json();
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const filePath = getProductsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: products.length }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Failed to save parsed-products.json to disk:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 파일 저장 실패" },
      { status: 500 }
    );
  }
}
