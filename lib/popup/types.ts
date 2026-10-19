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

export const EMPTY_POPUP_CONFIG: PopupConfig = {
  id: "",
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  isActive: false,
  showOnHome: false,
  showOnMembership: false,
  hideForTodayEnabled: false,
  popupType: "NOTICE",
  noticeMessage: "",
  noticePeriod: "",
  description: "",
  createdAt: "",
  updatedAt: "",
};

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  ...EMPTY_POPUP_CONFIG,
};

export const POPUP_STORAGE_KEY = "admin_popup_config";
export const POPUP_HIDE_UNTIL_KEY = "choicomma_hide_home_popup_until";
export const POPUP_UPDATED_EVENT = "admin_popup_config_updated";

export function getLocalPopupConfig(): PopupConfig {
  if (typeof window === "undefined") return EMPTY_POPUP_CONFIG;
  try {
    const raw = localStorage.getItem(POPUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...EMPTY_POPUP_CONFIG,
          ...parsed,
        };
      }
    }
  } catch (e) {}
  return EMPTY_POPUP_CONFIG;
}

export function saveLocalPopupConfig(config: PopupConfig): void {
  if (typeof window === "undefined") return;
  try {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(updated));
    // 배포 시 기존에 설정되어 있던 '오늘 하루 열지 않기' 임시 플래그를 초기화하여 즉시 확인 가능하도록 보장
    localStorage.removeItem(POPUP_HIDE_UNTIL_KEY);
    localStorage.removeItem("choicomma_popup_hide_set_at");
    const popupId = config.id || "default";
    localStorage.removeItem(`choicomma_hide_home_popup_${popupId}_until`);
    window.dispatchEvent(new CustomEvent(POPUP_UPDATED_EVENT, { detail: updated }));
    window.dispatchEvent(new CustomEvent("storage"));
  } catch (e) {}
}
