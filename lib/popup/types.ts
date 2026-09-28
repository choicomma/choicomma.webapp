export interface PopupConfig {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  showOnHome: boolean;
  showOnMembership: boolean;
  hideForTodayEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  id: "main_popup_001",
  title: "초이콤마 시즌 스페셜 이벤트",
  imageUrl: "",
  linkUrl: "/shop",
  isActive: false,
  showOnHome: true,
  showOnMembership: true,
  hideForTodayEnabled: true,
  createdAt: "2026-09-28",
  updatedAt: "2026-09-28",
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
