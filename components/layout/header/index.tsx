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
import { motion, AnimatePresence } from "motion/react";
import { LanguageSelector } from "./language-selector";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [isAdmin, setIsAdmin] = useState(false);

  const [hasSecretTimeSale, setHasSecretTimeSale] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
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
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth_changed", checkAuth);
    window.addEventListener("secret_timesales_updated", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth_changed", checkAuth);
      window.removeEventListener("secret_timesales_updated", checkAuth);
    };
  }, []);

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

  const isLightHeaderRoute = pathname?.startsWith("/shop") || pathname === "/checkout" || pathname?.startsWith("/product");

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
        {/* Animated Black Background Slide-Down Panel (Only on non-shop pages or when dark mode desired) */}
        <AnimatePresence>
          {isScrolled && !isLightHeaderRoute && (
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md shadow-xl z-0 overflow-hidden"
            />
          )}
        </AnimatePresence>

        {/* Header Content Bar */}
        <div
          className={cn(
            "relative z-10 w-full pl-2 sm:pl-4 md:pl-6 pr-sides flex items-center justify-between md:grid md:grid-cols-12 md:gap-sides transition-colors duration-400 pt-0.5 pb-1 md:py-1",
            isLightHeaderRoute ? "text-neutral-900" : isScrolled ? "text-white" : "text-neutral-900"
          )}
        >
          {/* Mobile: Logo on far left / Desktop: col-span-5 */}
          <Link href="/" className="md:col-span-5 flex items-center justify-start py-0 -ml-1 sm:ml-0" prefetch>
            <LogoSvg
              isScrolled={isLightHeaderRoute ? false : isScrolled}
              className="cursor-pointer justify-start"
            />
          </Link>

          {/* Desktop Navigation & Cart (Single Unified Pill Bar) */}
          <nav className="hidden md:flex items-center md:col-span-7 justify-end gap-2.5 -mt-6 md:-mt-8">
            <div
              className={cn(
                "items-center gap-2 h-11 px-4 rounded-full backdrop-blur-md flex transition-colors duration-400 shadow-sm",
                isScrolled ? "bg-white/10 text-white" : "bg-black/5 text-neutral-900"
              )}
            >
              <ul className="flex items-center gap-6">
                {activeNavItems.map((item: any) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "font-bold text-sm transition-colors duration-300 uppercase flex items-center gap-1.5 whitespace-nowrap",
                        item.isSecret
                          ? "bg-amber-400 text-neutral-950 px-2.5 py-0.5 rounded-full font-black shadow-xs hover:bg-amber-300"
                          : isScrolled
                          ? pathname === item.href
                            ? "text-white font-black"
                            : "text-neutral-300 hover:text-white"
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

              <div className={cn("w-px h-4 mx-2", isScrolled ? "bg-white/20" : "bg-black/10")} />

              <LanguageSelector isScrolled={isScrolled} />

              <div className={cn("w-px h-4 mx-2", isScrolled ? "bg-white/20" : "bg-black/10")} />

              <CartModal
                variant="ghost"
                className={cn(
                  "transition-colors duration-400 h-8 px-2.5 rounded-full border-0 bg-transparent hover:bg-transparent shadow-none font-bold text-sm",
                  isScrolled ? "text-white hover:text-neutral-300" : "text-neutral-900 hover:text-black"
                )}
              />
            </div>
          </nav>

          {/* Mobile: Language Selector, Cart Icon & MENU on far right */}
          <div className="flex items-center gap-1.5 md:hidden">
            <LanguageSelector isScrolled={isScrolled} />
            <CartModal
              variant="ghost"
              className={cn(
                "transition-colors duration-400 p-2 border-0 bg-transparent hover:bg-transparent shadow-none",
                isScrolled ? "text-white hover:text-neutral-300" : "text-neutral-900 hover:text-black"
              )}
            />
            <MobileMenu collections={collections} isScrolled={isScrolled} />
          </div>
        </div>
      </div>
    </header>
  );
}
