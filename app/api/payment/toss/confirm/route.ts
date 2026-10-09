import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getPaymentLogsFilePath() {
  return path.join(process.cwd(), "data", "payment-logs.json");
}

function readPaymentLogs(): any[] {
  try {
    const filePath = getPaymentLogsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Payment Logs Read Warning]:", err);
  }
  return [];
}

function writePaymentLogs(logs: any[]) {
  try {
    const targetPath = getPaymentLogsFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(logs, null, 2);
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
    console.error("[Payment Logs Write Error]:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { message: "결제 요청 필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const secretKey =
      process.env.TOSS_SECRET_KEY && !process.env.TOSS_SECRET_KEY.includes("docs_")
        ? process.env.TOSS_SECRET_KEY
        : "live_sk_EP59LybZ8BzymnjAKw2k86GYo7pR";
    const basicAuthToken = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "토스페이먼츠 결제 승인에 실패하였습니다." },
        { status: response.status }
      );
    }

    // Git payment-logs.json 파일에 결제 승인 로그 영속 저장
    try {
      const logs = readPaymentLogs();
      const newLog = {
        id: `PAY-${orderId}-${Date.now().toString().slice(-4)}`,
        orderId: orderId,
        paymentKey: paymentKey,
        amount: Number(amount),
        status: data.status || "DONE",
        method: data.method || "간편결제",
        approvedAt: data.approvedAt || new Date().toISOString(),
        rawResponse: data,
        created_at: new Date().toISOString(),
      };
      const existingIdx = logs.findIndex((l) => l.paymentKey === paymentKey);
      if (existingIdx !== -1) {
        logs[existingIdx] = { ...logs[existingIdx], ...newLog };
      } else {
        logs.unshift(newLog);
      }
      writePaymentLogs(logs);
    } catch (logErr) {
      console.warn("Notice: Failed to insert payment_log into Git JSON:", logErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Toss Payments Confirmation Error:", error);
    return NextResponse.json(
      { message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
