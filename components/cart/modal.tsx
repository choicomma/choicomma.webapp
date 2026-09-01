"use client";

import { ArrowRight, TriangleAlert, PlusCircleIcon, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCartAndSetCookie, redirectToCheckout } from "./actions";
import { useCart } from "./cart-context";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { CartItemCard } from "./cart-item";
import { formatPrice } from "@/lib/sfcc/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import TossPaymentModal from "../checkout/toss-payment-modal";

import { translateUiText, getCurrentLanguage } from "@/lib/i18n/translation";

const CartItems = ({ closeCart, openTossModal }: { closeCart: () => void; openTossModal: () => void }) => {
  const { cart, updateCartItem } = useCart();
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  if (!cart) return <></>;

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden">
      <div className="flex justify-between text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 px-1">
        <span>Products</span>
        <span>{cart.lines.length} items</span>
      </div>
      <div className="grow overflow-auto py-3 space-y-3">
        <AnimatePresence>
          {cart.lines
            .sort((a, b) =>
              a.merchandise.product.title.localeCompare(
                b.merchandise.product.title
              )
            )
            .map((item, i) => (
              <motion.div
                key={`${item.id}-${item.merchandise.id}`}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
              >
                <CartItemCard
                  item={item}
                  optimisticUpdate={updateCartItem}
                  onCloseCart={closeCart}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
      <div className="py-3 text-xs font-bold text-neutral-600 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-2 flex items-center justify-between">
          <p>Taxes</p>
          <p className="text-right font-black text-neutral-900 dark:text-white">
            {formatPrice(
              cart.cost.totalTaxAmount.amount,
              cart.cost.totalTaxAmount.currencyCode
            )}
          </p>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <p>Shipping</p>
          {cart.cost.shippingAmount ? (
            <p className="text-right font-black text-neutral-900 dark:text-white">
              {formatPrice(
                cart.cost.shippingAmount.amount,
                cart.cost.shippingAmount.currencyCode
              )}
            </p>
          ) : (
            <p className="text-right font-bold text-neutral-500">Calculated at checkout</p>
          )}
        </div>
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <p className="text-sm font-black text-neutral-900 dark:text-white">Total</p>
          <p className="text-right text-lg font-black text-neutral-900 dark:text-white font-mono">
            {formatPrice(
              cart.cost.totalAmount.amount,
              cart.cost.totalAmount.currencyCode
            )}
          </p>
        </div>
      </div>
      <div className="pt-2">
        <Link
          href="/checkout"
          onClick={closeCart}
          className="w-full relative flex items-center justify-between gap-3 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold cursor-pointer py-3.5 px-5 rounded-2xl shadow-md transition-all text-sm"
        >
          <span>📋 {translateUiText("결제하기", currentLang)}</span>
          <ArrowRight className="size-5 text-neutral-300" />
        </Link>
      </div>
    </div>
  );
};

export default function CartModal({
  className,
  variant = "ghost",
  size = "sm",
  showText = false,
  onOpenCallback,
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-lg";
  showText?: boolean;
  onOpenCallback?: () => void;
} = {}) {
  const { cart, mode } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isTossModalOpen, setIsTossModalOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const quantityRef = useRef(cart?.totalQuantity);
  const isInitialLoad = useRef(true);
  const openCart = () => {
    if (onOpenCallback) onOpenCallback();
    setIsOpen(true);
  };
  const closeCart = () => setIsOpen(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!cart) {
      createCartAndSetCookie();
    }
  }, [cart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      setIsOpen(true);
    };
    const handleOpenCartEvent = () => {
      setIsOpen(true);
    };
    window.addEventListener("choicomma_cart_updated", handleCartUpdate);
    window.addEventListener("choicomma_open_cart", handleOpenCartEvent);
    return () => {
      window.removeEventListener("choicomma_cart_updated", handleCartUpdate);
      window.removeEventListener("choicomma_open_cart", handleOpenCartEvent);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/checkout") closeCart();
  }, [pathname]);

  const renderCartContent = () => {
    if (!cart || cart.lines.length === 0) {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full flex"
          >
            <Link
              href="/shop"
              className="bg-background rounded-lg p-2 border border-dashed border-border w-full"
              onClick={closeCart}
            >
              <div className="flex flex-row gap-6">
                <div className="relative size-20 overflow-hidden rounded-sm shrink-0 border border-dashed border-border flex items-center justify-center">
                  <PlusCircleIcon className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-2 2xl:gap-3 flex-1 justify-center">
                  <span className="text-lg 2xl:text-xl font-semibold">
                    {translateUiText("장바구니", currentLang)}
                  </span>
                  <p className="text-sm text-muted-foreground hover:underline">
                    {translateUiText("EXPLORE COLLECTION", currentLang)}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      );
    }

    return <CartItems closeCart={closeCart} openTossModal={() => setIsTossModalOpen(true)} />;
  };

  return (
    <>
      <Button
        aria-label="Open cart"
        onClick={openCart}
        variant={variant}
        size={size}
        className={cn("uppercase font-bold relative flex items-center justify-center gap-2", className)}
      >
        {/* Shopping Bag Icon */}
        <ShoppingBag className="w-4 h-4 shrink-0" />

        {/* Text rendering: always show if showText is true, otherwise hide on mobile / show on desktop */}
        <span className={showText ? "inline-flex items-center gap-1" : "hidden md:inline-flex items-center gap-1"}>
          <span>{translateUiText("장바구니", currentLang)}</span> ({cart?.totalQuantity || 0})
        </span>

        {/* Mobile Badge (only when showText is false) */}
        {!showText && (cart?.totalQuantity || 0) > 0 && (
          <span className="md:hidden absolute -top-1.5 -right-1.5 bg-neutral-950 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
            {cart?.totalQuantity}
          </span>
        )}
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
              onClick={closeCart}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 bottom-0 right-0 flex w-full md:w-[480px] p-2 md:p-4 z-50"
            >
              <div className="flex flex-col bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 p-4 md:p-6 rounded-3xl shadow-2xl w-full">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <p className="text-2xl font-black text-neutral-900 dark:text-white">
                    {translateUiText("장바구니", currentLang)}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Close cart"
                    onClick={closeCart}
                    className="font-extrabold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Close
                  </Button>
                </div>

                {renderCartContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toss Payments Test Checkout Modal */}
      <TossPaymentModal
        isOpen={isTossModalOpen}
        onClose={() => setIsTossModalOpen(false)}
        totalAmount={Number(cart?.cost?.totalAmount?.amount || 50000)}
        orderName={
          cart?.lines?.[0]?.merchandise?.product?.title
            ? cart.lines.length > 1
              ? `${cart.lines[0].merchandise.product.title} 외 ${cart.lines.length - 1}건`
              : cart.lines[0].merchandise.product.title
            : "초이콤마 오리지널 패션 주문건"
        }
      />
    </>
  );
}

function CheckoutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      size="lg"
      className="w-full relative flex items-center justify-between gap-3"
    >
      {pending ? "Processing..." : "Proceed to Checkout"}
      <ArrowRight className="size-6" />
    </Button>
  );
}
