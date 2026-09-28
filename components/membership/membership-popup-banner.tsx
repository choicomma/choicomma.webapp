"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PopupConfig,
  getLocalPopupConfig,
  POPUP_UPDATED_EVENT,
} from "@/lib/popup/types";
import { ExternalLink, Sparkles } from "lucide-react";

export function MembershipPopupBanner() {
  const router = useRouter();
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Initial read from localStorage
    const local = getLocalPopupConfig();
    setConfig(local);

    // 2. Sync from server
    fetch("/api/admin/popup")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setConfig(data.config);
        }
      })
      .catch(() => {});

    // 3. Listen to live updates from admin tab
    const handleUpdated = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      }
    };

    window.addEventListener(POPUP_UPDATED_EVENT, handleUpdated);
    window.addEventListener("storage", () => {
      setConfig(getLocalPopupConfig());
    });

    return () => {
      window.removeEventListener(POPUP_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  if (!mounted || !config || !config.isActive || !config.imageUrl || !config.showOnMembership) {
    return null;
  }

  const handleClick = () => {
    if (!config.linkUrl) return;
    if (config.linkUrl.startsWith("http")) {
      window.open(config.linkUrl, "_blank", "noopener,noreferrer");
    } else {
      router.push(config.linkUrl);
    }
  };

  return (
    <div className="w-full my-6 animate-in fade-in duration-300">
      <div
        onClick={handleClick}
        className={`relative w-full rounded-3xl overflow-hidden border border-neutral-200/90 bg-neutral-950 shadow-md group transition-all duration-300 ${
          config.linkUrl ? "cursor-pointer hover:shadow-xl hover:border-neutral-400" : ""
        }`}
      >
        {/* Banner Top Decorative Accent */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wide">
          <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span>{config.title || "SPECIAL EVENT"}</span>
        </div>

        {config.linkUrl && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white text-[11px] font-medium transition-colors">
            <span>자세히 보기</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        )}

        {/* Banner Image */}
        <div className="relative w-full max-h-[340px] flex items-center justify-center bg-neutral-900 overflow-hidden">
          <img
            src={config.imageUrl}
            alt={config.title || "멤버십 전용 팝업 이벤트"}
            className="w-full h-auto max-h-[340px] object-cover sm:object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </div>
      </div>
    </div>
  );
}
