import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PasswordResetRecord {
  token: string;
  customerId: string;
  email: string;
  name?: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1시간 (1 Hour)

function getTokensFilePath(): string {
  return path.join(process.cwd(), "data", "password-resets.json");
}

function readTokensFile(): PasswordResetRecord[] {
  try {
    const filePath = getTokensFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Password Resets Token Read Warning]:", err);
  }
  return [];
}

function writeTokensFile(data: PasswordResetRecord[]): void {
  try {
    const filePath = getTokensFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, filePath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(filePath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error("[Password Resets Token Write Error]:", err);
  }
}

/**
 * 신규 비밀번호 재설정 토큰 발급 (기존 미사용 토큰은 자동 무효화)
 */
export function createPasswordResetToken(
  customerId: string,
  email: string,
  name?: string
): PasswordResetRecord {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString();

  const record: PasswordResetRecord = {
    token,
    customerId: String(customerId).trim(),
    email: String(email).trim().toLowerCase(),
    name: name ? String(name).trim() : undefined,
    createdAt: now.toISOString(),
    expiresAt,
    used: false,
  };

  const records = readTokensFile();

  // 기존 동일 고객의 미사용 토큰들은 무효화(used: true) 처리
  const updatedRecords = records.map((r) => {
    if (
      !r.used &&
      (r.customerId === record.customerId || r.email.toLowerCase() === record.email.toLowerCase())
    ) {
      return { ...r, used: true };
    }
    return r;
  });

  // 7일 이상 지난 만료 토큰 정리
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filteredRecords = updatedRecords.filter((r) => {
    return new Date(r.createdAt).getTime() > sevenDaysAgo;
  });

  filteredRecords.push(record);
  writeTokensFile(filteredRecords);

  return record;
}

/**
 * 비밀번호 재설정 토큰 유효성 검증
 */
export function verifyPasswordResetToken(token: string): {
  valid: boolean;
  record?: PasswordResetRecord;
  reason?: "not_found" | "already_used" | "expired";
} {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "not_found" };
  }

  const records = readTokensFile();
  const record = records.find((r) => r.token === token.trim());

  if (!record) {
    return { valid: false, reason: "not_found" };
  }

  if (record.used) {
    return { valid: false, record, reason: "already_used" };
  }

  const now = Date.now();
  const expiryTime = new Date(record.expiresAt).getTime();
  if (now > expiryTime) {
    return { valid: false, record, reason: "expired" };
  }

  return { valid: true, record };
}

/**
 * 비밀번호 재설정 토큰 사용 처리
 */
export function markTokenAsUsed(token: string): boolean {
  if (!token) return false;
  const records = readTokensFile();
  let updated = false;

  const newRecords = records.map((r) => {
    if (r.token === token.trim()) {
      updated = true;
      return { ...r, used: true };
    }
    return r;
  });

  if (updated) {
    writeTokensFile(newRecords);
  }
  return updated;
}
