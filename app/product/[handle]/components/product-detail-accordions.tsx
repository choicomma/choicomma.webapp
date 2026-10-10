"use client";
// Force HMR refresh for Designer Description Accordion

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Product } from "@/lib/sfcc/types";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Sliders, Minus, Plus, X, RotateCcw, Move } from "lucide-react";
import { getCurrentLanguage, translateProductDescription } from "@/lib/i18n/translation";
import { cn } from "@/lib/utils";
import { ProductReviews } from "./product-reviews";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ACCORDION_I18N: Record<string, Record<string, string>> = {
  ko: {
    reviews: "고객 후기",
    reviewsTooltip: "베스트댓글 선정 시, 최대 50,000원",
    designerDesc: "제품 상세 사진",
    fabricInfo: "원단 정보",
    fabricComp: "소재",
    elasticity: "신축성",
    sheerness: "비침",
    thickness: "두께감",
    lining: "안감",
    laundryGuide: "• 권장 세탁 방법: 드라이클리닝 권장 / 찬물 미온수 단독 손세탁 (건조기 사용 금지)",
    fabricZoom: "🔍 원단 실물 텍스처 / 상세 확대컷",
    sizeGuide: "사이즈 가이드",
    sizeNotice1: "- 측정수치는 cm를 나타냅니다.",
    sizeNotice2: "- 측정 위치에 따라 1~1.5cm 정도의 차이가 생길 수 있습니다.",
    sizeNotice3: "- 색상은 모니터 사양 또는 해상도에 따라 약간의 차이가 있을 수 있습니다.",
    shippingReturns: "배송 및 반품",
    nonReturnable: "반품 불가 안내",
    nonReturnableNotice: "다음과 같은 내용은 불량 사유가 아니오니 구입 전 확인해 주시기 바랍니다.",
  },
  en: {
    reviews: "REVIEWS",
    reviewsTooltip: "Best Review: Up to ₩50,000",
    designerDesc: "PRODUCT DETAIL PHOTOS",
    fabricInfo: "FABRIC DETAILS",
    fabricComp: "FABRIC COMPOSITION",
    elasticity: "ELASTICITY",
    sheerness: "SHEERNESS",
    thickness: "THICKNESS",
    lining: "LINING",
    laundryGuide: "• Recommended Wash: Dry Cleaning Recommended / Hand Wash Separately in Cold Water (No Dryer)",
    fabricZoom: "🔍 Fabric Texture / Zoom View",
    sizeGuide: "SIZE GUIDE",
    sizeNotice1: "- Measurements are indicated in cm.",
    sizeNotice2: "- Depending on measurement position, a difference of 1-1.5cm may occur.",
    sizeNotice3: "- Colors may vary slightly depending on monitor specifications.",
    shippingReturns: "SHIPPING & RETURNS",
    nonReturnable: "NON-RETURNABLE POLICY",
    nonReturnableNotice: "Please note that the following points are not considered product defects prior to purchase.",
  },
  ja: {
    reviews: "レビュー",
    reviewsTooltip: "ベストレビュー選定時、最大50,000ウォン",
    designerDesc: "デザイナー説明",
    fabricInfo: "生地情報",
    fabricComp: "素材構成 (FABRIC)",
    elasticity: "伸縮性",
    sheerness: "透け感",
    thickness: "厚み",
    lining: "裏地",
    laundryGuide: "• 洗濯方法: ドライクリーニング推奨 / 冷水手洗い (乾燥機, 漂白剤使用不可)",
    fabricZoom: "🔍 生地テクスチャ / 拡大カット",
    sizeGuide: "サイズガイド",
    sizeNotice1: "- 測定値はcmで表示されます。",
    sizeNotice2: "- 測定位置により1〜1.5cm程度の誤差が生じる場合があります。",
    sizeNotice3: "- モニ터의 仕様や解像度により実際の色味と異なる場合があります。",
    shippingReturns: "配送・返品",
    nonReturnable: "返品不可案内",
    nonReturnableNotice: "以下の内容は不良理由に該当いたしませんのでご購入前にご確認ください。",
  },
  zh: {
    reviews: "用户评价",
    reviewsTooltip: "评选最佳评价时，最高 50,000韩元",
    designerDesc: "设计师说明",
    fabricInfo: "面料信息",
    fabricComp: "面料成分 (FABRIC)",
    elasticity: "弹性",
    sheerness: "透光度",
    thickness: "厚度",
    lining: "里料",
    laundryGuide: "• 洗涤说明: 建议干洗 / 冷水单独手洗 (禁止使用烘干机)",
    fabricZoom: "🔍 面料实物纹理 / 细节放大",
    sizeGuide: "尺寸指南",
    sizeNotice1: "- 测量数值单位为 cm。",
    sizeNotice2: "- 根据测量位置不同，可能会存在 1~1.5cm 的误差。",
    sizeNotice3: "- 颜色根据显示器分辨率可能会有细微差异。",
    shippingReturns: "配送与退货",
    nonReturnable: "不可退货说明",
    nonReturnableNotice: "以下情况不属于商品瑕疵，请在购买前仔细确认。",
  },
  fr: {
    reviews: "AVIS CLIENTS",
    reviewsTooltip: "Meilleur avis : Jusqu'à 50 000 ₩",
    designerDesc: "DESCRIPTION DU DESIGNER",
    fabricInfo: "INFORMATIONS SUR LE TISSU",
    fabricComp: "COMPOSITION DU TISSU",
    elasticity: "ÉLASTICITÉ",
    sheerness: "TRANSPARENCE",
    thickness: "ÉPAISSEUR",
    lining: "DOUBLURE",
    laundryGuide: "• Entretien recommandé: Nettoyage à sec recommandé / Lavage à la main à l'eau froide",
    fabricZoom: "🔍 Texture du tissu / Zoom détaillé",
    sizeGuide: "GUIDE DES TAILLES",
    sizeNotice1: "- Les mesures sont indiquées en cm.",
    sizeNotice2: "- Une différence de 1 à 1,5 cm peut survenir selon le point de mesure.",
    sizeNotice3: "- Les couleurs peuvent varier légèrement selon la résolution de votre écran.",
    shippingReturns: "LIVRAISON ET RETOURS",
    nonReturnable: "POLITIQUE DE NON-RETOUR",
    nonReturnableNotice: "Veuillez noter que les points suivants ne sont pas considérés comme des défauts.",
  },
  de: {
    reviews: "BEWERTUNGEN",
    reviewsTooltip: "Beste Bewertung: Bis zu 50.000 ₩",
    designerDesc: "DESIGNER-BESCHREIBUNG",
    fabricInfo: "STOFF-INFORMATIONEN",
    fabricComp: "STOFFZUSAMMENSETZUNG",
    elasticity: "ELASTIZITÄT",
    sheerness: "TRANSPARENZ",
    thickness: "DICKE",
    lining: "FUTTER",
    laundryGuide: "• Waschempfehlung: Chemische Reinigung empfohlen / Handwäsche mit kaltem Wasser",
    fabricZoom: "🔍 Stofftextur / Detailansicht",
    sizeGuide: "GRÖSSENTABELLE",
    sizeNotice1: "- Messwerte sind in cm angegeben.",
    sizeNotice2: "- Je nach Messposition kann eine Abweichung von 1-1,5 cm auftreten.",
    sizeNotice3: "- Farben können je nach Monitorauflösung leicht abweichen.",
    shippingReturns: "VERSAND & RÜCKGABE",
    nonReturnable: "RÜCKGABE-HINWEIS",
    nonReturnableNotice: "Bitte beachten Sie vor dem Kauf, dass folgende Punkte keine Mängel darstellen.",
  },
  es: {
    reviews: "RESEÑAS",
    reviewsTooltip: "Mejor reseña: Hasta 50.000 ₩",
    designerDesc: "DESCRIPCIÓN DEL DISEÑADOR",
    fabricInfo: "INFORMACIÓN DE LA TELA",
    fabricComp: "COMPOSICIÓN DE LA TELA",
    elasticity: "ELASTICIDAD",
    sheerness: "TRANSPARENCIA",
    thickness: "GROSOR",
    lining: "FORRO",
    laundryGuide: "• Lavado recomendado: Lavado en seco / Lavar a mano en agua fría",
    fabricZoom: "🔍 Textura de la tela / Detalle ampliado",
    sizeGuide: "GUÍA DE TALLAS",
    sizeNotice1: "- Las medidas se indican en cm.",
    sizeNotice2: "- Puede haber una diferencia de 1-1.5 cm según la posición de medición.",
    sizeNotice3: "- Los colores pueden variar ligeramente según la resolución del monitor.",
    shippingReturns: "ENVÍO Y DEVOLUCIONES",
    nonReturnable: "AVISO DE NO DEVOLUCIÓN",
    nonReturnableNotice: "Tenga en cuenta que los siguientes puntos no se consideran defectos antes de comprar.",
  },
};

interface ProductDetailAccordionsProps {
  product: Product;
  className?: string;
  isMobile?: boolean;
}

export function ProductDetailAccordions({
  product,
  className,
  isMobile: isMobileProp,
}: ProductDetailAccordionsProps) {
  const [currentLang, setCurrentLang] = useState("ko");
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isMobile = isMobileProp ?? isMobileScreen;

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const t = ACCORDION_I18N[currentLang] || ACCORDION_I18N.ko;
  const prod = product as any;
  const hasDistinctDetail =
    prod.detailDescription &&
    prod.detailDescription.trim() !== "" &&
    prod.detailDescription.trim() !== product.description?.trim();

  const hasDistinctDetailedInfo =
    prod.detailedInfo &&
    prod.detailedInfo.trim() !== "" &&
    prod.detailedInfo.trim() !== product.description?.trim();

  const detailText = hasDistinctDetail
    ? prod.detailDescription
    : hasDistinctDetailedInfo
    ? prod.detailedInfo
    : `• 디자이너 노트: 본 상품(${product.title.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim()})은 choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.\n• 소재 및 아웃핏: 최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.\n• 관리 안내: 전문 드라이클리닝을 권장합니다.`;

  const isBareImage = typeof detailText === "string" && (
    detailText.trim().startsWith("data:image/") ||
    /^https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(detailText.trim()) ||
    /^\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(detailText.trim())
  );

  const formattedDetailHtml = isBareImage
    ? `<img src="${detailText.trim()}" alt="${product.title || '상세 이미지'}" class="w-full h-auto rounded-2xl my-3 block object-contain" />`
    : detailText;

  const isHtmlContent = typeof detailText === "string" && (
    isBareImage ||
    detailText.includes("<img") ||
    detailText.includes("<p>") ||
    detailText.includes("<div") ||
    detailText.includes("<br")
  );

  const hasSizeGuide =
    (product as any).showSizeGuide === true ||
    (product as any).showSizeGuide === "true";

  const fabricImg = String(
    (product as any).fabricImage ||
    (product as any).fabricTextureImage ||
    (product as any).fabricImageUrl ||
    (product as any).fabric_image ||
    (product as any).bulkDiscount?.fabricImage ||
    ""
  ).trim();

  // 원단 이미지가 등록되어 있을 때만 원단 정보 탭 노출 (이미지 없을 시 탭 자체 미노출)
  const hasFabricInfo = Boolean(fabricImg);

  // 모바일 버전에서는 고객후기를 가장 오른쪽(마지막)으로 추가
  const tabs = [
    { id: "details", label: t.designerDesc },
    ...(hasFabricInfo ? [{ id: "fabric", label: t.fabricInfo }] : []),
    ...(hasSizeGuide ? [{ id: "guide", label: t.sizeGuide }] : []),
    { id: "care", label: t.shippingReturns },
    ...(isMobile ? [{ id: "reviews", label: t.reviews || "고객 후기" }] : []),
  ];

  const hasReviewsTab = tabs.some((tab) => tab.id === "reviews");

  const [headerOffset, setHeaderOffset] = useState<number>(0);
  const [isSticky, setIsSticky] = useState(false);
  const [isZoomSliderOpen, setIsZoomSliderOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0); // 1.0 = 100%, 2.8 = 280%
  const isDetailImageEnlarged = isZoomSliderOpen && zoomScale > 1.0;

  const panContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingPan = useRef(false);
  const hasDragged = useRef(false);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const panScrollLeft = useRef(0);
  const panWindowScrollY = useRef(0);

  // 모바일 터치 2D 패닝 (상하좌우) Ref
  const isTouchingPan = useRef(false);
  const touchPanStartX = useRef(0);
  const touchPanStartY = useRef(0);
  const touchPanScrollLeft = useRef(0);
  const touchPanWindowScrollY = useRef(0);

  // 확대 배율 변경 시 보고 있던 사진 지점을 기억하는 앵커 Ref
  const focalAnchorRef = useRef<{
    ratioX: number;
    ratioY: number;
    viewportCenterY: number;
  } | null>(null);

  // 배율 변경 전 현재 사용자가 보고 있는 중심점(Anchor) 캡처
  const captureFocalAnchor = () => {
    if (!panContainerRef.current) return;
    const container = panContainerRef.current;
    const rect = container.getBoundingClientRect();
    const clientWidth = container.clientWidth;
    const scrollWidth = container.scrollWidth;
    const scrollLeft = container.scrollLeft;

    // 가로 포커스 비율 (0 ~ 1)
    const focalX = scrollLeft + clientWidth / 2;
    const ratioX = scrollWidth > 0 ? focalX / scrollWidth : 0.5;

    // 세로 포커스 (화면 중앙 기준)
    const headerHeight = headerOffset || 76;
    const visibleHeight = window.innerHeight - headerHeight;
    const viewportCenterY = headerHeight + visibleHeight / 2;
    const relativeY = viewportCenterY - rect.top;
    const ratioY = rect.height > 0 ? Math.max(0, Math.min(1, relativeY / rect.height)) : 0.5;

    focalAnchorRef.current = {
      ratioX,
      ratioY,
      viewportCenterY,
    };
  };

  const handleOpenZoomSlider = () => {
    captureFocalAnchor();
    setIsZoomSliderOpen(true);
    if (zoomScale <= 1.0) {
      setZoomScale(1.8); // 기본 180% (1.8x) 확대
    }
  };

  const handleCloseZoomSlider = () => {
    captureFocalAnchor();
    setZoomScale(1.0);
    setIsZoomSliderOpen(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    captureFocalAnchor();
    const val = parseFloat(e.target.value);
    setZoomScale(val);
  };

  const handleStepZoom = (delta: number) => {
    captureFocalAnchor();
    setZoomScale((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(2.8, Math.max(1.0, next));
    });
  };

  const handleResetZoom = () => {
    captureFocalAnchor();
    setZoomScale(1.0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDetailImageEnlarged || !panContainerRef.current) return;
    if (e.button !== 0) return;
    isDraggingPan.current = true;
    hasDragged.current = false;
    panStartX.current = e.clientX;
    panStartY.current = e.clientY;
    panScrollLeft.current = panContainerRef.current.scrollLeft;
    panWindowScrollY.current = window.scrollY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan.current || !panContainerRef.current) return;
    e.preventDefault();
    const deltaX = (e.clientX - panStartX.current) * 1.3;
    const deltaY = (e.clientY - panStartY.current) * 1.3;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasDragged.current = true;
    }
    panContainerRef.current.scrollLeft = panScrollLeft.current - deltaX;
    window.scrollTo({
      top: Math.max(0, panWindowScrollY.current - deltaY),
      behavior: "instant" as ScrollBehavior,
    });
  };

  const handleMouseUpOrLeave = () => {
    isDraggingPan.current = false;
  };

  const handleTouchStartPan = (e: React.TouchEvent) => {
    if (!isDetailImageEnlarged || !panContainerRef.current) return;
    if (e.touches.length === 1) {
      isTouchingPan.current = true;
      hasDragged.current = false;
      const touch = e.touches[0];
      touchPanStartX.current = touch.clientX;
      touchPanStartY.current = touch.clientY;
      touchPanScrollLeft.current = panContainerRef.current.scrollLeft;
      touchPanWindowScrollY.current = window.scrollY;
    }
  };

  const handleTouchMovePan = (e: React.TouchEvent) => {
    if (!isTouchingPan.current || !panContainerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchPanStartX.current;
    const deltaY = touch.clientY - touchPanStartY.current;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasDragged.current = true;
    }

    panContainerRef.current.scrollLeft = touchPanScrollLeft.current - deltaX;
    window.scrollTo({
      top: Math.max(0, touchPanWindowScrollY.current - deltaY),
      behavior: "instant" as ScrollBehavior,
    });
  };

  const handleTouchEndPan = () => {
    isTouchingPan.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingPan.current = false;
      isTouchingPan.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    window.addEventListener("touchcancel", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
      window.removeEventListener("touchcancel", handleGlobalMouseUp);
    };
  }, []);

  // 확대 배율 변경 시 화면 렌더링 직전에 스크롤 오프셋을 즉각 보정하여 사진 위치 불변 유지
  useIsomorphicLayoutEffect(() => {
    if (!focalAnchorRef.current || !panContainerRef.current) return;
    const { ratioX, ratioY, viewportCenterY } = focalAnchorRef.current;
    focalAnchorRef.current = null;

    const container = panContainerRef.current;
    const clientWidth = container.clientWidth;
    const newScrollWidth = container.scrollWidth;
    const rect = container.getBoundingClientRect();

    // 1. 가로 위치 복원: 보고 있던 지점을 가로 중앙에 정확히 유지
    const newFocalX = ratioX * newScrollWidth;
    const targetScrollLeft = Math.max(0, Math.min(newScrollWidth - clientWidth, newFocalX - clientWidth / 2));
    container.scrollLeft = targetScrollLeft;

    // 2. 세로 위치 복원: 이미지 배율 변경으로 인한 높이 변화량만큼 윈도우 스크롤을 즉시 보정
    const currentFocalScreenY = rect.top + ratioY * rect.height;
    const diffY = currentFocalScreenY - viewportCenterY;

    if (Math.abs(diffY) > 1) {
      window.scrollBy({ top: diffY, behavior: "instant" });
    }
  }, [zoomScale, isZoomSliderOpen]);

  // 헤더 높이(bottom 위치)를 실시간 측정하여 스티키 메뉴의 정확한 top 오프셋 계산
  useEffect(() => {
    const updateOffset = () => {
      const headerEl = document.querySelector("header");
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        if (rect.bottom > 0) {
          setHeaderOffset(Math.round(rect.bottom));
          return;
        }
      }
      setHeaderOffset(window.innerWidth < 640 ? 68 : window.innerWidth < 768 ? 76 : 96);
    };

    updateOffset();

    const headerEl = document.querySelector("header");
    let ro: ResizeObserver | null = null;
    if (headerEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateOffset);
      ro.observe(headerEl);
    }

    window.addEventListener("resize", updateOffset);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  // 스크롤 시 스티키 고정 상태 감지하여 미세한 그림자 효과 부여
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentOffset = headerOffset || (window.innerWidth < 640 ? 68 : window.innerWidth < 768 ? 76 : 96);
      setIsSticky(rect.top <= currentOffset + 2);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headerOffset]);

  useEffect(() => {
    if (activeTabIdx >= tabs.length) {
      setActiveTabIdx(0);
    }
  }, [tabs.length, activeTabIdx]);

  const handleTabClick = (idx: number) => {
    if (idx < 0 || idx >= tabs.length || idx === activeTabIdx) return;
    setIsSliding(true);
    setActiveTabIdx(idx);

    if (tabs[idx]?.id !== "details") {
      setIsZoomSliderOpen(false);
      setZoomScale(1.0);
    }

    // 스티키 상태에서 탭 전환 시 헤더 하단에 맞추어 매끄럽게 상단 스크롤
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentOffset = headerOffset || (window.innerWidth < 640 ? 68 : window.innerWidth < 768 ? 76 : 96);
      if (rect.top < currentOffset) {
        const targetScroll = Math.max(0, window.scrollY + rect.top - currentOffset);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }

    setTimeout(() => {
      setIsSliding(false);
    }, 520);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // 확대 상태에서는 캐러셀 탭 스와이프를 비활성화하여 이미지 탐색 제스처와 충돌 방지
    if (isDetailImageEnlarged) return;
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDetailImageEnlarged) return;
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
  };

  const handleTouchEnd = () => {
    if (isDetailImageEnlarged) {
      touchStartX.current = null;
      touchDeltaX.current = 0;
      return;
    }
    if (touchStartX.current !== null) {
      if (touchDeltaX.current < -50 && activeTabIdx < tabs.length - 1) {
        handleTabClick(activeTabIdx + 1);
      } else if (touchDeltaX.current > 50 && activeTabIdx > 0) {
        handleTabClick(activeTabIdx - 1);
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div
      ref={containerRef}
      id="product-detail-menu"
      data-detail-menu="true"
      className={cn("w-full mt-8 md:mt-0 border-t border-neutral-200 overflow-visible max-w-full min-w-0 relative", className)}
    >
      {/* 1. Horizontal Sliding Menu Bar (가로 형태 메뉴 바 - 상단 고정 스티키 효과) */}
      <div
        style={headerOffset > 0 ? { top: `${headerOffset}px` } : undefined}
        className={cn(
          "w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md sticky top-[68px] sm:top-[76px] md:top-[96px] z-30 transition-shadow duration-200",
          isSticky ? "shadow-sm border-neutral-200/90" : "shadow-none"
        )}
      >
        <div
          className={cn(
            "flex items-end justify-between gap-2 overflow-x-auto no-scrollbar scrollbar-none px-0.5",
            hasReviewsTab ? "pt-8 sm:pt-9 pb-1.5" : "py-1.5"
          )}
        >
          {/* Horizontal Tabs */}
          <div className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(idx)}
                className={cn(
                  "relative px-3 sm:px-4 py-2.5 text-xs sm:text-[13px] font-bold tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap select-none rounded-lg",
                  activeTabIdx === idx
                    ? "text-neutral-950 font-black bg-neutral-100 sm:bg-transparent"
                    : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50"
                )}
              >
                {/* 고객후기 상단 말풍선: 베스트댓글 선정 시, 최대 50,000원 */}
                {tab.id === "reviews" && (
                  <div className="absolute -top-7 right-0 z-30 select-none pointer-events-none">
                    <div className="relative inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 bg-neutral-900 text-white text-[10px] sm:text-[11px] font-bold rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.18)] whitespace-nowrap animate-bounce">
                      <span className="text-amber-400 text-xs shrink-0">✨</span>
                      {currentLang === "ko" ? (
                        <span>
                          베스트댓글 선정 시,{" "}
                          <strong className="text-amber-300 font-extrabold underline decoration-amber-400/60 underline-offset-2">
                            최대 50,000원
                          </strong>
                        </span>
                      ) : (
                        <span>
                          {t.reviewsTooltip || "베스트댓글 선정 시, 최대 50,000원"}
                        </span>
                      )}
                      {/* 말풍선 꼬리 (삼각형 화살표) */}
                      <span className="absolute -bottom-1.5 right-6 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-neutral-900" />
                    </div>
                  </div>
                )}

                <span>{tab.label}</span>
                {/* Active Sliding Indicator Underline */}
                {activeTabIdx === idx && (
                  <span className="hidden sm:block absolute bottom-0 left-1 right-1 h-[2.5px] bg-neutral-950 rounded-full animate-in fade-in duration-200" />
                )}
              </button>
            ))}
          </div>

          {/* Slide Navigation Buttons (< Prev / Next >) - 모바일에서는 삭제, 데스크톱에서만 표시 */}
          {!isMobile && (
            <div className={cn("hidden md:flex items-center gap-1 shrink-0 pl-1", hasReviewsTab ? "pb-1" : "")}>
              <button
                type="button"
                disabled={activeTabIdx === 0}
                onClick={() => handleTabClick(activeTabIdx - 1)}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="이전 메뉴로 슬라이드"
                aria-label="이전 메뉴"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-neutral-400 px-0.5 select-none">
                {activeTabIdx + 1}/{tabs.length}
              </span>
              <button
                type="button"
                disabled={activeTabIdx === tabs.length - 1}
                onClick={() => handleTabClick(activeTabIdx + 1)}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="다음 메뉴로 슬라이드"
                aria-label="다음 메뉴"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 돋보기 메뉴 바 (모바일에서만 표시 & 상세페이지 탭 스티키 효과 포함) */}
        {isMobile && tabs[activeTabIdx]?.id === "details" && (
          <div className="md:hidden w-full px-2 sm:px-4 pb-2 pt-1 border-t border-neutral-100 bg-white/95 transition-all">
            {!isZoomSliderOpen ? (
              /* 돋보기 바 닫힘 상태: 제목만 표시되는 콤팩트 바 (클릭 시 슬라이더 활성화) */
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenZoomSlider}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenZoomSlider();
                  }
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 shadow-2xs flex items-center justify-between gap-2 cursor-pointer transition-all select-none active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ZoomIn className="w-4 h-4 text-neutral-800 shrink-0" />
                  <span className="text-[12px] font-black text-neutral-900 tracking-tight">
                    상세 사진 확대
                  </span>
                </div>
              </div>
            ) : (
              /* 돋보기 바 열림 상태: 닫힘 상태와 완전히 동일한 크기(h-11)와 배경색을 유지하며 슬라이더 제공 */
              <div className="w-full h-11 px-3.5 rounded-xl border border-neutral-200/90 bg-white shadow-2xs flex items-center justify-between gap-2.5 transition-all select-none">
                {/* 좌측: 상세 사진 확대 라벨 (클릭 시 원래 크기로 복원/닫기) */}
                <button
                  type="button"
                  onClick={handleCloseZoomSlider}
                  className="flex items-center gap-2 shrink-0 text-left cursor-pointer group focus:outline-none"
                  title="상세 사진 확대 닫기"
                >
                  <ZoomIn className="w-4 h-4 text-neutral-800 shrink-0" />
                  <span className="text-[12px] font-black text-neutral-900 tracking-tight whitespace-nowrap">
                    상세 사진 확대
                  </span>
                </button>

                {/* 우측: 크기 그대로 유지되는 가로 슬라이더 조절기 ([-] 슬라이더 [+]) */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[220px] ml-auto">
                  <button
                    type="button"
                    onClick={() => handleStepZoom(-0.2)}
                    disabled={zoomScale <= 1.0}
                    className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-all shrink-0 cursor-pointer"
                    title="줌아웃 (축소)"
                    aria-label="줌아웃"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex-1 flex items-center h-6">
                    <input
                      type="range"
                      min={1.0}
                      max={2.8}
                      step={0.05}
                      value={zoomScale}
                      onPointerDown={captureFocalAnchor}
                      onTouchStart={captureFocalAnchor}
                      onMouseDown={captureFocalAnchor}
                      onChange={handleSliderChange}
                      className="zoom-range-slider"
                      aria-label="상세 이미지 확대/축소 배율 조절 슬라이더"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepZoom(0.2)}
                    disabled={zoomScale >= 2.8}
                    className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-all shrink-0 cursor-pointer"
                    title="줌인 (확대)"
                    aria-label="줌인"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 확대 안내 배너 바 (상세 사진 확대 중일 때 상단에 계속 떠 있게 스티키 적용) */}
        {isDetailImageEnlarged && tabs[activeTabIdx]?.id === "details" && (
          <div className="w-full px-2 sm:px-4 pb-2 pt-0.5 border-t border-neutral-100 bg-white/95 transition-all animate-in fade-in duration-150">
            <div
              role="button"
              tabIndex={0}
              onClick={handleCloseZoomSlider}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCloseZoomSlider();
                }
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-600 rounded-lg text-[11px] font-bold select-none border border-neutral-200/70 shadow-2xs cursor-pointer transition-colors"
              title="클릭 시 줌아웃 (원래 크기로 복원)"
            >
              <Move className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">현재 줌인(확대) 상태입니다. 상하좌우(위·아래·좌우)로 드래그하여 확인하세요. (클릭 시 줌아웃)</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Sliding Content Panels Carousel (가로 슬라이드 콘텐츠 영역) */}
      <div 
        className={cn(
          "w-full max-w-full min-w-0 relative mt-6",
          isSliding ? "overflow-hidden" : (isDetailImageEnlarged ? "overflow-visible" : "overflow-hidden")
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-start transition-transform duration-500 ease-out w-full"
          style={{ transform: `translateX(-${activeTabIdx * 100}%)` }}
        >
          {tabs.map((tab, idx) => (
            <div
              key={tab.id}
              className={cn(
                "w-full min-w-full shrink-0 max-w-full transition-opacity duration-300",
                isDetailImageEnlarged && tab.id === "details" && !isSliding
                  ? "overflow-visible"
                  : "overflow-hidden",
                activeTabIdx === idx
                  ? "opacity-100 h-auto"
                  : isSliding
                  ? "opacity-30 h-auto"
                  : "opacity-0 h-0 overflow-hidden pointer-events-none"
              )}
            >
              {/* 고객 후기 (모바일 전용 탭 - 가장 오른쪽) */}
              {tab.id === "reviews" && (
                <div className="w-full">
                  <ProductReviews
                    productId={product.id}
                    productTitle={product.title}
                    hideTopBorder={true}
                  />
                </div>
              )}

              {/* 제품 상세 사진 (Designer Desc & Photos) */}
              {tab.id === "details" && (
                <div className="w-full">
                  {isHtmlContent ? (
                    <div
                      ref={panContainerRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                      onTouchStart={handleTouchStartPan}
                      onTouchMove={handleTouchMovePan}
                      onTouchEnd={handleTouchEndPan}
                      onTouchCancel={handleTouchEndPan}
                      onDragStart={(e) => e.preventDefault()}
                      onClickCapture={(e) => {
                        if (hasDragged.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className={cn(
                        "w-full max-w-full min-w-0 select-none",
                        isDetailImageEnlarged
                          ? "overflow-x-auto overflow-y-visible touch-none cursor-grab active:cursor-grabbing pb-6 [scrollbar-width:thin] [scrollbar-color:#a3a3a3_#f5f5f5]"
                          : "overflow-hidden w-full mx-auto"
                      )}
                    >
                      <div
                        style={
                          isDetailImageEnlarged
                            ? {
                                width: `${Math.round(zoomScale * 100)}%`,
                                minWidth: `${Math.round(zoomScale * 100)}%`,
                              }
                            : undefined
                        }
                        className={cn(
                          "select-none",
                          isDetailImageEnlarged ? "max-w-none" : "w-full mx-auto"
                        )}
                      >
                        <div
                          className={cn(
                            "w-full text-neutral-800 leading-relaxed space-y-4 break-words [overflow-wrap:anywhere] select-none",
                            "[&_p]:!max-w-none [&_p]:!w-full [&_p]:!overflow-visible [&_p]:my-2",
                            "[&_img]:!w-full [&_img]:!h-auto [&_img]:!max-w-none [&_img]:mx-auto [&_img]:rounded-2xl",
                            "[&_img]:select-none [&_img]:pointer-events-auto [&_img]:[user-drag:none] [&_img]:[-webkit-user-drag:none]",
                            isDetailImageEnlarged
                              ? "[&_img]:my-6 [&_img]:shadow-2xl"
                              : "[&_img]:my-3 hover:[&_img]:brightness-95 hover:[&_img]:shadow-md"
                          )}
                          dangerouslySetInnerHTML={{ __html: formattedDetailHtml }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-xs text-neutral-700 break-words [overflow-wrap:anywhere]">
                      {translateProductDescription(detailText, currentLang)}
                    </div>
                  )}
                </div>
              )}

              {/* 원단 정보 (Fabric Details) */}
              {tab.id === "fabric" && (() => {
                const displayFabricComp = String(
                  (product as any).fabricComposition ||
                  (product as any).bulkDiscount?.fabricComposition ||
                  "COTTON 100% (프리미엄 코튼)"
                ).replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼");

                return (
                  <div className="flex flex-col gap-4 py-4 px-4 border border-neutral-200/80 bg-neutral-50/50 rounded-2xl">
                    {(displayFabricComp || t.fabricComp) && (
                      <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2.5">
                        <span className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">{t.fabricComp}</span>
                        <span className="font-bold text-neutral-950 text-xs">
                          {displayFabricComp}
                        </span>
                      </div>
                    )}

                    {/* 관리자페이지에서 업로드한 원단 이미지 단독 노출 (카드 디자인에 꽉 차게) */}
                    {fabricImg && (
                      <div className="w-full rounded-xl overflow-hidden border border-neutral-200/90 bg-neutral-100 shadow-2xs group relative">
                        <img
                          src={fabricImg}
                          alt={displayFabricComp || `${product.title} 원단 정보 이미지`}
                          className={cn(
                            "w-full h-auto block object-cover transition-all duration-300",
                            isDetailImageEnlarged ? "max-h-[950px] scale-[1.02]" : "max-h-[850px]"
                          )}
                        />
                      </div>
                    )}

                    <div className="text-[11px] text-neutral-500 pt-1 leading-relaxed border-t border-neutral-200/60 mt-1">
                      <p>{t.laundryGuide}</p>
                    </div>
                  </div>
                );
              })()}

              {/* 사이즈 가이드 (Size Guide) */}
              {tab.id === "guide" && (
                <div className="flex flex-col items-center py-4 my-1 border border-neutral-200/80 bg-white rounded-2xl p-5 md:p-6 shadow-2xs">
                  {((product as any).sizeGuideImage || (product as any).sizeChartImage) && (
                    <div
                      className="w-full mb-4 rounded-xl overflow-hidden border border-neutral-200 bg-white p-2 group relative"
                    >
                      <img
                        src={(product as any).sizeGuideImage || (product as any).sizeChartImage}
                        alt="상품 수치 / 사이즈 가이드 표"
                        className={cn(
                          "w-full h-auto object-contain transition-all duration-300",
                          isDetailImageEnlarged ? "max-h-[600px] scale-[1.03]" : "max-h-[450px]"
                        )}
                      />
                    </div>
                  )}

                  {/* Notice Bullet Points */}
                  <div className="text-[10.5px] text-neutral-500 text-center space-y-0.5 my-3 font-sans leading-relaxed">
                    <p>{t.sizeNotice1}</p>
                    <p>{t.sizeNotice2}</p>
                    <p>{t.sizeNotice3}</p>
                  </div>

                  {/* Garment Measurements Table */}
                  <div className="w-full max-w-full overflow-x-auto mt-2 no-scrollbar">
                    {(() => {
                      const sizes = (product as any).sizes?.length ? (product as any).sizes : ["1", "2", "3", "FREE"];
                      const customRows = (product as any).sizeMeasurements;
                      const rows = customRows && customRows.length > 0 ? customRows : [
                        { name: "어깨단면", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
                        { name: "가슴단면", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
                        { name: "팔길이", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
                        { name: "총장", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
                      ];

                      return (
                        <table className="w-full text-center border-t border-b border-neutral-400 text-xs font-sans">
                          <thead>
                            <tr className="border-b border-neutral-200 font-bold text-neutral-800">
                              <th className="py-2.5 px-2 text-left font-bold text-[11px] uppercase">SIZE</th>
                              {sizes.map((size: string) => (
                                <th key={size} className="py-2.5 px-2 text-[11px]">{size}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 text-neutral-700 font-medium">
                            {rows.map((row: any) => (
                              <tr key={row.name}>
                                <td className="py-2.5 px-2 text-left font-bold text-neutral-900 text-[10.5px] uppercase tracking-wider">
                                  {row.name}
                                </td>
                                {sizes.map((size: string) => (
                                  <td key={size} className="py-2.5 px-2 text-[11px] font-mono">
                                    {row.values[size] || "-"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 배송 및 반품 (Shipping & Returns) */}
              {tab.id === "care" && (
                <div className="space-y-4">
                  {/* 불량 사유 제외 안내 */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
                    <h4 className="text-sm font-black text-neutral-950 flex items-center gap-1.5">
                      {t.nonReturnable}
                    </h4>
                    <p className="text-xs font-semibold text-neutral-600">
                      {t.nonReturnableNotice}
                    </p>

                    <div className="pt-2 border-t border-neutral-200/70">
                      <span className="text-[11px] font-bold text-neutral-500 block mb-2">불량 사유 제외 사유 안내</span>
                      <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>모니터 해상도에 따른 컬러 차이</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>배송 시 생긴 구김 또는 실밥 미정리, 바느질선 대칭 차이</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>상품 제작 과정의 초크 자국</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>원단 특유의 냄새</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>측정 방식에 따른 1~3cm 사이즈 오차</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>제품의 버튼 및 기타 부자재가 헐겁게 부착된 경우 <span className="text-neutral-500 font-medium">(초이 콤마는 내부 검수 팀을 통해 제품에 대한 검수 작업을 진행하고 있습니다.)</span></span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="shrink-0 font-bold">•</span>
                          <span>수제화/가방 등 제작상품의 경우, 제작과정에서 발생되는 미세한 본드 자국 및 펴질 수 있는 주름</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 배송에 대한 안내 */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
                    <h4 className="text-sm font-black text-neutral-950 flex items-center gap-1.5">
                      배송에 대한 안내
                    </h4>
                    <ul className="space-y-2.5 text-xs text-neutral-700 leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <span className="shrink-0 font-bold">•</span>
                        <div>
                          <strong className="font-extrabold text-neutral-950">배송비 :</strong> CJ대한통운 이용, 기본 4,000원 (10만 원 이상 무료 / 도서산간 지역의 경우에는 추가 비용이 발생할 수 있습니다.)
                        </div>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="shrink-0 font-bold">•</span>
                        <div>
                          <strong className="font-extrabold text-neutral-950">배송 기간 :</strong> 초이콤마의 모든 제품은 자체 제작 상품으로 주문 후 제작되고 있습니다. 본 배송기간은 영업일 기준, 7~14일 소요(주말·공휴일 제외) 소요 됩니다.
                        </div>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="shrink-0 font-bold">•</span>
                        <div>
                          <strong className="font-extrabold text-neutral-950">바로배송 :</strong> 단, 바로 배송을 통해 미리 공지된 제품은 1~3일 소요됩니다.
                        </div>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="shrink-0 font-bold">•</span>
                        <div>
                          <strong className="font-extrabold text-neutral-950">주의 :</strong> 제작 과정 중 생긴 공장 사정에 따라 갑작스러운 지연이 발생할 수 있습니다. 상품에 따라 유동적일 수 있어 배송기간 확인 후 주문해주시기 바랍니다.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
