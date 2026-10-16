# 주문서(Checkout) 페이지 결제 수단 선택 기능 추가 완료

## 1. 개요 및 구현 배경
* **사용자 요청:** "주문서 단계에서 결제방법 선택할 수 있는 기능 추가 해줘"
* **기존 문제점:**
  * 기존 주문서 페이지에는 주문자 정보, 배송지 정보, 환불 계좌 정보만 존재하였고, 결제 방법 선택 영역(UI)이 누락되어 있었습니다.
  * 내부적으로 토스 결제창 호출 시 `method: "CARD"`가 고정되어 있어 사용자가 원하는 결제 방식(간편결제, 가상계좌 무통장입금, 실시간 계좌이체, 휴대폰 소액결제 등)을 선택할 수 없었습니다.

---

## 2. 주요 구현 내용

### 1) 결제 수단 선택 카드 UI 신설 (Section 3)
* **파일:** [app/checkout/components/checkout-client-wrapper.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/checkout/components/checkout-client-wrapper.tsx)
* 배송지 정보와 환불 계좌 정보 사이에 직관적인 **5종 결제 수단 선택 타일 그리드**를 추가했습니다:
  1. **신용·체크카드 (`CARD`)**: 모든 카드사, 무이자할부 지원
  2. **간편결제 (`EASY_PAY`)**: 토스페이, 카카오페이, 네이버페이, 페이코 등
  3. **가상계좌 무통장 (`VIRTUAL_ACCOUNT`)**: 주문 완료 시 전용 가상계좌 발급 (72시간 이내 입금)
  4. **실시간 계좌이체 (`TRANSFER`)**: 은행 즉시 출금 이체
  5. **휴대폰 결제 (`MOBILE_PHONE`)**: 통신사 익월 요금 합산 청구
* 선택된 결제 수단에 따라 활성화 하이라이트(다크모드/라이트모드 자동 대응), 체크 아이콘 및 설명 안내문이 동적으로 표시됩니다.
* **가상계좌(무통장) 선택 시**: 바로 아래 환불 계좌 정보 섹션에 `가상계좌 선택 시 필수` 배지가 표시되어 사용자가 환불 계좌를 꼼꼼히 확인하도록 유도합니다.

### 2) 토스페이먼츠(Toss Payments SDK v2) 결제 연동 고도화
* `handlePayment()` 호출 시 사용자가 선택한 `formData.paymentMethod`에 맞추어 `requestPayment` 파라미터를 동적으로 구성:
  * `CARD` 및 `EASY_PAY`: 카드 및 간편결제 통합 결제창 호출
  * `VIRTUAL_ACCOUNT`: 가상계좌 전용 설정(`validHours: 72`, `cashReceipt: 소득공제`) 적용
  * `TRANSFER`: 계좌이체 전용 설정(`cashReceipt: 소득공제`) 적용
  * `MOBILE_PHONE`: 휴대폰 소액결제 결제창 호출

### 3) 주문 요약 및 결제 버튼 영역 실시간 피드백
* 우측 주문 요약의 결제하기 버튼 하단에 `결제 수단: [선택된 결제수단명]` 텍스트를 실시간으로 노출하여 결제 진행 전 선택 사항을 한 번 더 확인할 수 있습니다.

### 4) 주문 완료(Order Success) 및 관리자 원장 반영
* **파일:** [app/order/success/page.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/order/success/page.tsx)
* 결제 완료 영수증 카드 및 관리자 주문 원장에 고객이 실제 선택/승인된 결제 수단명(예: "신용·체크카드", "간편결제", "가상계좌 (무통장입금)" 등)이 정확하게 기록되고 표시되도록 연동했습니다.

---

## 3. 검증 결과
1. **TypeScript 정적 검사 (`npx tsc --noEmit`):** 에러 0건 정상 통과.
2. **페이지 렌더링 검증:** `http://localhost:3000/checkout` 정상 서빙 확인 (HTTP 200 OK).
3. **주문서 결제 플로우 검증:**
   * 결제 수단 선택 시 즉시 실시간 상태 반영.
   * 토스페이먼츠 SDK 파라미터가 선택된 결제 수단에 맞게 분기 처리됨.
