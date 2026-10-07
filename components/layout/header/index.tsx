"use client";

import React, { useState, useEffect } from "react";
import MobileMenu from "./mobile-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoSvg } from "./logo-svg";
import CartModal from "@/components/cart/modal";
import { NavItem } from "@/lib/types";
import { Collection } from "@/lib/sfcc/types";
import { MainNoticeBanner } from "@/components/home/main-client-features";
import { LanguageSelector } from "./language-selector";
import { validateCustomerSession } from "@/lib/auth/customer-session";

export const navItems: NavItem[] = [
  {
    label: "홈",
    href: "/",
  },
  {
    label: "전체보기",
    href: "/shop",
  },
  {
    label: "타임세일",
    href: "/shop/timesale",
  },
  {
    label: "주문내역/배송조회",
    href: "/membership?tab=orders",
  },
  {
    label: "로그인",
    href: "/login",
  },
];

interface HeaderProps {
  collections: Collection[];
}

export function Header({ collections }: HeaderProps) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [hasSecretTimeSale, setHasSecretTimeSale] = useState(false);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/admin" || pathname === "/membership") {
      return;
    }

    const checkAuth = () => {
      if (typeof window !== "undefined") {
        validateCustomerSession();
        const name = localStorage.getItem("membership_user_name");
        const email = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
        const role = localStorage.getItem("user_role") || "";
        const isLoggedInFlag = localStorage.getItem("is_logged_in") === "true";
        const isAdminSession = sessionStorage.getItem("choicomma_admin_authenticated") === "true";

        const isAdm =
          role === "admin" ||
          (email === "admin" && isLoggedInFlag) ||
          name === "관리자" ||
          isAdminSession;

        const isLogged = isLoggedInFlag || Boolean(name && name.trim().length > 0);

        setIsAdmin(isAdm);
        setIsLoggedIn(isLogged);
        setUserName(name || "");

        // Check secret timesale applicability for this user
        const secretSalesRaw = localStorage.getItem("admin_secret_timesales");
        let hasTargetedSale = false;
        if (secretSalesRaw) {
          try {
            const secretSalesList: any[] = JSON.parse(secretSalesRaw);
            for (const sale of secretSalesList) {
              if (sale.status !== "active") continue;
              const isEmailTargeted = Boolean(
                email &&
                  (sale.targetCustomerEmails || []).some(
                    (em: string) => em.toLowerCase().trim() === email
                  )
              );
              const isGradeTargeted = Boolean(
                (sale.targetGrades || []).length > 0 &&
                  (sale.targetGrades.includes("ALL") ||
                    sale.targetGrades.includes(role?.toUpperCase()) ||
                    (role?.toUpperCase().includes("VIP") && sale.targetGrades.includes("VIP")))
              );
              if (isEmailTargeted || isGradeTargeted || isAdm) {
                hasTargetedSale = true;
                break;
              }
            }
          } catch (e) {}
        }
        setHasSecretTimeSale(hasTargetedSale);
      }
    };

    checkAuth();

    // Event listener callback: defer execution with setTimeout(..., 0)
    // to prevent updating Header state synchronously while another component (e.g. AdminPage) is rendering
    const handleAuthEvent = () => {
      setTimeout(checkAuth, 0);
    };

    window.addEventListener("storage", handleAuthEvent);
    window.addEventListener("auth_changed", handleAuthEvent);
    window.addEventListener("secret_timesales_updated", handleAuthEvent);
    return () => {
      window.removeEventListener("storage", handleAuthEvent);
      window.removeEventListener("auth_changed", handleAuthEvent);
      window.removeEventListener("secret_timesales_updated", handleAuthEvent);
    };
  }, [pathname]);

  if (pathname === "/login" || pathname === "/admin" || pathname === "/membership") {
    return null;
  }

  const activeNavItems = [
    ...navItems.map((item) => {
      if (item.href === "/login" && isLoggedIn) {
        return {
          label: "마이페이지",
          href: isAdmin ? "/admin" : "/membership",
        };
      }
      return item;
    }),
  ];

  const isLightHeaderRoute = pathname?.startsWith("/shop") || pathname === "/checkout" || pathname?.startsWith("/product") || pathname?.startsWith("/order");

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex flex-col pointer-events-none">
      {/* Dynamic Main Announcement Banner */}
      <div className="pointer-events-auto w-full">
        <MainNoticeBanner />
      </div>

      {/* Main Header Bar Container */}
      <div className={cn(
        "relative w-full pointer-events-auto overflow-visible transition-colors duration-300",
        isLightHeaderRoute ? "bg-white/95 backdrop-blur-md border-b border-neutral-200/60 shadow-xs" : ""
      )}>
        {/* Header Content Bar */}
        <div
          className={cn(
            "relative z-10 w-full pl-2 sm:pl-4 md:pl-6 pr-sides flex items-center justify-between md:grid md:grid-cols-12 md:gap-sides transition-colors duration-400 pt-0.5 pb-1 md:py-1",
            "text-neutral-900"
          )}
        >
          {/* Mobile: Logo on far left / Desktop: col-span-5 */}
          <Link href="/" className="md:col-span-5 flex items-center justify-start py-0 -ml-1 sm:ml-0" prefetch>
            <LogoSvg
              className="cursor-pointer justify-start"
            />
          </Link>

          {/* Desktop Navigation & Cart (Single Unified Pill Bar) */}
          <nav className="hidden md:flex items-center md:col-span-7 justify-end gap-2.5 -mt-6 md:-mt-8">
            <div
              className={cn(
                "items-center gap-1.5 md:gap-2 h-10 md:h-11 px-2.5 md:px-4 rounded-full backdrop-blur-md flex transition-colors duration-400 shadow-sm shrink-0",
                "bg-black/5 text-neutral-900 border border-black/5"
              )}
            >
              <ul className="flex items-center gap-2 md:gap-3 lg:gap-4 xl:gap-6 shrink-0">
                {activeNavItems.map((item: any) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "font-bold text-sm transition-colors duration-300 uppercase flex items-center gap-1.5 whitespace-nowrap",
                        item.isSecret
                          ? "bg-amber-400 text-neutral-950 px-2.5 py-0.5 rounded-full font-black shadow-xs hover:bg-amber-300"
                          : pathname === item.href
                            ? "text-black font-black"
                            : "text-neutral-700 hover:text-black"
                      )}
                      prefetch
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="w-px h-4 mx-2 bg-black/10" />

              <LanguageSelector />

              <div className="w-px h-4 mx-2 bg-black/10" />

              <CartModal
                variant="ghost"
                className="transition-colors duration-400 h-8 px-2.5 rounded-full border-0 bg-transparent hover:bg-transparent shadow-none font-bold text-sm text-neutral-900 hover:text-black"
              />
            </div>
          </nav>

          {/* Mobile: Language Selector, Cart Icon & MENU on far right */}
          <div className="flex items-center gap-1.5 md:hidden">
            <LanguageSelector />
            <CartModal
              variant="ghost"
              className="transition-colors duration-400 p-2 border-0 bg-transparent hover:bg-transparent shadow-none text-neutral-900 hover:text-black"
            />
            <MobileMenu collections={collections} />
          </div>
        </div>
      </div>
    </header>
  );
}
