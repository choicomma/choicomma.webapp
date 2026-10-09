export interface PopupConfig {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  showOnHome: boolean;
  showOnMembership: boolean;
  hideForTodayEnabled: boolean;
  popupType?: "IMAGE" | "NOTICE";
  noticeMessage?: string;
  noticePeriod?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  id: "global_mall_notice_20261012",
  title: "초이콤마 글로벌 몰 오픈 준비 및 서비스 일시 이용 불가 안내",
  subtitle: "GLOBAL STORE LAUNCH & TEMPORARY SERVICE UNAVAILABILITY NOTICE",
  imageUrl: "",
  linkUrl: "",
  isActive: true,
  showOnHome: true,
  showOnMembership: false,
  hideForTodayEnabled: true,
  popupType: "NOTICE",
  noticeMessage: "초이콤마 글로벌 몰 공식 런칭 준비로 현재 서비스 이용을 하실 수 없습니다. 신속히 정상화할 수 있도록 하겠습니다.",
  noticePeriod: "2026.10.12일까지",
  description: "현재 해외 글로벌 고객님들과 함께하기 위한 초이콤마 글로벌 몰 공식 런칭 및 인프라 연동 작업이 집중 진행되고 있습니다.\n이로 인해 작업 기간 동안 일시적으로 쇼핑몰 서비스 이용 및 사이트 접속을 하실 수 없습니다.\n고객님들의 쾌적하고 안전한 쇼핑을 위해 2026년 10월 12일까지 모든 작업을 완료하여 신속히 정상화하겠습니다.",
  createdAt: "2026-10-09",
  updatedAt: "2026-10-09",
};

export const POPUP_STORAGE_KEY = "admin_popup_config";
export const POPUP_HIDE_UNTIL_KEY = "choicomma_hide_home_popup_until";
export const POPUP_UPDATED_EVENT = "admin_popup_config_updated";

export function getLocalPopupConfig(): PopupConfig {
  if (typeof window === "undefined") return DEFAULT_POPUP_CONFIG;
  try {
    const raw = localStorage.getItem(POPUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_POPUP_CONFIG,
          ...parsed,
        };
      }
    }
  } catch (e) {}
  return DEFAULT_POPUP_CONFIG;
}

export function saveLocalPopupConfig(config: PopupConfig): void {
  if (typeof window === "undefined") return;
  try {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(POPUP_UPDATED_EVENT, { detail: updated }));
    window.dispatchEvent(new CustomEvent("storage"));
  } catch (e) {}
}
