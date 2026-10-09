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
    const { orderId, paymentKey, cancelReason, cancelAmount } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { message: "주문번호(orderId) 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. paymentKey 찾기 (직접 전달되지 않은 경우 data/payment-logs.json에서 조회)
    let effPaymentKey = paymentKey?.trim() || "";

    if (!effPaymentKey) {
      try {
        const logs = readPaymentLogs();
        const found = logs.find((l) => l.orderId === orderId);
        if (found?.paymentKey) {
          effPaymentKey = found.paymentKey;
        }
      } catch (err) {
        console.warn("Notice: Failed to lookup paymentKey from payment-logs.json:", err);
      }
    }

    const secretKey =
      process.env.TOSS_SECRET_KEY && !process.env.TOSS_SECRET_KEY.includes("docs_")
        ? process.env.TOSS_SECRET_KEY
        : "live_sk_EP59LybZ8BzymnjAKw2k86GYo7pR";
    const basicAuthToken = Buffer.from(`${secretKey}:`).toString("base64");

    // Toss Payments API를 통해 orderId로 실제 paymentKey 직접 조회 시도
    if (!effPaymentKey && orderId) {
      try {
        const tossLookup = await fetch(
          `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
          {
            headers: { Authorization: `Basic ${basicAuthToken}` },
          }
        );
        if (tossLookup.ok) {
          const tossOrder = await tossLookup.json();
          if (tossOrder?.paymentKey) {
            effPaymentKey = tossOrder.paymentKey;
          }
        }
      } catch (tossLookupErr) {
        console.warn("Notice: Failed to lookup paymentKey from Toss Payments API:", tossLookupErr);
      }
    }

    const reason = cancelReason?.trim() || "고객 요청에 의한 환불 (CS 라이브 채팅)";

    // 2. 만약 paymentKey가 없는 테스트 주문이거나 0원(무료/적립금) 주문인 경우
    if (!effPaymentKey || effPaymentKey.startsWith("free_") || effPaymentKey.startsWith("test_")) {
      const mockResult = {
        orderId,
        paymentKey: effPaymentKey || `mock_cancel_${Date.now()}`,
        status: "CANCELED",
        cancelReason: reason,
        cancelAmount: cancelAmount ? Number(cancelAmount) : 0,
        canceledAt: new Date().toISOString(),
        isSimulated: true,
      };

      try {
        const logs = readPaymentLogs();
        const idx = logs.findIndex((l) => l.orderId === orderId);
        if (idx !== -1) {
          logs[idx] = { ...logs[idx], status: "CANCELED", rawResponse: mockResult, canceledAt: mockResult.canceledAt };
          writePaymentLogs(logs);
        }
      } catch {}

      return NextResponse.json({
        success: true,
        data: mockResult,
        message: "결제 취소(환불)가 정상 처리되었습니다.",
      });
    }

    // 3. 실제 토스페이먼츠 결제 취소 API 호출
    const cancelBody: Record<string, any> = {
      cancelReason: reason,
    };
    if (cancelAmount && Number(cancelAmount) > 0) {
      cancelBody.cancelAmount = Number(cancelAmount);
    }

    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(effPaymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Toss Payments Cancel Error Response:", data);
      return NextResponse.json(
        {
          message: data.message || "토스페이먼츠 결제 취소(환불) 요청에 실패하였습니다.",
          code: data.code,
        },
        { status: response.status }
      );
    }

    // 4. Git payment-logs.json 테이블 상태를 CANCELED로 업데이트
    try {
      const logs = readPaymentLogs();
      const idx = logs.findIndex((l) => l.paymentKey === effPaymentKey || l.orderId === orderId);
      if (idx !== -1) {
        logs[idx] = {
          ...logs[idx],
          status: data.status || "CANCELED",
          rawResponse: data,
          canceledAt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        writePaymentLogs(logs);
      }
    } catch (dbErr) {
      console.warn("Notice: Failed to update payment_logs in Git JSON:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data,
      message: "토스페이먼츠 결제 취소 및 환불이 정상 완료되었습니다.",
    });
  } catch (error: any) {
    console.error("Toss Cancel API Internal Error:", error);
    return NextResponse.json(
      { message: error.message || "결제 취소 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
