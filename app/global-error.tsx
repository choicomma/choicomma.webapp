"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-white text-neutral-900 font-sans antialiased min-h-screen flex items-center justify-center p-4">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xl mb-4">
            !
          </div>
          <h2 className="text-xl font-bold text-neutral-900">시스템 오류가 발생했습니다</h2>
          <p className="my-2 text-sm text-neutral-600">
            예기치 못한 문제가 발생했습니다. 새로고침하거나 다시 시도해 주세요.
          </p>
          {error?.message && (
            <p className="text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl my-3 break-all max-w-full">
              {error.message}
            </p>
          )}
          <Button
            size="lg"
            className="mt-4 bg-black text-white hover:bg-neutral-800 rounded-xl w-full cursor-pointer font-bold"
            onClick={() => reset()}
          >
            다시 시도하기 (Try Again)
          </Button>
        </div>
      </body>
    </html>
  );
}
