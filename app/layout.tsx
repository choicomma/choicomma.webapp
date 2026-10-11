import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsProvider } from "@/components/providers/nuqs-provider";
import { getCart, getSFCCMode } from "@/lib/sfcc";
import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/modal";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { HeaderWithData } from "@/components/layout/header/server-wrapper";
import { CATALOG_EPOCH, CATALOG_CACHE_KEYS_TO_PURGE, CATALOG_EPOCH_STORAGE_KEY } from "@/lib/catalog-epoch";

const pretendard = localFont({
  src: "../public/font/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
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
  verification: {
    other: {
      "naver-site-verification": "d3e238722a634e1c3e11af118a0ccd78f6614446",
    },
  },
};

import { LiveChatWidget } from "@/components/chat/live-chat-widget";
import { CustomerSessionWatcher } from "@/components/auth/customer-session-watcher";
import { VisitorTracker } from "@/components/analytics/visitor-tracker";

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
        <meta name="naver-site-verification" content="d3e238722a634e1c3e11af118a0ccd78f6614446" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                try {
                  // 상품 캐시 세대가 바뀌면(새 배포) 이 브라우저에 남은 옛 상품 캐시를 한 번만 지운다.
                  var epochKey = ${JSON.stringify(CATALOG_EPOCH_STORAGE_KEY)};
                  var epoch = ${JSON.stringify(CATALOG_EPOCH)};
                  if (window.localStorage.getItem(epochKey) !== epoch) {
                    var purgeKeys = ${JSON.stringify(CATALOG_CACHE_KEYS_TO_PURGE)};
                    for (var i = 0; i < purgeKeys.length; i++) {
                      window.localStorage.removeItem(purgeKeys[i]);
                    }
                    window.localStorage.setItem(epochKey, epoch);
                  }
                } catch(e) {}
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
          <NuqsProvider>
            <VisitorTracker />
            <CustomerSessionWatcher />
            <HeaderWithData />
            {children}
            <LiveChatWidget />
            <CartDrawer />
            <Toaster closeButton position="top-center" offset="24px" duration={3500} />
            {isDevelopment && <DebugGrid />}
          </NuqsProvider>
        </CartProvider>
      </body>
    </html>
  );
}
