import { Product } from "../types";
import { excelParsedProducts } from "./excel-products";

export const mockProducts: Product[] = [
  {
    id: "verde-leather-lounge-chair",
    handle: "verde-leather-lounge-chair",
    title: "코스탈 워시드 트위드 베스트",
    description:
      "워시드 감성의 트위드 텍스처와 세련된 실루엣이 돋보이는 시즌 베스트.",
    descriptionHtml:
      "<p>코스탈 워시드 트위드 베스트는 클래식한 트위드 소재를 현대적이고 내추럴한 워싱 감성으로 재해석한 베스트입니다.</p>",
    categoryId: "outer",
    tags: ["OUTER"],
    isMainFeatured: true,
    featuredImage: {
      altText: "코스탈 워시드 트위드 베스트",
      url: "/model_1.jpg",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "499",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "499",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "코스탈 워시드 트위드 베스트",
        url: "/model_1.jpg",
        width: 1200,
        height: 1200,
      },
      {
        altText: "코스탈 워시드 트위드 베스트",
        url: "/model_1.jpg",
        width: 1200,
        height: 1200,
      },
      {
        altText: "코스탈 워시드 트위드 베스트",
        url: "/model_1.jpg",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  // Outerwear Category Products (38 Products from /public/outer)
  ...[
    { name: "울 카시미어 벨티드 롱 코트", file: "OUTER_1.jpg", price: "890,000", desc: "최상급 울과 카시미어 혼방 소재로 기품 있는 실루엣을 전하는 럭셔리 코트." },
    { name: "클래식 오버사이즈 랩 자켓", file: "OUTER_2.jpg", price: "640,000", desc: "감각적인 오버핏 실루엣과 고급스러운 벨트 디테일이 조화로운 오버사이즈 자켓." },
    { name: "노치드 라펠 스트럭처 트렌치 코트", file: "OUTER_3.jpg", price: "720,000", desc: "구조적인 노치드 라펠과 모던한 아웃라인으로 완성된 프리미엄 트렌치." },
    { name: "프리미엄 램스킨 트러커 자켓", file: "OUTER_4.jpg", price: "1,150,000", desc: "부드러운 양가죽 터치감과 세련된 스티치 디테일의 하이엔드 무드 자켓." },
    { name: "미니멀 울 드레이프 패딩 코트", file: "OUTER_5.jpg", price: "780,000", desc: "가볍고 따뜻한 충전재와 유연한 울 소재가 연출하는 드레이프 라인." },
    { name: "실크 블렌드 오버핏 부클레 코트", file: "OUTER_6.jpg", price: "930,000", desc: "포근한 부클레 텍스처와 아늑한 핏이 돋보이는 모던 아우터." },
    { name: "클래식 테일러드 숏 트렌치", file: "OUTER_7.jpg", price: "590,000", desc: "활동성이 우수한 숏 길이감과 정교한 테일러링이 돋보이는 아이템." },
    { name: "럭셔리 더블 브레스티드 자켓", file: "OUTER_8.jpg", price: "680,000", desc: "더블 버튼 배치로 고전적이면서도 세련된 분위기를 연출하는 브레이저." },
    { name: "캐시미어 믹스 크롭 가디건 자켓", file: "OUTER_9.jpg", price: "480,000", desc: "부드러운 캐시미어 믹스 텍스처와 현대적인 크롭 비율의 라인." },
    { name: "헤링본 트위드 오버사이즈 자켓", file: "OUTER_10.jpg", price: "610,000", desc: "클래식 패턴 헤링본 트위드 소재의 아우터." },
    { name: "프렌치 라이더스 리얼 레더 코트", file: "OUTER_11.jpg", price: "1,280,000", desc: "프렌치 감성의 리얼 레더 질감이 가미된 롱 트렌치 핏 아우터." },
    { name: "하운드투스 스티치 테일러드 자켓", file: "OUTER_12.jpg", price: "650,000", desc: "하운드투스 텍스처와 깔끔한 봉제 기술로 마감된 클래식 자켓." },
    { name: "스트럭처드 케이프 하프 코트", file: "OUTER_13.jpg", price: "820,000", desc: "우아하게 흐르는 케이프 디자인과 실용성을 동시에 갖춘 아우터." },
    { name: "소프트 램스킨 크롭 점퍼", file: "OUTER_14.jpg", price: "990,000", desc: "소프트 레더의 질감이 시크한 무드를 연출해주는 크롭 아우터." },
    { name: "벨벳 칼라 라펠 울 롱 코트", file: "OUTER_15.jpg", price: "940,000", desc: "깃 부분 벨벳 포인트 처리로 디테일 완성도를 높인 프리미엄 코트." },
    { name: "시그니처 버튼 벨티드 트렌치", file: "OUTER_16.jpg", price: "750,000", desc: "choicomma 만의 시그니처 각인 버튼이 돋보이는 벨티드 트렌치." },
    { name: "알파카 블렌드 플러피 자켓", file: "OUTER_17.jpg", price: "870,000", desc: "알파카 헤어가 믹스되어 고급스럽고 따뜻한 플러피 질감 아우터." },
    { name: "모던 카키 오버핏 라이트 점퍼", file: "OUTER_18.jpg", price: "460,000", desc: "어디에나 가볍게 레이어드할 수 있는 감각적인 아웃핏 점퍼." },
    { name: "울 터틀넥 다운 실루엣 베스트", file: "OUTER_19.jpg", price: "520,000", desc: "넥 라인을 따뜻하게 감싸주며 실루엣을 보완해주는 아우터 베스트." },
    { name: "체크 패턴 싱글 롱 롱코트", file: "OUTER_20.jpg", price: "790,000", desc: "은은한 체크 패턴의 깊이감으로 단정한 스타일을 선보이는 코트." },
    { name: "수피마 코튼 윈드브레이커", file: "OUTER_21.jpg", price: "390,000", desc: "최상급 수피마 코튼 믹스 소재로 내구성과 착용감이 정갈한 점퍼." },
    { name: "드레이프 숄더 패디드 카디건", file: "OUTER_22.jpg", price: "430,000", desc: "숄더 라인의 부드러운 패딩감으로 차분한 무드를 연출하는 아우터." },
    { name: "럭스 퍼 칼라 가죽 라이더", file: "OUTER_23.jpeg", price: "1,100,000", desc: "탈부착 가능한 칼라 넥과 럭셔리 레더 핏 라이더 자켓." },
    { name: "울 가브리엘 리버서블 하프 코트", file: "OUTER_24.png", price: "880,000", desc: "양면으로 다양한 스타일링이 가능한 실용적인 리버서블 하프 코트." },
    { name: "캐주얼 라운드 넥 누빔 점퍼", file: "OUTER_25.png", price: "380,000", desc: "경량 충전재 누빔으로 정교하고 감각적인 데일리 라이트 아우터." },
    { name: "클래식 카멜 톤 벨티드 롱코트", file: "OUTER_26.png", price: "920,000", desc: "깊이 있는 카멜 톤과 우아한 벨트 스트랩으로 완성되는 세련된 코트." },
    { name: "소프트 터치 울 블레이저", file: "OUTER_27.png", price: "580,000", desc: "매끄럽게 유연한 터치감으로 바디 라인을 정돈해주는 울 블레이저." },
    { name: "스웨이드 텍스처 하프 자켓", file: "OUTER_28.png", price: "670,000", desc: "스웨이드 원단의 매력적인 깊이감과 트렌디한 하프 기장 아우터." },
    { name: "헤비 웨이트 트위드 카디건 코트", file: "OUTER_29.png", price: "710,000", desc: "짜임새 있는 묵직한 트위드 질감과 카디건 스타일이 만난 아우터." },
    { name: "모던 숏 패딩 트렌치", file: "OUTER_30.png", price: "540,000", desc: "트렌치 코트의 디테일과 패딩의 따뜻함을 조화롭게 결합한 점퍼." },
    { name: "프리미엄 세무 슬림핏 브레이저", file: "OUTER_31.png", price: "630,000", desc: "슬림하게 연출되는 실루엣과 감각적인 질감의 하이엔드 브레이저." },
    { name: "오프화이트 케이블 울 가디건", file: "OUTER_32.png", price: "410,000", desc: "포근한 오프화이트 컬러와 케이블 조직으로 고급스러움을 담은 아우터." },
    { name: "벨티드 울 랩 카디건", file: "OUTER_33.png", price: "450,000", desc: "자연스럽게 감싸 묶어 연출하는 감성적인 울 랩 카디건 코트." },
    { name: "슬림 드레이프 트렌치 코트", file: "OUTER_34.png", price: "760,000", desc: "가볍고 입체적인 드레이프 라인으로 시크함을 더해주는 트렌치." },
    { name: "크롭 실루엣 라이트 코트", file: "OUTER_35.png", price: "520,000", desc: "경쾌한 크롭 실루엣과 정교한 마감으로 눈길을 사로잡는 자켓." },
    { name: "소프트 베이지 더블 브레스티드", file: "OUTER_36.png", price: "690,000", desc: "부드러운 베이지 컬러감으로 여성스러움을 부각해주는 더블 자켓." },
    { name: "시그니처 울 트러커 자켓", file: "OUTER_37.png", price: "610,000", desc: "트러커 자켓 특유의 클래식 핏에 고품질 울을 적용한 모던 아우터." },
    { name: "시크릿 VIP 하이엔드 무스탕 코트", file: "OUTER_38.png", price: "1,450,000", desc: "탁월한 보온성과 압도적인 럭셔리 아우라를 선사하는 롱 무스탕." }
  ].map((item, idx) => ({
    id: `outer-product-${idx + 1}`,
    handle: `outer-product-${idx + 1}`,
    title: item.name,
    description: item.desc,
    detailDescription: `• 고급 원단 사양: ${item.name}은(는) 최고급 소재 원사 수급 및 섬세한 봉제 공정으로 제작되어 압도적인 고품격 텍스처를 구현합니다.\n• 핏 & 실루엣: 입체 패턴 설계로 정갈하고 세련된 착용감을 안겨줍니다.\n• 관리 안내: 전문 드라이클리닝 권장 / 습기가 적고 그늘진 곳에 보관하세요.`,
    descriptionHtml: `<p>${item.desc}</p>`,
    categoryId: "outer",
    tags: idx < 5 ? ["BEST", "NEW"] : ["OUTER"],
    isMainFeatured: idx < 2 ? true : undefined,
    featuredImage: {
      altText: item.name,
      url: `/outer/${item.file}`,
      width: 1000,
      height: 1250,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: item.price.replace(/,/g, ""),
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: item.price.replace(/,/g, ""),
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: item.name,
        url: `/outer/${item.file}`,
        width: 1000,
        height: 1250,
      },
    ],
    options: [
      {
        id: "size",
        name: "Size",
        values: [
          { id: "1", name: "1" },
          { id: "2", name: "2" },
          { id: "3", name: "3" },
        ],
      },
    ],
    seo: { title: item.name, description: item.desc },
    variants: [
      {
        id: `outer-var-${idx + 1}-1`,
        title: `${item.name} - 1`,
        availableForSale: true,
        selectedOptions: [{ name: "size", value: "1" }],
        price: { amount: item.price.replace(/,/g, ""), currencyCode: "KRW" },
      },
      {
        id: `outer-var-${idx + 1}-2`,
        title: `${item.name} - 2`,
        availableForSale: true,
        selectedOptions: [{ name: "size", value: "2" }],
        price: { amount: item.price.replace(/,/g, ""), currencyCode: "KRW" },
      },
    ],
  })),
  // TOP Category Products (17 Products from /public/top)
  ...[
    { name: "실크 블렌드 라운드 블라우스", file: "TOP_1.jpg", price: "320,000", desc: "은은한 윤택감과 유연한 실루엣이 연출되는 럭셔리 실크 블라우스." },
    { name: "소프트 텐셀 슬림 피티드 티셔츠", file: "TOP_5.jpg", price: "128,000", desc: "극상의 부드러움을 주는 텐셀 원단의 데일리 슬림 탑." },
    { name: "파인 Gauge 리브드 시스루 셔츠", file: "TOP_7.jpg", price: "245,000", desc: "감각적인 골지 리브 조직과 은은한 시스루 미학의 블라우스." },
    { name: "수피마 코튼 오버핏 모던 셔츠", file: "TOP_9.jpg", price: "198,000", desc: "정갈하게 바디 라인을 떨어뜨리는 세련된 오버핏 코튼 셔츠." },
    { name: "클래식 셔링 칼라 시폰 탑", file: "TOP_10.jpg", price: "260,000", desc: "넥 라인 셔링 디테일로 페미닌한 감성을 살린 미니멀 셔츠." },
    { name: "크롭 스퀘어 넥 골지 탑", file: "TOP_11.jpg", price: "145,000", desc: "데콜테 라인을 부각시켜주는 감각적인 스퀘어 넥라인." },
    { name: "헤리티지 리넨 시어 버튼 탑", file: "TOP_12.jpg", price: "280,000", desc: "내추럴 리넨 텍스처와 은은한 무드를 더하는 시어 셔츠." },
    { name: "미니멀 하프 슬리브 트위드 블라우스", file: "TOP_14.jpg", price: "340,000", desc: "시즌 베스트 트위드 텍스처의 정교한 숏 슬리브 탑." },
    { name: "벨티드 웨이스트 드레이프 블라우스", file: "TOP_15.jpg", price: "310,000", desc: "허리 라인을 부드럽게 감싸 흐르는 감성적인 드레이프 라인." },
    { name: "소프트 모달 터틀넥 시스루 티", file: "TOP_16.jpg", price: "135,000", desc: "레이어드룩에 필수적인 포근하고 정갈한 터틀넥 탑." },
    { name: "실크 캐미솔 라인 하프 블라우스", file: "TOP_17.jpg", price: "290,000", desc: "여성스러운 아웃라인과 우아한 소재감이 완성한 블라우스." },
    { name: "헤링본 텍스처 버튼업 숏 슬리브", file: "TOP_19.jpg", price: "220,000", desc: "섬세한 하이엔드 조직감으로 감각을 끌어올린 상의." },
    { name: "볼륨 슬리브 테일러드 셔츠", file: "TOP_21.jpg", price: "275,000", desc: "소매 입체 볼륨감으로 시크한 실루엣을 완성하는 트렌디 셔츠." },
    { name: "클래식 오프숄더 리브드 탑", file: "TOP_22.jpg", price: "168,000", desc: "숄더 라인을 돋보이게 해주는 드레시한 골지 오프숄더." },
    { name: "수피마 코튼 브이넥 모던 셔츠", file: "TOP_23.jpg", price: "210,000", desc: "깊이 있는 브이넥과 클린한 라인의 데일리 리얼 클래식 셔츠." },
    { name: "소프트 테리 넥라인 크롭 티", file: "TOP_24.jpg", price: "115,000", desc: "활동성과 포근한 터치감을 모두 갖춘 크롭 컷 상의." },
    { name: "럭스 레이스 패널드 실크 셔츠", file: "TOP_25.jpg", price: "360,000", desc: "디테일 레이스 포인트로 유니크함을 자아내는 럭셔리 실크 상의." }
  ].map((item, idx) => ({
    id: `top-product-${idx + 1}`,
    handle: `top-product-${idx + 1}`,
    title: item.name,
    description: item.desc,
    descriptionHtml: `<p>${item.desc}</p>`,
    categoryId: "top",
    tags: idx < 3 ? ["BEST", "NEW"] : ["TOP"],
    featuredImage: {
      altText: item.name,
      url: `/top/${item.file}`,
      width: 1000,
      height: 1250,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: item.price.replace(/,/g, ""),
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: item.price.replace(/,/g, ""),
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: item.name,
        url: `/top/${item.file}`,
        width: 1000,
        height: 1250,
      },
    ],
    options: [],
    seo: { title: item.name, description: item.desc },
    variants: [],
  })),
  {
    id: "azure-folding-metal-chair-top",
    handle: "azure-folding-metal-chair-top",
    title: "Azure Folding Metal Chair",
    description:
      "A bold electric-blue folding chair made of powder-coated steel — lightweight, stackable, and ready for any space.",
    descriptionHtml:
      "<p>Bold, functional, and effortlessly cool — the Azure Folding Chair adds a vibrant pop of color wherever you need extra seating. Built from powder-coated steel in a striking electric blue, it's lightweight yet durable, perfect for casual dining, events, or creative studios. Folds flat for easy storage and transport.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 78 cm height × 44 cm width × 45 cm depth</li>\r\n  <li><strong>Material:</strong> Powder-coated steel</li>\r\n  <li><strong>Color:</strong> Matte electric blue</li>\r\n  <li><strong>Weight Capacity:</strong> Up to 100 kg (220 lbs)</li>\r\n  <li><strong>Storage:</strong> Folds flat for easy stacking</li>\r\n  <li><strong>Assembly:</strong> No assembly required</li>\r\n</ul>\r\n\r\n<p>A practical classic reimagined with a bold, contemporary twist.</p>",
    categoryId: "top",
    tags: [],
    featuredImage: {
      altText: "Azure Folding Metal Chair",
      url: "/product_1.webp",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "78",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "78",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Azure Folding Metal Chair",
        url: "/product_1.webp",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "blue",
            name: "Blue",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "azure-folding-metal-chair-1",
        title: "Azure Folding Metal Chair",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "blue",
          },
        ],
        price: {
          amount: "78",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "ra-round-velvet-cushion",
    handle: "ra-round-velvet-cushion",
    title: "Ra Round Velvet Cushion",
    description:
      "A round velvet cushion in bold pink with soft pleats and plush comfort — playful, modern, and cozy.",
    descriptionHtml:
      "<p>The Ra Cushion is a plush round accent that brings softness and style in equal measure. Wrapped in a rich pink velvet with deep radial tufting, it adds a sculptural touch to sofas, beds, or lounge chairs. The compact, donut-inspired shape makes it a playful yet elegant addition to any cozy corner.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 38 cm diameter × 10 cm height</li>\r\n  <li><strong>Material:</strong> Velvet cover, polyfill interior</li>\r\n  <li><strong>Color:</strong> Bright pink</li>\r\n  <li><strong>Texture:</strong> Soft-touch with gathered pleats</li>\r\n  <li><strong>Closure:</strong> Hidden zipper</li>\r\n  <li><strong>Care:</strong> Spot clean only</li>\r\n</ul>\r\n\r\n<p>Perfect for layering, lounging, or adding a bold color pop to any modern setting.</p>",
    categoryId: "accessory",
    tags: [],
    featuredImage: {
      altText: "Ra Round Velvet Cushion",
      url: "/product_2.webp",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "150",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "150",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Ra Round Velvet Cushion",
        url: "/product_2.webp",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "yellow",
            name: "Yellow",
          },
          {
            id: "pink",
            name: "Pink",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "ra-round-velvet-cushion-1",
        title: "Ra Round Velvet Cushion",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "yellow",
          },
        ],
        price: {
          amount: "150",
          currencyCode: "KRW",
        },
      },
      {
        id: "ra-round-velvet-cushion-2",
        title: "Ra Round Velvet Cushion",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "pink",
          },
        ],
        price: {
          amount: "150",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "nagoya-sculptural-table-lamp",
    handle: "nagoya-sculptural-table-lamp",
    title: "Nagoya Sculptural Table Lamp",
    description:
      "A sculptural gloss black table lamp with brass details — bold, elegant, and built to glow with character.",
    descriptionHtml:
      "<p>The Nagoya Table Lamp fuses art deco flair with futuristic design. Its bold, high-gloss black body rises into a sculptural silhouette, topped with a shallow disc shade in matching black and brushed brass accents. A true statement piece, it casts ambient light that feels both moody and elegant — ideal for nightstands, consoles, or dramatic corners.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 50 cm height × 28 cm diameter</li>\r\n  <li><strong>Materials:</strong> Lacquered metal, brushed brass detailing</li>\r\n  <li><strong>Finish:</strong> Gloss black with warm brass trim</li>\r\n  <li><strong>Light Source:</strong> Integrated LED (dimmable)</li>\r\n  <li><strong>Switch:</strong> Brass touch button on base</li>\r\n  <li><strong>Cord:</strong> 1.8 m black fabric cord</li>\r\n</ul>\r\n\r\n<p>A showstopping lamp that elevates any interior with its refined form and cinematic presence.</p>",
    categoryId: "accessory",
    tags: [],
    featuredImage: {
      altText: "Nagoya Sculptural Table Lamp",
      url: "/product_3.webp",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "179",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "179",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Nagoya Sculptural Table Lamp",
        url: "/product_3.webp",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "ranch-hide-patchwork-rug",
    handle: "ranch-hide-patchwork-rug",
    title: "Ranch Hide Patchwork Rug",
    description:
      "A hand-stitched cowhide patchwork rug with rich tones and natural spotted patterns — rugged, warm, and one-of-a-kind.",
    descriptionHtml:
      "<p>The Ranch Rug blends natural textures and wild elegance in a striking patchwork of genuine cowhide. Featuring a mosaic of hand-cut shapes in rich browns, creams, and spotted patterns, it brings a bold, organic touch to modern or rustic spaces. Each rug is one-of-a-kind, with unique color variations and textures that make it a true statement piece.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 160 cm × 230 cm</li>\r\n  <li><strong>Material:</strong> 100% natural cowhide, felt backing</li>\r\n  <li><strong>Colors:</strong> Mixed browns, whites, blacks with spotted detail</li>\r\n  <li><strong>Construction:</strong> Hand-stitched patchwork</li>\r\n  <li><strong>Backing:</strong> Soft non-slip felt</li>\r\n  <li><strong>Care:</strong> Spot clean with damp cloth; avoid soaking</li>\r\n</ul>\r\n\r\n<p>Each piece is a work of natural art — durable, warm, and crafted to bring character to your floor.</p>",
    categoryId: "accessory",
    tags: [],
    featuredImage: {
      altText: "Ranch Hide Patchwork Rug",
      url: "/product_4.webp",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "349",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "349",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Ranch Hide Patchwork Rug",
        url: "/product_4.webp",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "nest-black-pendant-lamp",
    handle: "nest-black-pendant-lamp",
    title: "Nest Black Pendant Lamp",
    description:
      "A matte black pendant lamp with a woven texture and warm gold interior—minimal, moody, and refined.",
    descriptionHtml:
      "<p>The Nest Pendant Lamp brings understated elegance to any room with its clean lines and tactile texture. Crafted from matte black woven material, the shade features a softly tapered top and cylindrical form that casts a warm, focused glow. Ideal for dining areas, entryways, or cozy corners, this fixture adds quiet drama without overpowering the space.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 28 cm height × 24 cm diameter</li>\r\n  <li><strong>Materials:</strong> Woven resin over metal frame</li>\r\n  <li><strong>Finish:</strong> Matte black exterior, warm gold interior</li>\r\n  <li><strong>Light Source:</strong> E26/E27 bulb (not included)</li>\r\n  <li><strong>Cord:</strong> 1.5 m adjustable black fabric cable</li>\r\n  <li><strong>Installation:</strong> Ceiling canopy included</li>\r\n</ul>\r\n\r\n<p>A versatile pendant with textural depth — modern, moody, and quietly sculptural.</p>",
    categoryId: "top",
    tags: [],
    featuredImage: {
      altText: "Nest Black Pendant Lamp",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwd5f101a4/images/v0/Nest_lamp_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "139",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "139",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Nest Black Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwd5f101a4/images/v0/Nest_lamp_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Nest Black Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwf4300cad/images/v0/Nest_lamp_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Nest Black Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwca0dcf73/images/v0/Nest_lamp_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "duna-pistachio-lounge-chair",
    handle: "duna-pistachio-lounge-chair",
    title: "Duna Pistachio Lounge Chair",
    description:
      "A sculptural lounge chair in pistachio green with wood legs — soft curves and fresh color for modern interiors.",
    descriptionHtml:
      "<p>The Duna Lounge Chair brings soft curves and fresh color to modern interiors. Upholstered in a smooth pistachio green finish with a molded silhouette and subtle button details, it combines comfort and style effortlessly. The solid wood legs offer a warm, natural contrast, making this chair an inviting accent for living rooms, reading nooks, or creative studios.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 76 cm height × 65 cm width × 70 cm depth</li>\r\n  <li><strong>Materials:</strong> Molded foam, vegan leather, solid wood legs</li>\r\n  <li><strong>Finish:</strong> Pistachio green upholstery with natural wood base</li>\r\n  <li><strong>Comfort:</strong> Ergonomic shape with arm support and soft backrest</li>\r\n  <li><strong>Weight Capacity:</strong> Up to 130 kg (287 lbs)</li>\r\n  <li><strong>Assembly:</strong> Legs attach easily with included tools</li>\r\n</ul>\r\n\r\n<p>Playful yet refined — the Duna chair brings personality and poise to any modern space.</p>",
    categoryId: "bottom",
    tags: [],
    featuredImage: {
      altText: "Duna Pistachio Lounge Chair",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwb04cdd99/images/v0/Duna_Seat_Color_Green_2.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "229",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "229",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Duna Pistachio Lounge Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwb04cdd99/images/v0/Duna_Seat_Color_Green_2.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "pistachio",
            name: "Pistachio",
          },
          {
            id: "pistachio/cream",
            name: "Pistachio/Cream",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "duna-pistachio-lounge-chair-1",
        title: "Duna Pistachio Lounge Chair",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "pistachio",
          },
        ],
        price: {
          amount: "229",
          currencyCode: "KRW",
        },
      },
      {
        id: "duna-pistachio-lounge-chair-2",
        title: "Duna Pistachio Lounge Chair",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "pistachio/cream",
          },
        ],
        price: {
          amount: "229",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "suryai-glass-table-lamp",
    handle: "suryai-glass-table-lamp",
    title: "Suryai Glass Table Lamp",
    description:
      "A classic table lamp with a glossy black glass base and cream shade — refined, warm, and timeless.",
    descriptionHtml:
      "<p>The Suryai Table Lamp brings timeless elegance and subtle contrast to your space. Featuring a high-gloss black glass base in a soft teardrop shape and topped with a classic cream fabric shade, it delivers warm, ambient lighting with refined style. Perfect for bedside tables, living room consoles, or reading nooks.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 52 cm height × 33 cm diameter (shade)</li>\r\n  <li><strong>Material:</strong> Hand-blown glass base, linen-blend fabric shade</li>\r\n  <li><strong>Color:</strong> Glossy black base with natural cream shade</li>\r\n  <li><strong>Light Source:</strong> E27 bulb (not included)</li>\r\n  <li><strong>Cord:</strong> 1.8 m with inline switch</li>\r\n  <li><strong>Care:</strong> Wipe base with soft cloth; dust shade as needed</li>\r\n</ul>\r\n\r\n<p>An effortlessly sophisticated lighting piece that elevates any setting with warmth and poise.</p>",
    categoryId: "bag",
    tags: [],
    featuredImage: {
      altText: "Suryai Glass Table Lamp",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw0032bc64/images/v0/Suryai_lamp_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "139",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "139",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Suryai Glass Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw0032bc64/images/v0/Suryai_lamp_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Suryai Glass Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw596ba978/images/v0/Suryai_lamp_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Suryai Glass Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw30e82fc0/images/v0/Suryai_lamp_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "adhana-wooden-pendant-lamp",
    handle: "adhana-wooden-pendant-lamp",
    title: "Adhana Wooden Pendant Lamp",
    description:
      "A handcrafted wood pendant lamp with a sculpted cone shape, perfect for adding natural warmth and soft light to your space.",
    descriptionHtml:
      "<p>The Adhana Pendant Lamp brings warmth and organic charm to any interior. Crafted from natural wood with a smooth, sculpted silhouette, this lamp blends minimalism and nature in a timeless cone shape that radiates soft, downward light—perfect over dining tables, kitchen islands, or cozy corners.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 28 cm height × 26 cm diameter</li>\r\n  <li><strong>Material:</strong> Solid natural wood</li>\r\n  <li><strong>Finish:</strong> Satin clear coat to highlight grain</li>\r\n  <li><strong>Light Source:</strong> E27 bulb (not included)</li>\r\n  <li><strong>Cord:</strong> 1.2 meters adjustable textile cable</li>\r\n  <li><strong>Mounting:</strong> Ceiling canopy included</li>\r\n</ul>\r\n\r\n<p>A sculptural statement with soft lighting and natural elegance — ideal for modern and rustic spaces alike.</p>",
    categoryId: "shoes",
    tags: [],
    featuredImage: {
      altText: "Adhana Wooden Pendant Lamp",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw78f76816/images/v0/Adhana_lamp_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "130",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "130",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Adhana Wooden Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw78f76816/images/v0/Adhana_lamp_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Adhana Wooden Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw638944b4/images/v0/Adhana_lamp_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Adhana Wooden Pendant Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw4464a4cb/images/v0/Adhana_lamp_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "beige",
            name: "Beige",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "adhana-wooden-pendant-lamp-1",
        title: "Adhana Wooden Pendant Lamp",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "beige",
          },
        ],
        price: {
          amount: "130",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "bliss-arched-desk-lamp",
    handle: "bliss-arched-desk-lamp",
    title: "Bliss Arched Desk Lamp",
    description:
      "A softly curved matte white desk lamp with a wood base and gold accent, perfect for warm, focused lighting.",
    descriptionHtml:
      "<p>The Bliss Desk Lamp is a calming blend of soft curves and warm materials. Featuring a smooth matte dome shade, arched metal arm, and a solid wood base, it brings modern serenity to any workspace or bedside. The subtle gold accent adds just enough contrast to elevate its clean design.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 42 cm height × 18 cm diameter (base)</li>\r\n  <li><strong>Materials:</strong> Powder-coated metal, natural wood base</li>\r\n  <li><strong>Finish:</strong> Matte white with brass detail</li>\r\n  <li><strong>Light Source:</strong> E14 bulb (not included)</li>\r\n  <li><strong>Cord:</strong> 1.5 m fabric cord with inline switch</li>\r\n  <li><strong>Ideal For:</strong> Desks, nightstands, and reading corners</li>\r\n</ul>\r\n\r\n<p>Designed to create a soft and stylish glow wherever you need focus or calm.</p>",
    categoryId: "accessory",
    tags: [],
    featuredImage: {
      altText: "Bliss Arched Desk Lamp",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw89d99b7b/images/v0/Bliss_lamp_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "109",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "109",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Bliss Arched Desk Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw89d99b7b/images/v0/Bliss_lamp_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Bliss Arched Desk Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwf996e044/images/v0/Bliss_lamp_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Bliss Arched Desk Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw5c36b30d/images/v0/Bliss_lamp_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "beige",
            name: "Beige",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "bliss-arched-desk-lamp-1",
        title: "Bliss Arched Desk Lamp",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "beige",
          },
        ],
        price: {
          amount: "109",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "sheila-round-waterflow-rug",
    handle: "sheila-round-waterflow-rug",
    title: "Sheila Round Waterflow Rug",
    description:
      "A round rug with flowing blue tones and a water-inspired pattern — soft, modern, and serene.",
    descriptionHtml:
      "<p>The Sheila Rug makes a serene splash with its flowing, water-inspired pattern in layered shades of blue and soft white. Crafted in a circular shape, this modern rug brings movement and calm to any space — from living rooms to bedrooms or creative studios. Its low-pile, tufted texture offers both visual depth and soft comfort underfoot.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 150 cm diameter</li>\r\n  <li><strong>Material:</strong> 100% polyester microfiber</li>\r\n  <li><strong>Pattern:</strong> Abstract waterflow in navy, teal, and ice blue</li>\r\n  <li><strong>Texture:</strong> Tufted low pile for easy maintenance</li>\r\n  <li><strong>Backing:</strong> Non-slip grip base</li>\r\n  <li><strong>Care:</strong> Vacuum regularly; spot clean as needed</li>\r\n</ul>\r\n\r\n<p>Perfect for grounding your space with fluid energy and modern elegance.</p>",
    categoryId: "outer",
    tags: [],
    featuredImage: {
      altText: "Sheila Round Waterflow Rug",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwdd010e4e/images/v0/Sheila_rug_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "199",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "199",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Sheila Round Waterflow Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwdd010e4e/images/v0/Sheila_rug_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Sheila Round Waterflow Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwf95fad14/images/v0/Sheila_rug_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Sheila Round Waterflow Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw30703764/images/v0/Sheila_rug_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "faun-textured-throw-pillow",
    handle: "faun-textured-throw-pillow",
    title: "Faun Textured Throw Pillow",
    description:
      "A plush throw pillow with a raised chevron texture and gradient fade from olive to rust — cozy, earthy, and bold.",
    descriptionHtml:
      "<p>The Faun Throw Pillow brings warmth, texture, and depth to your space with its gradient olive-to-rust color fade and raised geometric pattern. Made from ultra-soft fabric with a plush insert, it's perfect for adding cozy sophistication to your sofa, lounge chair, or bed. A subtle statement piece that blends comfort and modern design.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 45 cm × 45 cm</li>\r\n  <li><strong>Material:</strong> 100% polyester cover with plush inner fill</li>\r\n  <li><strong>Color:</strong> Olive green with rust gradient base</li>\r\n  <li><strong>Texture:</strong> Raised woven chevron pattern</li>\r\n  <li><strong>Closure:</strong> Hidden zipper for easy cover removal</li>\r\n  <li><strong>Care:</strong> Spot clean or dry clean recommended</li>\r\n</ul>\r\n\r\n<p>Elevate your space with rich texture and earthy tones — the perfect accent for layered interiors.</p>",
    categoryId: "top",
    tags: [],
    featuredImage: {
      altText: "Faun Textured Throw Pillow",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw170d2e0b/images/v0/Faun_pillow_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "45",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "45",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Faun Textured Throw Pillow",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw170d2e0b/images/v0/Faun_pillow_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Faun Textured Throw Pillow",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw44a1285c/images/v0/Faun_pillow_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Faun Textured Throw Pillow",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw846f4589/images/v0/Faun_pillow_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "olive",
            name: "Olive",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "faun-textured-throw-pillow-1",
        title: "Faun Textured Throw Pillow",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "olive",
          },
        ],
        price: {
          amount: "45",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "abba-lamp",
    handle: "abba-lamp",
    title: "Abba Table Lamp",
    description:
      "A modern table lamp with a matte black conical base and green fabric shade with a gold interior — perfect for adding warm, ambient light to any space.",
    descriptionHtml:
      "<p>Minimalist elegance meets modern functionality in this table lamp. Designed with a sleek matte black conical base and a deep green fabric shade with a warm gold interior, it adds a refined touch to any space — from bedside tables to reading nooks.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 45 cm height × 30 cm diameter</li>\r\n  <li><strong>Materials:</strong> Metal base, fabric lampshade</li>\r\n  <li><strong>Finish:</strong> Matte black base with green & gold shade</li>\r\n  <li><strong>Light Source:</strong> E27 bulb (not included)</li>\r\n  <li><strong>Cord Length:</strong> 1.5 meters with inline switch</li>\r\n</ul>\r\n\r\n<p>Perfect for adding ambient light with a modern twist. Pair it with a warm LED bulb for the coziest glow.</p>",
    categoryId: "bottom",
    tags: [],
    featuredImage: {
      altText: "Abba Table Lamp",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw61cfe9cd/images/v0/Abba_lamp_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "130",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "130",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Abba Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw61cfe9cd/images/v0/Abba_lamp_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Abba Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw95a87039/images/v0/Abba_lamp_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Abba Table Lamp",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwd3e22ec5/images/v0/Abba_lamp_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "green/black",
            name: "Green/Black",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "abba-lamp-1",
        title: "Abba Table Lamp",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "green/black",
          },
        ],
        price: {
          amount: "130",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "chief-modern-lounge-chair",
    handle: "chief-modern-lounge-chair",
    title: "Chief Modern Lounge Chair",
    description:
      "A bold black lounge chair with gold legs and sculpted comfort — built to stand out in any modern space.",
    descriptionHtml:
      "<p>The Chief Lounge Chair is where bold design meets everyday luxury. Featuring a sculpted, ergonomic seat wrapped in smooth black faux leather and supported by a gleaming gold-finished frame, it makes a powerful visual statement in any space. Perfectly contoured for comfort, it's ideal for living rooms, studios, or standout corners in modern interiors.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 82 cm height × 63 cm width × 66 cm depth</li>\r\n  <li><strong>Material:</strong> Faux leather upholstery, metal base</li>\r\n  <li><strong>Finish:</strong> Matte black seat with polished gold legs</li>\r\n  <li><strong>Comfort:</strong> Padded seat and back with stitched contouring</li>\r\n  <li><strong>Weight Capacity:</strong> Up to 140 kg (308 lbs)</li>\r\n  <li><strong>Assembly:</strong> Minimal assembly required</li>\r\n</ul>\r\n\r\n<p>Command the room with a chair that blends elegance, comfort, and unmistakable presence.</p>",
    categoryId: "bag",
    tags: [],
    featuredImage: {
      altText: "Chief Modern Lounge Chair",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc0bb063d/images/v0/Chief_seat_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "249",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "249",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Chief Modern Lounge Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc0bb063d/images/v0/Chief_seat_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Chief Modern Lounge Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw1d9375cc/images/v0/Chief_seat_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Chief Modern Lounge Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwec9550e1/images/v0/Chief_seat_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "black",
            name: "Black",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "chief-modern-lounge-chair-1",
        title: "Chief Modern Lounge Chair",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "black",
          },
        ],
        price: {
          amount: "249",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "mika-minimalist-ceramic-planter",
    handle: "mika-minimalist-ceramic-planter",
    title: "Mika Minimalist Ceramic Planter",
    description:
      "A soft white ceramic planter with subtle speckles—minimalist and perfect for small indoor plants.",
    descriptionHtml:
      "<p>The Mika Planter pairs simplicity and charm in a smooth, speckled ceramic form. With its rounded silhouette and matte finish, it’s the perfect home for succulents, cacti, or small houseplants. Its neutral tone complements any color palette, making it a go-to accent for desks, shelves, or sunny windowsills.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 10 cm height × 9 cm diameter</li>\r\n  <li><strong>Material:</strong> Ceramic with matte glaze</li>\r\n  <li><strong>Color:</strong> Soft white with subtle speckles</li>\r\n  <li><strong>Drainage:</strong> No drainage hole (ideal for low-maintenance plants or use with a nursery pot)</li>\r\n  <li><strong>Use:</strong> Indoor use recommended</li>\r\n  <li><strong>Care:</strong> Wipe clean with a damp cloth</li>\r\n</ul>\r\n\r\n<p>A clean and timeless planter that adds just the right touch of greenery to your everyday spaces.</p>",
    categoryId: "shoes",
    tags: [],
    featuredImage: {
      altText: "Mika Minimalist Ceramic Planter",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw64daa1f6/images/v0/Mika_Pot_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "29",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "29",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Mika Minimalist Ceramic Planter",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw64daa1f6/images/v0/Mika_Pot_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Mika Minimalist Ceramic Planter",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc274f8ca/images/v0/Mika_Pot_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Mika Minimalist Ceramic Planter",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw7ac294a4/images/v0/Mika_pot_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "memphis-marble-pattern-rug",
    handle: "memphis-marble-pattern-rug",
    title: "Memphis Marble Pattern Rug",
    description:
      "A vibrant low-pile rug with a swirling marble pattern in orange, olive, and sand—retro energy meets modern design.",
    descriptionHtml:
      "<p>The Memphis Rug brings bold, organic movement into your space with its swirling marble-inspired pattern in fiery orange, olive, sand, and gray tones. Crafted with ultra-soft synthetic fibers and a low pile height, it’s both visually striking and cozy underfoot—perfect for anchoring living rooms, bedrooms, or creative studios with a touch of retro-modern flair.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 160 cm × 230 cm</li>\r\n  <li><strong>Material:</strong> 100% polyester with non-slip backing</li>\r\n  <li><strong>Color Palette:</strong> Burnt orange, olive, sand, gray</li>\r\n  <li><strong>Texture:</strong> Soft-touch low pile</li>\r\n  <li><strong>Care:</strong> Spot clean or vacuum regularly</li>\r\n  <li><strong>Use:</strong> Indoor only</li>\r\n</ul>\r\n\r\n<p>A standout statement piece that energizes any room with expressive color and fluid form.</p>",
    categoryId: "accessory",
    tags: [],
    featuredImage: {
      altText: "Memphis Marble Pattern Rug",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw6bf2bc74/images/v0/Memphis_rug_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "189",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "189",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Memphis Marble Pattern Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw6bf2bc74/images/v0/Memphis_rug_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Memphis Marble Pattern Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw3d7b5ccc/images/v0/Memphis_rug_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Memphis Marble Pattern Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw61b782d6/images/v0/Mmephis_rug_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "kaya-ceramic-humidifier",
    handle: "kaya-ceramic-humidifier",
    title: "Kaya Ceramic Humidifier",
    description:
      "A passive ceramic humidifier in matte olive green — stylish, silent, and ideal for dry indoor spaces.",
    descriptionHtml:
      "<p>The Kaya Ceramic Humidifier is a minimalist wellness essential that doubles as a sculptural accent. Made from matte-finish ceramic in a deep olive tone, its ridged form disperses moisture passively—no power required. Just add water and place near a heat source or sunny window to naturally improve your room’s humidity and comfort.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 18 cm height × 12 cm diameter</li>\r\n  <li><strong>Material:</strong> Unglazed ceramic</li>\r\n  <li><strong>Color:</strong> Matte olive green</li>\r\n  <li><strong>Function:</strong> Passive evaporation—no electricity needed</li>\r\n  <li><strong>Use:</strong> Fill with water; ideal for dry indoor environments</li>\r\n  <li><strong>Care:</strong> Rinse and air dry regularly</li>\r\n</ul>\r\n\r\n<p>Perfect for bedrooms, desktops, or studios — where clean design meets natural comfort.</p>",
    categoryId: "new",
    tags: [],
    featuredImage: {
      altText: "Kaya Ceramic Humidifier",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc10d27d6/images/v0/Kaya_humidifier_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "69",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "69",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc10d27d6/images/v0/Kaya_humidifier_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwafc0c7a1/images/v0/Kaya_humidifier_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc339871c/images/v0/Kaya_humidifier_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "kaya-ceramic-humidifier-2",
    handle: "kaya-ceramic-humidifier-2",
    title: "Kaya Ceramic Humidifier",
    description:
      "A passive ceramic humidifier in matte olive green — stylish, silent, and ideal for dry indoor spaces.",
    descriptionHtml:
      "<p>The Kaya Ceramic Humidifier is a minimalist wellness essential that doubles as a sculptural accent. Made from matte-finish ceramic in a deep olive tone, its ridged form disperses moisture passively—no power required. Just add water and place near a heat source or sunny window to naturally improve your room’s humidity and comfort.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 18 cm height × 12 cm diameter</li>\r\n  <li><strong>Material:</strong> Unglazed ceramic</li>\r\n  <li><strong>Color:</strong> Matte olive green</li>\r\n  <li><strong>Function:</strong> Passive evaporation—no electricity needed</li>\r\n  <li><strong>Use:</strong> Fill with water; ideal for dry indoor environments</li>\r\n  <li><strong>Care:</strong> Rinse and air dry regularly</li>\r\n</ul>\r\n\r\n<p>Perfect for bedrooms, desktops, or studios — where clean design meets natural comfort.</p>",
    categoryId: "miscellaneous",
    tags: [],
    featuredImage: {
      altText: "Kaya Ceramic Humidifier",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc10d27d6/images/v0/Kaya_humidifier_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "69",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "69",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc10d27d6/images/v0/Kaya_humidifier_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwafc0c7a1/images/v0/Kaya_humidifier_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Kaya Ceramic Humidifier",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwc339871c/images/v0/Kaya_humidifier_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "alloy-plywood-side-chair",
    handle: "alloy-plywood-side-chair",
    title: "Alloy Plywood Side Chair",
    description:
      "A mid-century inspired plywood chair with chrome legs, perfect for modern dining or workspaces.",
    descriptionHtml:
      "<p>The Alloy Side Chair strikes the perfect balance between form and function. Featuring a molded plywood seat with a natural wood finish and a contoured backrest, it offers everyday comfort with iconic mid-century style. Its slender chrome legs bring a light, airy feel that works effortlessly in dining rooms, offices, or creative spaces.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 78 cm height × 47 cm width × 52 cm depth</li>\r\n  <li><strong>Materials:</strong> Molded plywood seat, chrome steel legs</li>\r\n  <li><strong>Finish:</strong> Natural wood veneer with satin clear coat</li>\r\n  <li><strong>Weight Capacity:</strong> Up to 120 kg (265 lbs)</li>\r\n  <li><strong>Stackable:</strong> Yes (up to 4 chairs)</li>\r\n  <li><strong>Assembly:</strong> Arrives fully assembled</li>\r\n</ul>\r\n\r\n<p>A modern classic that brings timeless design and everyday practicality into any space.</p>",
    categoryId: "seats",
    tags: [],
    featuredImage: {
      altText: "Alloy Plywood Side Chair",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw7586d97a/images/v0/Alloy_chair_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "149",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "149",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Alloy Plywood Side Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw7586d97a/images/v0/Alloy_chair_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Alloy Plywood Side Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw3c2bcc71/images/v0/Alloy_chair_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Alloy Plywood Side Chair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw912dc870/images/v0/Alloy_chair_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [
      {
        id: "color",
        name: "Color",
        values: [
          {
            id: "beige",
            name: "Beige",
          },
        ],
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    variants: [
      {
        id: "alloy-plywood-side-chair-1",
        title: "Alloy Plywood Side Chair",
        availableForSale: true,
        selectedOptions: [
          {
            name: "color",
            value: "beige",
          },
        ],
        price: {
          amount: "149",
          currencyCode: "KRW",
        },
      },
    ],
  },
  {
    id: "soda-fluid-shape-rug",
    handle: "soda-fluid-shape-rug",
    title: "Soda Fluid Shape Rug",
    description:
      "An irregular blue rug with wavy patterns and bold texture — a sculptural splash of color and shape.",
    descriptionHtml:
      "<p>The Soda Rug flows with personality, combining irregular organic form with a dynamic mix of blue tones. Its wavy pattern in navy, cobalt, and sky creates a sense of movement, while the asymmetrical cut adds a sculptural touch to any space. Soft underfoot and visually bold, it's ideal for living areas, studios, or anywhere you want to spark creativity.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 160 cm × 200 cm (approximate due to organic shape)</li>\r\n  <li><strong>Material:</strong> 100% tufted polyester</li>\r\n  <li><strong>Color Palette:</strong> Navy, cobalt, sky blue</li>\r\n  <li><strong>Shape:</strong> Irregular organic silhouette</li>\r\n  <li><strong>Backing:</strong> Anti-slip base</li>\r\n  <li><strong>Care:</strong> Vacuum regularly; spot clean as needed</li>\r\n</ul>\r\n\r\n<p>A playful statement rug that brings fluid motion and modern artistry to your floor.</p>",
    categoryId: "rugs",
    tags: [],
    featuredImage: {
      altText: "Soda Fluid Shape Rug",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw4471e0ea/images/v0/Soda_rug_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "219",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "219",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Soda Fluid Shape Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw4471e0ea/images/v0/Soda_rug_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Soda Fluid Shape Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw5cb63e29/images/v0/Soda_rug_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Soda Fluid Shape Rug",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw2efc7fd7/images/v0/Soda_rug_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  {
    id: "pomme-shell-armchair-pink",
    handle: "pomme-shell-armchair-pink",
    title: "Pomme Shell Armchair",
    description:
      "A modern pink molded armchair with metal legs and iconic curves — playful, practical, and stylish.",
    descriptionHtml:
      "<p>The Pomme Shell Armchair blends iconic mid-century lines with a playful modern hue. Its molded pink polypropylene seat features smooth curves and integrated armrests for everyday comfort, supported by sleek metal legs with crisscross reinforcements. Ideal for dining, working, or adding a vibrant accent to any space.</p>\r\n\r\n<ul>\r\n  <li><strong>Dimensions:</strong> 82 cm height × 62 cm width × 60 cm depth</li>\r\n  <li><strong>Material:</strong> Molded polypropylene shell, metal base</li>\r\n  <li><strong>Finish:</strong> Soft matte pink seat with black metal legs</li>\r\n  <li><strong>Comfort:</strong> Curved backrest and arm support</li>\r\n  <li><strong>Assembly:</strong> Simple assembly with included hardware</li>\r\n  <li><strong>Weight Capacity:</strong> Up to 120 kg (265 lbs)</li>\r\n</ul>\r\n\r\n<p>Colorful, comfortable, and endlessly versatile — a true statement in form and function.</p>",
    categoryId: "seats",
    tags: [],
    featuredImage: {
      altText: "Pomme Shell Armchair",
      url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw17a4618f/images/v0/Pomme_chair_1.png",
      width: 1200,
      height: 1200,
    },
    availableForSale: true,
    currencyCode: "KRW",
    priceRange: {
      maxVariantPrice: {
        amount: "119",
        currencyCode: "KRW",
      },
      minVariantPrice: {
        amount: "119",
        currencyCode: "KRW",
      },
    },
    images: [
      {
        altText: "Pomme Shell Armchair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw17a4618f/images/v0/Pomme_chair_1.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Pomme Shell Armchair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw3c6821bf/images/v0/Pomme_chair_2.png",
        width: 1200,
        height: 1200,
      },
      {
        altText: "Pomme Shell Armchair",
        url: "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZYLQ_002/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw7d416530/images/v0/Pomme_chair_3.png",
        width: 1200,
        height: 1200,
      },
    ],
    options: [],
    seo: {
      title: "",
      description: "",
    },
    variants: [],
  },
  ...(excelParsedProducts as any[]),
];
