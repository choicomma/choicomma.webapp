"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ShoppingBag, Menu } from "lucide-react";

interface MobileMenuProps {
  collections: Collection[];
  isScrolled?: boolean;
}

export default function MobileMenu({ collections, isScrolled }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const pathname = usePathname();
  const { cart } = useCart();

  const openMobileMenu = () => setIsOpen(true);
  const closeMobileMenu = () => setIsOpen(false);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
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
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth_changed", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth_changed", checkAuth);
    };
  }, []);

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
                {/* Top Quick Actions Grid: 로그인 / MY PAGE + 장바구니 */}
                <nav className="grid grid-cols-2 gap-2.5">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={closeMobileMenu}
                    className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 justify-center font-bold py-5 text-sm truncate shadow-2xs rounded-xl"
                    asChild
                  >
                    <Link href={isLoggedIn ? (isAdmin ? "/admin" : "/membership") : "/login"} prefetch>
                      {isLoggedIn ? (isAdmin ? "어드민" : (userName ? `마이페이지 (${userName})` : "마이페이지")) : "로그인"}
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
                    className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 justify-center font-bold py-5 text-sm shadow-2xs rounded-xl gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>장바구니 ({cart?.totalQuantity || 0})</span>
                  </Button>
                </nav>

                {/* Category Links with Larger Text & Increased Spacing */}
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <ShopLinks label="" collections={collections} includeShopAll={true} />
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
