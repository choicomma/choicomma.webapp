"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";

function VisitorTrackerCore() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string>("");
  const lastTrackedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 브라우저 환경에서 window.location.search를 직접 참조하여 쿼리스트링 포함 (Next.js 빌드 CSR bailout 방지)
    const search = window.location.search || "";
    const currentPath = (pathname || window.location.pathname || "/") + search;

    // 1초 이내 동일 경로 중복 호출 방지 (Debounce)
    const now = Date.now();
    if (currentPath === lastTrackedPathRef.current && now - lastTrackedTimeRef.current < 1500) {
      return;
    }

    lastTrackedPathRef.current = currentPath;
    lastTrackedTimeRef.current = now;

    // 관리자 여부 감지 (URL 경로, 관리자 계정 식별자, 관리자 플래그)
    let isAdmin = false;
    try {
      if (pathname?.startsWith("/admin")) {
        isAdmin = true;
        localStorage.setItem("choicomma_admin_device", "true");
      } else {
        const adminFlag = localStorage.getItem("choicomma_admin_device");
        const userId = localStorage.getItem("membership_user_id");
        const userEmail = localStorage.getItem("membership_user_email");
        const userRole = localStorage.getItem("user_role");
        if (
          adminFlag === "true" ||
          userId === "ADMIN-001" ||
          userEmail === "admin@choicomma.com" ||
          userRole === "admin"
        ) {
          isAdmin = true;
        }
      }
    } catch (e) {}

    // 1. 고유 방문자 ID (UV 식별용 - 로컬스토리지에 영구 보존)
    let visitorId = "";
    try {
      visitorId = localStorage.getItem("cc_visitor_id") || "";
      if (!visitorId) {
        visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem("cc_visitor_id", visitorId);
      }
    } catch (e) {
      visitorId = `v_${Date.now()}`;
    }

    // 2. 세션 ID (세션스토리지에 브라우저 탭 닫힐 때까지 보존)
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("cc_session_id") || "";
      if (!sessionId) {
        sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        sessionStorage.setItem("cc_session_id", sessionId);
      }
    } catch (e) {
      sessionId = `s_${Date.now()}`;
    }

    // 3. 실제 방문 데이터 비콘/POST 전송
    const payload = {
      path: currentPath,
      title: document.title || currentPath,
      referrer: document.referrer || "direct",
      visitorId,
      sessionId,
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      isAdmin,
    };

    try {
      fetch("/api/track/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.isBlocked) {
            console.warn("⚠️ [Security Notice] 현재 IP는 관리자에 의해 차단되어 있습니다.");
          }
        })
        .catch(() => {});
    } catch (err) {}
  }, [pathname]);

  return null;
}

export function VisitorTracker() {
  return (
    <Suspense fallback={null}>
      <VisitorTrackerCore />
    </Suspense>
  );
}
