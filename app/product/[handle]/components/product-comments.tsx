"use client";

import React, { useState, useEffect } from "react";
import { getCurrentLanguage } from "@/lib/i18n/translation";

interface CommentItem {
  id: string;
  author: string;
  content: string;
  rating: number;
  createdAt: string;
}

interface ProductCommentsProps {
  productId: string;
  productTitle: string;
}

const COMMENTS_I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "상품 문의 및 한줄 댓글",
    count: "개의 댓글",
    placeholder: "상품에 대한 궁금한 점이나 착용 후기를 자유롭게 남겨주세요.",
    namePlaceholder: "작성자명 (미입력 시 고객님)",
    submit: "댓글 등록",
    empty: "작성된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!",
    delete: "삭제",
    rating: "평점",
  },
  en: {
    title: "Comments & Inquiries",
    count: "comments",
    placeholder: "Leave your question or feedback about this product.",
    namePlaceholder: "Your Name",
    submit: "Post Comment",
    empty: "No comments yet. Be the first to leave a comment!",
    delete: "Delete",
    rating: "Rating",
  },
  ja: {
    title: "商品のお問い合わせ・コメント",
    count: "件のコメント",
    placeholder: "商品についてのご質問やご感想をご自由にご記入ください。",
    namePlaceholder: "お名前",
    submit: "投稿する",
    empty: "まだコメントがありません。最初のコメントを投稿してみましょう！",
    delete: "削除",
    rating: "評価",
  },
  zh: {
    title: "商品咨询与留言",
    count: "条留言",
    placeholder: "欢迎留下关于商品的疑问或穿着体验。",
    namePlaceholder: "您的姓名",
    submit: "提交留言",
    empty: "暂无留言，快来抢先留下第一条吧！",
    delete: "删除",
    rating: "评分",
  },
  fr: {
    title: "Commentaires & Questions",
    count: "commentaires",
    placeholder: "Laissez vos questions ou avis sur ce produit.",
    namePlaceholder: "Votre nom",
    submit: "Publier",
    empty: "Aucun commentaire pour le moment. Soyez le premier à commenter !",
    delete: "Supprimer",
    rating: "Note",
  },
};

const DEFAULT_COMMENTS: CommentItem[] = [];

export function ProductComments({ productId, productTitle }: ProductCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [currentLang, setCurrentLang] = useState("ko");

  const storageKey = `choicomma_product_comments_${productId}`;

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Remove mock/dummy comments
            const cleaned = parsed.filter(
              (c: any) => !["cmt-1", "cmt-2", "cmt-3", "cmt-4"].includes(c?.id)
            );
            setComments(cleaned);
            localStorage.setItem(storageKey, JSON.stringify(cleaned));
          } else {
            setComments([]);
            localStorage.setItem(storageKey, JSON.stringify([]));
          }
        } else {
          setComments([]);
          localStorage.setItem(storageKey, JSON.stringify([]));
        }
      } catch (e) {
        setComments([]);
      }
    }
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newComment: CommentItem = {
      id: `cmt-${Date.now()}`,
      author: author.trim() || "고객님",
      content: content.trim(),
      rating: rating,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    setContent("");
    setAuthor("");
  };

  const handleDelete = (id: string) => {
    const confirmMsg =
      currentLang === "en"
        ? "Are you sure you want to delete this comment?"
        : currentLang === "ja"
        ? "このコメントを削除しますか？"
        : currentLang === "zh"
        ? "您确定要删除这条留言吗？"
        : currentLang === "fr"
        ? "Voulez-vous vraiment supprimer ce commentaire ?"
        : "댓글을 삭제하시겠습니까?";

    if (window.confirm(confirmMsg)) {
      const updated = comments.filter((c) => c.id !== id);
      setComments(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    }
  };

  const t = COMMENTS_I18N[currentLang] || COMMENTS_I18N.ko;

  return (
    <div className="w-full mt-4 pt-4 border-t border-neutral-200/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-neutral-950">
          {t.title}
        </h3>
        <span className="text-xs font-bold text-neutral-500 font-mono">
          {comments.length} {t.count}
        </span>
      </div>

      {/* Comment Input Box */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={t.namePlaceholder}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-40 px-3 py-2 text-xs border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-950 bg-white"
          />
          <div className="flex items-center gap-1 text-xs text-neutral-700 ml-auto">
            <span className="text-[11px] font-bold text-neutral-500 mr-1">{t.rating}</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-sm cursor-pointer transition-colors ${
                  star <= rating ? "text-neutral-950 font-black" : "text-neutral-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            placeholder={t.placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 text-xs border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-950 bg-white resize-none text-neutral-900 placeholder:text-neutral-400"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim()}
            className="px-4 py-2 bg-black hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
          >
            {t.submit}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-6 border border-dashed border-neutral-200 rounded-sm">
            {t.empty}
          </p>
        ) : (
          comments.map((cmt) => (
            <div
              key={cmt.id}
              className="p-3.5 bg-neutral-50/70 border border-neutral-200/70 rounded-sm space-y-1.5 transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-neutral-950">{cmt.author}</span>
                  <span className="text-neutral-900 text-[11px] tracking-tight">
                    {"★".repeat(cmt.rating)}
                    {"☆".repeat(5 - cmt.rating)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-neutral-400">{cmt.createdAt}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(cmt.id)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
              <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
                {cmt.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
