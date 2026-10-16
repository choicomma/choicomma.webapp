/**
 * 한국 주소 파싱 및 포맷팅 유틸리티
 * 
 * 1. (우편번호) 추출 지원: (12345), [12345]
 * 2. 구분자 지원: | 또는 //
 * 3. 지능형 정규식 분리: 도로명/지번 뒤에 오는 건물명, 동/호수를 상세주소로 자동 분리
 */

export interface ParsedAddress {
  postcode: string;
  baseAddress: string;
  detailAddress: string;
}

export function splitKoreanAddress(
  rawAddress?: string | null,
  fallbackPostcode: string = "",
  fallbackDetail: string = ""
): ParsedAddress {
  let address = (rawAddress || "").trim();
  let postcode = (fallbackPostcode || "").trim();
  let detailAddress = (fallbackDetail || "").trim();

  if (!address || address === "-") {
    return {
      postcode,
      baseAddress: address,
      detailAddress,
    };
  }

  // 1. 우편번호 추출: (12345), [12345]
  const zipMatch = address.match(/^[\(\[](\d{5})[\)\]]\s*(.*)$/);
  if (zipMatch) {
    if (!postcode || postcode === "06123" || postcode === "06306") {
      postcode = zipMatch[1];
    }
    address = zipMatch[2].trim();
  }

  // 2. 파이프(|) 또는 슬래시(//) 구분자가 이미 존재하는 경우
  if (address.includes("|")) {
    const parts = address.split("|").map((s) => s.trim());
    return {
      postcode,
      baseAddress: parts[0] || "",
      detailAddress: parts.slice(1).join(" ").trim() || detailAddress,
    };
  }
  if (address.includes(" // ")) {
    const parts = address.split(" // ").map((s) => s.trim());
    return {
      postcode,
      baseAddress: parts[0] || "",
      detailAddress: parts.slice(1).join(" ").trim() || detailAddress,
    };
  }

  // 3. fallbackDetail이 주소 끝에 명확히 위치하는 경우
  if (detailAddress && address.endsWith(detailAddress)) {
    const base = address.slice(0, -detailAddress.length).trim();
    if (base.length > 0) {
      return { postcode, baseAddress: base, detailAddress };
    }
  }

  // 4. 지능형 정규식 분리 (단일 문자열 주소)
  // 한국 주소 체계:
  // - 도로명: [..로/길/대로] [번호(-번호)] [(참고항목)]
  // - 지번: [..읍/면/동/리/가] [번지(-번지)] [(참고항목)]
  // 뒤에 나오는 단어들을 상세주소로 인식
  const regex = /^(.*?(?:(?:로|길|대로|읍|면|동|리|가)\s+\d+(?:-\d+)?(?:\s*\([^\)]*\))?))\s+(.+)$/;
  const match = address.match(regex);
  if (match) {
    return {
      postcode,
      baseAddress: match[1].trim(),
      detailAddress: match[2].trim(),
    };
  }

  return {
    postcode,
    baseAddress: address,
    detailAddress,
  };
}

export function formatKoreanAddress(
  postcode: string = "",
  baseAddress: string = "",
  detailAddress: string = ""
): string {
  const cleanPostcode = (postcode || "").trim();
  const cleanAddress = (baseAddress || "").trim();
  const cleanDetail = (detailAddress || "").trim();

  const zipPart = cleanPostcode ? `(${cleanPostcode}) ` : "";
  if (cleanDetail) {
    return `${zipPart}${cleanAddress} | ${cleanDetail}`.trim();
  }
  return `${zipPart}${cleanAddress}`.trim() || "-";
}
