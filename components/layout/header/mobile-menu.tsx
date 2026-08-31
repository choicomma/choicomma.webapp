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
import { ShoppingBag } from "lucide-react";

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
        variant="secondary"
        size="sm"
        className={`md:hidden uppercase font-bold transition-colors duration-300 ${
          isScrolled ? "bg-white text-black hover:bg-neutral-200" : ""
        }`}
      >
        MENU
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-foreground/30 z-50"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Panel - Slides from Right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 bottom-0 right-0 flex w-full md:w-[400px] p-modal-sides z-50"
            >
              <div className="flex flex-col bg-muted p-4 rounded w-full shadow-2xl">
                <div className="pl-2 flex items-baseline justify-between mb-8">
                  <p className="text-2xl font-bold">MENU</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Close menu"
                    onClick={closeMobileMenu}
                    className="font-bold"
                  >
                    닫기
                  </Button>
                </div>

                {/* Top Buttons: LOG IN / MY PAGE, CART, and LANGUAGE */}
                <nav className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={closeMobileMenu}
                    className="uppercase bg-background/60 justify-start font-bold py-5 text-sm truncate"
                    asChild
                  >
                    <Link href={isLoggedIn ? "/membership" : "/login"} prefetch>
                      {isLoggedIn ? (userName ? `MY PAGE (${userName})` : "MY PAGE") : "LOG IN"}
                    </Link>
                  </Button>

                  {/* Integrated Cart Item inside Menu Drawer - Identical style and size as LOG IN */}
                  <div onClick={closeMobileMenu} className="w-full">
                    <CartModal
                      variant="secondary"
                      size="sm"
                      className="w-full uppercase bg-background/60 justify-start font-bold py-5 text-sm"
                    />
                  </div>
                </nav>



                <ShopLinks label="카테고리" collections={collections} includeShopAll={true} />

                <div className="mt-auto pt-4 border-t border-border/40" />
                <SidebarLinks className="gap-6 max-w-max" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
