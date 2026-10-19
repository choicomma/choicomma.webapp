import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  fetchNaverToken,
  fetchNaverUserInfo,
} from "@/lib/auth/naver";
import { runSafeSupabaseQuery } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getCustomersFilePath() {
  return path.join(process.cwd(), "data", "customers.json");
}

function readCustomersFile(): any[] {
  try {
    const filePath = getCustomersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[Naver Auth - Customers File Read Warning]:", err);
  }
  return [];
}

function writeCustomersFile(data: any[]) {
  try {
    const targetPath = getCustomersFilePath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    }
  } catch (err) {
    console.error("[Naver Auth - Customers File Write Error]:", err);
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "/membership";
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // 사용자가 네이버 동의창에서 취소했거나 에러 발생 시
  if (error || !code) {
    console.warn("[Naver Auth Cancelled/Error]:", error, errorDescription);
    return NextResponse.redirect(new URL("/login?naver=cancelled", req.url));
  }

  try {
    // 1. 네이버 토큰 발급
    const tokenData = await fetchNaverToken(code, state);
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access_token returned from Naver");
    }

    // 2. 네이버 사용자 프로필 조회
    const userInfo = await fetchNaverUserInfo(accessToken);
    const naverId = String(userInfo.id);
    const naverEmail = (userInfo.email || "").trim().toLowerCase();
    const naverName = (userInfo.name || userInfo.nickname || "네이버회원").trim();
    let naverPhone = (userInfo.mobile || "").trim();
    if (naverPhone && !naverPhone.includes("-") && naverPhone.length >= 10) {
      naverPhone = naverPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
    }

    // 3. 기존 회원 대조 및 검색
    const allCustomers = readCustomersFile();
    let matchedCustomer: any = null;
    let isNewSignUp = false;

    const cleanInputPhone = naverPhone.replace(/[^0-9]/g, "");

    // 1순위: 이미 네이버 ID로 연동된 회원
    matchedCustomer = allCustomers.find(
      (c) => c.naverId && String(c.naverId) === naverId
    );

    // 2순위: 네이버 계정 이메일과 일치하는 기존 회원
    if (!matchedCustomer && naverEmail) {
      matchedCustomer = allCustomers.find(
        (c) =>
          c.email &&
          c.email.trim().toLowerCase() === naverEmail
      );
    }

    // 3순위: 전화번호가 제공된 경우 전화번호 일치 회원
    if (!matchedCustomer && cleanInputPhone && cleanInputPhone.length >= 10) {
      matchedCustomer = allCustomers.find((c) => {
        const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
        return cPhone === cleanInputPhone;
      });
    }

    // 4. 회원 데이터 처리 (신규 생성 또는 기존 회원 갱신)
    let finalCustomer: any;

    if (matchedCustomer) {
      // 기존 회원 매칭 성공 -> naverId가 비어있다면 업데이트
      finalCustomer = {
        ...matchedCustomer,
        naverId: matchedCustomer.naverId || naverId,
      };

      const updatedList = allCustomers.map((c) =>
        c.id === matchedCustomer.id ? finalCustomer : c
      );
      writeCustomersFile(updatedList);
    } else {
      // 신규 회원 자동 가입
      isNewSignUp = true;
      const newCustId = `CUST-${Date.now().toString().slice(-6)}`;
      finalCustomer = {
        id: newCustId,
        loginId: naverEmail || `naver_${naverId}`,
        name: naverName,
        email: naverEmail || `naver_${naverId}@choicomma.user`,
        phone: naverPhone || "",
        address: "",
        detailAddress: "",
        postcode: "",
        grade: "GENERAL",
        totalSpent: 0,
        points: 1000, // 신규 웰컴 마일리지 1,000P 증정
        couponsCount: 1, // 웰컴 쿠폰 1장 증정
        joinedDate: new Date().toISOString().split("T")[0],
        status: "Active",
        role: "CUSTOMER",
        isAdmin: false,
        naverId: naverId,
        authProvider: "naver",
      };

      const updatedList = [finalCustomer, ...allCustomers];
      writeCustomersFile(updatedList);
    }

    // 5. Supabase Pro DB 안전 동기화 (백그라운드)
    try {
      await runSafeSupabaseQuery(async (client) => {
        return await client.from("customers").upsert(
          {
            id: finalCustomer.id,
            name: finalCustomer.name,
            email: finalCustomer.email,
            phone: finalCustomer.phone || "",
            address: finalCustomer.address || "",
            grade: finalCustomer.grade || "GENERAL",
            totalSpent: Number(finalCustomer.totalSpent || 0),
            points: Number(finalCustomer.points || 0),
            couponsCount: Number(finalCustomer.couponsCount || 0),
            joinedDate: finalCustomer.joinedDate,
            status: finalCustomer.status || "Active",
            role: finalCustomer.role || "CUSTOMER",
            isAdmin: Boolean(finalCustomer.isAdmin),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }, 2500);
    } catch (dbErr) {
      console.warn("[Naver Auth - Supabase Sync Notice]:", dbErr);
    }

    // 6. 브라우저 세션 스토리지 주입 및 최종 화면 이동 HTML 렌더링
    const targetRedirect = state.startsWith("/") ? state : "/membership";
    const customerJsonForClient = JSON.stringify({
      id: finalCustomer.id,
      loginId: finalCustomer.loginId || finalCustomer.email || "",
      name: finalCustomer.name || "고객",
      email: finalCustomer.email || "",
      phone: finalCustomer.phone || "",
      postcode: finalCustomer.postcode || "",
      address: finalCustomer.address || "",
      detailAddress: finalCustomer.detailAddress || "",
      points: String(finalCustomer.points || 0),
      grade: finalCustomer.grade || "GENERAL",
      role: finalCustomer.role || "CUSTOMER",
      isNewSignUp,
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>네이버 로그인 처리 중 - choicomma</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(0,0,0,0.08);
      border-top-color: #03C75A;
      border-right-color: #00B04A;
      border-radius: 50%;
      animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      margin-top: 24px;
      font-size: 15px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.02em;
    }
    .desc {
      margin-top: 6px;
      font-size: 13px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">네이버 계정으로 안전하게 로그인하는 중입니다</div>
  <div class="desc">잠시만 기다려 주시면 바로 이동합니다...</div>

  <script>
    (function() {
      try {
        var customer = ${customerJsonForClient};
        var expiresAt = Date.now() + 24 * 60 * 60 * 1000;

        sessionStorage.setItem("customer_session_active", "true");
        sessionStorage.removeItem("choicomma_admin_authenticated");

        localStorage.setItem("customer_session_expires_at", String(expiresAt));
        localStorage.setItem("is_logged_in", "true");
        localStorage.setItem("membership_user_id", customer.id);
        localStorage.setItem("membership_user_login_id", customer.loginId);
        localStorage.setItem("membership_user_name", customer.name);
        localStorage.setItem("membership_user_email", customer.email);
        localStorage.setItem("membership_user_phone", customer.phone);
        localStorage.setItem("membership_user_postcode", customer.postcode);
        localStorage.setItem("membership_user_address", customer.address);
        localStorage.setItem("membership_user_address_detail", customer.detailAddress);
        localStorage.setItem("membership_user_points", customer.points);
        localStorage.setItem("user_grade", customer.grade);
        localStorage.setItem("user_role", customer.role);

        var savedRaw = localStorage.getItem("admin_customers");
        var localList = [];
        if (savedRaw) {
          try { localList = JSON.parse(savedRaw); } catch(e) {}
        }
        var filtered = localList.filter(function(c) { return c.id !== customer.id && c.email !== customer.email; });
        localStorage.setItem("admin_customers", JSON.stringify([customer].concat(filtered)));

        if (customer.isNewSignUp) {
          localStorage.removeItem("choicomma_cart");
          window.dispatchEvent(new CustomEvent("choicomma_cart_updated", { detail: { action: "clear" } }));
        }

        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("auth_changed", { detail: { provider: "naver", customerId: customer.id } }));
      } catch (e) {
        console.error("Failed to inject customer session:", e);
      }

      setTimeout(function() {
        window.location.replace("${targetRedirect}");
      }, 350);
    })();
  </script>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[Naver Auth Callback Exception]:", err);
    return NextResponse.redirect(
      new URL(`/login?error=naver_failed&msg=${encodeURIComponent(err.message || "네이버 로그인 실패")}`, req.url)
    );
  }
}
