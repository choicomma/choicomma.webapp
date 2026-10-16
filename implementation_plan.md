# 주문서 페이지 고객 등급별 적립금 산정 및 자동 지급 계획

구매 단계 주문서(Checkout) 페이지에서 고객 등급(`GENERAL`, `SILVER`, `GOLD`, `PLATINUM`, `VVIP`)에 맞는 적립률(1% ~ 5%)이 적용되지 않고 1%로 고정되어 계산되던 문제와, 결제 완료 후 적립금이 실제로 지급되지 않던 문제를 해결하기 위한 조치 계획입니다.

## 원인 분석
1. **주문서 결제 금액 요약의 하드코딩:**
   * [app/checkout/components/checkout-client-wrapper.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/checkout/components/checkout-client-wrapper.tsx)에서 고객 등급 조회가 누락되어 있으며, `earnedPoints = Math.floor(finalTotalAmount * 0.01)` 및 `🎁 구매 시 적립 예정 혜택 (1%)`로 1% 고정됨.
2. **주문 완료 후 포인트 미지급:**
   * [app/order/success/page.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/order/success/page.tsx)에서 결제 승인 후 주문/배송은 등록하지만, 적립금 지급(`membership_user_points`, `membership_points_history`, `admin_customers`, Supabase `customers`) 로직이 부재함.

## 변경 계획

### [lib/membership/tiers.ts](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/lib/membership/tiers.ts) [NEW]
* 등급별 기본 정책 상수(`DEFAULT_TIER_POLICIES`) 및 적립률 계산 함수(`normalizeUserGrade`, `getTierPointRate`, `calculateEarnedPoints`) 공통화.

### [app/checkout/components/checkout-client-wrapper.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/checkout/components/checkout-client-wrapper.tsx) [MODIFY]
* 주문자 정보(이메일, 연락처, 성함) 및 세션을 기반으로 고객 등급(`userGrade`)과 적립률(`pointRate`)을 동적으로 판별.
* 금액별 등급 적립금 `Math.floor(finalTotalAmount * (pointRate / 100))` 실시간 계산 및 UI 반영.
* 결제창 호출 시 `pending_order_${orderId}`에 `earnedPoints`, `pointRate`, `userGrade`, `appliedPoints` 전달.

### [app/order/success/page.tsx](file:///c:/Users/PC/Documents/webapp/choicomma_webapp/app/order/success/page.tsx) [MODIFY]
* 결제 완료 시 `earnedPoints`를 고객 적립금에 즉시 가산.
* `membership_points_history`에 상세 적립 내역 추가(중복 적립 방지).
* `admin_customers` 및 Supabase `customers` 테이블의 적립금과 누적 구매액 실시간 업데이트.
* 주문 완료 영수증에 등급별 적립 혜택 표시.

## 검증 계획
* `npx tsc --noEmit` 정적 타입 검증.
* 조건 고객님(PLATINUM, 4%) 7,950,000원 주문 기준 318,000P 계산 및 결제 완료 시 포인트 가산 검증.
