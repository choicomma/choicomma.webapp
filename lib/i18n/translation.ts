"use client";

import React, { useState, useEffect } from "react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", name: "Chinese", nativeName: "中文 (简体)", flag: "🇨🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
];

// In-memory client cache
const memoryCache = new Map<string, string>();
const LOCAL_STORAGE_KEY = "choicomma_trans_cache_v2";

/**
 * Validates whether the translated text is genuinely translated.
 * Prevents caching untranslated Korean fallbacks when DEEPL_API_KEY is missing or fails.
 */
export function isGenuineTranslation(original: string, translated: string, targetLang: string): boolean {
  if (!translated || typeof translated !== "string") return false;
  const lang = (targetLang || "").toLowerCase();
  if (lang === "ko") return true;

  const origTrimmed = original.trim();
  const transTrimmed = translated.trim();

  // If identical to original and contains Korean characters, it failed to translate
  if (origTrimmed === transTrimmed && /[가-힣]/.test(origTrimmed)) {
    return false;
  }

  // If non-Korean target language still contains significant Korean characters, do not cache
  if (lang !== "ko") {
    const koreanChars = (transTrimmed.match(/[가-힣]/g) || []).length;
    if (koreanChars > 0 && koreanChars >= transTrimmed.length * 0.3) {
      return false;
    }
  }

  return true;
}

// Load localStorage cache into memory on client init
function initCacheFromStorage() {
  if (typeof window === "undefined") return;
  try {
    // Purge legacy v1 cache which may contain erroneous Korean fallbacks
    localStorage.removeItem("choicomma_trans_cache_v1");

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === "string") {
            const parts = k.split(":");
            const targetLang = parts[1] || "";
            const original = parts.slice(2).join(":");
            if (isGenuineTranslation(original, v, targetLang)) {
              memoryCache.set(k, v);
            }
          }
        });
      }
    }
  } catch (e) {
    // ignore
  }
}

// Persist memory cache to localStorage (debounced)
let persistTimer: NodeJS.Timeout | null = null;
function persistCacheToStorage() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const obj: Record<string, string> = {};
      // Cap at 2000 entries to prevent localStorage quota issues
      let count = 0;
      for (const [k, v] of memoryCache.entries()) {
        obj[k] = v;
        count++;
        if (count >= 2000) break;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, 1000);
}

// Run cache init once
initCacheFromStorage();

// Instant UI Dictionary for e-commerce phrases
const UI_DICTIONARY: Record<string, Record<string, string>> = {
  "홈": {
    en: "Home",
    ja: "ホーム",
    "zh-cn": "首页",
    es: "Inicio",
    fr: "Accueil",
    de: "Startseite",
    vi: "Trang chủ",
    th: "หน้าแรก",
    id: "Beranda",
  },
  "메뉴": {
    en: "Menu",
    ja: "メニュー",
    "zh-cn": "菜单",
    es: "Menú",
    fr: "Menu",
    de: "Menü",
    vi: "Menu",
    th: "เมนู",
    id: "Menu",
  },
  "MENU": {
    en: "MENU",
    ja: "MENU",
    "zh-cn": "菜单",
    es: "MENÚ",
    fr: "MENU",
    de: "MENÜ",
    vi: "MENU",
    th: "เมนู",
    id: "MENU",
  },
  "닫기": {
    en: "Close",
    ja: "閉じる",
    "zh-cn": "关闭",
    es: "Cerrar",
    fr: "Fermer",
    de: "Schließen",
    vi: "Đóng",
    th: "ปิด",
    id: "Tutup",
  },
  "마이페이지": {
    en: "My Page",
    ja: "マイページ",
    "zh-cn": "个人中心",
    es: "Mi Página",
    fr: "Mon Compte",
    de: "Mein Konto",
    vi: "Trang cá nhân",
    th: "หน้าของฉัน",
    id: "Halaman Saya",
  },
  "주문내역/배송조회": {
    en: "Orders & Tracking",
    ja: "注文履歴・配送照会",
    "zh-cn": "订单/物流查询",
    es: "Pedidos y Envíos",
    fr: "Commandes et Suivi",
    de: "Bestellungen & Sendungsverfolgung",
    vi: "Đơn hàng & Vận chuyển",
    th: "ประวัติการสั่งซื้อ/ติดตามพัสดุ",
    id: "Pesanan & Pelacakan",
  },
  "주문내역 / 배송조회": {
    en: "Orders & Tracking",
    ja: "注文履歴・配送照会",
    "zh-cn": "订单/物流查询",
    es: "Pedidos y Envíos",
    fr: "Commandes et Suivi",
    de: "Bestellungen & Sendungsverfolgung",
    vi: "Đơn hàng & Vận chuyển",
    th: "ประวัติการสั่งซื้อ/ติดตามพัสดุ",
    id: "Pesanan & Pelacakan",
  },
  "주문내역": {
    en: "Orders",
    ja: "注文履歴",
    "zh-cn": "订单历史",
    es: "Pedidos",
    fr: "Commandes",
    de: "Bestellungen",
    vi: "Đơn hàng",
    th: "ประวัติการสั่งซื้อ",
    id: "Pesanan",
  },
  "배송조회": {
    en: "Tracking",
    ja: "配送照会",
    "zh-cn": "物流查询",
    es: "Seguimiento",
    fr: "Suivi",
    de: "Sendungsverfolgung",
    vi: "Vận chuyển",
    th: "ติดตามพัสดุ",
    id: "Pelacakan",
  },
  "상품 검색어 입력...": {
    en: "Search products...",
    ja: "商品を検索...",
    "zh-cn": "搜索商品...",
    es: "Buscar productos...",
    fr: "Rechercher des produits...",
    de: "Produkte suchen...",
    vi: "Tìm kiếm sản phẩm...",
    th: "ค้นหาสินค้า...",
    id: "Cari produk...",
  },
  "검색": {
    en: "Search",
    ja: "検索",
    "zh-cn": "搜索",
    es: "Buscar",
    fr: "Rechercher",
    de: "Suchen",
    vi: "Tìm kiếm",
    th: "ค้นหา",
    id: "Cari",
  },
  "카테고리": {
    en: "Categories",
    ja: "カテゴリー",
    "zh-cn": "商品分类",
    es: "Categorías",
    fr: "Catégories",
    de: "Kategorien",
    vi: "Danh mục",
    th: "หมวดหมู่",
    id: "Kategori",
  },
  "아우터": {
    en: "Outer",
    ja: "アウター",
    "zh-cn": "外套",
    es: "Abrigos",
    fr: "Manteaux",
    de: "Jacken",
    vi: "Áo khoác",
    th: "เสื้อตัวนอก",
    id: "Outer",
  },
  "상의": {
    en: "Tops",
    ja: "トップス",
    "zh-cn": "上装",
    es: "Tops",
    fr: "Hauts",
    de: "Oberteile",
    vi: "Áo",
    th: "เสื้อ",
    id: "Atasan",
  },
  "하의": {
    en: "Bottoms",
    ja: "ボトムス",
    "zh-cn": "下装",
    es: "Pantalones",
    fr: "Bas",
    de: "Unterteile",
    vi: "Quần",
    th: "กางเกง",
    id: "Bawahan",
  },
  "가방": {
    en: "Bags",
    ja: "バッグ",
    "zh-cn": "包袋",
    es: "Bolsos",
    fr: "Sacs",
    de: "Taschen",
    vi: "Túi xách",
    th: "กระเป๋า",
    id: "Tas",
  },
  "신발": {
    en: "Shoes",
    ja: "シューズ",
    "zh-cn": "鞋履",
    es: "Zapatos",
    fr: "Chaussures",
    de: "Schuhe",
    vi: "Giày dép",
    th: "รองเท้า",
    id: "Sepatu",
  },
  "악세사리": {
    en: "Accessories",
    ja: "アクセサリー",
    "zh-cn": "配饰",
    es: "Accesorios",
    fr: "Accessoires",
    de: "Accessoires",
    vi: "Phụ kiện",
    th: "เครื่องประดับ",
    id: "Aksesoris",
  },
  "베스트": {
    en: "Best Sellers",
    ja: "ベストセラー",
    "zh-cn": "热销榜",
    es: "Los Más Vendidos",
    fr: "Meilleures Ventes",
    de: "Bestseller",
    vi: "Bán chạy nhất",
    th: "สินค้าขายดี",
    id: "Terlaris",
  },
  "관리자": {
    en: "Admin",
    ja: "管理者",
    "zh-cn": "管理员",
    es: "Admin",
    fr: "Admin",
    de: "Admin",
    vi: "Quản trị viên",
    th: "ผู้ดูแลระบบ",
    id: "Admin",
  },
  "회원": {
    en: "Member",
    ja: "会員",
    "zh-cn": "会员",
    es: "Miembro",
    fr: "Membre",
    de: "Mitglied",
    vi: "Thành viên",
    th: "สมาชิก",
    id: "Anggota",
  },
  "회원님": {
    en: "Member",
    ja: "会員様",
    "zh-cn": "会员",
    es: "Estimado cliente",
    fr: "Cher client",
    de: "Lieber Kunde",
    vi: "Quý khách",
    th: "ท่านสมาชิก",
    id: "Pelanggan",
  },
  "로그인 중": {
    en: "Logged In",
    ja: "ログイン中",
    "zh-cn": "已登录",
    es: "Conectado",
    fr: "Connecté",
    de: "Angemeldet",
    vi: "Đã đăng nhập",
    th: "เข้าสู่ระบบแล้ว",
    id: "Sedang Masuk",
  },
  "오픈 예정": {
    en: "Coming Soon",
    ja: "オープン予定",
    "zh-cn": "即将发售",
    es: "Próximamente",
    fr: "Prochainement",
    de: "Demnächst",
    vi: "Sắp mở bán",
    th: "เร็วๆ นี้",
    id: "Segera Hadir",
  },
  "품절": {
    en: "Sold Out",
    ja: "売り切れ",
    "zh-cn": "已售罄",
    es: "Agotado",
    fr: "Épuisé",
    de: "Ausverkauft",
    vi: "Hết hàng",
    th: "สินค้าหมด",
    id: "Habis",
  },
  "SOLD OUT": {
    en: "Sold Out",
    ja: "売り切れ",
    "zh-cn": "已售罄",
    es: "Agotado",
    fr: "Épuisé",
    de: "Ausverkauft",
    vi: "Hết hàng",
    th: "สินค้าหมด",
    id: "Habis",
  },
  "COMING SOON": {
    en: "Coming Soon",
    ja: "オープン予定",
    "zh-cn": "即将发售",
    es: "Próximamente",
    fr: "Prochainement",
    de: "Demnächst",
    vi: "Sắp mở bán",
    th: "เร็วๆ นี้",
    id: "Segera Hadir",
  },
  "장바구니": {
    en: "Cart",
    ja: "カート",
    "zh-cn": "购物车",
    es: "Carrito",
    fr: "Panier",
    de: "Warenkorb",
    vi: "Giỏ hàng",
    th: "รถเข็น",
    id: "Keranjang",
  },
  "구매하기": {
    en: "Buy Now",
    ja: "購入する",
    "zh-cn": "立即购买",
    es: "Comprar ahora",
    fr: "Acheter",
    de: "Jetzt kaufen",
    vi: "Mua ngay",
    th: "ซื้อเลย",
    id: "Beli Sekarang",
  },
  "바로구매": {
    en: "Buy Now",
    ja: "今すぐ購入",
    "zh-cn": "立即购买",
    es: "Comprar ahora",
    fr: "Acheter",
    de: "Sofort kaufen",
    vi: "Mua ngay",
    th: "ซื้อเลย",
    id: "Beli Sekarang",
  },
  "장바구니 담기": {
    en: "Add to Cart",
    ja: "カートに追加",
    "zh-cn": "加入购物车",
    es: "Añadir al carrito",
    fr: "Ajouter au panier",
    de: "In den Warenkorb",
    vi: "Thêm vào giỏ",
    th: "เพิ่มลงรถเข็น",
    id: "Tambah ke Keranjang",
  },
  "로그인": {
    en: "Sign In",
    ja: "ログイン",
    "zh-cn": "登录",
    es: "Iniciar sesión",
    fr: "Connexion",
    de: "Anmelden",
    vi: "Đăng nhập",
    th: "เข้าสู่ระบบ",
    id: "Masuk",
  },
  "로그아웃": {
    en: "Sign Out",
    ja: "ログアウト",
    "zh-cn": "退出登录",
    es: "Cerrar sesión",
    fr: "Déconnexion",
    de: "Abmelden",
    vi: "Đăng xuất",
    th: "ออกจากระบบ",
    id: "Keluar",
  },
  "전체보기": {
    en: "View All",
    ja: "すべて見る",
    "zh-cn": "查看全部",
    es: "Ver todo",
    fr: "Voir tout",
    de: "Alle anzeigen",
    vi: "Xem tất cả",
    th: "ดูทั้งหมด",
    id: "Lihat Semua",
  },
  "타임세일": {
    en: "Time Sale",
    ja: "タイムセール",
    "zh-cn": "限时特惠",
    es: "Oferta flash",
    fr: "Vente flash",
    de: "Flash-Sale",
    vi: "Giảm giá có hạn",
    th: "ลดราคาจำกัดเวลา",
    id: "Promo Terbatas",
  },
  "결제하기": {
    en: "Checkout",
    ja: "レジへ進む",
    "zh-cn": "去结算",
    es: "Pagar",
    fr: "Commander",
    de: "Zur Kasse",
    vi: "Thanh toán",
    th: "ชำระเงิน",
    id: "Bayar Sekarang",
  },
  "쇼핑 계속하기": {
    en: "Continue Shopping",
    ja: "お買い物を続ける",
    "zh-cn": "继续购物",
    es: "Continuar comprando",
    fr: "Continuer vos achats",
    de: "Weiter einkaufen",
    vi: "Tiếp tục mua sắm",
    th: "ซื้อสินค้าต่อ",
    id: "Lanjut Belanja",
  },
  "담은 상품": {
    en: "Items",
    ja: "選択した商品",
    "zh-cn": "已选商品",
    es: "Artículos",
    fr: "Articles",
    de: "Artikel",
    vi: "Sản phẩm đã chọn",
    th: "สินค้าที่เลือก",
    id: "Item Terpilih",
  },
  "총 결제금액": {
    en: "Total",
    ja: "合計金額",
    "zh-cn": "合计金额",
    es: "Total",
    fr: "Total",
    de: "Gesamtsumme",
    vi: "Tổng thanh toán",
    th: "ยอดรวมทั้งหมด",
    id: "Total Pembayaran",
  },
  "장바구니가 비어 있습니다.": {
    en: "Your cart is empty.",
    ja: "カートは空です。",
    "zh-cn": "购物车是空的。",
    es: "Tu carrito está vacío.",
    fr: "Votre panier est vide.",
    de: "Ihr Warenkorb ist leer.",
    vi: "Giỏ hàng đang trống.",
    th: "รถเข็นของคุณว่างเปล่า",
    id: "Keranjang belanja Anda kosong.",
  },
  "원하시는 상품을 장바구니에 담아보세요.": {
    en: "Add products you like to your cart.",
    ja: "お気に入りの商品をカートに追加してください。",
    "zh-cn": "快去挑选喜欢的商品吧。",
    es: "Agrega productos a tu carrito.",
    fr: "Ajoutez des produits à votre panier.",
    de: "Legen Sie Artikel in den Warenkorb.",
    vi: "Hãy thêm sản phẩm yêu thích vào giỏ hàng.",
    th: "เพิ่มสินค้าที่คุณต้องการลงในรถเข็น",
    id: "Tambahkan produk pilihan Anda ke keranjang.",
  },
  "낮은 가격순": {
    en: "Price: Low to High",
    ja: "価格の安い順",
    "zh-cn": "价格从低到高",
    es: "Precio: menor a mayor",
    fr: "Prix croissant",
    de: "Preis aufsteigend",
    vi: "Giá: Thấp đến cao",
    th: "ราคา: ต่ำไปสูง",
    id: "Harga: Rendah ke Tinggi",
  },
  "높은 가격순": {
    en: "Price: High to Low",
    ja: "価格の高い順",
    "zh-cn": "价格从高到低",
    es: "Precio: mayor a menor",
    fr: "Prix décroissant",
    de: "Preis absteigend",
    vi: "Giá: Cao đến thấp",
    th: "ราคา: สูงไปต่ำ",
    id: "Harga: Tinggi ke Rendah",
  },
  "최신 등록순": {
    en: "Newest",
    ja: "新着順",
    "zh-cn": "最新上架",
    es: "Más nuevos",
    fr: "Nouveautés",
    de: "Neueste",
    vi: "Mới nhất",
    th: "ใหม่ล่าสุด",
    id: "Terbaru",
  },
  "오래된순": {
    en: "Oldest",
    ja: "古い順",
    "zh-cn": "最早上架",
    es: "Más antiguos",
    fr: "Plus anciens",
    de: "Älteste",
    vi: "Cũ nhất",
    th: "เก่าที่สุด",
    id: "Terlama",
  },
  "정렬 기준": {
    en: "Sort by",
    ja: "並び替え",
    "zh-cn": "排序方式",
    es: "Ordenar por",
    fr: "Trier par",
    de: "Sortieren nach",
    vi: "Sắp xếp theo",
    th: "จัดเรียงตาม",
    id: "Urutkan",
  },
  "정렬": {
    en: "Sort",
    ja: "並び替え",
    "zh-cn": "排序",
    es: "Ordenar",
    fr: "Trier",
    de: "Sortieren",
    vi: "Sắp xếp",
    th: "จัดเรียง",
    id: "Urutkan",
  },
  "초기화": {
    en: "Reset",
    ja: "リセット",
    "zh-cn": "重置",
    es: "Restablecer",
    fr: "Réinitialiser",
    de: "Zurücksetzen",
    vi: "Đặt lại",
    th: "รีเซ็ต",
    id: "Atur Ulang",
  },
  "정상가": {
    en: "Regular Price",
    ja: "通常価格",
    "zh-cn": "原价",
    es: "Precio original",
    fr: "Prix initial",
    de: "Normalpreis",
    vi: "Giá gốc",
    th: "ราคาปกติ",
    id: "Harga Normal",
  },
  "할인가": {
    en: "Sale Price",
    ja: "セール価格",
    "zh-cn": "特价",
    es: "Precio de oferta",
    fr: "Prix réduit",
    de: "Aktionspreis",
    vi: "Giá ưu đãi",
    th: "ราคาลด",
    id: "Harga Promo",
  },
  "색상": {
    en: "Color",
    ja: "色",
    "zh-cn": "颜色",
    es: "Color",
    fr: "Couleur",
    de: "Farbe",
    vi: "Màu sắc",
    th: "สี",
    id: "Warna",
  },
  "사이즈": {
    en: "Size",
    ja: "サイズ",
    "zh-cn": "尺码",
    es: "Talla",
    fr: "Taille",
    de: "Größe",
    vi: "Kích cỡ",
    th: "ขนาด",
    id: "Ukuran",
  },
  "수량": {
    en: "Quantity",
    ja: "数量",
    "zh-cn": "数量",
    es: "Cantidad",
    fr: "Quantité",
    de: "Menge",
    vi: "Số lượng",
    th: "จำนวน",
    id: "Jumlah",
  },
  "관련 상품": {
    en: "Related Products",
    ja: "関連商品",
    "zh-cn": "相关商品",
    es: "Productos relacionados",
    fr: "Produits associés",
    de: "Ähnliche Produkte",
    vi: "Sản phẩm liên quan",
    th: "สินค้าที่เกี่ยวข้อง",
    id: "Produk Terkait",
  },
  "최신 컬렉션": {
    en: "Latest Collection",
    ja: "最新コレクション",
    "zh-cn": "最新系列",
    es: "Última Colección",
    fr: "Dernière Collection",
    de: "Neueste Kollektion",
    vi: "Bộ sưu tập mới nhất",
    th: "คอลเลกชันล่าสุด",
    id: "Koleksi Terbaru",
  },
  "추천 상품": {
    en: "Recommended",
    ja: "おすすめ商品",
    "zh-cn": "推荐商品",
    es: "Recomendados",
    fr: "Recommandés",
    de: "Empfohlen",
    vi: "Gợi ý cho bạn",
    th: "สินค้าแนะนำ",
    id: "Rekomendasi",
  },
  "세트 상품": {
    en: "Set Bundles",
    ja: "セット商品",
    "zh-cn": "套装商品",
    es: "Conjuntos",
    fr: "Ensembles",
    de: "Set-Angebote",
    vi: "Bộ sản phẩm",
    th: "เซ็ตสินค้า",
    id: "Produk Set",
  },
  "세트 특가": {
    en: "Set Sale",
    ja: "セット特別価格",
    "zh-cn": "套装特惠",
    es: "Oferta en Set",
    fr: "Offre Ensemble",
    de: "Set-Sonderpreis",
    vi: "Giá ưu đãi combo",
    th: "โปรโมชั่นเซ็ต",
    id: "Promo Spesial Set",
  },
  "앞으로 가기": {
    en: "Move Forward",
    ja: "前へ",
    "zh-cn": "前进",
    es: "Avanzar",
    fr: "Avancer",
    de: "Vorwärts",
    vi: "Tiến lên",
    th: "ไปข้างหน้า",
    id: "Maju",
  },
  "뒤로 가기": {
    en: "Move Back",
    ja: "後ろへ",
    "zh-cn": "后退",
    es: "Retroceder",
    fr: "Reculer",
    de: "Zurück",
    vi: "Lùi lại",
    th: "ย้อนกลับ",
    id: "Mundur",
  },
};

/**
 * Get current active language code from cookie or localStorage
 */
export function getCurrentLanguage(): string {
  if (typeof document === "undefined") return "ko";

  // 1. Check standard choicomma_lang cookie
  const match = document.cookie.match(/(?:^|; )choicomma_lang=([^;]*)/);
  if (match && match[1]) {
    const code = match[1].trim();
    if (code) return code;
  }

  // 2. Check localStorage
  try {
    const saved = localStorage.getItem("choicomma_lang");
    if (saved) return saved;
  } catch (e) {}

  // 3. Fallback to legacy googtrans cookie
  const gMatch = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
  if (gMatch && gMatch[1]) {
    const code = gMatch[1].split("/").pop();
    if (code) {
      const lower = code.toLowerCase();
      if (lower === "zh-cn" || lower === "zh") return "zh-CN";
      return code;
    }
  }

  return "ko";
}

/**
 * Set current active language code and broadcast change event
 */
export function setLanguage(lang: string): void {
  if (typeof window === "undefined") return;

  const code = lang || "ko";

  // 1. Set modern standard cookie (1 year, SameSite=Lax)
  document.cookie = `choicomma_lang=${code}; path=/; max-age=31536000; SameSite=Lax;`;

  // 2. Set legacy googtrans cookie for smooth transition across older components
  document.cookie = `googtrans=/ko/${code}; path=/; max-age=31536000; SameSite=Lax;`;

  // 3. Persist in localStorage
  try {
    localStorage.setItem("choicomma_lang", code);
  } catch (e) {}

  // 4. Dispatch custom event so all listening components update instantly
  window.dispatchEvent(new Event("language_changed"));
  window.dispatchEvent(new Event("language-changed"));
}

/**
 * Fast synchronous dictionary lookup for UI words
 */
export function translateUiText(key: string, targetLang?: string): string {
  if (!key) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return key;

  const trimmed = key.trim();
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    return UI_DICTIONARY[trimmed][lang];
  }

  const cacheKey = `ko:${lang}:${trimmed}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  return key;
}

/**
 * Synchronous product title getter (returns cached translation or original)
 */
export function translateProductTitle(title: string, targetLang?: string): string {
  if (!title) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return title;

  const trimmed = title.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check dictionary
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    return UI_DICTIONARY[trimmed][lang];
  }

  // Trigger background fetch if not yet in cache
  fetchAsyncTranslation(trimmed, lang).catch(() => {});

  return title;
}

export function translateProductDescription(desc: string, targetLang?: string): string {
  if (!desc) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return desc;

  const trimmed = desc.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Trigger background fetch if not yet in cache
  fetchAsyncTranslation(trimmed, lang).catch(() => {});

  return desc;
}

/**
 * Asynchronous DeepL translation function with client-side caching
 */
export async function fetchAsyncTranslation(
  text: string,
  targetLang?: string,
  mode: "title" | "ui" = "title"
): Promise<string> {
  if (!text) return "";
  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") return text;

  const trimmed = text.trim();
  const cacheKey = `ko:${lang}:${trimmed}`;

  // 1. Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check UI dictionary
  if (UI_DICTIONARY[trimmed]?.[lang]) {
    const dictVal = UI_DICTIONARY[trimmed][lang];
    memoryCache.set(cacheKey, dictVal);
    persistCacheToStorage();
    return dictVal;
  }

  // 3. Call server DeepL translation API
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: [trimmed],
        targetLang: lang,
        sourceLang: "ko",
      }),
    });

    if (!res.ok) return text;

    const data = await res.json();
    const result = data.translations?.[0]?.translated;
    const isFailed = Boolean(data.notice || data.error || data.translations?.[0]?.failed);

    if (result && typeof result === "string") {
      if (!isFailed && isGenuineTranslation(trimmed, result, lang)) {
        memoryCache.set(cacheKey, result);
        persistCacheToStorage();
      }
      return result;
    }
  } catch (e) {
    console.error("[fetchAsyncTranslation error]", e);
  }

  return text;
}

/**
 * Batch translation function for multiple texts in one round-trip
 */
export async function fetchBatchTranslation(
  texts: string[],
  targetLang?: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!texts || texts.length === 0) return result;

  const lang = (targetLang || getCurrentLanguage()).toLowerCase();
  if (lang === "ko") {
    texts.forEach((t) => (result[t] = t));
    return result;
  }

  const missing: string[] = [];

  texts.forEach((t) => {
    const trimmed = t.trim();
    const cacheKey = `ko:${lang}:${trimmed}`;
    if (memoryCache.has(cacheKey)) {
      result[t] = memoryCache.get(cacheKey)!;
    } else if (UI_DICTIONARY[trimmed]?.[lang]) {
      result[t] = UI_DICTIONARY[trimmed][lang];
      memoryCache.set(cacheKey, result[t]);
    } else {
      missing.push(trimmed);
    }
  });

  if (missing.length === 0) return result;

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: missing,
        targetLang: lang,
        sourceLang: "ko",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const translations = data.translations || [];
      const hasNoticeOrError = Boolean(data.notice || data.error);

      translations.forEach((item: { original: string; translated: string; failed?: boolean }) => {
        if (item.original && item.translated) {
          const cacheKey = `ko:${lang}:${item.original}`;
          if (!hasNoticeOrError && !item.failed && isGenuineTranslation(item.original, item.translated, lang)) {
            memoryCache.set(cacheKey, item.translated);
          }
          result[item.original] = item.translated;
        }
      });
      persistCacheToStorage();
    }
  } catch (e) {
    console.error("[fetchBatchTranslation error]", e);
  }

  // Fill in any remaining with original text
  texts.forEach((t) => {
    if (!result[t]) result[t] = t;
  });

  return result;
}

/**
 * React Hook for listening to language change and getting translations
 */
export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<string>("ko");

  useEffect(() => {
    const update = () => setCurrentLang(getCurrentLanguage());
    update();
    window.addEventListener("language_changed", update);
    window.addEventListener("language-changed", update);
    return () => {
      window.removeEventListener("language_changed", update);
      window.removeEventListener("language-changed", update);
    };
  }, []);

  return {
    currentLang,
    setLanguage,
    t: (key: string) => translateUiText(key, currentLang),
    translateAsync: (text: string) => fetchAsyncTranslation(text, currentLang),
  };
}

/**
 * React Hook for a single product title with auto-translation and re-render
 */
export function useProductTranslation(originalTitle: string, targetLang?: string) {
  const [currentLang, setCurrentLang] = useState(() => (targetLang || getCurrentLanguage()).toLowerCase());

  useEffect(() => {
    if (targetLang) {
      setCurrentLang(targetLang.toLowerCase());
      return;
    }
    const update = () => setCurrentLang(getCurrentLanguage().toLowerCase());
    update();
    window.addEventListener("language_changed", update);
    window.addEventListener("language-changed", update);
    return () => {
      window.removeEventListener("language_changed", update);
      window.removeEventListener("language-changed", update);
    };
  }, [targetLang]);

  const [translated, setTranslated] = useState(() => {
    if (!originalTitle) return "";
    const lang = currentLang;
    if (lang === "ko") return originalTitle;
    return translateProductTitle(originalTitle, lang);
  });

  useEffect(() => {
    if (!originalTitle) {
      setTranslated("");
      return;
    }
    const lang = currentLang;
    if (lang === "ko") {
      setTranslated(originalTitle);
      return;
    }

    // 1. Immediately show cached or dictionary title if available
    const syncVal = translateProductTitle(originalTitle, lang);
    setTranslated(syncVal);

    // 2. Asynchronously fetch from DeepL if not cached
    let isMounted = true;
    fetchAsyncTranslation(originalTitle, lang, "title").then((res) => {
      if (isMounted && res) {
        setTranslated(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalTitle, currentLang]);

  return translated;
}

/**
 * Helper React Component to render auto-translated product titles cleanly
 */
export function ProductTranslatedTitle({
  title,
  targetLang,
  className,
}: {
  title: string;
  targetLang?: string;
  className?: string;
}) {
  const translated = useProductTranslation(title, targetLang);
  if (className) {
    return React.createElement("span", { className }, translated);
  }
  return React.createElement(React.Fragment, null, translated);
}


