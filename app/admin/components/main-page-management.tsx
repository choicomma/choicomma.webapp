"use client";

import React, { useState, useMemo } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Upload,
  Sparkles,
  Link as LinkIcon,
  Check,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Megaphone,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { compressImageDataUrl } from "@/lib/admin/helpers";
import { CATEGORIES_LIST } from "@/lib/admin/constants";

interface MainPageManagementProps {
  productsList: any[];
  setProductsList: React.Dispatch<React.SetStateAction<any[]>>;
  saveProductsToStorage: (list: any[]) => void;
  triggerToast: (msg: string) => void;
  mainNoticeBanner?: string;
  setMainNoticeBanner?: (val: string) => void;
  isMainNoticeActive?: boolean;
  setIsMainNoticeActive?: (val: boolean) => void;
  mainBadgeText?: string;
  setMainBadgeText?: (val: string) => void;
  handleSaveMainPageSettings?: (e: React.FormEvent) => void;
}

export function MainPageManagement({
  productsList,
  setProductsList,
  saveProductsToStorage,
  triggerToast,
  mainNoticeBanner,
  setMainNoticeBanner,
  isMainNoticeActive,
  setIsMainNoticeActive,
  mainBadgeText,
  setMainBadgeText,
  handleSaveMainPageSettings,
}: MainPageManagementProps) {
  const DEFAULT_HERO_FALLBACKS = Array.from({ length: 9 }, (_, i) => ({
    id: `hero-slide-${i + 1}`,
    title: `메인 배너 슬라이드 ${i + 1}`,
    heroCustomImage: `/main_slider/${i + 1}.jpg`,
    featuredImage: { url: `/main_slider/${i + 1}.jpg` },
    isHeroFeatured: true,
  }));

  const filteredHero = productsList.filter((p) => p.isHeroFeatured === true);
  const heroProducts = filteredHero.length > 0 ? filteredHero : DEFAULT_HERO_FALLBACKS;

  // Local fallback states for notice banner and badge
  const [localNotice, setLocalNotice] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("main_notice_banner") || "전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다.";
    }
    return "전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다.";
  });

  const [localNoticeActive, setLocalNoticeActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("main_notice_active");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [localBadge, setLocalBadge] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("main_badge_text") || "latest drop";
    }
    return "latest drop";
  });

  const noticeValue = mainNoticeBanner !== undefined ? mainNoticeBanner : localNotice;
  const noticeActiveValue = isMainNoticeActive !== undefined ? isMainNoticeActive : localNoticeActive;
  const badgeValue = mainBadgeText !== undefined ? mainBadgeText : localBadge;

  const handleUpdateNotice = (val: string) => {
    setLocalNotice(val);
    setMainNoticeBanner?.(val);
  };

  const handleUpdateNoticeActive = (val: boolean) => {
    setLocalNoticeActive(val);
    setIsMainNoticeActive?.(val);
  };

  const handleUpdateBadge = (val: string) => {
    setLocalBadge(val);
    setMainBadgeText?.(val);
  };

  const handleSaveNoticeAndBadge = (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (handleSaveMainPageSettings) {
      handleSaveMainPageSettings(e || ({} as any));
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("main_notice_banner", noticeValue);
        localStorage.setItem("main_notice_active", String(noticeActiveValue));
        localStorage.setItem("main_badge_text", badgeValue);
        window.dispatchEvent(new CustomEvent("storage"));
      }
    }
    triggerToast("메인 공지 띠배너 및 배지 설정이 즉시 반영되었습니다!");
  };

  // Move Hero Slide Up/Down
  const handleMoveHeroSlide = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= heroProducts.length) return;

    const currentHeroList = [...heroProducts];
    const itemToMove = currentHeroList[index];
    currentHeroList.splice(index, 1);
    currentHeroList.splice(targetIdx, 0, itemToMove);

    // non-hero 상품들과 병합하여 저장
    const nonHeroProducts = productsList.filter((p) => !p.isHeroFeatured && !String(p.id).startsWith("hero-slide-"));
    const updatedAll = [...currentHeroList, ...nonHeroProducts];

    setProductsList(updatedAll);
    saveProductsToStorage(updatedAll);
    triggerToast(`슬라이드 순서가 변경되었습니다. (슬라이드 #${targetIdx + 1})`);
  };

  // Sub Tab ("banner" | "notice" | "display")
  const [mainSubTab, setMainSubTab] = useState<"banner" | "notice" | "display">("banner");

  // Modal 1, 2, 3 States
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState<boolean>(false);
  const [targetHeroProduct, setTargetHeroProduct] = useState<any | null>(null);
  const [customHeroImageUrl, setCustomHeroImageUrl] = useState<string>("");

  const [isProductLinkModalOpen, setIsProductLinkModalOpen] = useState<boolean>(false);
  const [selectedLinkedProductId, setSelectedLinkedProductId] = useState<string>("");

  const [isMainSelectModalOpen, setIsMainSelectModalOpen] = useState(false);
  const [mainSelectMode, setMainSelectMode] = useState<"hero" | "bottom">("hero");

  // Search & Filter for Modals
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const categoriesList = CATEGORIES_LIST;

  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      if (p.categoryId === "main_banner" || String(p.id).startsWith("hero-slide-")) {
        return false;
      }
      const matchesSearch =
        !searchQuery.trim() ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        p.categoryId === selectedCategoryFilter ||
        (Array.isArray(p.categoryIds) && p.categoryIds.includes(selectedCategoryFilter));
      return matchesSearch && matchesCategory;
    });
  }, [productsList, searchQuery, selectedCategoryFilter]);

  // Handlers
  const openImageUploadModal = (product?: any) => {
    if (product) {
      setTargetHeroProduct(product);
      setCustomHeroImageUrl(product?.heroCustomImage || product?.featuredImage?.url || "");
    } else {
      setTargetHeroProduct(null);
      setCustomHeroImageUrl("");
    }
    setIsImageUploadModalOpen(true);
  };

  const handleSaveImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    let newImage = customHeroImageUrl.trim();
    if (!newImage) {
      alert("등록할 이미지 URL을 입력하거나 이미지 파일을 업로드해 주세요.");
      return;
    }

    if (newImage.startsWith("data:image")) {
      newImage = await compressImageDataUrl(newImage, 1920, 0.8);
    }

    let updatedList: any[] = [];
    if (targetHeroProduct) {
      updatedList = productsList.map((p) => {
        if (String(p.id) === String(targetHeroProduct.id)) {
          return {
            ...p,
            heroCustomImage: newImage,
            isHeroFeatured: true,
          };
        }
        return p;
      });
      triggerToast("슬라이드 이미지가 성공적으로 변경되었습니다.");
    } else {
      const newHeroId = `hero-slide-${Date.now()}`;
      const newHeroSlide = {
        id: newHeroId,
        productNo: 9000 + productsList.length,
        productCode: `HERO-${Date.now()}`,
        handle: `hero-slide-${Date.now()}`,
        title: `메인 배너 슬라이드 ${productsList.filter((p) => p.isHeroFeatured).length + 1}`,
        categoryId: "main_banner",
        description: "초이콤마 오리지널 메인 슬라이드 배너입니다.",
        heroCustomImage: newImage,
        featuredImage: { url: newImage },
        isHeroFeatured: true,
        availableForSale: false,
      };

      updatedList = [...productsList, newHeroSlide];
      triggerToast("새로운 슬라이드 이미지가 성공적으로 등록되었습니다.");
    }

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    setIsImageUploadModalOpen(false);
  };

  const handleRemoveHeroSlide = (id: string) => {
    const isConfirmed = window.confirm("해당 슬라이드 이미지를 삭제하시겠습니까?");
    if (!isConfirmed) return;

    const updatedList = productsList
      .map((p) => {
        if (String(p.id) === String(id)) {
          return {
            ...p,
            isHeroFeatured: false,
            heroCustomImage: undefined,
          };
        }
        return p;
      })
      .filter((p) => !(String(p.id).startsWith("hero-slide-") && !p.isHeroFeatured));

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast("슬라이드 이미지가 성공적으로 삭제되었습니다.");
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rawDataUrl = evt.target?.result as string;
      if (rawDataUrl) {
        const compressed = await compressImageDataUrl(rawDataUrl, 1920, 0.8);
        setCustomHeroImageUrl(compressed);
        triggerToast("이미지가 성공적으로 압축 및 등록되었습니다.");
      }
    };
    reader.readAsDataURL(file);
  };

  const openProductLinkModal = (product?: any) => {
    const target = product || productsList.find((p) => p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)) || productsList[0];
    setTargetHeroProduct(target);
    setSelectedLinkedProductId(target?.linkedProductId || target?.id || "");
    setIsProductLinkModalOpen(true);
  };

  const handleSaveProductLink = (linkedId: string) => {
    if (!targetHeroProduct) return;
    const linked = productsList.find((p) => p.id === linkedId);

    const updatedList = productsList.map((p) => {
      if (p.id === targetHeroProduct.id) {
        return {
          ...p,
          linkedProductId: linkedId,
          isMainFeatured: true,
          isHeroFeatured: true,
        };
      }
      return p;
    });
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(`'${linked?.title || linkedId}' 상품으로 성공적으로 연동되었습니다.`);
    setIsProductLinkModalOpen(false);
  };

  const openMainSelectModal = (mode: "hero" | "bottom") => {
    setMainSelectMode(mode);
    setIsMainSelectModalOpen(true);
  };

  const handleToggleHeroProduct = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const willBeFeatured = !targetProduct.isHeroFeatured;
    const confirmMessage = willBeFeatured
      ? `'${targetProduct.title}' 상품을 상단 메인 슬라이더 전용 상품으로 등록하시겠습니까?`
      : `'${targetProduct.title}' 상품을 상단 메인 슬라이더 해제하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    const updatedList = productsList.map((p) => {
      if (p.id === id) {
        triggerToast(
          willBeFeatured
            ? `'${p.title}' 상품이 상단 메인 슬라이더에 등록되었습니다.`
            : `'${p.title}' 상품이 상단 메인 슬라이더에서 해제되었습니다.`
        );
        return {
          ...p,
          isHeroFeatured: willBeFeatured,
        };
      }
      return p;
    });
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
  };

  const handleToggleBottomProduct = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const willBeFeatured = !targetProduct.isBottomFeatured;
    const confirmMessage = willBeFeatured
      ? `'${targetProduct.title}' 상품을 하단 상품으로 지정하시겠습니까?`
      : `'${targetProduct.title}' 상품을 하단 상품에서 해제하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    const updatedList = productsList.map((p) => {
      if (p.id === id) {
        triggerToast(
          willBeFeatured
            ? `'${p.title}' 상품이 하단 상품으로 지정되었습니다.`
            : `'${p.title}' 상품의 하단 상품 지정이 해제되었습니다.`
        );
        return {
          ...p,
          isMainFeatured: willBeFeatured ? true : p.isHeroFeatured || false,
          isBottomFeatured: willBeFeatured,
          isHeroFeatured: willBeFeatured ? false : p.isHeroFeatured,
        };
      }
      return p;
    });
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500 text-neutral-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              MAIN VISUAL & BANNER MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-950">메인 화면 및 비주얼 배너 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            쇼핑몰 최상단 공지 띠배너, 브랜드 슬로건 배지, 메인 슬라이더 배너 이미지(1920*1080) 및 진열 상품을 통합 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openMainSelectModal("hero")}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-black px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            🎯 메인 진열 상품 관리
          </button>
          <button
            type="button"
            onClick={() => openImageUploadModal()}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 border border-amber-400"
          >
            <ImageIcon className="w-4 h-4" />
            🖼️ 슬라이드 이미지 추가
          </button>
        </div>
      </div>

      {/* SECTION 0: NOTICE BANNER & BRAND BADGE CONTROLLER */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-950">
                📢 상단 공지 띠배너 & 브랜드 배지 실시간 설정
              </h3>
              <p className="text-xs text-neutral-500">
                쇼핑몰 최상단 헤더 띠배너 활성화 여부 및 안내 문구, 로고 옆 브랜드 배지를 직접 편집합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveNoticeAndBadge}
            className="bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>💾 설정 즉시 저장</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Controls */}
          <div className="space-y-4">
            {/* Toggle Notice Active */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <div>
                <label className="text-xs font-black text-neutral-900 block">
                  상단 공지 띠배너 노출 여부
                </label>
                <p className="text-[11px] text-neutral-500">
                  켜짐 상태일 때 쇼핑몰 최상단 헤더에 공지 띠배너가 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateNoticeActive(!noticeActiveValue)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  noticeActiveValue
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {noticeActiveValue ? "노출 중 (ON)" : "숨김 (OFF)"}
              </button>
            </div>

            {/* Notice Text Input */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                공지 띠배너 안내 문구
              </label>
              <input
                type="text"
                value={noticeValue}
                onChange={(e) => handleUpdateNotice(e.target.value)}
                placeholder="예: 전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다."
                className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
              />
            </div>

            {/* Badge Text Input */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                브랜드 슬로건 / 배지 문구
              </label>
              <input
                type="text"
                value={badgeValue}
                onChange={(e) => handleUpdateBadge(e.target.value)}
                placeholder="예: latest drop, AUTUMN 2026, SIGNATURE"
                className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none uppercase font-mono transition-colors"
              />
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="space-y-3">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider block">
              👀 실시간 화면 미리보기 (Live Preview)
            </span>

            {/* Preview Header mockup */}
            <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-md">
              {/* Notice Mockup */}
              {noticeActiveValue ? (
                <div className="bg-neutral-950 text-white text-[11px] font-bold py-2 px-3 flex items-center justify-between border-b border-neutral-800">
                  <div className="flex items-center gap-1.5 mx-auto">
                    <Megaphone className="w-3 h-3 text-amber-400" />
                    <span>{noticeValue || "공지 문구를 입력하세요"}</span>
                  </div>
                  <X className="w-3 h-3 text-neutral-500" />
                </div>
              ) : (
                <div className="p-2 bg-neutral-950/60 text-center text-[10px] text-neutral-500 font-mono">
                  [공지 띠배너 비활성화됨]
                </div>
              )}

              {/* Main Nav Mockup */}
              <div className="p-4 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-black text-sm text-neutral-950 tracking-wider">CHOICOMMA</span>
                  <span className="px-2 py-0.5 rounded-full border border-neutral-300 text-[10px] font-extrabold uppercase bg-neutral-50 text-neutral-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    {badgeValue || "LATEST DROP"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  header preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: SLIDER IMAGE MANAGEMENT */}
      <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        {/* Hero Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heroProducts.map((heroProduct, index) => {
            const displayImg = heroProduct.heroCustomImage || heroProduct.featuredImage?.url || "/product_1.webp";

            return (
              <div
                key={heroProduct.id}
                className="bg-white border-2 border-amber-400 rounded-3xl p-5 shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide bg-amber-500 text-neutral-950 shadow-2xs">
                        슬라이드 #{index + 1}
                      </span>
                      <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveHeroSlide(index, "up")}
                          className="p-1 text-neutral-500 hover:text-neutral-950 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          title="슬라이드 앞으로 이동"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === heroProducts.length - 1}
                          onClick={() => handleMoveHeroSlide(index, "down")}
                          className="p-1 text-neutral-500 hover:text-neutral-950 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          title="슬라이드 뒤로 이동"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                      메인 배너 이미지
                    </span>
                  </div>

                  <div className="relative aspect-[16/9] w-full rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200 shadow-2xs">
                    <img
                      src={displayImg}
                      alt={`슬라이드 ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => openImageUploadModal(heroProduct)}
                    className="bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 font-extrabold text-[11px] py-2 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>이미지 변경</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openProductLinkModal(heroProduct)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] py-2 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>상품 연동</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveHeroSlide(heroProduct.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-black text-[11px] py-2 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Slide Image Card */}
          <button
            type="button"
            onClick={() => openImageUploadModal()}
            className="bg-white/90 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-3xl p-6 transition-all flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer hover:bg-amber-50/50 hover:scale-[1.01] active:scale-95 shadow-2xs min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center transition-colors shadow-xs group-hover:scale-110">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                🖼️ 슬라이드 이미지 추가
              </span>
              <h4 className="font-black text-sm text-neutral-950 mt-1.5 group-hover:text-amber-700 transition-colors">
                새로운 메인 배너 이미지 등록
              </h4>
            </div>
          </button>
        </div>
      </div>

      {/* MODAL 1: REGISTER / EDIT HERO CUSTOM IMAGE */}
      {isImageUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl border border-amber-400 animate-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500 text-neutral-950 text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    HERO BANNER IMAGE MANAGER
                  </span>
                </div>
                <h3 className="text-2xl font-black text-neutral-950">
                  🖼️ 메인 대표 이미지 등록 / 변경
                </h3>
                <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                  상단 대형 메인 슬라이더 영역에 노출할 대표 이미지를 선택 및 변경합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImageUploadModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImageUpload} className="space-y-5">
              {/* 1. Target Product Slot Selection */}
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                    🎯 이미지 변경 대상 슬롯 / 상품 선택
                  </label>
                  <span className="text-[10px] font-bold text-amber-700">
                    {targetHeroProduct ? `현재 선택: ${targetHeroProduct.title}` : "상품을 선택해 주세요"}
                  </span>
                </div>
                <select
                  value={targetHeroProduct?.id || ""}
                  onChange={(e) => {
                    const p = productsList.find((item) => item.id === e.target.value);
                    if (p) {
                      setTargetHeroProduct(p);
                      setCustomHeroImageUrl(p.heroCustomImage || p.featuredImage?.url || "");
                    }
                  }}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                >
                  {productsList.map((p, idx) => {
                    const isHero = p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured);
                    return (
                      <option key={p.id} value={p.id}>
                        {isHero ? `🌟 [상단 대표 슬롯 #${idx + 1}] ` : `[일반 상품] `}{p.title} ({formatPrice(p.priceRange?.minVariantPrice?.amount)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Image Upload & Preview Container */}
              <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                    메인 대표 노출 이미지 (Custom Image)
                  </label>
                  <span className="text-[11px] font-bold text-neutral-500">권장 해상도 1920 x 1080</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-32 h-40 rounded-xl bg-neutral-100 border-2 border-dashed border-amber-400 overflow-hidden flex flex-col items-center justify-center relative shrink-0 shadow-xs">
                    {customHeroImageUrl ? (
                      <img
                        src={customHeroImageUrl}
                        alt="Custom Hero Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-neutral-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] font-bold block">미리보기</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3.5 w-full">
                    {/* Prominent Enlarged File Upload Button */}
                    <div>
                      <label className="block text-xs font-black text-neutral-900 mb-1.5 flex items-center gap-1">
                        📁 이미지 파일 업로드 (컴퓨터에서 선택)
                      </label>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-2xl cursor-pointer bg-amber-50/50 hover:bg-amber-100/70 transition-all group shadow-2xs">
                        <div className="flex items-center gap-2 text-amber-950 font-black text-xs md:text-sm">
                          <Upload className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <span>내 컴퓨터에서 이미지 파일 선택 / 업로드</span>
                        </div>
                        <span className="text-[11px] text-neutral-500 mt-1 font-semibold">
                          클릭하여 파일(.jpg, .png, .webp) 선택
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Image URL Input */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        🌐 또는 이미지 웹 URL 직접 입력
                      </label>
                      <input
                        type="text"
                        placeholder="/model_1.jpg 또는 https://..."
                        value={customHeroImageUrl}
                        onChange={(e) => setCustomHeroImageUrl(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsImageUploadModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  💾 이미지 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELECT & CONFIGURE LINKED PRODUCT */}
      {isProductLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl border border-emerald-500 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-600 text-white text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    PRODUCT LINK CONFIGURATION
                  </span>
                </div>
                <h3 className="text-2xl font-black text-neutral-950">
                  🔗 상품 연동 설정 및 변경
                </h3>
                <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                  상단 대표 이미지를 클릭했을 때 이동할 스토어 상품을 선택하세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductLinkModalOpen(false)}
                className="p-2.5 text-neutral-400 hover:text-neutral-950 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="연동할 상품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">전체 카테고리</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product List Selector Table */}
            <div className="flex-1 overflow-y-auto border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left text-sm text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold border-b border-neutral-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-5">상품 이미지</th>
                    <th className="py-3.5 px-5">상품명</th>
                    <th className="py-3.5 px-5">카테고리</th>
                    <th className="py-3.5 px-5">판매가</th>
                    <th className="py-3.5 px-5 text-right">연동 선택</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                        검색 조건에 일치하는 상품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isCurrentlyLinked = selectedLinkedProductId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="w-16 h-20 rounded-xl bg-white overflow-hidden border border-neutral-200 shadow-2xs flex items-center justify-center p-1">
                              <img
                                src={p.featuredImage?.url || "/product_1.webp"}
                                alt={p.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-black text-base text-neutral-950">{p.title}</p>
                            <p className="text-xs text-neutral-500 truncate max-w-md mt-0.5">{p.description}</p>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-block px-3 py-1 rounded-md text-xs font-extrabold bg-neutral-100 text-neutral-800 uppercase border border-neutral-200">
                              {p.categoryId}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-black text-base text-neutral-950 font-mono">
                            {formatPrice(p.priceRange?.minVariantPrice?.amount)}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveProductLink(p.id)}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0 ${isCurrentlyLinked
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20 font-black"
                                  : "bg-neutral-950 hover:bg-neutral-800 text-white border-neutral-950 font-black"
                                }`}
                            >
                              <span>{isCurrentlyLinked ? "✓ 현재 연동됨" : "🔗 이 상품으로 연동"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-sm font-bold text-neutral-500">
                선택된 연동 상품:{" "}
                <span className="text-emerald-700 font-black text-base">
                  {productsList.find((p) => p.id === selectedLinkedProductId)?.title || "선택 안됨"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setIsProductLinkModalOpen(false)}
                className="px-6 py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                설정 완료 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECT & REGISTER MAIN DISPLAY PRODUCTS (SEPARATED HERO / BOTTOM) */}
      {isMainSelectModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/65 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl border border-amber-300 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500 text-neutral-950 text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    {mainSelectMode === "hero" ? "🌟 TOP HERO MAIN PRODUCT SELECTOR" : "🛍️ BOTTOM SUB PRODUCT SELECTOR"}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-neutral-950">
                  {mainSelectMode === "hero" ? "상단 메인 대표 상품 선택 및 지정" : "하단 상품 선택 및 지정"}
                </h3>
                <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                  {mainSelectMode === "hero"
                    ? "쇼핑몰 메인 상단 대형 히어로 슬라이더 영역에 대표로 노출할 상품을 선택하세요."
                    : "메인 화면 하단 3열 그리드 영역에 노출할 상품을 선택하세요."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMainSelectModalOpen(false)}
                className="p-2.5 text-neutral-400 hover:text-neutral-950 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="상품명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">전체 카테고리</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products List Table */}
            <div className="flex-1 overflow-y-auto border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left text-sm text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold border-b border-neutral-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-5">상품 이미지</th>
                    <th className="py-3.5 px-5">상품명</th>
                    <th className="py-3.5 px-5">카테고리</th>
                    <th className="py-3.5 px-5">판매가</th>
                    <th className="py-3.5 px-5 text-right">
                      {mainSelectMode === "hero" ? "상단 대표 지정" : "하단 상품 지정"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                        검색 조건에 일치하는 상품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, index) => {
                      const isSelectedInCurrentMode =
                        mainSelectMode === "hero"
                          ? p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)
                          : p.isBottomFeatured;

                      return (
                        <tr key={`${p.id}-${index}`} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="w-16 h-20 md:w-20 md:h-24 rounded-xl bg-white overflow-hidden border border-neutral-200 shadow-2xs flex items-center justify-center p-1">
                              <img
                                src={p.featuredImage?.url || "/product_1.webp"}
                                alt={p.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-black text-base text-neutral-950">{p.title}</p>
                            <p className="text-xs md:text-sm text-neutral-500 truncate max-w-sm mt-0.5">{p.description}</p>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-block px-2.5 py-1 rounded-md text-xs font-extrabold bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase">
                              {p.categoryId}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-black text-base text-neutral-950 font-mono">
                            {formatPrice(p.priceRange?.minVariantPrice?.amount)}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                mainSelectMode === "hero"
                                  ? handleToggleHeroProduct(p.id)
                                  : handleToggleBottomProduct(p.id)
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0 ${isSelectedInCurrentMode
                                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                  : mainSelectMode === "hero"
                                    ? "bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-600 shadow-amber-500/20 font-black"
                                    : "bg-neutral-950 text-white border-neutral-900 hover:bg-neutral-800 font-black"
                                }`}
                            >
                              <span>{isSelectedInCurrentMode ? "선택 해제" : "선택"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs md:text-sm font-bold text-neutral-500">
                {mainSelectMode === "hero" ? (
                  <>
                    상단 대표 메인 상품 수:{" "}
                    <span className="text-amber-600 font-black text-base">
                      {productsList.filter((p) => p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)).length}개
                    </span>
                  </>
                ) : (
                  <>
                    하단 상품 수:{" "}
                    <span className="text-neutral-950 font-black text-base">
                      {productsList.filter((p) => p.isBottomFeatured).length}개
                    </span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setIsMainSelectModalOpen(false)}
                className="px-6 py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs md:text-sm shadow-md transition-all cursor-pointer"
              >
                설정 완료 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
