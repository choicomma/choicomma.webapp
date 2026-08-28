import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { getCart, getSFCCMode } from "@/lib/sfcc";
import { CartProvider } from "@/components/cart/cart-context";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { HeaderWithData } from "@/components/layout/header/server-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "choicomma",
  description: "choicomma official store",
  generator: "v0.app",
};

import { LiveChatWidget } from "@/components/chat/live-chat-widget";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = await getSFCCMode();
  const cart = getCart();

  return (
    <html lang="ko" suppressHydrationWarning>
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
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <CartProvider cartPromise={cart} mode={mode}>
          <NuqsAdapter>
            <HeaderWithData />
            {children}
            <LiveChatWidget />
            <Toaster closeButton position="top-center" />
            {isDevelopment && <DebugGrid />}
          </NuqsAdapter>
        </CartProvider>
      </body>
    </html>
  );
}
