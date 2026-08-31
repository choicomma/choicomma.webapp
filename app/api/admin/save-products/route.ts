import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const products = await req.json();
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "올바른 배열 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "lib", "sfcc", "mock", "parsed-products.json");
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: products.length });
  } catch (error: any) {
    console.error("Failed to save parsed-products.json to disk:", error);
    return NextResponse.json(
      { success: false, message: error.message || "서버 파일 저장 실패" },
      { status: 500 }
    );
  }
}
