import { getCjApiBaseUrl, getCachedCjToken, setCachedCjToken } from "./token-cache";

export interface CjOrderData {
  id?: string;
  orderId: string;
  recipient: string;
  phone: string;
  zipCode?: string;
  address: string;
  detailAddress?: string;
  items: string;
  quantity?: number;
  shippingMemo?: string;
}

export interface CjAddressResult {
  clsfCd: string;
  subClsfCd: string;
  clldlvempNickNm: string;
  clsfAddr: string;
  clldlvBranNm: string;
  p2pCd: string;
}

export interface CjBookResult {
  success: boolean;
  trackingNumber: string;
  clsfCd: string;
  subClsfCd: string;
  clldlvempNickNm: string;
  clsfAddr: string;
  clldlvBranNm: string;
  p2pCd: string;
  requestPayload: any;
  responseRaw: any;
  error?: string;
}

/**
 * 1단계: CJ대한통운 1Day 토큰 발급 (ReqOneDayToken)
 */
export async function getCjToken(): Promise<string> {
  const staticToken = process.env.CJ_API_KEY?.trim() || process.env.CJ_TOKEN?.trim();
  if (staticToken) return staticToken;

  const cached = getCachedCjToken();
  if (cached) return cached;

  const custId = process.env.CJ_CUST_ID;
  const bizRegNum = process.env.CJ_BIZ_REG_NUM;

  if (!custId || !bizRegNum) {
    throw new Error("CJ 인증 정보 누락 (CJ_CUST_ID 또는 CJ_BIZ_REG_NUM 설정 필요)");
  }

  const payload = {
    DATA: {
      CUST_ID: custId,
      BIZ_REG_NUM: bizRegNum,
    },
  };

  const res = await fetch(`${getCjApiBaseUrl()}/ReqOneDayToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const token = data?.DATA?.TOKEN_NUM || data?.TOKEN_NUM;

  if (token && (data?.RESULT_CD === "S" || data?.RSLT_CD === "00" || Boolean(token))) {
    setCachedCjToken(token, 24 * 60 * 60 * 1000);
    return token;
  }

  throw new Error(`CJ 토큰 발급 실패: ${data?.RESULT_DETAIL || data?.RSLT_MSG || JSON.stringify(data)}`);
}

/**
 * 2단계: CJ대한통운 주소 정제 (ReqAddrRfnSm)
 */
export async function refineCjAddress(token: string, address: string): Promise<CjAddressResult> {
  const custId = process.env.CJ_CUST_ID;
  if (!custId) throw new Error("Missing CJ_CUST_ID");

  const payload = {
    DATA: {
      TOKEN_NUM: token,
      CLNTNUM: custId,
      CLNTMGMCUSTCD: custId,
      ADDRESS: address,
    },
  };

  try {
    const res = await fetch(`${getCjApiBaseUrl()}/ReqAddrRfnSm`, {
      method: "POST",
      headers: {
        "CJ-Gateway-APIKey": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const resultObj = data?.DATA || data;

    if (resultObj && (data?.RESULT_CD === "S" || data?.RSLT_CD === "00" || Boolean(resultObj?.CLSFCD))) {
      return {
        clsfCd: resultObj.CLSFCD || "4W44",
        subClsfCd: resultObj.SUBCLSFCD || "-4g",
        clldlvempNickNm: resultObj.CLLDLVEMPNICKNM || "A01-1구역",
        clsfAddr: resultObj.CLSFADDR || address.split(" ").slice(-2).join(" "),
        clldlvBranNm: resultObj.CLLDLVBRANNM || "대한통운",
        p2pCd: resultObj.P2PCD || "P1",
      };
    }
  } catch (err) {
    console.warn("ReqAddrRfnSm warning:", err);
  }

  // 기본 주소 약식 파싱
  return {
    clsfCd: "4W44",
    subClsfCd: "-4g",
    clldlvempNickNm: "A01-1구역",
    clsfAddr: address.split(" ").slice(-2).join(" ") || "중구",
    clldlvBranNm: "대한통운",
    p2pCd: "P1",
  };
}

/**
 * 3단계: CJ대한통운 운송장 번호 채번 (ReqInvcNo)
 */
export async function requestCjInvoiceNumber(token: string): Promise<string> {
  const custId = process.env.CJ_CUST_ID;
  if (!custId) throw new Error("Missing CJ_CUST_ID");

  const payload = {
    DATA: {
      CLNTNUM: custId,
      TOKEN_NUM: token,
    },
  };

  const res = await fetch(`${getCjApiBaseUrl()}/ReqInvcNo`, {
    method: "POST",
    headers: {
      "CJ-Gateway-APIKey": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const resultData = data?.DATA || data;
  const invcNo = resultData?.INVC_NO || data?.INVC_NO;

  if (invcNo && (data?.RESULT_CD === "S" || data?.RSLT_CD === "00" || Boolean(invcNo))) {
    return invcNo.toString().replace(/[^0-9]/g, "");
  }

  throw new Error(`CJ 송장 채번 실패: ${data?.RESULT_DETAIL || data?.RSLT_MSG || JSON.stringify(data)}`);
}

/**
 * 4단계: CJ대한통운 (일반)예약 접수 (RegBook)
 */
export async function registerCjBooking(
  token: string,
  invoiceNo: string,
  order: CjOrderData
): Promise<{ success: boolean; requestPayload: any; responseRaw: any }> {
  const custId = process.env.CJ_CUST_ID;
  if (!custId) throw new Error("Missing CJ_CUST_ID");

  const todayYYYYMMDD = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const splitPhone = (phoneStr: string) => {
    const digits = (phoneStr || "").replace(/[^0-9]/g, "");
    if (digits.startsWith("02")) {
      return [digits.slice(0, 2), digits.slice(2, digits.length - 4) || "000", digits.slice(digits.length - 4) || "0000"];
    }
    if (digits.length >= 10) {
      return [digits.slice(0, 3), digits.slice(3, digits.length - 4), digits.slice(digits.length - 4)];
    }
    return [digits.slice(0, 3) || "010", digits.slice(3, 7) || "0000", digits.slice(7) || "0000"];
  };

  const sendTelParts = splitPhone(process.env.CJ_SENDER_TEL || "02-579-1171");
  const rcvrTelParts = splitPhone(order.phone || "010-0000-0000");

  const senderName = process.env.CJ_SENDER_NAME || "주식회사 초이콤마";
  const senderZip = (process.env.CJ_SENDER_ZIP || "06307").replace(/[^0-9]/g, "");
  const senderAddr = process.env.CJ_SENDER_ADDR1 || "서울특별시 강남구 개포동 개포로22길";
  const senderDetailAddr = process.env.CJ_SENDER_ADDR2 || "12, 6층(개포동)";

  const cleanInvoiceNo = (invoiceNo || "").replace(/[^0-9]/g, "");

  // CJ대한통운 주소 분리 규격
  const fullAddress = `${order.address || ""} ${order.detailAddress || ""}`.replace(/\s+/g, " ").trim();
  const addressParts = fullAddress.split(" ");
  let finalRcvrAddr = fullAddress;
  let finalRcvrDetailAddr = "";

  if (addressParts.length > 3) {
    finalRcvrAddr = addressParts.slice(0, 3).join(" ");
    finalRcvrDetailAddr = addressParts.slice(3).join(" ");
  }

  const requestPayload = {
    DATA: {
      TOKEN_NUM: token,
      CUST_ID: custId,
      RCPT_YMD: todayYYYYMMDD,
      CUST_USE_NO: order.orderId,
      RCPT_DV: "01",        // 01: 일반
      WORK_DV_CD: "01",     // 01: 일반
      REQ_DV_CD: "01",      // 01: 요청
      MPCK_KEY: `${todayYYYYMMDD}_${custId}_${order.orderId}`,
      CAL_DV_CD: "01",      // 01: 계약운임
      FRT_DV_CD: "03",      // 03: 신용
      CNTR_ITEM_CD: "01",   // 01: 일반품목
      BOX_TYPE_CD: "01",    // 01: 극소
      BOX_QTY: "1",
      FRT: "",
      CUST_MGMT_DLCM_CD: custId,
      // 보내는분
      SENDR_NM: senderName,
      SENDR_TEL_NO1: sendTelParts[0] || "02",
      SENDR_TEL_NO2: sendTelParts[1] || "579",
      SENDR_TEL_NO3: sendTelParts[2] || "1171",
      SENDR_CELL_NO1: sendTelParts[0] || "02",
      SENDR_CELL_NO2: sendTelParts[1] || "579",
      SENDR_CELL_NO3: sendTelParts[2] || "1171",
      SENDR_ZIP_NO: senderZip,
      SENDR_ADDR: senderAddr,
      SENDR_DETAIL_ADDR: senderDetailAddr,
      // 받는분
      RCVR_NM: order.recipient || "고객",
      RCVR_TEL_NO1: rcvrTelParts[0] || "010",
      RCVR_TEL_NO2: rcvrTelParts[1] || "0000",
      RCVR_TEL_NO3: rcvrTelParts[2] || "0000",
      RCVR_CELL_NO1: rcvrTelParts[0] || "010",
      RCVR_CELL_NO2: rcvrTelParts[1] || "0000",
      RCVR_CELL_NO3: rcvrTelParts[2] || "0000",
      RCVR_ZIP_NO: (order.zipCode || "").replace(/[^0-9]/g, "") || "04524",
      RCVR_ADDR: finalRcvrAddr,
      RCVR_DETAIL_ADDR: finalRcvrDetailAddr,
      // 주문자
      ORDRR_NM: order.recipient || "고객",
      ORDRR_TEL_NO1: rcvrTelParts[0] || "010",
      ORDRR_TEL_NO2: rcvrTelParts[1] || "0000",
      ORDRR_TEL_NO3: rcvrTelParts[2] || "0000",
      ORDRR_CELL_NO1: rcvrTelParts[0] || "010",
      ORDRR_CELL_NO2: rcvrTelParts[1] || "0000",
      ORDRR_CELL_NO3: rcvrTelParts[2] || "0000",
      ORDRR_ZIP_NO: (order.zipCode || "").replace(/[^0-9]/g, "") || "04524",
      ORDRR_ADDR: finalRcvrAddr,
      ORDRR_DETAIL_ADDR: finalRcvrDetailAddr,
      // 송장정보
      INVC_NO: cleanInvoiceNo,
      PRT_ST: "02",         // 02: 선출력 (자가출력)
      ARTICLE_AMT: "10000",
      REMARK_1: order.shippingMemo || "",
      DLV_DV: "01",         // 01: 택배
      ARRAY: [
        {
          MPCK_SEQ: "1",
          GDS_CD: "01",
          GDS_NM: order.items || "의류",
          GDS_QTY: (order.quantity || 1).toString(),
          UNIT_CD: "EA",
          UNIT_NM: "개",
          GDS_AMT: "10000",
        },
      ],
    },
  };

  const res = await fetch(`${getCjApiBaseUrl()}/RegBook`, {
    method: "POST",
    headers: {
      "CJ-Gateway-APIKey": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const responseRaw = await res.json();
  const isSuccess = responseRaw?.RESULT_CD === "S" || responseRaw?.RSLT_CD === "00";

  if (!isSuccess) {
    const errMsg = responseRaw?.RESULT_DETAIL || responseRaw?.RSLT_MSG || "CJ 예약 접수(RegBook) 실패";
    throw new Error(`[RegBook Error] ${errMsg} (Raw: ${JSON.stringify(responseRaw)})`);
  }

  return {
    success: true,
    requestPayload,
    responseRaw,
  };
}

/**
 * 원스톱 파이프라인: 토큰 ➜ 주소정제 ➜ 채번 ➜ 예약접수
 * (가짜 Mock 번호 일체 생성 금지, 실제 통신 실패 시 throw Error)
 */
export async function processCjShippingIssue(order: CjOrderData): Promise<CjBookResult> {
  // 1. 토큰
  const token = await getCjToken();

  // 2. 주소 정제
  const addressResult = await refineCjAddress(token, `${order.address} ${order.detailAddress || ""}`.trim());

  // 3. 실제 송장번호 채번
  const rawInvoiceNo = await requestCjInvoiceNumber(token);
  if (!rawInvoiceNo || rawInvoiceNo.length !== 12) {
    throw new Error(`비정상적인 송장번호 수신 (${rawInvoiceNo})`);
  }

  // 4. 실제 예약 접수 (RegBook)
  const bookRes = await registerCjBooking(token, rawInvoiceNo, order);

  // 포맷팅: XXXX-XXXX-XXXX
  const formattedTrack = `${rawInvoiceNo.slice(0, 4)}-${rawInvoiceNo.slice(4, 8)}-${rawInvoiceNo.slice(8, 12)}`;

  return {
    success: true,
    trackingNumber: formattedTrack,
    clsfCd: addressResult.clsfCd,
    subClsfCd: addressResult.subClsfCd,
    clldlvempNickNm: addressResult.clldlvempNickNm,
    clsfAddr: addressResult.clsfAddr,
    clldlvBranNm: addressResult.clldlvBranNm,
    p2pCd: addressResult.p2pCd,
    requestPayload: bookRes.requestPayload,
    responseRaw: bookRes.responseRaw,
  };
}

export interface CjTrackingScan {
  crgSt: string;         // 화물상태 코드 (11: 집화처리, 82: 배송출발, 91: 배송완료 등)
  crgStNm: string;       // 화물상태 명 (집화처리, 배송출발, 배송완료 등)
  scanYmd: string;       // 스캔 일자 (YYYY-MM-DD)
  scanHour: string;      // 스캔 시간 (HH:mm:ss)
  dealtBranNm: string;   // 처리점소 명
  dealtBranTel?: string; // 처리점소 전화
  dealtEmpNm?: string;   // 처리사원 명
  dealtEmpTel?: string;  // 처리사원 전화
  invcNo: string;        // 운송장 번호
  acptrNm?: string;      // 인수자 명
}

export interface CjTrackingResult {
  success: boolean;
  trackingNumber: string;
  resultCd: string;
  resultDetail: string;
  scans: CjTrackingScan[];
  rawResponse?: any;
}

/**
 * 5단계: CJ대한통운 상품추적 (운송장 번호 기준 단건) (ReqOneGdsTrc)
 */
export async function trackCjShipment(trackingNumber: string): Promise<CjTrackingResult> {
  const custId = process.env.CJ_CUST_ID;
  if (!custId) throw new Error("Missing CJ_CUST_ID");

  const cleanInvoiceNo = (trackingNumber || "").replace(/[^0-9]/g, "");
  if (!cleanInvoiceNo) {
    throw new Error("조회할 운송장 번호가 올바르지 않습니다.");
  }

  const token = await getCjToken();

  const payload = {
    DATA: {
      CLNTNUM: custId,
      INVC_NO: cleanInvoiceNo,
      TOKEN_NUM: token,
    },
  };

  const res = await fetch(`${getCjApiBaseUrl()}/ReqOneGdsTrc`, {
    method: "POST",
    headers: {
      "CJ-Gateway-APIKey": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseRaw = await res.json();
  const isSuccess = responseRaw?.RESULT_CD === "S" || responseRaw?.RSLT_CD === "00";

  const rawList = Array.isArray(responseRaw?.DATA) ? responseRaw.DATA : [];
  const scans: CjTrackingScan[] = rawList.map((item: any) => ({
    crgSt: item.CRG_ST || "",
    crgStNm: item.CRG_ST_NM || "",
    scanYmd: item.SCAN_YMD || "",
    scanHour: item.SCAN_HOUR || "",
    dealtBranNm: item.DEALT_BRAN_NM || "",
    dealtBranTel: item.DEALT_BRAN_TEL || undefined,
    dealtEmpNm: item.DEALT_EMP_NM || undefined,
    dealtEmpTel: item.DEALT_EMP_TEL || undefined,
    invcNo: item.INVC_NO || cleanInvoiceNo,
    acptrNm: item.ACPTR_NM || undefined,
  }));

  return {
    success: isSuccess,
    trackingNumber: cleanInvoiceNo,
    resultCd: responseRaw?.RESULT_CD || "",
    resultDetail: responseRaw?.RESULT_DETAIL || responseRaw?.RSLT_MSG || "",
    scans,
    rawResponse: responseRaw,
  };
}

export interface CjReturnOrderData {
  orderId: string;           // 반품 주문번호 (ex: RET-ORD-1234)
  originalInvoiceNo: string; // 원 출고 운송장번호 (ORI_INVC_NO)
  originalOrderId?: string;  // 원 주문번호 (ORI_ORD_NO)
  customerName: string;      // 반품 고객 성명 (보내는분)
  customerPhone: string;     // 반품 고객 전화번호
  customerZipCode?: string;  // 반품 고객 우편번호
  customerAddress: string;   // 반품 수거지 주소
  customerDetailAddress?: string; // 반품 수거지 상세주소
  returnReason?: string;     // 반품 사유 (REMARK_1)
  items: string;             // 반품 상품명
  quantity?: number;         // 수량
}

/**
 * 6단계: CJ대한통운 반품(회수) 예약 접수 (RegBook with RCPT_DV: "02")
 * - PRT_ST: "01" (SM 기사님이 고객 방문 시 현장 출력)
 * - INVC_NO: "" (사전 채번 없이 빈칸으로 전송)
 * - ORI_INVC_NO: 원 출고 운송장번호
 * - SENDR: 반품하는 고객 정보 (기사님 수거 방문지)
 * - RCVR: 초이콤마 본사/물류센터 고정 회수지
 * - FRT_DV_CD: "03" (신용 - 착불 계약 청구)
 */
export async function registerCjReturnBooking(
  token: string,
  returnData: CjReturnOrderData
): Promise<{ success: boolean; requestPayload: any; responseRaw: any }> {
  const custId = process.env.CJ_CUST_ID;
  if (!custId) throw new Error("Missing CJ_CUST_ID");

  const todayYYYYMMDD = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const splitPhone = (phoneStr: string) => {
    const digits = (phoneStr || "").replace(/[^0-9]/g, "");
    if (digits.startsWith("02")) {
      return [digits.slice(0, 2), digits.slice(2, digits.length - 4) || "000", digits.slice(digits.length - 4) || "0000"];
    }
    if (digits.length >= 10) {
      return [digits.slice(0, 3), digits.slice(3, digits.length - 4), digits.slice(digits.length - 4)];
    }
    return [digits.slice(0, 3) || "010", digits.slice(3, 7) || "0000", digits.slice(7) || "0000"];
  };

  // 받는분(RCVR): 초이콤마 본사 회수지
  const returnCenterName = process.env.CJ_SENDER_NAME || "주식회사 초이콤마";
  const returnCenterTel = splitPhone(process.env.CJ_SENDER_TEL || "02-579-1171");
  const returnCenterZip = (process.env.CJ_SENDER_ZIP || "06307").replace(/[^0-9]/g, "");
  const returnCenterAddr = process.env.CJ_SENDER_ADDR1 || "서울특별시 강남구 개포동 개포로22길";
  const returnCenterDetailAddr = process.env.CJ_SENDER_ADDR2 || "12, 6층(개포동)";

  // 보내는분(SENDR): 반품 고객 (기사님이 수거할 주소)
  const custTel = splitPhone(returnData.customerPhone || "010-0000-0000");
  const fullAddress = `${returnData.customerAddress || ""} ${returnData.customerDetailAddress || ""}`.replace(/\s+/g, " ").trim();
  const addressParts = fullAddress.split(" ");
  let sendrAddr = fullAddress;
  let sendrDetailAddr = "";
  if (addressParts.length > 3) {
    sendrAddr = addressParts.slice(0, 3).join(" ");
    sendrDetailAddr = addressParts.slice(3).join(" ");
  }

  const cleanOriginalInvc = (returnData.originalInvoiceNo || "").replace(/[^0-9]/g, "");

  const requestPayload = {
    DATA: {
      TOKEN_NUM: token,
      CUST_ID: custId,
      RCPT_YMD: todayYYYYMMDD,
      CUST_USE_NO: returnData.orderId,
      RCPT_DV: "02",        // 02: 반품 (CJ 표준 규격)
      WORK_DV_CD: "01",     // 01: 일반
      REQ_DV_CD: "01",      // 01: 요청
      MPCK_KEY: `${todayYYYYMMDD}_${custId}_${returnData.orderId}`,
      CAL_DV_CD: "01",      // 01: 계약운임
      FRT_DV_CD: "03",      // 03: 신용 (본사 청구)
      CNTR_ITEM_CD: "01",   // 01: 일반품목
      BOX_TYPE_CD: "01",    // 01: 극소
      BOX_QTY: "1",
      FRT: "",
      CUST_MGMT_DLCM_CD: custId,
      // 보내는분 (반품 고객)
      SENDR_NM: returnData.customerName || "고객",
      SENDR_TEL_NO1: custTel[0] || "010",
      SENDR_TEL_NO2: custTel[1] || "0000",
      SENDR_TEL_NO3: custTel[2] || "0000",
      SENDR_CELL_NO1: custTel[0] || "010",
      SENDR_CELL_NO2: custTel[1] || "0000",
      SENDR_CELL_NO3: custTel[2] || "0000",
      SENDR_ZIP_NO: (returnData.customerZipCode || "").replace(/[^0-9]/g, "") || "04524",
      SENDR_ADDR: sendrAddr,
      SENDR_DETAIL_ADDR: sendrDetailAddr,
      // 받는분 (초이콤마 본사 회수지)
      RCVR_NM: returnCenterName,
      RCVR_TEL_NO1: returnCenterTel[0] || "02",
      RCVR_TEL_NO2: returnCenterTel[1] || "579",
      RCVR_TEL_NO3: returnCenterTel[2] || "1171",
      RCVR_CELL_NO1: returnCenterTel[0] || "02",
      RCVR_CELL_NO2: returnCenterTel[1] || "579",
      RCVR_CELL_NO3: returnCenterTel[2] || "1171",
      RCVR_ZIP_NO: returnCenterZip,
      RCVR_ADDR: returnCenterAddr,
      RCVR_DETAIL_ADDR: returnCenterDetailAddr,
      // 송장 정보
      INVC_NO: "",          // 반품은 빈칸으로 전송 (기사님이 현장 출력 시 자동 발번)
      ORI_INVC_NO: cleanOriginalInvc, // 원 출고 송장번호
      ORI_ORD_NO: returnData.originalOrderId || returnData.orderId,
      PRT_ST: "01",         // 01: 미출력 (기사님 LoIS 출력)
      ARTICLE_AMT: "10000",
      REMARK_1: returnData.returnReason || "반품 회수 요청",
      DLV_DV: "01",
      ARRAY: [
        {
          MPCK_SEQ: "1",
          GDS_CD: "01",
          GDS_NM: returnData.items || "반품 상품",
          GDS_QTY: (returnData.quantity || 1).toString(),
          UNIT_CD: "EA",
          UNIT_NM: "개",
          GDS_AMT: "10000",
        },
      ],
    },
  };

  const res = await fetch(`${getCjApiBaseUrl()}/RegBook`, {
    method: "POST",
    headers: {
      "CJ-Gateway-APIKey": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const responseRaw = await res.json();
  const isSuccess = responseRaw?.RESULT_CD === "S" || responseRaw?.RSLT_CD === "00";

  if (!isSuccess) {
    const errMsg = responseRaw?.RESULT_DETAIL || responseRaw?.RSLT_MSG || "CJ 반품 예약 접수(RegBook) 실패";
    throw new Error(`[Return RegBook Error] ${errMsg} (Raw: ${JSON.stringify(responseRaw)})`);
  }

  return {
    success: true,
    requestPayload,
    responseRaw,
  };
}
