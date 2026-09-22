/**
 * [초이콤마 choicomma_webapp] 주문 및 배송 가상 모의 데이터 원장
 *
 * 합배송 시뮬레이션 및 배송 프로세스 테스트를 위한 구조화된 모의 데이터셋입니다.
 * - 그룹 1: 최고관리자(최유진) 48시간 이내 개별 주문 2건 (CH20260915-011, CH20260916-012) -> 합배송 테스트용
 * - 그룹 2: 김민지 24시간 이내 개별 주문 2건 (CH20260915-021, CH20260916-022) -> 합배송 테스트용
 * - 그룹 3: 기존 단독 주문 데이터들 (CH20260908-001 ~ 005)
 */

export interface MockShipmentPackage {
  id: string;
  pkgIndex: number;
  items: string;
  quantity: number;
  carrier: string;
  trackingNumber: string;
  status: string;
  cjP2pCd?: string;
  cjClsfCd?: string;
  cjSubClsfCd?: string;
  cjClldlvBranNm?: string;
  cjClldlvempNickNm?: string;
  cjClsfAddr?: string;
}

export interface MockShipmentOrder {
  id: string;
  orderId: string;
  ordererName?: string;
  recipient: string;
  phone: string;
  altPhone?: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  items: string;
  quantity: number;
  carrier: string;
  trackingNumber: string;
  status: "Pending" | "Partially Shipped" | "In Transit" | "Delivered";
  shippingMemo?: string;
  orderDate: string;
  shippedDate?: string | null;
  estimatedDelivery?: string | null;
  packages: MockShipmentPackage[];
  created_at?: string;
  updated_at?: string;
  isMergedParent?: boolean;
  isMergedChild?: boolean;
  mergedIntoId?: string;
  mergedIntoOrderId?: string;
  bundledRefundPoints?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 합배송(Bundle) 테스트용 신규 주문 데이터 (48시간 이내 복수 주문)
// ─────────────────────────────────────────────────────────────────────────────
export const bundleTestShipments: MockShipmentOrder[] = [
  // [합배송 그룹 A] 최고관리자 (최유진 / ADMIN-001) - 2건
  {
    id: "TRK-2026-011",
    orderId: "CH20260915-011",
    ordererName: "최고관리자 (Admin)",
    recipient: "최고관리자 (Admin)",
    phone: "02-579-1171",
    altPhone: "010-5791-1171",
    zipCode: "06306",
    address: "서울특별시 강남구 개포로22길 12",
    detailAddress: "6층 (주)초이콤마 본사",
    items: "휘메일 쉬어드밍크 벨티드 롱 코트 (FREE) 1개",
    quantity: 1,
    carrier: "CJ대한통운",
    trackingNumber: "-",
    status: "Pending",
    shippingMemo: "경비실 혹은 본사 6층 안내데스크에 맡겨주세요.",
    orderDate: "2026-09-15 14:20:00",
    shippedDate: null,
    estimatedDelivery: null,
    packages: [
      {
        id: "PKG-011-1",
        pkgIndex: 1,
        items: "휘메일 쉬어드밍크 벨티드 롱 코트 (FREE) 1개",
        quantity: 1,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: "2026-09-15T05:20:00.000Z",
    updated_at: "2026-09-15T05:20:00.000Z",
  },
  {
    id: "TRK-2026-012",
    orderId: "CH20260916-012",
    ordererName: "최고관리자 (Admin)",
    recipient: "최고관리자 (Admin)",
    phone: "02-579-1171",
    altPhone: "010-5791-1171",
    zipCode: "06306",
    address: "서울특별시 강남구 개포로22길 12",
    detailAddress: "6층 (주)초이콤마 본사",
    items: "뤼미에르 클래식 셔츠 (1) 1개, 하이엔드 테일러링 메리노울 플레어 버뮤다 팬츠 / 차콜 (2) 1개",
    quantity: 2,
    carrier: "CJ대한통운",
    trackingNumber: "-",
    status: "Pending",
    shippingMemo: "직접 수령 예정입니다.",
    orderDate: "2026-09-16 09:15:00",
    shippedDate: null,
    estimatedDelivery: null,
    packages: [
      {
        id: "PKG-012-1",
        pkgIndex: 1,
        items: "뤼미에르 클래식 셔츠 (1) 1개, 하이엔드 테일러링 메리노울 플레어 버뮤다 팬츠 / 차콜 (2) 1개",
        quantity: 2,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: "2026-09-16T00:15:00.000Z",
    updated_at: "2026-09-16T00:15:00.000Z",
  },

  // [합배송 그룹 B] 김민지 고객 - 2건
  {
    id: "TRK-2026-021",
    orderId: "CH20260915-021",
    ordererName: "김민지",
    recipient: "김민지",
    phone: "010-9876-5432",
    altPhone: "",
    zipCode: "06035",
    address: "서울특별시 강남구 가로수길 42",
    detailAddress: "3층 302호",
    items: "엘레강스 플루이드 실루엣 실크100 브라우스 / 블랙 (FREE) 1개",
    quantity: 1,
    carrier: "CJ대한통운",
    trackingNumber: "-",
    status: "Pending",
    shippingMemo: "문 앞 보관 부탁드립니다.",
    orderDate: "2026-09-15 17:40:00",
    shippedDate: null,
    estimatedDelivery: null,
    packages: [
      {
        id: "PKG-021-1",
        pkgIndex: 1,
        items: "엘레강스 플루이드 실루엣 실크100 브라우스 / 블랙 (FREE) 1개",
        quantity: 1,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: "2026-09-15T08:40:00.000Z",
    updated_at: "2026-09-15T08:40:00.000Z",
  },
  {
    id: "TRK-2026-022",
    orderId: "CH20260916-022",
    ordererName: "김민지",
    recipient: "김민지",
    phone: "010-9876-5432",
    altPhone: "",
    zipCode: "06035",
    address: "서울특별시 강남구 가로수길 42",
    detailAddress: "3층 302호",
    items: "썸머 메리노울 카프리 팬츠 (1) 1개, 메리노울 100 썸머 가디건 (1) 1개",
    quantity: 2,
    carrier: "CJ대한통운",
    trackingNumber: "-",
    status: "Pending",
    shippingMemo: "부재시 경비실에 맡겨주세요.",
    orderDate: "2026-09-16 11:10:00",
    shippedDate: null,
    estimatedDelivery: null,
    packages: [
      {
        id: "PKG-022-1",
        pkgIndex: 1,
        items: "썸머 메리노울 카프리 팬츠 (1) 1개, 메리노울 100 썸머 가디건 (1) 1개",
        quantity: 2,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: "2026-09-16T02:10:00.000Z",
    updated_at: "2026-09-16T02:10:00.000Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. 기본 가상 주문 원장 (기존 등록된 5건 주문)
// ─────────────────────────────────────────────────────────────────────────────
export const standardMockShipments: MockShipmentOrder[] = [
  {
    id: "TRK-2026-001",
    orderId: "CH20260908-001",
    ordererName: "홍길동",
    recipient: "홍길동",
    phone: "010-1234-5678",
    altPhone: "02-555-1234",
    zipCode: "04524",
    address: "서울특별시 중구 세종대로 110",
    detailAddress: "101동 1205호",
    items: "프리미엄 이태리 램스킨 스웨이드 테일러드 카라 자켓 (1) 1개, 뤼미에르 클래식 셔츠 (2) 1개",
    quantity: 2,
    carrier: "CJ대한통운",
    trackingNumber: "6892-3551-9989",
    status: "In Transit",
    shippingMemo: "부재시 문앞에 놓아주세요 (안전배송)",
    orderDate: "2026-09-14",
    shippedDate: "2026-09-14",
    estimatedDelivery: "-",
    packages: [
      {
        id: "PKG-001-1",
        pkgIndex: 1,
        items: "프리미엄 이태리 램스킨 스웨이드 테일러드 카라 자켓 (1) 1개, 뤼미에르 클래식 셔츠 (2) 1개",
        quantity: 2,
        carrier: "CJ대한통운",
        trackingNumber: "6892-3551-9989",
        status: "In Transit",
        cjP2pCd: "P1",
        cjClsfCd: "4W44",
        cjSubClsfCd: "-4g",
        cjClldlvBranNm: "대한통운",
        cjClldlvempNickNm: "A01-1구역",
        cjClsfAddr: "101동 1205호",
      },
    ],
    created_at: "2026-09-14T07:13:21.439Z",
    updated_at: "2026-09-14T10:21:12.257Z",
  },
  {
    id: "TRK-2026-002",
    orderId: "CH20260908-002",
    ordererName: "김민지",
    recipient: "김민지",
    phone: "010-9876-5432",
    altPhone: "",
    zipCode: "06035",
    address: "서울특별시 강남구 가로수길 42",
    detailAddress: "3층 302호",
    items: "썸머 메리노울 카프리 팬츠 (1) 2개, 메리노울 100 썸머 가디건 (1) 1개",
    quantity: 3,
    carrier: "CJ대한통운",
    trackingNumber: "6892-1328-2867",
    status: "In Transit",
    shippingMemo: "배송 전 연락 부탁드립니다.",
    orderDate: "2026-09-14",
    shippedDate: "2026-09-14",
    estimatedDelivery: "-",
    packages: [
      {
        id: "PKG-002-1",
        pkgIndex: 1,
        items: "썸머 메리노울 카프리 팬츠 (1) 2개",
        quantity: 2,
        carrier: "CJ대한통운",
        trackingNumber: "6892-1328-2867",
        status: "In Transit",
        cjP2pCd: "P1",
        cjClsfCd: "4W44",
        cjSubClsfCd: "-4g",
        cjClldlvBranNm: "대한통운",
        cjClldlvempNickNm: "A01-1구역",
        cjClsfAddr: "3층 302호",
      },
      {
        id: "PKG-4876-2",
        pkgIndex: 2,
        items: "메리노울 100 썸머 가디건 (1) 1개",
        quantity: 1,
        carrier: "CJ대한통운",
        trackingNumber: "-",
        status: "Pending",
      },
    ],
    created_at: "2026-09-14T07:13:21.439Z",
    updated_at: "2026-09-14T10:21:12.257Z",
  },
  {
    id: "TRK-2026-003",
    orderId: "CH20260908-003",
    ordererName: "이서준",
    recipient: "이서준",
    phone: "010-3344-5566",
    altPhone: "031-700-8899",
    zipCode: "13524",
    address: "경기도 성남시 분당구 판교역로 166",
    detailAddress: "카카오 판교아지트 B동 7층",
    items: "휘메일 마호가니 드랍숄더 집업 (FREE) 1개, 썸머 메리노울 카프리 팬츠 (2) 1개",
    quantity: 2,
    carrier: "CJ대한통운",
    trackingNumber: "6892-5469-2622",
    status: "In Transit",
    shippingMemo: "경비실에 맡겨주세요.",
    orderDate: "2026-09-14",
    shippedDate: "2026-09-14",
    estimatedDelivery: "-",
    packages: [
      {
        id: "PKG-003-1",
        pkgIndex: 1,
        items: "휘메일 마호가니 드랍숄더 집업 (FREE) 1개, 썸머 메리노울 카프리 팬츠 (2) 1개",
        quantity: 2,
        carrier: "CJ대한통운",
        trackingNumber: "6892-5469-2622",
        status: "In Transit",
      },
    ],
    created_at: "2026-09-14T07:13:21.439Z",
    updated_at: "2026-09-14T10:21:12.257Z",
  },
  {
    id: "TRK-2026-004",
    orderId: "CH20260908-004",
    ordererName: "박지영",
    recipient: "박지영",
    phone: "010-7788-9900",
    altPhone: "",
    zipCode: "48058",
    address: "부산광역시 해운대구 센텀중앙로 78",
    detailAddress: "센텀타워 1502호",
    items: "휘메일 마호가니 벨티드 로브 자켓 (FREE) 1개, 뤼미에르 클래식 셔츠 (1) 2개",
    quantity: 3,
    carrier: "CJ대한통운",
    trackingNumber: "6892-8513-6990",
    status: "In Transit",
    shippingMemo: "부재시 문앞에 놓아주세요.",
    orderDate: "2026-09-14",
    shippedDate: "2026-09-14",
    estimatedDelivery: "-",
    packages: [
      {
        id: "PKG-004-1",
        pkgIndex: 1,
        items: "휘메일 마호가니 벨티드 로브 자켓 (FREE) 1개, 뤼미에르 클래식 셔츠 (1) 2개",
        quantity: 3,
        carrier: "CJ대한통운",
        trackingNumber: "6892-8513-6990",
        status: "In Transit",
        cjP2pCd: "P1",
        cjClsfCd: "4W44",
        cjSubClsfCd: "-4g",
        cjClldlvBranNm: "대한통운",
        cjClldlvempNickNm: "A01-1구역",
        cjClsfAddr: "센텀타워 1502호",
      },
    ],
    created_at: "2026-09-14T07:13:21.439Z",
    updated_at: "2026-09-14T10:21:12.257Z",
  },
  {
    id: "TRK-2026-005",
    orderId: "CH20260908-005",
    ordererName: "최수현",
    recipient: "최수현",
    phone: "010-5566-7788",
    altPhone: "",
    zipCode: "21984",
    address: "인천광역시 연수구 송도과학로 32",
    detailAddress: "송도IT센터 18층",
    items: "휘메일 트리밍 후드 밍크 케이프 (실버블루 / FREE) 1개",
    quantity: 1,
    carrier: "CJ대한통운",
    trackingNumber: "6892-2841-6575",
    status: "In Transit",
    shippingMemo: "도착 전 연락 바랍니다.",
    orderDate: "2026-09-14",
    shippedDate: "2026-09-14",
    estimatedDelivery: "-",
    packages: [
      {
        id: "PKG-005-1",
        pkgIndex: 1,
        items: "휘메일 트리밍 후드 밍크 케이프 (실버블루 / FREE) 1개",
        quantity: 1,
        carrier: "CJ대한통운",
        trackingNumber: "6892-2841-6575",
        status: "In Transit",
        cjP2pCd: "P1",
        cjClsfCd: "4W44",
        cjSubClsfCd: "-4g",
        cjClldlvBranNm: "대한통운",
        cjClldlvempNickNm: "A01-1구역",
        cjClsfAddr: "송도IT센터 18층",
      },
    ],
    created_at: "2026-09-14T07:13:21.439Z",
    updated_at: "2026-09-14T10:21:12.257Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CJ 개발 서버 실제 연동 검증 주문 (CJ 발급 번호: 6600-3762-6853, 도착지코드 5R67 1e)
// ─────────────────────────────────────────────────────────────────────────────
export const realCjTestShipment: MockShipmentOrder = {
  id: "TRK-ORD-REAL-1789534984986-001",
  orderId: "ORD-REAL-1789534984986-001",
  ordererName: "홍길동(실검증)",
  recipient: "홍길동(실검증)",
  phone: "010-1234-5678",
  altPhone: "",
  zipCode: "04524",
  address: "서울특별시 중구 세종대로 110",
  detailAddress: "서울시청 본관 1층",
  items: "엘레강스 플루이드 실루엣 실크100 브라우스 / 아이보리 (FREE) 1개",
  quantity: 1,
  carrier: "CJ대한통운",
  trackingNumber: "6600-3762-6853",
  status: "In Transit",
  shippingMemo: "부재 시 문 앞에 놓아주세요. 파손주의",
  orderDate: "2026-09-16 14:00:00",
  shippedDate: "2026-09-16",
  estimatedDelivery: "-",
  packages: [
    {
      id: "PKG-REAL-001-1",
      pkgIndex: 1,
      items: "엘레강스 플루이드 실루엣 실크100 브라우스 / 아이보리 (FREE) 1개",
      quantity: 1,
      carrier: "CJ대한통운",
      trackingNumber: "6600-3762-6853",
      status: "In Transit",
      cjP2pCd: "P1",
      cjClsfCd: "5R67",
      cjSubClsfCd: "1e",
      cjClldlvBranNm: "중구무교",
      cjClldlvempNickNm: "E04-1구역",
      cjClsfAddr: "태평1 31 서울시청",
    },
  ],
  created_at: "2026-09-16T05:03:15.814Z",
  updated_at: "2026-09-16T05:03:15.814Z",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. 전체 통합 주문 원장 (실검증 주문 1건 + 합배송 테스트 4건 + 기존 5건 = 총 10건)
// ─────────────────────────────────────────────────────────────────────────────
export const allMergedMockShipments: MockShipmentOrder[] = [
  realCjTestShipment,
  ...bundleTestShipments,
  ...standardMockShipments,
];

// 기본 export
export default allMergedMockShipments;
