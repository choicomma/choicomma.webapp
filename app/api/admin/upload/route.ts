import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getUploadsDir(): string {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Case 1: multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const rawExt = path.extname(file.name || "") || ".webp";
      const ext = rawExt.toLowerCase().match(/\.(jpe?g|png|webp|gif|svg)$/) ? rawExt.toLowerCase() : ".webp";
      const baseName = path.basename(file.name || "upload", rawExt).replace(/[^a-zA-Z0-9가-힣_-]/g, "").slice(0, 30);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName || "img"}${ext}`;

      const uploadsDir = getUploadsDir();
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${fileName}`;
      return NextResponse.json({ success: true, url: publicUrl });
    }

    // Case 2: application/json with base64 dataUrl
    const body = await req.json();
    const dataUrl = body?.base64 || body?.dataUrl || "";
    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ success: false, error: "No image data provided" }, { status: 400 });
    }

    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ success: false, error: "Invalid dataUrl format" }, { status: 400 });
    }

    let ext = `.${match[1].toLowerCase()}`;
    if (ext === ".jpeg") ext = ".jpg";
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    const hint = String(body?.filename || body?.name || "cut").replace(/[^a-zA-Z0-9가-힣_-]/g, "").slice(0, 30);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${hint || "cut"}${ext}`;

    const uploadsDir = getUploadsDir();
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("[Upload API Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
