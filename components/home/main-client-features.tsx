"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Megaphone, X } from "lucide-react";

export function MainNoticeBanner() {
  return null;
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
