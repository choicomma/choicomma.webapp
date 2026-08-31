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
    label: "타임세일",
    href: "/shop/timesale",
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

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const name = localStorage.getItem("membership_user_name");
        const email = localStorage.getItem("membership_user_email");
        const isLogged = Boolean(name || email || localStorage.getItem("is_logged_in") === "true");
        setIsLoggedIn(isLogged);
        setUserName(name || "");
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth_changed", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth_changed", checkAuth);
    };
  }, []);

  if (pathname === "/login" || pathname === "/admin" || pathname === "/membership") {
    return null;
  }

  const activeNavItems = navItems.map((item) => {
    if (item.href === "/login" && isLoggedIn) {
      return {
        label: userName ? `마이페이지 (${userName})` : "마이페이지",
        href: "/membership",
      };
    }
    return item;
  });

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex flex-col pointer-events-none">
      {/* Dynamic Main Announcement Banner */}
      <div className="pointer-events-auto w-full">
        <MainNoticeBanner />
      </div>

      {/* Main Header Bar Container */}
      <div className="relative w-full pointer-events-auto overflow-visible">
        {/* Animated Black Background Slide-Down Panel */}
        <AnimatePresence>
          {isScrolled && (
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
            "relative z-10 w-full p-sides flex items-center justify-between md:grid md:grid-cols-12 md:gap-sides transition-colors duration-400 py-3.5",
            isScrolled ? "text-white" : "text-neutral-900"
          )}
        >
          {/* Mobile: Logo on far left / Desktop: col-span-2 */}
          <Link href="/" className="md:col-span-2 flex items-center" prefetch>
            <LogoSvg
              className={cn(
                "h-6 w-auto md:size-full md:max-w-[400px] transition-colors duration-400",
                isScrolled ? "text-white fill-white" : "text-black fill-black"
              )}
            />
          </Link>

          {/* Desktop Navigation & Cart */}
          <nav className="hidden md:flex items-center md:col-span-10 justify-end gap-3">
            <ul
              className={cn(
                "items-center gap-6 py-1.5 px-5 rounded-full backdrop-blur-md flex transition-colors duration-400",
                isScrolled ? "bg-white/10 text-white" : "bg-black/5 text-neutral-900"
              )}
            >
              {activeNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "font-semibold text-base transition-colors duration-300 uppercase flex items-center gap-1.5",
                      isScrolled
                        ? pathname === item.href
                          ? "text-white font-bold"
                          : "text-neutral-300 hover:text-white"
                        : pathname === item.href
                          ? "text-black font-bold"
                          : "text-neutral-700 hover:text-black"
                    )}
                    prefetch
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <LanguageSelector isScrolled={isScrolled} />
            <CartModal
              className={cn(
                "transition-colors duration-400",
                isScrolled ? "bg-white text-black hover:bg-neutral-200" : ""
              )}
            />
          </nav>

          {/* Mobile: MENU & Language Selector on far right */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSelector isScrolled={isScrolled} />
            <MobileMenu collections={collections} isScrolled={isScrolled} />
          </div>
        </div>
      </div>
    </header>
  );
}
