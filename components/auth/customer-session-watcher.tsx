"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { validateCustomerSession, isCurrentUserAdmin } from "@/lib/auth/customer-session";

/**
 * 일반 고객 세션 만료 및 브라우저 종료 감지용 전역 감시 컴포넌트
 * - 관리자(Admin)는 검사 대상에서 제외
 * - 1분 간격 주기적 체크 + 브라우저 탭 활성화 시 즉각 체크
 * - 만료 시 `/membership` 등 회원 전용 페이지에 머물고 있으면 `/login`으로 안전하게 리다이렉트
 */
export function CustomerSessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 관리자 페이지(/admin)이거나 관리자 계정인 경우 동작 건너뜀
    if (pathname?.startsWith("/admin") || isCurrentUserAdmin()) {
      return;
    }

    const checkSession = () => {
      if (isCurrentUserAdmin()) return;

      const isValid = validateCustomerSession();
      if (!isValid) {
        // 회원 전용 페이지(마이페이지 등)에 머물고 있을 경우 로그인 페이지로 이동
        if (pathname?.startsWith("/membership")) {
          router.push("/login?expired=true");
        }
      }
    };

    // 1. 초기 마운트 시 검사
    checkSession();

    // 2. 주기적 검사 (1분 간격)
    const intervalId = setInterval(checkSession, 60 * 1000);

    // 3. 브라우저 탭 활성화/포커스 복귀 시 검사
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, router]);

  return null;
}
