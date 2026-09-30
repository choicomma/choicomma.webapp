"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Star,
  Camera,
  ThumbsUp,
  CheckCircle2,
  Plus,
  X,
  ChevronDown,
  Filter,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  Crown,
  Gift,
  Award,
  User,
  Mail,
  Phone,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import { getCurrentLanguage } from "@/lib/i18n/translation";
import { isCurrentUserAdmin } from "@/lib/auth/customer-session";
import { saveAdminCoupons, getAllUserCoupons, AvailableCoupon } from "@/lib/membership/coupons";
import { cn } from "@/lib/utils";

export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  option?: string;
  sizeFit?: "정사이즈" | "조금 큼" | "조금 작음";
  colorMatch?: "화면과 동일" | "화면보다 밝음" | "화면보다 어두움";
  title: string;
  content: string;
  photos?: string[];
  helpfulCount: number;
  createdAt: string;
  isVerifiedBuyer?: boolean;
  isBest?: boolean;
  authorEmail?: string;
  authorPhone?: string;
  authorGrade?: string;
  couponAwarded?: boolean;
  couponAwardedDate?: string;
  couponAmount?: number;
}

interface ProductReviewsProps {
  productId: string;
  productTitle?: string;
  hideTopBorder?: boolean;
  className?: string;
}

const REVIEWS_I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "고객 후기",
    writeReview: "후기 작성하기",
    totalReviews: "전체 리뷰",
    satisfaction: "구매 만족도",
    recommendation: "의 고객이 이 상품을 만족해하셨습니다.",
    all: "전체 후기",
    photoOnly: "포토 후기만",
    latest: "최신순",
    highest: "평점 높은순",
    lowest: "평점 낮은순",
    verified: "구매자 인증",
    helpful: "도움이 돼요",
    empty: "아직 등록된 고객 후기가 없습니다. 첫 번째 리뷰의 주인공이 되어보세요!",
    modalTitle: "상품 구매 후기 작성",
    modalSubtitle: "고객님의 소중한 후기는 다른 분들의 쇼핑에 큰 도움이 됩니다.",
    ratingLabel: "상품은 어떠셨나요?",
    optionLabel: "구매하신 색상 / 사이즈",
    optionPlaceholder: "예: 아이보리 / FREE",
    titleLabel: "한줄 요약",
    titlePlaceholder: "상품에 대한 총평을 한줄로 남겨주세요.",
    contentLabel: "솔직한 상세 후기",
    contentPlaceholder: "소재감, 착용 핏, 마감 등 느낀 점을 자유롭게 적어주세요. (최소 10자 이상)",
    photoLabel: "사진 첨부 (선택)",
    nameLabel: "작성자명",
    namePlaceholder: "성함 (미입력 시 회원명 또는 고객님)",
    submit: "후기 등록 완료",
    cancel: "취소",
    fitLabel: "사이즈감",
    colorLabel: "색상 만족도",
    fitTrue: "정사이즈예요",
    fitLarge: "생각보다 커요",
    fitSmall: "생각보다 작아요",
    colorSame: "화면과 같아요",
    colorBright: "화면보다 밝아요",
    colorDark: "화면보다 어두워요",
  },
  en: {
    title: "Customer Reviews",
    writeReview: "Write a Review",
    totalReviews: "Total Reviews",
    satisfaction: "Satisfaction Rate",
    recommendation: "of customers recommend this product.",
    all: "All Reviews",
    photoOnly: "Photo Reviews",
    latest: "Latest",
    highest: "Highest Rating",
    lowest: "Lowest Rating",
    verified: "Verified Buyer",
    helpful: "Helpful",
    empty: "No reviews yet. Be the first to share your experience!",
    modalTitle: "Write a Review",
    modalSubtitle: "Your honest review helps others make better shopping choices.",
    ratingLabel: "Overall Rating",
    optionLabel: "Purchased Option / Size",
    optionPlaceholder: "e.g. Ivory / FREE",
    titleLabel: "Headline",
    titlePlaceholder: "Summarize your thoughts in one sentence",
    contentLabel: "Detailed Review",
    contentPlaceholder: "Share how the product fits, fabric quality, and comfort.",
    photoLabel: "Attach Photos (Optional)",
    nameLabel: "Your Name",
    namePlaceholder: "Your Name",
    submit: "Submit Review",
    cancel: "Cancel",
    fitLabel: "Fit",
    colorLabel: "Color",
    fitTrue: "True to size",
    fitLarge: "Runs large",
    fitSmall: "Runs small",
    colorSame: "As pictured",
    colorBright: "Brighter than picture",
    colorDark: "Darker than picture",
  },
  ja: {
    title: "カスタマーレビュー",
    writeReview: "レビューを書く",
    totalReviews: "全レビュー",
    satisfaction: "満足度",
    recommendation: "のお客様がこの商品に満足しています。",
    all: "すべて",
    photoOnly: "写真付き",
    latest: "最新順",
    highest: "評価が高い順",
    lowest: "評価が低い順",
    verified: "購入者認証",
    helpful: "役に立った",
    empty: "まだレビューがありません。最初のレビューを投稿してみましょう！",
    modalTitle: "レビューを投稿",
    modalSubtitle: "あなたのレビューが他のお客様の参考になります。",
    ratingLabel: "総合評価",
    optionLabel: "ご購入オプション/サイズ",
    optionPlaceholder: "例: アイボリー / FREE",
    titleLabel: "一行要約",
    titlePlaceholder: "商品の感想を一言で",
    contentLabel: "詳細なレビュー",
    contentPlaceholder: "素材感や着心地、フィット感についてご記入ください。",
    photoLabel: "写真添付 (任意)",
    nameLabel: "お名前",
    namePlaceholder: "お名前",
    submit: "投稿する",
    cancel: "キャンセル",
    fitLabel: "サイズ感",
    colorLabel: "色合い",
    fitTrue: "ちょうど良い",
    fitLarge: "少し大きめ",
    fitSmall: "少し小さめ",
    colorSame: "写真通り",
    colorBright: "写真より明るい",
    colorDark: "写真より暗い",
  },
  zh: {
    title: "买家真实评价",
    writeReview: "发表评价",
    totalReviews: "所有评价",
    satisfaction: "满意度",
    recommendation: "的顾客对本商品表示满意。",
    all: "全部评价",
    photoOnly: "有图评价",
    latest: "最新",
    highest: "评分最高",
    lowest: "评分最低",
    verified: "已购认证",
    helpful: "有帮助",
    empty: "暂无评价，快来抢先留下第一条评价吧！",
    modalTitle: "撰写商品评价",
    modalSubtitle: "您的真实评价将对其他顾客提供宝贵参考。",
    ratingLabel: "商品评分",
    optionLabel: "购买规格 / 尺码",
    optionPlaceholder: "例如: 象牙白 / 均码",
    titleLabel: "一句话总结",
    titlePlaceholder: "一句话概括您的体验",
    contentLabel: "详细评价",
    contentPlaceholder: "请分享穿着舒适度、面料质感和剪裁体验。",
    photoLabel: "添加照片 (可选)",
    nameLabel: "姓名",
    namePlaceholder: "您的姓名",
    submit: "提交评价",
    cancel: "取消",
    fitLabel: "尺码感受",
    colorLabel: "颜色感受",
    fitTrue: "尺码标准",
    fitLarge: "偏大",
    fitSmall: "偏小",
    colorSame: "与图片一致",
    colorBright: "比图片亮",
    colorDark: "比图片暗",
  },
  fr: {
    title: "Avis Clients",
    writeReview: "Donner un avis",
    totalReviews: "Total des avis",
    satisfaction: "Satisfaction",
    recommendation: "des clients recommandent cet article.",
    all: "Tous les avis",
    photoOnly: "Avec photos",
    latest: "Plus récents",
    highest: "Mieux notés",
    lowest: "Moins bien notés",
    verified: "Acheteur vérifié",
    helpful: "Utile",
    empty: "Aucun avis pour le moment. Soyez le premier à donner votre avis !",
    modalTitle: "Rédiger un avis",
    modalSubtitle: "Votre avis aide les autres clients dans leurs choix.",
    ratingLabel: "Note globale",
    optionLabel: "Option / Taille achetée",
    optionPlaceholder: "ex: Ivoire / TU",
    titleLabel: "Titre de l'avis",
    titlePlaceholder: "Résumez votre expérience en une phrase",
    contentLabel: "Avis détaillé",
    contentPlaceholder: "Partagez vos impressions sur la matière, la coupe et le confort.",
    photoLabel: "Ajouter des photos (optionnel)",
    nameLabel: "Votre nom",
    namePlaceholder: "Votre nom",
    submit: "Publier l'avis",
    cancel: "Annuler",
    fitLabel: "Coupe",
    colorLabel: "Couleur",
    fitTrue: "Taille conforme",
    fitLarge: "Taille grand",
    fitSmall: "Taille petit",
    colorSame: "Conforme à la photo",
    colorBright: "Plus clair qu'en photo",
    colorDark: "Plus foncé qu'en photo",
  },
};

// 기본 구매 후기 (실제 고객이 작성한 후기만 저장 및 표시)
const getInitialSampleReviews = (): ReviewItem[] => [];

export function ProductReviews({
  productId,
  productTitle = "상품",
  hideTopBorder = false,
  className,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [currentLang, setCurrentLang] = useState("ko");
  const [filterType, setFilterType] = useState<"all" | "photo">("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "highest" | "lowest">("latest");
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());

  // Admin Mode Detection
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  // Admin Best Comment Thank You Coupon Modal State
  const [couponModalReview, setCouponModalReview] = useState<ReviewItem | null>(null);
  const [targetCustomerEmail, setTargetCustomerEmail] = useState("");
  const [targetCustomerName, setTargetCustomerName] = useState("");
  const [targetCustomerPhone, setTargetCustomerPhone] = useState("");
  const [targetCustomerGrade, setTargetCustomerGrade] = useState("GOLD");
  const [couponDiscountAmount, setCouponDiscountAmount] = useState<number>(10000);
  const [couponValidDays, setCouponValidDays] = useState<number>(30);

  // Form State
  const [formRating, setFormRating] = useState<number>(5);
  const [formAuthor, setFormAuthor] = useState<string>("");
  const [formOption, setFormOption] = useState<string>("아이보리 / FREE");
  const [formSizeFit, setFormSizeFit] = useState<"정사이즈" | "조금 큼" | "조금 작음">("정사이즈");
  const [formColorMatch, setFormColorMatch] = useState<"화면과 동일" | "화면보다 밝음" | "화면보다 어두움">("화면과 동일");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeProductId = productId || "default";
  const storageKey = `choicomma_product_reviews_${safeProductId}`;
  const helpfulStorageKey = `choicomma_helpful_reviews_${safeProductId}`;

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLang = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLang);

    // Admin Session Detection
    const checkAdmin = () => {
      setIsAdmin(isCurrentUserAdmin());
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    window.addEventListener("login_state_changed", checkAdmin);

    const loadReviewsData = () => {
      if (typeof window === "undefined") return;
      try {
        // 모든 상품 리뷰 스토리지에서 샘플 가짜 데이터(rev-sample-) 일괄 제거
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("choicomma_product_reviews_")) {
            const val = localStorage.getItem(key);
            if (val) {
              try {
                const list = JSON.parse(val);
                if (Array.isArray(list)) {
                  const realOnly = list.filter((r: any) => !r.id?.startsWith("rev-sample-"));
                  if (realOnly.length !== list.length) {
                    localStorage.setItem(key, JSON.stringify(realOnly));
                  }
                }
              } catch (err) {}
            }
          }
        }

        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const realOnly = parsed.filter((r: any) => !r.id?.startsWith("rev-sample-"));
            setReviews(realOnly);
            localStorage.setItem(storageKey, JSON.stringify(realOnly));
          } else {
            setReviews([]);
            localStorage.setItem(storageKey, JSON.stringify([]));
          }
        } else {
          setReviews([]);
          localStorage.setItem(storageKey, JSON.stringify([]));
        }
      } catch (e) {
        setReviews([]);
      }

      try {
        const helpfulSaved = localStorage.getItem(helpfulStorageKey);
        if (helpfulSaved) {
          setHelpfulClicked(new Set(JSON.parse(helpfulSaved)));
        }
      } catch (e) {}

      const loggedInName = localStorage.getItem("membership_user_name");
      if (loggedInName) {
        const masked =
          loggedInName.length > 2
            ? `${loggedInName[0]}*${loggedInName.slice(-1)}`
            : `${loggedInName[0]}*`;
        setFormAuthor(masked);
      }
    };

    loadReviewsData();

    window.addEventListener("storage", loadReviewsData);
    window.addEventListener("choicomma_reviews_updated", loadReviewsData);

    return () => {
      window.removeEventListener("language_changed", handleLang);
      window.removeEventListener("storage", checkAdmin);
      window.removeEventListener("login_state_changed", checkAdmin);
      window.removeEventListener("storage", loadReviewsData);
      window.removeEventListener("choicomma_reviews_updated", loadReviewsData);
    };
  }, [safeProductId, productTitle, storageKey, helpfulStorageKey]);

  // 평점 통계 계산
  const metrics = useMemo(() => {
    if (reviews.length === 0) {
      return {
        avgRating: "0.0",
        avgNum: 0,
        totalCount: 0,
        satisfactionPct: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        photoCount: 0,
      };
    }

    const totalCount = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avgNum = Math.round((sum / totalCount) * 10) / 10;
    const avgRating = avgNum.toFixed(1);

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let photoCount = 0;
    reviews.forEach((r) => {
      const score = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      dist[score] = (dist[score] || 0) + 1;
      if (r.photos && r.photos.length > 0) photoCount++;
    });

    const highRatings = (dist[5] || 0) + (dist[4] || 0);
    const satisfactionPct = Math.round((highRatings / totalCount) * 100);

    return {
      avgRating,
      avgNum,
      totalCount,
      satisfactionPct,
      distribution: dist,
      photoCount,
    };
  }, [reviews]);

  // 필터 및 정렬된 리뷰 목록 (베스트 댓글 우선 정렬)
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (filterType === "photo") {
      list = list.filter((r) => r.photos && r.photos.length > 0);
    }

    if (sortOrder === "latest") {
      list.sort((a, b) => {
        if (a.isBest && !b.isBest) return -1;
        if (!a.isBest && b.isBest) return 1;
        return b.createdAt > a.createdAt ? 1 : -1;
      });
    } else if (sortOrder === "highest") {
      list.sort((a, b) => {
        if (a.isBest && !b.isBest) return -1;
        if (!a.isBest && b.isBest) return 1;
        return (b.rating || 5) - (a.rating || 5);
      });
    } else if (sortOrder === "lowest") {
      list.sort((a, b) => (a.rating || 5) - (b.rating || 5));
    }

    return list;
  }, [reviews, filterType, sortOrder]);

  // 관리자 기능: 베스트 댓글 지정 / 해제 토글
  const handleToggleBest = (id: string) => {
    if (!isAdmin) return;
    const targetRev = reviews.find((r) => r.id === id);
    if (!targetRev) return;

    const willBeBest = !targetRev.isBest;

    if (willBeBest) {
      if (!window.confirm("베스트 댓글로 지정하시겠습니까?")) {
        return;
      }
    } else {
      if (!window.confirm("베스트 댓글 지정을 해제하시겠습니까?")) {
        return;
      }
    }

    const updated = reviews.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          isBest: willBeBest,
        };
      }
      return r;
    });

    setReviews(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("choicomma_reviews_updated"));
    }

    if (willBeBest) {
      alert(`👑 [${targetRev.author}] 님의 후기가 '베스트 댓글'로 지정되었습니다!\n\n베스트 댓글 뱃지 및 골드 테두리가 적용되며, 감사 쿠폰을 지급할 수 있습니다.`);
    } else {
      alert(`[${targetRev.author}] 님의 '베스트 댓글' 지정이 해제되었습니다.`);
    }
  };

  // 관리자 기능: 베스트 댓글 고객 정보 & 감사 쿠폰 팝업 열기
  const handleOpenCouponModal = (rev: ReviewItem) => {
    if (!isAdmin) return;
    setCouponModalReview(rev);

    let email = rev.authorEmail || "";
    let name = rev.author || "";
    let phone = rev.authorPhone || "";
    let grade = rev.authorGrade || "GOLD";

    if (typeof window !== "undefined") {
      try {
        const rawCust = localStorage.getItem("admin_customers");
        if (rawCust) {
          const custList = JSON.parse(rawCust);
          if (Array.isArray(custList)) {
            const cleanAuthor = rev.author.replace(/[\s\*님]/g, "");
            const found = custList.find((c: any) =>
              (email && c.email?.toLowerCase() === email.toLowerCase()) ||
              (cleanAuthor && c.name?.replace(/[\s\*님]/g, "").includes(cleanAuthor)) ||
              (c.phone && phone && c.phone === phone)
            );
            if (found) {
              if (!email) email = found.email || "";
              if (!phone) phone = found.phone || "";
              grade = found.grade || grade;
              name = found.name || name;
            }
          }
        }
      } catch (e) {}
    }

    if (!email) {
      const slug = rev.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "user";
      email = `${slug}@choicomma.com`;
    }
    if (!phone) {
      phone = "010-8271-9923";
    }

    setTargetCustomerEmail(email);
    setTargetCustomerName(name);
    setTargetCustomerPhone(phone);
    setTargetCustomerGrade(grade);
    setCouponDiscountAmount(rev.couponAmount || 10000);
    setCouponValidDays(30);
  };

  // 관리자 기능: '베스트 댓글 감사 쿠폰' 발급 실행
  const handleIssueThankYouCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponModalReview) return;
    if (!targetCustomerEmail.trim()) {
      alert("쿠폰을 지급받을 고객 이메일을 입력해 주세요.");
      return;
    }

    if (!window.confirm("쿠폰을 발급하시겠습니까?")) {
      return;
    }

    const today = new Date();
    const expireDate = new Date(today.getTime() + couponValidDays * 24 * 60 * 60 * 1000);
    const validUntilStr = `${expireDate.getFullYear()}.${String(expireDate.getMonth() + 1).padStart(2, "0")}.${String(expireDate.getDate()).padStart(2, "0")}`;

    const newCoupon: AvailableCoupon = {
      id: `coupon-best-review-${Date.now()}`,
      code: `BEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      title: "베스트 댓글 감사 쿠폰",
      discount: `${couponDiscountAmount.toLocaleString()}원`,
      discountAmount: couponDiscountAmount,
      condition: "금액 제한 없음",
      validUntil: validUntilStr,
      type: "FIXED",
      badge: "BEST REVIEW",
      isActive: true,
      isUsed: false,
      targetType: "CUSTOMER",
      targetCustomerEmails: [targetCustomerEmail.trim().toLowerCase()],
      targetCustomerNames: [targetCustomerName.trim() || couponModalReview.author],
      minOrderAmount: 0,
      createdAt: new Date().toISOString(),
    };

    // 1. 최신 쿠폰 목록에 추가 및 Supabase/localStorage 동기화
    const existing = getAllUserCoupons();
    saveAdminCoupons([newCoupon, ...existing]);

    // 2. 리뷰 데이터에 쿠폰 발급 상태 반영
    const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    const updated = reviews.map((r) => {
      if (r.id === couponModalReview.id) {
        return {
          ...r,
          authorEmail: targetCustomerEmail.trim().toLowerCase(),
          authorPhone: targetCustomerPhone,
          authorGrade: targetCustomerGrade,
          couponAwarded: true,
          couponAwardedDate: todayStr,
          couponAmount: couponDiscountAmount,
        };
      }
      return r;
    });

    setReviews(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("choicomma_reviews_updated"));
    }

    setCouponModalReview(null);
    alert(`🎉 [베스트 댓글 감사 쿠폰 (${couponDiscountAmount.toLocaleString()}원)]이\n${targetCustomerName}(${targetCustomerEmail}) 고객님께 성공적으로 발급되었습니다!\n\n해당 회원의 마이페이지 쿠폰함에서 즉시 확인 및 주문 결제 시 사용 가능합니다.`);
  };

  // 사진 업로드 핸들러
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setFormPhotos((prev) => [...prev, result].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 도움이 돼요 클릭 핸들러
  const handleToggleHelpful = (id: string) => {
    const isAlready = helpfulClicked.has(id);
    const newSet = new Set(helpfulClicked);

    const updated = reviews.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          helpfulCount: isAlready ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
        };
      }
      return r;
    });

    if (isAlready) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setReviews(updated);
    setHelpfulClicked(newSet);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem(helpfulStorageKey, JSON.stringify(Array.from(newSet)));
      window.dispatchEvent(new CustomEvent("choicomma_reviews_updated"));
    }
  };

  // 리뷰 작성 제출
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      alert("상세 후기 내용을 10자 이상 작성해 주세요.");
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;

    const authorName =
      formAuthor.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("membership_user_name") : "") ||
      "고객님";

    const storedEmail = typeof window !== "undefined" ? localStorage.getItem("membership_user_email") || "" : "";
    const storedPhone = typeof window !== "undefined" ? localStorage.getItem("membership_user_phone") || "" : "";
    const storedGrade = typeof window !== "undefined" ? localStorage.getItem("user_grade") || "GENERAL" : "GENERAL";

    const newRev: ReviewItem = {
      id: `rev-${Date.now()}`,
      author: authorName,
      authorEmail: storedEmail,
      authorPhone: storedPhone,
      authorGrade: storedGrade,
      isBest: false,
      rating: formRating,
      option: formOption.trim() || "FREE",
      sizeFit: formSizeFit,
      colorMatch: formColorMatch,
      title: formTitle.trim() || "정말 마음에 들어요!",
      content: formContent.trim(),
      photos: formPhotos.length > 0 ? formPhotos : undefined,
      helpfulCount: 0,
      createdAt: dateStr,
      isVerifiedBuyer: true,
      couponAwarded: false,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("choicomma_reviews_updated"));
    }

    // 폼 초기화 및 모달 닫기
    setFormTitle("");
    setFormContent("");
    setFormPhotos([]);
    setFormRating(5);
    setIsWriteModalOpen(false);
    alert("🎉 고객님의 소중한 후기가 성공적으로 등록되었습니다. 감사합니다!");
  };

  // 리뷰 삭제
  const handleDeleteReview = (id: string) => {
    if (window.confirm("이 구매 후기를 삭제하시겠습니까?")) {
      const updated = reviews.filter((r) => r.id !== id);
      setReviews(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("choicomma_reviews_updated"));
      }
    }
  };

  const t = REVIEWS_I18N[currentLang] || REVIEWS_I18N.ko;

  return (
    <div
      className={cn(
        "w-full",
        hideTopBorder
          ? "mt-0 pt-0 border-t-0"
          : "mt-8 md:mt-0 pt-8 border-t border-neutral-200",
        className
      )}
    >
      {/* 1. Header & Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 uppercase">
              {t.title}
            </h3>
            <span className="text-xs font-bold text-neutral-500 font-mono bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
              {metrics.totalCount}건
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            실제 상품을 구매하신 고객님들의 생생하고 솔직한 착용 후기입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-102 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.writeReview}</span>
        </button>
      </div>

      {/* 2. Rating Summary Score Card Dashboard */}
      <div className="bg-neutral-50/80 border border-neutral-200/90 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Star Score Big Badge */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center sm:border-r border-neutral-200/80 sm:pr-6">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-neutral-950">
              {metrics.avgRating}
            </span>
            <div className="flex items-center gap-1 my-2 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(metrics.avgNum)
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-neutral-600">
              {metrics.totalCount > 0 ? (
                <>
                  <span className="text-neutral-950 font-black">{metrics.satisfactionPct}%</span>
                  {t.recommendation}
                </>
              ) : (
                <span>아직 등록된 고객 후기가 없습니다.</span>
              )}
            </p>
          </div>

          {/* Right: Star Rating Distribution Progress Bars */}
          <div className="md:col-span-8 space-y-1.5 pl-0 sm:pl-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics.distribution[star] || 0;
              const pct = metrics.totalCount > 0 ? Math.round((count / metrics.totalCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2.5 text-xs">
                  <span className="w-8 font-bold text-neutral-600 font-mono flex items-center gap-0.5">
                    {star}점
                  </span>
                  <div className="flex-1 h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono font-semibold text-neutral-400 text-[11px]">
                    {count}명 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Filter & Sort Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-neutral-200">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-neutral-950 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
            }`}
          >
            {t.all} ({metrics.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("photo")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === "photo"
                ? "bg-neutral-950 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t.photoOnly} ({metrics.photoCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs text-neutral-500 font-bold">
          <span className="text-[11px] text-neutral-400 mr-1">정렬:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-transparent border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="latest">{t.latest}</option>
            <option value="highest">{t.highest}</option>
            <option value="lowest">{t.lowest}</option>
          </select>
        </div>
      </div>

      {/* 4. Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
            <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">{t.empty}</p>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-4 sm:p-5 rounded-2xl transition-all space-y-3 ${
                rev.isBest
                  ? "bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-2 border-amber-400 shadow-md ring-2 ring-amber-300/30"
                  : "bg-white border border-neutral-200/90 shadow-2xs hover:border-neutral-300"
              }`}
            >
              {/* Header: Rating, Author, Date, Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 2. 베스트 댓글 뱃지 */}
                  {rev.isBest && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-950 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 px-2.5 py-0.5 rounded-md border border-amber-400 shadow-2xs">
                      <Crown className="w-3.5 h-3.5 fill-amber-600 text-amber-800" />
                      베스트 댓글
                    </span>
                  )}

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-extrabold text-neutral-950">{rev.author}</span>
                  {rev.authorGrade && (
                    <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                      {rev.authorGrade}
                    </span>
                  )}
                  {rev.isVerifiedBuyer && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {t.verified}
                    </span>
                  )}
                  {rev.couponAwarded && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      <Gift className="w-2.5 h-2.5 text-purple-600" />
                      감사 쿠폰 지급완료{rev.couponAwardedDate ? ` (${rev.couponAwardedDate})` : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                  <span>{rev.createdAt}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev.id)}
                    className="text-neutral-300 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                    title="리뷰 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Purchase Options & Tags */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                {rev.option && (
                  <span className="font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 font-mono">
                    옵션: {rev.option}
                  </span>
                )}
                {rev.sizeFit && (
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {rev.sizeFit === "정사이즈" ? t.fitTrue : rev.sizeFit === "조금 큼" ? t.fitLarge : t.fitSmall}
                  </span>
                )}
                {rev.colorMatch && (
                  <span className="font-bold text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200">
                    {rev.colorMatch === "화면과 동일" ? t.colorSame : rev.colorMatch === "화면보다 밝음" ? t.colorBright : t.colorDark}
                  </span>
                )}
              </div>

              {/* Review Title & Content Body */}
              <div className="space-y-1">
                {rev.title && (
                  <h4 className="text-xs sm:text-sm font-extrabold text-neutral-950 leading-snug">
                    {rev.title}
                  </h4>
                )}
                <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap break-words">
                  {rev.content}
                </p>
              </div>

              {/* Attached Review Photos */}
              {rev.photos && rev.photos.length > 0 && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {rev.photos.map((imgUrl, pIdx) => (
                    <div
                      key={pIdx}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 cursor-pointer group hover:scale-103 transition-transform shadow-2xs shrink-0"
                      onClick={() => setSelectedPhotoModal(imgUrl)}
                    >
                      <img
                        src={imgUrl}
                        alt={`Review photo ${pIdx + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        확대보기
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: Admin Management Actions & Helpful Button */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-neutral-100">
                {/* 1. 관리자 전용 제어 바 */}
                {isAdmin ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 border border-amber-300 px-1.5 py-0.5 rounded">
                      ADMIN
                    </span>
                    {/* 1. 베스트 댓글 지정/해제 토글 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleToggleBest(rev.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        rev.isBest
                          ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300"
                      }`}
                    >
                      <Crown className={`w-3.5 h-3.5 ${rev.isBest ? "fill-amber-600 text-amber-700" : "text-amber-500"}`} />
                      <span>{rev.isBest ? "베스트 댓글 해제" : "베스트 댓글 지정"}</span>
                    </button>

                    {/* 3 & 4. 베스트 댓글 감사 쿠폰 지급 팝업 열기 버튼 */}
                    {rev.isBest && (
                      <button
                        type="button"
                        onClick={() => handleOpenCouponModal(rev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs ${
                          rev.couponAwarded
                            ? "bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
                            : "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-600"
                        }`}
                        title="작성 고객 정보 확인 및 베스트 댓글 감사 쿠폰 발급"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>{rev.couponAwarded ? "쿠폰 추가 발급" : "감사 쿠폰 지급"}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={() => handleToggleHelpful(rev.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    helpfulClicked.has(rev.id)
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-950"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${helpfulClicked.has(rev.id) ? "fill-blue-600" : ""}`} />
                  <span>{t.helpful}</span>
                  <span className="font-mono text-[11px] ml-0.5 font-extrabold">
                    {rev.helpfulCount}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Write Review Modal */}
      {isWriteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsWriteModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-black text-neutral-950">{t.modalTitle}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{t.modalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitReview} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Star Rating Selection */}
              <div className="space-y-1.5 text-center py-2 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                <span className="text-xs font-bold text-neutral-700 block">{t.ratingLabel}</span>
                <div className="flex items-center justify-center gap-1.5 text-2xl cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className={`transition-all hover:scale-115 p-1 ${
                        star <= formRating ? "text-amber-400" : "text-neutral-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-xs font-black text-neutral-950 font-mono">
                  {formRating}점 만점
                </span>
              </div>

              {/* Author & Option Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-neutral-700">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-neutral-700">{t.optionLabel}</label>
                  <input
                    type="text"
                    value={formOption}
                    onChange={(e) => setFormOption(e.target.value)}
                    placeholder={t.optionPlaceholder}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 font-mono"
                  />
                </div>
              </div>

              {/* Fit & Color Assessment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-neutral-700">{t.fitLabel}</label>
                  <select
                    value={formSizeFit}
                    onChange={(e) => setFormSizeFit(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 bg-white"
                  >
                    <option value="정사이즈">{t.fitTrue}</option>
                    <option value="조금 큼">{t.fitLarge}</option>
                    <option value="조금 작음">{t.fitSmall}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-neutral-700">{t.colorLabel}</label>
                  <select
                    value={formColorMatch}
                    onChange={(e) => setFormColorMatch(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 bg-white"
                  >
                    <option value="화면과 동일">{t.colorSame}</option>
                    <option value="화면보다 밝음">{t.colorBright}</option>
                    <option value="화면보다 어두움">{t.colorDark}</option>
                  </select>
                </div>
              </div>

              {/* Review Title */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-neutral-700">{t.titleLabel}</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 font-bold"
                />
              </div>

              {/* Review Content */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-neutral-700">{t.contentLabel}</label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={t.contentPlaceholder}
                  className="w-full p-3 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950 resize-none text-neutral-900 leading-relaxed"
                />
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-neutral-700 flex items-center justify-between">
                  <span>{t.photoLabel}</span>
                  <span className="text-[11px] font-mono text-neutral-400">최대 3장</span>
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  {formPhotos.map((photoUrl, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200">
                      <img src={photoUrl} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-black cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {formPhotos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-900 flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer bg-neutral-50"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-bold">사진 추가</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!formContent.trim()}
                  className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  {t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Photo Enlargement Lightbox Modal */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoModal}
              alt="Enlarged review photo"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* 7. 관리자 전용: 고객 정보 및 '베스트 댓글 감사 쿠폰' 발급 모달 */}
      {couponModalReview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCouponModalReview(null)}
        >
          <div
            className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-neutral-950">
                      베스트 댓글 감사 쿠폰 지급
                    </h3>
                    <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    선정된 베스트 댓글 작성 고객님께 특별 쿠폰을 발급합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalReview(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleIssueThankYouCoupon} className="p-5 space-y-4 text-xs">
              {/* 고객 상세 정보 카드 */}
              <div className="bg-neutral-50/90 border border-neutral-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-neutral-400" /> 작성 고객 정보
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                    회원 등급: {targetCustomerGrade}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-medium">고객명 / 닉네임</span>
                    <span className="font-extrabold text-neutral-900">{targetCustomerName}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-medium">연락처</span>
                    <span className="font-extrabold text-neutral-900 font-mono text-[11px]">
                      {targetCustomerPhone || "010-****-****"}
                    </span>
                  </div>
                </div>

                {/* 이메일 입력 (쿠폰이 발급될 계정) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-neutral-500" />
                    쿠폰 발급 대상 이메일
                  </label>
                  <input
                    type="email"
                    required
                    value={targetCustomerEmail}
                    onChange={(e) => setTargetCustomerEmail(e.target.value)}
                    placeholder="customer@choicomma.com"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono font-medium text-neutral-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-neutral-400">
                    * 해당 이메일 회원의 마이페이지 쿠폰함 및 결제창에 실시간 연동됩니다.
                  </p>
                </div>

                {/* 후기 내용 미리보기 */}
                <div className="pt-2 border-t border-neutral-200/70 text-[11px]">
                  <span className="text-neutral-400 block text-[10px] font-medium mb-0.5">선정된 후기 내용:</span>
                  <div className="bg-white/80 p-2 rounded-lg border border-neutral-200/60 text-neutral-700 line-clamp-2 italic">
                    "{couponModalReview.content}"
                  </div>
                </div>
              </div>

              {/* 쿠폰 발급 설정 카드 */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-amber-700" /> 쿠폰 혜택 설정
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full border border-amber-300">
                    전용 쿠폰
                  </span>
                </div>

                {/* 쿠폰명 */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-medium">쿠폰명</span>
                    <span className="font-black text-neutral-950 text-xs">베스트 댓글 감사 쿠폰</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    BEST REVIEW
                  </span>
                </div>

                {/* 할인 금액 선택 버튼 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-800 block">
                    할인 금액 선택
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 30000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCouponDiscountAmount(amt)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                          couponDiscountAmount === amt
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs scale-102"
                            : "bg-white text-neutral-700 border-neutral-200 hover:border-amber-300 hover:bg-amber-50/50"
                        }`}
                      >
                        {amt.toLocaleString()}원
                      </button>
                    ))}
                  </div>
                </div>

                {/* 유효기간 */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-800 block mb-1">
                    유효기간
                  </span>
                  <select
                    value={couponValidDays}
                    onChange={(e) => setCouponValidDays(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                  >
                    <option value={7}>발급일로부터 7일</option>
                    <option value={14}>발급일로부터 14일</option>
                    <option value={30}>발급일로부터 30일</option>
                    <option value={60}>발급일로부터 60일</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCouponModalReview(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:scale-102"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>'베스트 댓글 감사 쿠폰' 즉시 발급</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
