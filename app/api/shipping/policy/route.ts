import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DEFAULT_POLICY = {
  baseFee: 4000,
  freeThreshold: 100000,
  freeShippingThreshold: 100000,
  islandExtraFee: 4000,
  returnExchangeFee: 8000,
  courierName: "CJ대한통운 (주계약)",
  shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
};

const globalForPolicy = global as unknown as { serverShippingPolicy?: typeof DEFAULT_POLICY };

function getPolicyFilePath() {
  return path.join(process.cwd(), "lib", "shipping", "shipping-policy.json");
}

function loadSavedPolicy(): typeof DEFAULT_POLICY {
  if (globalForPolicy.serverShippingPolicy) {
    return globalForPolicy.serverShippingPolicy;
  }
  const filePath = getPolicyFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.baseFee === "number") {
        const merged = { ...DEFAULT_POLICY, ...parsed };
        globalForPolicy.serverShippingPolicy = merged;
        return merged;
      }
    } catch {}
  }
  const fallback = { ...DEFAULT_POLICY };
  globalForPolicy.serverShippingPolicy = fallback;
  return fallback;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Rate limiter map to break infinite client loops (e.g. storage event ping-pong)
const lastPolicyHitMap = new Map<string, number>();

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || "unknown";
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  const clientKey = `${clientIp}:${referer}`;
  const now = Date.now();
  const lastHit = lastPolicyHitMap.get(clientKey) || 0;

  // If a client page (e.g. /membership) requests faster than 2.5s, throttle to break recursive client loops
  if (referer.includes("/membership") && now - lastHit < 2500) {
    return NextResponse.json({ throttled: true, message: "Loop breaker throttle" }, { status: 429 });
  }
  lastPolicyHitMap.set(clientKey, now);

  const policy = loadSavedPolicy();
  if (referer.includes("/membership")) {
    return NextResponse.json(
      {
        success: true,
        policy,
        shippingPolicy: policy,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  return NextResponse.json(policy, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = {
      ...DEFAULT_POLICY,
      ...body,
      baseFee: Number(body.baseFee) || DEFAULT_POLICY.baseFee,
      freeShippingThreshold: Number(body.freeShippingThreshold) ?? DEFAULT_POLICY.freeShippingThreshold,
      islandExtraFee: Number(body.islandExtraFee) ?? DEFAULT_POLICY.islandExtraFee,
      returnExchangeFee: Number(body.returnExchangeFee) ?? DEFAULT_POLICY.returnExchangeFee,
    };

    globalForPolicy.serverShippingPolicy = updated;

    const filePath = getPolicyFilePath();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    } catch (fsErr) {
      console.warn("Notice: could not write policy to disk (serverless):", fsErr);
    }

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
