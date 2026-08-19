"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="mx-auto mb-4 mt-24 flex max-w-xl flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl">
      <h2 className="text-xl font-bold text-neutral-900">오류가 발생했습니다</h2>
      <p className="my-2 text-sm text-neutral-600">
        페이지를 불러오는 중 문제가 발생했습니다. 브라우저를 새로고침하거나 아래 버튼을 눌러 다시 시도해 주세요.
      </p>
      {error?.message && (
        <p className="text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl my-3 break-all">
          {error.message}
        </p>
      )}
      <Button size="lg" className="mt-4 bg-black text-white hover:bg-neutral-800 rounded-xl" onClick={() => reset()}>
        다시 시도하기 (Try Again)
      </Button>
    </div>
  );
}
