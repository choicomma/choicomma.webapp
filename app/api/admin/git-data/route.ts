import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DataFileInfo {
  key: string;
  name: string;
  filename: string;
  description: string;
  exists: boolean;
  recordCount: number;
  sizeBytes: number;
  lastModified: string | null;
  status: "HEALTHY" | "EMPTY" | "MISSING";
}

const DATA_REGISTRY: { key: string; name: string; filename: string; description: string; countExtractor?: (data: any) => number }[] = [
  {
    key: "products",
    name: "상품 카탈로그",
    filename: "products-cache.json",
    description: "전체 50개 상품 마스터, 옵션, 재고, 대표 이미지",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "site_settings",
    name: "사이트 운영 설정",
    filename: "site-settings.json",
    description: "CJ대한통운 계약정보, 배송비 정책, 이벤트 팝업 설정",
    countExtractor: (d) => typeof d === "object" && d ? Object.keys(d).length : 0,
  },
  {
    key: "orders",
    name: "주문 원장",
    filename: "orders.json",
    description: "고객 주문 마스터 내역, 결제 금액, 배송지 정보",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "shipments",
    name: "배송 및 송장 원장",
    filename: "shipments.json",
    description: "CJ대한통운 12자리 운송장 번호, 배송 상태, 합배송 정보",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "customers",
    name: "회원 및 계정 마스터",
    filename: "customers.json",
    description: "최고 관리자(ADMIN-001) 및 일반 회원 계정, 등급, 적립금",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "coupons",
    name: "쿠폰 마스터",
    filename: "coupons.json",
    description: "관리자 발행 쿠폰 마스터 및 할인 정책",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "inquiries",
    name: "1:1 고객 문의",
    filename: "inquiries.json",
    description: "고객 문의글, 첨부 이미지, 관리자 답변 내역",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "inbound_schedules",
    name: "물류센터 입고 일정",
    filename: "inbound-schedules.json",
    description: "입고 예정 일정, 거래처, 물류창고 할당 정보",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "timesales",
    name: "타임세일 & 시크릿 세일",
    filename: "timesales.json",
    description: "타임세일 및 VIP 시크릿 프로모션 설정",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "payment_logs",
    name: "결제 트랜잭션 로그",
    filename: "payment-logs.json",
    description: "토스페이먼츠 승인/취소 트랜잭션 영구 기록",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "chat_sessions",
    name: "실시간 상담 세션",
    filename: "chat-sessions.json",
    description: "실시간 고객 상담 세션 목록 및 활성 상태",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
  {
    key: "chat_messages",
    name: "실시간 상담 메시지",
    filename: "chat-messages.json",
    description: "세션별 송수신 실시간 상담 대화록",
    countExtractor: (d) => Array.isArray(d) ? d.length : 0,
  },
];

function safeAtomicWriteJsonFile(targetPath: string, data: any) {
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
}

function cleanupScratchFiles(dataDir: string) {
  const scratchPath = path.join(dataDir, "scratch-audit.js");
  if (fs.existsSync(scratchPath)) {
    try {
      fs.unlinkSync(scratchPath);
    } catch {}
  }

  // Clean up temporary pre-migration raw cache backups
  try {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (file.startsWith("products-cache.backup.")) {
        fs.unlinkSync(path.join(dataDir, file));
      }
    }
  } catch {}
}

// GET: 원장 상태 진단 및 일괄 백업 추출
export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");
    const dataDir = path.join(process.cwd(), "data");

    // Clean up temporary scratch file if present
    cleanupScratchFiles(dataDir);

    // Action: download - Export single data file
    const targetKey = req.nextUrl.searchParams.get("key");
    if (action === "download" && targetKey) {
      const item = DATA_REGISTRY.find((d) => d.key === targetKey || d.filename === targetKey);
      if (item) {
        const filePath = path.join(dataDir, item.filename);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          return new NextResponse(content, {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="${item.filename}"`,
            },
          });
        }
      }
      return NextResponse.json({ success: false, error: "요청하신 원장 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    // Action: backup - Export all data as a single JSON bundle
    if (action === "backup") {
      const bundle: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        storageType: "Git JSON (No Supabase)",
        files: {},
      };

      for (const item of DATA_REGISTRY) {
        const filePath = path.join(dataDir, item.filename);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            bundle.files[item.key] = JSON.parse(content);
          } catch (e) {
            bundle.files[item.key] = null;
          }
        }
      }

      return new NextResponse(JSON.stringify(bundle, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="choicomma-backup-${Date.now()}.json"`,
        },
      });
    }

    // Default: Return status of all Git data files
    const fileStats: DataFileInfo[] = [];
    let totalSizeBytes = 0;
    let healthyCount = 0;

    for (const item of DATA_REGISTRY) {
      const filePath = path.join(dataDir, item.filename);
      let exists = false;
      let recordCount = 0;
      let sizeBytes = 0;
      let lastModified: string | null = null;
      let status: "HEALTHY" | "EMPTY" | "MISSING" = "MISSING";

      if (fs.existsSync(filePath)) {
        exists = true;
        const stat = fs.statSync(filePath);
        sizeBytes = stat.size;
        totalSizeBytes += sizeBytes;
        lastModified = stat.mtime.toISOString();

        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(raw);
          recordCount = item.countExtractor ? item.countExtractor(parsed) : (Array.isArray(parsed) ? parsed.length : 1);
          status = recordCount > 0 || (Array.isArray(parsed) && parsed.length === 0) || (typeof parsed === "object") ? "HEALTHY" : "EMPTY";
          healthyCount++;
        } catch {
          status = "EMPTY";
        }
      }

      fileStats.push({
        key: item.key,
        name: item.name,
        filename: item.filename,
        description: item.description,
        exists,
        recordCount,
        sizeBytes,
        lastModified,
        status,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: DATA_REGISTRY.length,
        existingFiles: fileStats.filter((f) => f.exists).length,
        healthyFiles: healthyCount,
        totalSizeBytes,
        formattedTotalSize: (totalSizeBytes / 1024).toFixed(1) + " KB",
        engine: "Git JSON (Zero Supabase Dependency)",
      },
      files: fileStats,
    });
  } catch (error: any) {
    console.error("[Git Data API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 백업 파일로부터 12개 원장 일괄 복원(Restore)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataDir = path.join(process.cwd(), "data");

    // Clean up temporary scratch file if present
    cleanupScratchFiles(dataDir);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 백업 데이터 형식입니다." },
        { status: 400 }
      );
    }

    // Determine payload files (bundle or raw map)
    const filesToRestore = body.files && typeof body.files === "object" ? body.files : body;
    const restoredKeys: string[] = [];
    const restoredFiles: string[] = [];

    for (const item of DATA_REGISTRY) {
      const candidateData = filesToRestore[item.key] ?? filesToRestore[item.filename];
      if (candidateData !== undefined && candidateData !== null) {
        const targetPath = path.join(dataDir, item.filename);
        safeAtomicWriteJsonFile(targetPath, candidateData);
        restoredKeys.push(item.key);
        restoredFiles.push(item.filename);
      }
    }

    if (restoredKeys.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "복원 가능한 유효한 원장 데이터(products, orders 등 12개 키)를 찾지 못했습니다.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `총 ${restoredKeys.length}개 원장이 성공적으로 복원되었습니다.`,
      restoredCount: restoredKeys.length,
      restoredKeys,
      restoredFiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Git Data Restore Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
