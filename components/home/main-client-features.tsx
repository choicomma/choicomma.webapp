"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Megaphone, X } from "lucide-react";

export function MainNoticeBanner() {
  const [notice, setNotice] = useState<string>("전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다.");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const updateNotice = () => {
      const savedNotice = localStorage.getItem("main_notice_banner");
      const savedActive = localStorage.getItem("main_notice_active");
      if (savedNotice !== null) setNotice(savedNotice);
      if (savedActive !== null) setIsActive(savedActive === "true");
    };

    updateNotice();
    window.addEventListener("storage", updateNotice);
    return () => window.removeEventListener("storage", updateNotice);
  }, []);

  if (!isActive || !notice || isDismissed) return null;

  return (
    <div className="w-full bg-neutral-950 text-white text-xs font-bold py-2.5 px-4 flex items-center justify-between z-30 transition-all border-b border-neutral-800">
      <div className="flex-1 text-center flex items-center justify-center gap-2">
        <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="tracking-wide text-[11px] sm:text-xs">{notice}</span>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer shrink-0"
        aria-label="공지 닫기"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function MainBadgeText() {
  const [badgeText, setBadgeText] = useState("latest drop");

  useEffect(() => {
    const updateBadge = () => {
      const savedBadge = localStorage.getItem("main_badge_text");
      if (savedBadge) setBadgeText(savedBadge);
    };

    updateBadge();
    window.addEventListener("storage", updateBadge);
    return () => window.removeEventListener("storage", updateBadge);
  }, []);

  return (
    <div className="px-6 hidden lg:block">
      <Badge variant="outline-secondary" className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
        <Sparkles className="w-3 h-3 text-amber-500" />
        {badgeText}
      </Badge>
    </div>
  );
}
