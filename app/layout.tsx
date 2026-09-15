import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { getCart, getSFCCMode } from "@/lib/sfcc";
import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/modal";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { HeaderWithData } from "@/components/layout/header/server-wrapper";

const pretendard = localFont({
  src: [
    {
      path: "../public/font/Pretendard-Thin.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-ExtraLight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "choicomma",
  description: "choicomma official store",
  generator: "v0.app",
};

import { LiveChatWidget } from "@/components/chat/live-chat-widget";
import { CustomerSessionWatcher } from "@/components/auth/customer-session-watcher";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = await getSFCCMode();
  const cart = getCart();

  return (
    <html lang="ko" className={`${pretendard.variable} ${pretendard.className}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                if (Node.prototype.removeChild) {
                  var origRemoveChild = Node.prototype.removeChild;
                  Node.prototype.removeChild = function(child) {
                    if (child.parentNode !== this) {
                      if (child.parentNode) {
                        return child.parentNode.removeChild(child);
                      }
                      return child;
                    }
                    return origRemoveChild.apply(this, arguments);
                  };
                }
                if (Node.prototype.insertBefore) {
                  var origInsertBefore = Node.prototype.insertBefore;
                  Node.prototype.insertBefore = function(newNode, refNode) {
                    if (refNode && refNode.parentNode !== this) {
                      if (refNode.parentNode) {
                        return refNode.parentNode.insertBefore(newNode, refNode);
                      }
                      return newNode;
                    }
                    return origInsertBefore.apply(this, arguments);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${pretendard.variable} ${pretendard.className} font-sans antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <CartProvider cartPromise={cart} mode={mode}>
          <NuqsAdapter>
            <CustomerSessionWatcher />
            <HeaderWithData />
            {children}
            <LiveChatWidget />
            <CartDrawer />
            <Toaster closeButton position="top-center" />
            {isDevelopment && <DebugGrid />}
          </NuqsAdapter>
        </CartProvider>
      </body>
    </html>
  );
}
