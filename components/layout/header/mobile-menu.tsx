"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { navItems } from "./index";
import { SidebarLinks } from "../sidebar/product-sidebar-links";
import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/sfcc/types";
import { useCart } from "@/components/cart/cart-context";
import CartModal from "@/components/cart/modal";
import { LanguageSelector } from "./language-selector";
import { ShoppingBag, Menu, Search, X } from "lucide-react";
import { validateCustomerSession } from "@/lib/auth/customer-session";

interface MobileMenuProps {
  collections: Collection[];
  isScrolled?: boolean;
}

function MobileMenuContent({ collections, isScrolled }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryVal = searchParams?.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(queryVal);
  const { cart } = useCart();

  const openMobileMenu = () => setIsOpen(true);
  const closeMobileMenu = () => setIsOpen(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = (provider: "kakao" | "naver" | "google") => {
    setSocialLoading(provider);
    closeMobileMenu();
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/membership";
    const redirectTarget = currentPath && currentPath !== "/login" ? currentPath : "/membership";
    window.location.href = `/api/auth/${provider}/login?redirect=${encodeURIComponent(redirectTarget)}&t=${Date.now()}`;
  };

  useEffect(() => {
    setSearchTerm(queryVal);
  }, [queryVal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    closeMobileMenu();
    if (trimmed) {
      router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/shop");
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    closeMobileMenu();
    router.push("/shop");
  };

  useEffect(() => {
    if (pathname === "/login" || pathname === "/admin" || pathname === "/membership") {
      return;
    }

    const checkAuth = () => {
      if (typeof window !== "undefined") {
        validateCustomerSession();
        const name = localStorage.getItem("membership_user_name");
        const email = localStorage.getItem("membership_user_email");
        const role = localStorage.getItem("user_role");
        const isLoggedInFlag = localStorage.getItem("is_logged_in") === "true";
        const isAdminSession = sessionStorage.getItem("choicomma_admin_authenticated") === "true";

        const isAdm = role === "admin" || (email === "admin" && isLoggedInFlag) || isAdminSession;
        const isLogged = isLoggedInFlag || Boolean(name && name.trim().length > 0);

        setIsAdmin(isAdm);
        setIsLoggedIn(isLogged);
        setUserName(name || "");
      }
    };

    checkAuth();
    const handleAuthEvent = () => {
      setTimeout(checkAuth, 0);
    };
    window.addEventListener("storage", handleAuthEvent);
    window.addEventListener("auth_changed", handleAuthEvent);
    return () => {
      window.removeEventListener("storage", handleAuthEvent);
      window.removeEventListener("auth_changed", handleAuthEvent);
    };
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Close menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  return (
    <>
      <Button
        onClick={openMobileMenu}
        aria-label="Open mobile menu"
        variant="ghost"
        size="sm"
        className={`md:hidden p-2 border-0 bg-transparent hover:bg-transparent shadow-none transition-colors duration-300 ${
          isScrolled ? "text-white hover:text-neutral-300" : "text-neutral-900 hover:text-black"
        }`}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Full-Height Drawer Panel - Slides from Right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 bottom-0 right-0 w-full sm:w-[380px] md:w-[420px] h-[100dvh] bg-white flex flex-col shadow-2xl z-[101]"
            >
              {/* Header Row: MENU title, Language Selector, Close button */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
                <p className="text-xl font-black text-neutral-950 tracking-tight">MENU</p>
                <div className="flex items-center gap-2">
                  <LanguageSelector isScrolled={false} align="right" />
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Close menu"
                    onClick={closeMobileMenu}
                    className="font-extrabold text-sm hover:bg-neutral-100 text-neutral-900 px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    닫기
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Top Quick Actions Grid: 로그인 / MY PAGE + 주문내역/배송조회 + 장바구니 */}
                <nav className="grid grid-cols-2 gap-2.5">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={closeMobileMenu}
                    className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 justify-center font-bold py-5 text-sm truncate shadow-2xs rounded-xl"
                    asChild
                  >
                    <Link href={isLoggedIn ? (isAdmin ? "/admin" : "/membership") : "/login"} prefetch>
                      {isLoggedIn ? "마이페이지" : "로그인"}
                    </Link>
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={closeMobileMenu}
                    className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 justify-center font-bold py-5 text-sm truncate shadow-2xs rounded-xl"
                    asChild
                  >
                    <Link href="/membership?tab=orders" prefetch>
                      <span>주문내역 / 배송조회</span>
                    </Link>
                  </Button>

                  {/* Cart Item inside Menu Drawer with Korean Label */}
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => {
                      closeMobileMenu();
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("choicomma_open_cart"));
                      }, 100);
                    }}
                    className="col-span-2 w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 justify-center font-bold py-5 text-sm shadow-2xs rounded-xl gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>장바구니 ({cart?.totalQuantity || 0})</span>
                  </Button>
                </nav>

                {/* 3가지 SNS 빠른 간편 로그인 (장바구니 바로 아래) */}
                {!isLoggedIn ? (
                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] font-extrabold text-neutral-400 tracking-wider uppercase">
                        SNS 1초 간편 로그인
                      </span>
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-950 underline underline-offset-2"
                      >
                        일반 로그인
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {/* 카카오 */}
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("kakao")}
                        disabled={Boolean(socialLoading)}
                        className="w-full bg-[#FEE500] hover:bg-[#FDD835] active:scale-[0.99] text-[#191919] font-extrabold py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 text-xs cursor-pointer border border-[#FEE500] disabled:opacity-60"
                      >
                        {socialLoading === "kakao" ? (
                          <div className="w-4 h-4 border-2 border-[#191919] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.85 1.862 5.347 4.678 6.744l-1.188 4.356c-.104.381.282.697.604.496l5.127-3.204c.256.026.516.039.779.039 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                            </svg>
                            <span>카카오로 1초 시작하기</span>
                          </>
                        )}
                      </button>

                      {/* 네이버 */}
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("naver")}
                        disabled={Boolean(socialLoading)}
                        className="w-full bg-[#03C75A] hover:bg-[#02b350] active:scale-[0.99] text-white font-extrabold py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 text-xs cursor-pointer border border-[#03C75A] disabled:opacity-60"
                      >
                        {socialLoading === "naver" ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 fill-white shrink-0" viewBox="0 0 24 24">
                              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                            </svg>
                            <span>네이버로 시작하기</span>
                          </>
                        )}
                      </button>

                      {/* 구글 */}
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("google")}
                        disabled={Boolean(socialLoading)}
                        className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-bold py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 text-xs cursor-pointer border border-neutral-200 disabled:opacity-60"
                      >
                        {socialLoading === "google" ? (
                          <div className="w-4 h-4 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>Google로 시작하기</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-neutral-800 truncate">
                        {userName ? `${userName}님 환영합니다` : "로그인 완료"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("is_logged_in");
                          localStorage.removeItem("membership_user_name");
                          localStorage.removeItem("membership_user_email");
                          localStorage.removeItem("membership_user_id");
                          localStorage.removeItem("customer_session_expires_at");
                          sessionStorage.removeItem("customer_session_active");
                          sessionStorage.removeItem("choicomma_admin_authenticated");
                          window.dispatchEvent(new CustomEvent("storage"));
                          window.dispatchEvent(new CustomEvent("auth_changed"));
                          closeMobileMenu();
                          router.push("/");
                        }
                      }}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 underline underline-offset-2 shrink-0 cursor-pointer pl-2"
                    >
                      로그아웃
                    </button>
                  </div>
                )}

                {/* Mobile Search Bar */}
                <div className="pt-2">
                  <form onSubmit={handleSearchSubmit} className="relative w-full">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="상품 검색어 입력..."
                      className="w-full bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white text-neutral-900 placeholder:text-neutral-400 text-sm font-medium pl-10 pr-9 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900 transition-all"
                    />
                    <button
                      type="submit"
                      aria-label="검색"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        aria-label="검색어 지우기"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>
                </div>

                {/* Category Links with Larger Text & Increased Spacing */}
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <ShopLinks
                    label=""
                    collections={collections.filter((c) => {
                      const h = String(c?.handle || "").toLowerCase();
                      return h !== "all" && h !== "new";
                    })}
                    includeShopAll={true}
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100" />
                <SidebarLinks className="gap-6 max-w-max text-sm" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MobileMenu(props: MobileMenuProps) {
  return (
    <Suspense
      fallback={
        <button
          type="button"
          aria-label="Open mobile menu"
          className="flex items-center justify-center p-2 rounded-full transition-colors text-inherit"
        >
          <Menu className="h-5 w-5" />
        </button>
      }
    >
      <MobileMenuContent {...props} />
    </Suspense>
  );
}
