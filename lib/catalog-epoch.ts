/**
 * 상품 카탈로그 "세대 번호".
 *
 * 브라우저(방문자/관리자)에는 예전 상품 목록이 localStorage 에 남아 있을 수 있다.
 * 이 값을 바꿔서 배포하면, 각 브라우저는 처음 접속할 때 한 번만 아래 옛 캐시를 지우고
 * 서버(배포된 data/products-cache.json)의 새 데이터만 사용한다.
 *
 * 옛 데이터를 한 번 더 완전히 지우고 싶을 때는 이 값을 새 문자열로 바꿔서 배포하면 된다.
 */
export const CATALOG_EPOCH = "2026-10-20-active-fix";

// 세대가 바뀔 때 지우는 상품 관련 브라우저 캐시 키 (장바구니/로그인/주문/채팅 등은 건드리지 않는다)
export const CATALOG_CACHE_KEYS_TO_PURGE = [
  "admin_products",
  "admin_deleted_product_ids",
  "admin_custom_products",
  "admin_products_sync_pending",
  "secret_timesale_product_ids",
  "secret_timesale_item_settings",
];

export const CATALOG_EPOCH_STORAGE_KEY = "catalog_epoch";

