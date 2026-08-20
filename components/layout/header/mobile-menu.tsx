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
import { getCurrentLanguage } from "@/lib/i18n/translation";
import { LanguageSelector } from "./language-selector";

const MOBILE_I18N: Record<string, Record<string, string>> = {
  ko: {
    menu: "MENU",
    close: "닫기",
    login: "LOG IN",
    langLabel: "Language / 언어",
    categories: "카테고리",
  },
  en: {
    menu: "MENU",
    close: "Close",
    login: "LOG IN",
    langLabel: "Language",
    categories: "CATEGORIES",
  },
  ja: {
    menu: "メニュー",
    close: "閉じる",
    login: "ログイン",
    langLabel: "言語選択",
    categories: "カテゴリー",
  },
  zh: {
    menu: "菜单",
    close: "关闭",
    login: "登录",
    langLabel: "语言选择",
    categories: "商品分类",
  },
  fr: {
    menu: "MENU",
    close: "Fermer",
    login: "CONNEXION",
    langLabel: "Langue",
    categories: "CATÉGORIES",
  },
  de: {
    menu: "MENÜ",
    close: "Schließen",
    login: "ANMELDEN",
    langLabel: "Sprache",
    categories: "KATEGORIEN",
  },
  es: {
    menu: "MENÚ",
    close: "Cerrar",
    login: "ACCESO",
    langLabel: "Idioma",
  },
};

interface MobileMenuProps {
  collections: Collection[];
  isScrolled?: boolean;
}

export default function MobileMenu({ collections, isScrolled }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");
  const pathname = usePathname();
  const { cart } = useCart();

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const t = MOBILE_I18N[currentLang] || MOBILE_I18N.ko;

  const openMobileMenu = () => setIsOpen(true);
  const closeMobileMenu = () => setIsOpen(false);

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
        {t.menu}
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
                  <p className="text-2xl font-bold">{t.menu}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Close menu"
                    onClick={closeMobileMenu}
                    className="font-bold"
                  >
                    {t.close}
                  </Button>
                </div>

                {/* Top Buttons: LOG IN, CART, and LANGUAGE */}
                <nav className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={closeMobileMenu}
                    className="uppercase bg-background/60 justify-start font-bold py-5 text-sm"
                    asChild
                  >
                    <Link href="/login" prefetch>{t.login}</Link>
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

                <div className="mb-6 flex items-center justify-between bg-background/60 p-3 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-neutral-600 uppercase">{t.langLabel}</span>
                  <LanguageSelector />
                </div>

                <ShopLinks label={t.categories} collections={collections} includeShopAll={true} />

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
