"use client";

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  flagUrl: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", name: "한국어", flag: "🇰🇷", flagUrl: "https://flagcdn.com/w40/kr.png" },
  { code: "en", name: "English", flag: "🇺🇸", flagUrl: "https://flagcdn.com/w40/us.png" },
  { code: "ja", name: "日本語", flag: "🇯🇵", flagUrl: "https://flagcdn.com/w40/jp.png" },
  { code: "zh", name: "中文", flag: "🇨🇳", flagUrl: "https://flagcdn.com/w40/cn.png" },
  { code: "fr", name: "Français", flag: "🇫🇷", flagUrl: "https://flagcdn.com/w40/fr.png" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", flagUrl: "https://flagcdn.com/w40/de.png" },
  { code: "es", name: "Español", flag: "🇪🇸", flagUrl: "https://flagcdn.com/w40/es.png" },
];

export function getCurrentLanguage(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("choicomma_lang") || "ko";
  }
  return "ko";
}

export function setLanguage(lang: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("choicomma_lang", lang);
    window.dispatchEvent(new CustomEvent("language_changed", { detail: { lang } }));
    window.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
  }
}

// Product Title Translations Dictionary
const PRODUCT_TITLE_DICTIONARY: Record<string, Record<string, string>> = {
  // 1. 시그니처 트위드 재킷
  "시그니처 트위드 재킷 (Signature Tweed Jacket)": {
    en: "Signature Tweed Jacket",
    ja: "シグネチャーツイードジャケット",
    zh: "经典粗花呢夹克",
    fr: "Veste en Tweed Signature",
    de: "Signature Tweed-Jacke",
    es: "Chaqueta de Tweed Signature",
  },
  "시그니처 트위드 재킷": {
    en: "Signature Tweed Jacket",
    ja: "シグネチャーツイードジャケット",
    zh: "经典粗花呢夹克",
    fr: "Veste en Tweed Signature",
    de: "Signature Tweed-Jacke",
    es: "Chaqueta de Tweed Signature",
  },

  // 2. 오버사이즈 캐시미어 코트
  "오버사이즈 캐시미어 코트 (Oversized Cashmere Coat)": {
    en: "Oversized Cashmere Coat",
    ja: "オーバーサイズ カシミヤ コート",
    zh: "廓形羊绒大衣",
    fr: "Manteau en Cachemire Oversize",
    de: "Oversize-Kaschmirmantel",
    es: "Abrigo de Cachemira Oversize",
  },
  "오버사이즈 캐시미어 코트": {
    en: "Oversized Cashmere Coat",
    ja: "オーバーサイズ カシミヤ コート",
    zh: "廓形羊绒大衣",
    fr: "Manteau en Cachemire Oversize",
    de: "Oversize-Kaschmirmantel",
    es: "Abrigo de Cachemira Oversize",
  },

  // 3. 미니멀 드레이프 블라우스
  "미니멀 드레이프 블라우스 (Minimal Draped Blouse)": {
    en: "Minimal Draped Blouse",
    ja: "ミニマル ドレープ ブラウス",
    zh: "极简垂坠感衬衫",
    fr: "Blouse Minimaliste Drapée",
    de: "Minimalistische Drapierte Bluse",
    es: "Blusa Minimalista Drapada",
  },
  "미니멀 드레이프 블라우스": {
    en: "Minimal Draped Blouse",
    ja: "ミニマル ドレープ ブラウス",
    zh: "极简垂坠感衬衫",
    fr: "Blouse Minimaliste Drapée",
    de: "Minimalistische Drapierte Bluse",
    es: "Blusa Minimalista Drapada",
  },

  // 4. 와이드 스트레이트 울 트라우저
  "와이드 스트레이트 울 트라우저 (Wide Straight Trousers)": {
    en: "Wide Straight Wool Trousers",
    ja: "ワイド ストレート ウール 트라우ザー",
    zh: "宽松直筒羊毛长裤",
    fr: "Pantalon Large Droit en Laine",
    de: "Weite Gerade Wollhose",
    es: "Pantalón Ancho Recto de Lana",
  },
  "와이드 스트레이트 울 트라우저": {
    en: "Wide Straight Wool Trousers",
    ja: "ワイド 스트レート ウール ト라우ザー",
    zh: "宽松直筒羊毛长裤",
    fr: "Pantalon Large Droit en Laine",
    de: "Weite Gerade Wollhose",
    es: "Pantalón Ancho Recto de Lana",
  },

  // 5. 클래식 레더 토트백
  "클래식 레더 토트백 (Classic Leather Tote Bag)": {
    en: "Classic Leather Tote Bag",
    ja: "クラシック レザー トートバッグ",
    zh: "复古皮革手提包",
    fr: "Cabas Classique en Cuir",
    de: "Klassische Leder-Shopper-Tasche",
    es: "Bolso Tote de Cuero Clásico",
  },
  "클래식 레더 토트백": {
    en: "Classic Leather Tote Bag",
    ja: "クラシック レザー トートバッグ",
    zh: "复古皮革手提包",
    fr: "Cabas Classique en Cuir",
    de: "Klassische Leder-Shopper-Tasche",
    es: "Bolso Tote de Cuero Clásico",
  },

  // 6. 프리미엄 실크 터치 셔츠
  "프리미엄 실크 터치 셔츠 (Premium Silk Touch Shirt)": {
    en: "Premium Silk Touch Shirt",
    ja: "プレミアム シルク タッチ シャツ",
    zh: "高端真丝质感衬衫",
    fr: "Chemise Toucher Soie Premium",
    de: "Premium Seidentouch-Hemd",
    es: "Camisa Tacto Seda Premium",
  },
  "프리미엄 실크 터치 셔츠": {
    en: "Premium Silk Touch Shirt",
    ja: "プレミアム シルク タッチ シャツ",
    zh: "高端真丝质感衬衫",
    fr: "Chemise Toucher Soie Premium",
    de: "Premium Seidentouch-Hemd",
    es: "Camisa Tacto Seda Premium",
  },

  // 7. 럭셔리 무드 케이프 가디건
  "럭셔리 무드 케이프 가디건 (Luxury Mood Cape Cardigan)": {
    en: "Luxury Mood Cape Cardigan",
    ja: "ラグジュアリー ムード 케ープ カーディガン",
    zh: "奢华风斗篷针织衫",
    fr: "Gilet Cape Ambiance Luxe",
    de: "Luxus-Cape-Strickjacke",
    es: "Chaqueta Capa de Lujo",
  },
  "럭셔리 무드 케이프 가디건": {
    en: "Luxury Mood Cape Cardigan",
    ja: "ラグジュアリー ムード 케ープ カーディガン",
    zh: "奢华风斗篷针织衫",
    fr: "Gilet Cape Ambiance Luxe",
    de: "Luxus-Cape-Strickjacke",
    es: "Chaqueta Capa de Lujo",
  },

  // 8. 슬림 라인 레이어드 스커트
  "슬림 라인 레이어드 스커트 (Slim Line Layered Skirt)": {
    en: "Slim Line Layered Skirt",
    ja: "スリム ライン レイヤード スカート",
    zh: "修身叠穿半身裙",
    fr: "Jupe Superposée Ligne Fine",
    de: "Schlanker Lagenrock",
    es: "Falda Capas Línea Estilizada",
  },
  "슬림 라인 레이어드 스커트": {
    en: "Slim Line Layered Skirt",
    ja: "スリム ライン レイヤード スカート",
    zh: "修身叠穿半身裙",
    fr: "Jupe Superposée Ligne Fine",
    de: "Schlanker Lagenrock",
    es: "Falda Capas Línea Estilizada",
  },

  // 9. 미니멀 첼시 앵클 부츠
  "미니멀 첼시 앵클 부츠 (Minimal Chelsea Boots)": {
    en: "Minimal Chelsea Ankle Boots",
    ja: "ミニマル チェルシー アンクル ブーツ",
    zh: "极简切尔西短靴",
    fr: "Bottines Chelsea Minimalistes",
    de: "Minimalistische Chelsea-Stiefeletten",
    es: "Botines Chelsea Minimalistas",
  },
  "미니멀 첼시 앵클 부츠": {
    en: "Minimal Chelsea Ankle Boots",
    ja: "ミニマル チェルシー アンクル ブーツ",
    zh: "极简切尔西短靴",
    fr: "Bottines Chelsea Minimalistes",
    de: "Minimalistische Chelsea-Stiefeletten",
    es: "Botines Chelsea Minimalistas",
  },

  // 10. 아티스틱 패딩 쇼퍼백
  "아티스틱 패딩 쇼퍼백 (Artistic Padded Shopper Bag)": {
    en: "Artistic Padded Shopper Bag",
    ja: "アーティスティック パデッド ショッパーバッグ",
    zh: "艺术感棉服购物包",
    fr: "Sac Cabas Rembourré Artistique",
    de: "Künstlerische Wattierte Shopper-Tasche",
    es: "Bolso Shopper Acolchado Artístico",
  },
  "아티스틱 패딩 쇼퍼백": {
    en: "Artistic Padded Shopper Bag",
    ja: "アーティスティック パデッド 쇼퍼백",
    zh: "艺术感棉服购物包",
    fr: "Sac Cabas Rembourré Artistique",
    de: "Künstlerische Wattierte Shopper-Tasche",
    es: "Bolso Shopper Acolchado Artístico",
  },
};

// Word-level fallback translation map for dynamically added custom titles
const WORD_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "재킷": "Jacket",
    "자켓": "Jacket",
    "코트": "Coat",
    "블라우스": "Blouse",
    "셔츠": "Shirt",
    "바지": "Pants",
    "트라우저": "Trousers",
    "팬츠": "Pants",
    "스커트": "Skirt",
    "가디건": "Cardigan",
    "부츠": "Boots",
    "토트백": "Tote Bag",
    "쇼퍼백": "Shopper Bag",
    "시그니처": "Signature",
    "오버사이즈": "Oversized",
    "미니멀": "Minimal",
    "클래식": "Classic",
    "프리미엄": "Premium",
    "럭셔리": "Luxury",
  },
  ja: {
    "재킷": "ジャケット",
    "자켓": "ジャケット",
    "코트": "コート",
    "블라우스": "ブラウス",
    "셔츠": "シャツ",
    "바지": "パンツ",
    "트라우저": "トラウザー",
    "팬츠": "パンツ",
    "스커트": "スカート",
    "가디건": "カーディガン",
    "부츠": "ブーツ",
    "토트백": "トートバッグ",
    "쇼퍼백": "ショッパーバッグ",
    "시그니처": "シグネチャー",
    "오버사이즈": "オーバーサイズ",
    "미니멀": "ミニマル",
    "클래식": "クラシック",
    "프리미엄": "プレミアム",
    "럭셔리": "ラグジュアリー",
  },
  zh: {
    "재킷": "夹克",
    "자켓": "夹克",
    "코트": "外套/大衣",
    "블라우스": "衬衫",
    "셔츠": "衬衫",
    "바지": "长裤",
    "트라우저": "长裤",
    "팬츠": "裤子",
    "스커트": "半裙",
    "가디건": "针织衫",
    "부츠": "短靴",
    "토트백": "手提包",
    "쇼퍼백": "购物包",
    "시그니처": "经典",
    "오버사이즈": "廓形",
    "미니멀": "极简",
    "클래식": "复古",
    "프리미엄": "高端",
    "럭셔리": "奢华",
  },
  fr: {
    "재킷": "Veste",
    "자켓": "Veste",
    "코트": "Manteau",
    "블라우스": "Blouse",
    "셔츠": "Chemise",
    "바지": "Pantalon",
    "트라우저": "Pantalon",
    "팬츠": "Pantalon",
    "스커트": "Jupe",
    "가디건": "Gilet",
    "부츠": "Bottines",
    "토트백": "Sac Cabas",
    "쇼퍼백": "Sac Cabas",
    "시그니처": "Signature",
    "오버사이즈": "Oversize",
    "미니멀": "Minimaliste",
    "클래식": "Classique",
    "프리미엄": "Premium",
    "럭셔리": "Luxe",
  },
  de: {
    "재킷": "Jacke",
    "자켓": "Jacke",
    "코트": "Mantel",
    "블라우스": "Bluse",
    "셔츠": "Hemd",
    "바지": "Hose",
    "트라우저": "Hose",
    "팬츠": "Hose",
    "스커트": "Rock",
    "가디건": "Strickjacke",
    "부츠": "Stiefeletten",
    "토트백": "Shopper-Tasche",
    "쇼퍼백": "Shopper-Tasche",
    "시그니처": "Signature",
    "오버사이즈": "Oversize",
    "미니멀": "Minimalistisch",
    "클래식": "Klassisch",
    "프리미엄": "Premium",
    "럭셔리": "Luxus",
  },
  es: {
    "재킷": "Chaqueta",
    "자켓": "Chaqueta",
    "코트": "Abrigo",
    "블라우스": "Blusa",
    "셔츠": "Camisa",
    "바지": "Pantalón",
    "트라우저": "Pantalón",
    "팬츠": "Pantalón",
    "스커트": "Falda",
    "가디건": "Chaqueta Capa",
    "부츠": "Botines",
    "토트백": "Bolso Tote",
    "쇼퍼백": "Bolso Shopper",
    "시그니처": "Signature",
    "오버사이즈": "Oversize",
    "미니멀": "Minimalista",
    "클래식": "Clásico",
    "프리미엄": "Premium",
    "럭셔리": "Lujo",
  },
};

const PRODUCT_DESC_DICTIONARY: Record<string, Record<string, string>> = {
  ko: {},
  en: {
    "• 디자이너 노트:": "• Designer Note:",
    "• 소재 및 아웃핏:": "• Fabric & Fit:",
    "• 관리 안내:": "• Care Guide:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "An original choicomma silhouette crafted with delicate details for our main collection.",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "Designed with premium fabrics and sensible fitting that beautifully accentuates the silhouette.",
    "전문 드라이클리닝을 권장합니다.": "Professional dry cleaning is recommended.",
    "입체적인 플리츠 레이어드가 돋보이는 모던 롱 스커트입니다.": "A modern long skirt highlighted by dimensional pleated layering.",
    "움직일 때마다 흩날리는 감각적인 드레이핑과 편안한 밴딩 디테일입니다.": "Features sensible draping that flutters with movement and comfortable waist banding.",
    "최이콤마만의 감성이 담긴 고급스러운 트위드 재킷입니다.": "A luxurious tweed jacket filled with choicomma's signature sensibility.",
    "프리미엄 원사와 섬세한 버튼 디테일이 돋보이는 모던 클래식 아우터입니다.": "A modern classic outer featuring premium yarn and delicate button details.",
    "부드러운 촉감과 은은한 광택감이 감도는 럭셔리 코트입니다.": "A luxury coat with a soft touch and subtle elegant sheen.",
    "100% 최고급 원단으로 제작되어 우수한 보온성과 오버핏 핏감을 선사합니다.": "Crafted from 100% premium fabric offering excellent warmth and a cozy oversized fit.",
    "우아한 드레이핑 라인이 돋보이는 실크 터치 블라우스입니다.": "A silk-touch blouse featuring an elegant draped silhouette.",
    "세련된 넥라인과 여유로운 핏으로 단품 및 레이어드 착장에 완벽합니다.": "Perfect for single wear or layering with its refined neckline and relaxed fit.",
    "깔끔하게 떨어지는 핀턱 핏의 울 와이드 팬츠입니다.": "Wool wide pants with a clean-falling pintuck fit.",
    "다리 라인을 길고 슬림하게 연출해 주는 최고급 구조감의 스트레이트 핏입니다.": "A high-end structured straight fit that creates long and slim leg lines.",
    "구조적인 형태감이 돋보이는 모던 가죽 토트백입니다.": "A modern leather tote bag with a striking structural shape.",
    "이태리 가죽 질감과 아티스틱한 하드웨어가 조합된 데일리 미니멀 백입니다.": "A daily minimal bag combining Italian leather texture with artistic hardware.",
    "은은한 광택과 실키한 터치감의 하이엔드 오버핏 셔츠입니다.": "A high-end oversized shirt with a subtle sheen and silky touch.",
    "드레이핑감 있는 프리미엄 소재를 활용해 고품격 룩을 연출합니다.": "Creates a high-grade look using premium draped materials.",
    "볼륨감 넘치는 숄 라인과 아늑한 실루엣의 케이프 가디건입니다.": "A cape cardigan with a voluminous shawl line and cozy silhouette.",
    "부드러운 니팅 감촉과 포근한 드레이프 핏으로 데일리 레이어드에 어울립니다.": "Complements daily layering with a soft knit touch and warm drape fit.",
    "슬림한 라스트와 고급 소가죽 소재의 모던 첼시 부츠입니다.": "Modern Chelsea boots featuring a slim last and premium cowhide leather.",
    "착화감이 뛰어나며 감각적인 미니멀리즘 스타일을 연출해 드립니다.": "Provides outstanding comfort and a sophisticated minimalist style.",
    "프리미엄 콤마 코튼": "Premium Comma Cotton",
    "보통": "Standard",
    "없음": "None",
    "적당함": "Moderate",
    "있음": "Available",
  },
  ja: {
    "• 디자이너 노트:": "• デザイナーノート:",
    "• 소재 및 아웃핏:": "• 소재＆フィット:",
    "• 관리 안내:": "• お手入れガイド:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "choicommaオリジナルのシルエットデザインに繊細なディテールをあしらったメインコレクションの作品です。",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "最高級の素材と感性豊かなフィット設計で、ボディラインを美しく演出します。",
    "전문 드라이클리닝을 권장합니다.": "専門のドライクリーニングを推奨します。",
    "입체적인 플리츠 레이어드가 돋보이는 모던 롱 스커트입니다.": "立体的なプリーツレイヤードが際立つモダンなロングスカートです。",
    "움직일 때마다 흩날리는 감각적인 드레이핑과 편안한 밴딩 디테일입니다.": "動くたびに揺れる感性豊かなドレーピングと快適なウエストバンディング構造です。",
    "최이콤마만의 감성이 담긴 고급스러운 트위드 재킷입니다.": "choicommaならではの感性が込められた高級感あふれるツイードジャケットです。",
    "프리미엄 원사와 섬세한 버튼 디테일이 돋보이는 모던 클래식 아우터입니다.": "プレミアム糸と繊細なボタンディテールが特徴のモダンクラシックアウターです。",
    "부드러운 촉감과 은은한 광택감이 감도는 럭셔리 코트입니다.": "柔らかい肌触りと上品な光沢感が漂うラグジュアリーコートです。",
    "100% 최고급 원단으로 제작되어 우수한 보온성과 오버핏 핏감을 선사합니다.": "100%最高級生地で制作され、優れた保温性とオーバーフィット感を提供します。",
    "우아한 드레이핑 라인이 돋보이는 실크 터치 블라우스입니다.": "エレガントなドレープライントが映えるシルクタッチブラウスです。",
    "세련된 넥라인과 여유로운 핏으로 단품 및 레이어드 착장에 완벽합니다.": "洗練されたネックラインとゆったりとしたフィット感でレイヤードに最適です。",
    "깔끔하게 떨어지는 핀턱 핏의 울 와이드 팬츠입니다.": "すっきりと落ちるピンタックフィットのウールワイドパンツです。",
    "다리 라인을 길고 슬림하게 연출해 주는 최고급 구조감의 스트레이트 핏입니다.": "脚長・美脚効果を発揮するハイエンドなストレートフィット構造です。",
    "구조적인 형태감이 돋보이는 모던 가죽 토트백입니다.": "構造的なフォルムが際立つモダンなレザートートバッグです。",
    "이태리 가죽 질감과 아티스틱한 하드웨어가 조합된 데일리 미니멀 백입니다.": "イタリアンレザーの質感とアーティスティックなパーツを組み合わせたデイリーバッグです。",
    "은은한 광택과 실키한 터치감의 하이엔드 오버핏 셔츠입니다.": "上品な光沢とシルキーな肌触りのハイエンドオーバーサイズシャツです。",
    "드레이핑감 있는 프리미엄 소재를 활용해 고품격 룩을 연출합니다.": "ドレープ感のあるプレミアム素材を使用し、高級感のあるスタイルを演出します。",
    "볼륨감 넘치는 숄 라인과 아늑한 실루엣의 케이프 가디건입니다.": "ボリューム感のあるショールラインと温かみのあるシルエットのケープカーディガンです。",
    "부드러운 니팅 감촉과 포근한 드레이프 핏으로 데일리 레이어드에 어울립니다.": "柔らかいニットの肌触りと心地よいドレープフィットでデイリーレイヤードに最適です。",
    "슬림한 라스트와 고급 소가죽 소재의 모던 첼시 부츠입니다.": "スリムなラストと高級牛革素材의モダンなチェルシーブーツです。",
    "착화감이 뛰어나며 감각적인 미니멀리즘 스타일을 연출해 드립니다.": "優れた履き心地と洗練されたミニマリズムスタイルを提供します。",
    "프리미엄 콤마 코튼": "プレミアムコンマコットン",
    "보통": "普通",
    "없음": "なし",
    "적당함": "適度",
    "있음": "あり",
  },
  zh: {
    "• 디자이너 노트:": "• 设计师手记:",
    "• 소재 및 아웃핏:": "• 面料与剪裁:",
    "• 관리 안내:": "• 洗涤保养:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "choicomma 原创廓形设计，以细腻精致的细节呈现的主推系列作品。",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "采用顶级面料与感官剪裁，完美勾勒优雅身姿。",
    "전문 드라이클리닝을 권장합니다.": "建议使用专业干洗。",
    "프리미엄 콤마 코튼": "高级 Comma 棉",
    "보통": "适中",
    "없음": "无",
    "적당함": "适中",
    "있음": "有",
  },
  fr: {
    "• 디자이너 노트:": "• Note du designer:",
    "• 소재 및 아웃핏:": "• Tissu et coupe:",
    "• 관리 안내:": "• Entretien:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "Silhouette originale choicomma confectionnée avec des détails délicats pour la collection principale.",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "Conçu avec des tissus haut de gamme et une coupe élégante sublimant la silhouette.",
    "전문 드라이클리닝을 권장합니다.": "Nettoyage à sec professionnel recommandé.",
    "프리미엄 콤마 코튼": "Coton Premium Comma",
    "보통": "Standard",
    "없음": "Aucun",
    "적당함": "Moyen",
    "있음": "Oui",
  },
  de: {
    "• 디자이너 노트:": "• Designer-Hinweis:",
    "• 소재 및 아웃핏:": "• Material & Passform:",
    "• 관리 안내:": "• Pflegehinweis:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "Original choicomma Silhouette, gefertigt mit feinen Details für die Hauptkollektion.",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "Hergestellt aus feinsten Materialien und einer eleganten Passform, die die Silhouette betont.",
    "전문 드라이클리닝을 권장합니다.": "Professionelle Trockenreinigung empfohlen.",
    "프리미엄 콤마 코튼": "Premium Comma Baumwolle",
    "보통": "Normal",
    "없음": "Keine",
    "적당함": "Mittel",
    "있음": "Vorhanden",
  },
  es: {
    "• 디자이너 노트:": "• Nota del diseñador:",
    "• 소재 및 아웃핏:": "• Tela y ajuste:",
    "• 관리 안내:": "• Guía de cuidado:",
    "choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.": "Silueta original de choicomma diseñada con delicados detalles para la colección principal.",
    "최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.": "Diseñado con telas de primera calidad y un ajuste elegante que resalta la silueta.",
    "전문 드라이클리닝을 권장합니다.": "Se recomienda lavado en seco profesional.",
    "프리미엄 콤마 코튼": "Algodón Premium Comma",
    "보통": "Normal",
    "없음": "Ninguno",
    "적당함": "Moderado",
    "있음": "Sí",
  },
};

/**
 * Translate a product title into the current or specified target language
 */
export function translateProductTitle(title: string, targetLang?: string): string {
  if (!title) return "";
  const lang = targetLang || getCurrentLanguage();
  if (lang === "ko") return title;

  // 1. Check exact dictionary match
  const exactDict = PRODUCT_TITLE_DICTIONARY[title];
  if (exactDict && exactDict[lang]) {
    return exactDict[lang];
  }

  // 2. Check base title without parenthetical English text like " (Signature Tweed Jacket)"
  const baseTitle = title.replace(/\s*\([^)]*\)/g, "").trim();
  if (baseTitle && baseTitle !== title) {
    const baseDict = PRODUCT_TITLE_DICTIONARY[baseTitle];
    if (baseDict && baseDict[lang]) {
      return baseDict[lang];
    }
  }

  // 3. Fallback word replacement
  let translated = baseTitle || title;
  const wordDict = WORD_TRANSLATIONS[lang];
  if (wordDict) {
    const sortedKeys = Object.keys(wordDict).sort((a, b) => b.length - a.length);
    sortedKeys.forEach((krWord) => {
      if (translated.includes(krWord)) {
        translated = translated.replaceAll(krWord, wordDict[krWord]);
      }
    });
  }

  return translated;
}

/**
 * Translate a product description or detail text into the current or specified target language
 */
export function translateProductDescription(desc: string, targetLang?: string): string {
  if (!desc) return "";
  const lang = targetLang || getCurrentLanguage();
  if (lang === "ko") return desc;

  const dict = PRODUCT_DESC_DICTIONARY[lang];
  if (!dict) return desc;

  let translated = desc;
  Object.keys(dict).forEach((krKey) => {
    if (translated.includes(krKey)) {
      translated = translated.replaceAll(krKey, dict[krKey]);
    }
  });

  return translated;
}
