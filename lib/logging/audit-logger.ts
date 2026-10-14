import { recordAdminAudit, AdminAuditLogItem, AuditActionType, AuditDomainType } from "./activity-store";

export interface LogAdminActivityParams {
  adminId?: string;
  adminName?: string;
  actionType: AuditActionType;
  domain: AuditDomainType;
  targetId: string | number;
  targetName: string;
  description: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  ipAddress?: string;
}

/**
 * 관리자 작업 감사 로그 기록 공통 헬퍼
 * API 엔드포인트나 서버 핸들러에서 1줄로 호출하여 안전하게 기록을 남깁니다.
 *
 * @example
 * await logAdminActivity({
 *   adminId: "admin_master",
 *   adminName: "총괄 관리자",
 *   actionType: "UPDATE",
 *   domain: "PRODUCT",
 *   targetId: product.id,
 *   targetName: product.title,
 *   description: "상품 판매 가격 189,000원 -> 168,000원 수정",
 *   beforeData: { price: 189000 },
 *   afterData: { price: 168000 },
 * });
 */
export async function logAdminActivity(params: LogAdminActivityParams): Promise<AdminAuditLogItem> {
  try {
    return await recordAdminAudit({
      adminId: params.adminId || "admin_master",
      adminName: params.adminName || "총괄 관리자",
      actionType: params.actionType,
      domain: params.domain,
      targetId: String(params.targetId),
      targetName: params.targetName,
      description: params.description,
      beforeData: params.beforeData,
      afterData: params.afterData,
      ipAddress: params.ipAddress || "",
    });
  } catch (err) {
    console.error("❌ Failed to log admin activity:", err);
    // 로그 실패로 인해 메인 비즈니스 로직이 중단되지 않도록 방어 반환
    return {
      id: `err_${Date.now()}`,
      adminId: params.adminId || "admin_master",
      adminName: params.adminName || "총괄 관리자",
      actionType: params.actionType,
      domain: params.domain,
      targetId: String(params.targetId),
      targetName: params.targetName,
      description: params.description,
      ipAddress: params.ipAddress || "",
      timestamp: new Date().toISOString(),
    };
  }
}
