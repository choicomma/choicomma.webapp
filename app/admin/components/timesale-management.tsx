"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Users,
  Clock,
  Trash2,
  Lock,
  Search,
  Check,
  ShoppingBag,
  Percent,
  Calendar,
  Eye,
  Tag,
  AlertCircle
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";

export interface SecretTimeSale {
  id: string;
  title: string;
  discountRate: number;
  productIds: string[];
  targetCustomerEmails: string[];
  targetGrades?: string[];
  durationHours: number;
  durationMinutes: number;
  status: "active" | "paused";
  createdAt: string;
}

interface TimesaleManagementProps {
  productsList?: any[];
  customersList?: any[];
  secretSalesList?: SecretTimeSale[];
  setSecretSalesList?: React.Dispatch<React.SetStateAction<SecretTimeSale[]>>;
  triggerToast?: (msg: string) => void;
}

export function TimesaleManagement({
  productsList = [],
  customersList = [],
  secretSalesList = [],
  setSecretSalesList,
  triggerToast = () => {},
}: TimesaleManagementProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSecretSale, setEditingSecretSale] = useState<SecretTimeSale | null>(null);

  // Form states for creating/editing secret time sale
  const [title, setTitle] = useState("");
  const [discountRate, setDiscountRate] = useState<number>(30);
  const [durationHours, setDurationHours] = useState<string>("24");
  const [durationMinutes, setDurationMinutes] = useState<string>("0");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCustomerEmails, setSelectedCustomerEmails] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  // Search filters inside modal
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerGradeFilter, setCustomerGradeFilter] = useState("all");

  const openCreateModal = () => {
    setTitle("[VIP 단독 시크릿] 2026 S/S 시즌 프라이빗 특가전");
    setDiscountRate(35);
    setDurationHours("24");
    setDurationMinutes("0");
    setSelectedProductIds([]);
    setSelectedCustomerEmails([]);
    setSelectedGrades(["VIP", "VVIP"]);
    setEditingSecretSale(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (sale: SecretTimeSale) => {
    setEditingSecretSale(sale);
    setTitle(sale.title);
    setDiscountRate(sale.discountRate);
    setDurationHours(String(sale.durationHours || 24));
    setDurationMinutes(String(sale.durationMinutes || 0));
    setSelectedProductIds(sale.productIds || []);
    setSelectedCustomerEmails(sale.targetCustomerEmails || []);
    setSelectedGrades(sale.targetGrades || []);
    setIsCreateModalOpen(true);
  };

  const handleSaveSecretSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("시크릿 타임세일 프로모션 명칭을 입력해주세요.");
      return;
    }
    if (selectedProductIds.length === 0) {
      alert("적용할 상품을 최소 1개 이상 선택해주세요.");
      return;
    }
    if (selectedCustomerEmails.length === 0 && selectedGrades.length === 0) {
      alert("노출 대상 회원 또는 대상 등급을 최소 1개 이상 지정해주세요.");
      return;
    }

    const newSale: SecretTimeSale = {
      id: editingSecretSale ? editingSecretSale.id : `SECRET-TS-${Date.now()}`,
      title: title.trim(),
      discountRate: Number(discountRate) || 30,
      productIds: selectedProductIds,
      targetCustomerEmails: selectedCustomerEmails,
      targetGrades: selectedGrades,
      durationHours: parseInt(durationHours, 10) || 24,
      durationMinutes: parseInt(durationMinutes, 10) || 0,
      status: editingSecretSale ? editingSecretSale.status : "active",
      createdAt: editingSecretSale ? editingSecretSale.createdAt : new Date().toISOString(),
    };

    if (setSecretSalesList) {
      if (editingSecretSale) {
        setSecretSalesList((prev) =>
          prev.map((item) => (item.id === editingSecretSale.id ? newSale : item))
        );
        triggerToast(`시크릿 타임세일 '${newSale.title}' 정보가 수정되었습니다.`);
      } else {
        setSecretSalesList((prev) => [newSale, ...prev]);
        triggerToast(`🤫 새로운 시크릿 타임세일 '${newSale.title}'이 개설되었습니다!`);
      }
    }

    setIsCreateModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    if (!setSecretSalesList) return;
    setSecretSalesList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "active" ? "paused" : "active";
          triggerToast(
            nextStatus === "active"
              ? `'${item.title}' 시크릿 세일이 활성화되었습니다.`
              : `'${item.title}' 시크릿 세일이 일시정지되었습니다.`
          );
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleDeleteSecretSale = (id: string) => {
    if (!window.confirm("정말로 해당 시크릿 타임세일 프로모션을 삭제하시겠습니까?")) return;
    if (setSecretSalesList) {
      setSecretSalesList((prev) => prev.filter((item) => item.id !== id));
      triggerToast("시크릿 타임세일이 삭제되었습니다.");
    }
  };

  // Helper toggle selections
  const toggleProduct = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const toggleCustomer = (email: string) => {
    setSelectedCustomerEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const filteredModalProducts = productsList.filter((p) => {
    if (p.categoryId === "main_banner" || String(p.id).startsWith("hero-slide-")) return false;
    const matchCat = productCategoryFilter === "all" || p.categoryId === productCategoryFilter;
    const matchQ =
      !productSearchQuery ||
      (p.title || "").toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      String(p.productNo || "").includes(productSearchQuery);
    return matchCat && matchQ;
  });

  const filteredModalCustomers = customersList.filter((c) => {
    const matchGrade = customerGradeFilter === "all" || c.grade === customerGradeFilter;
    const matchQ =
      !customerSearchQuery ||
      (c.name || "").toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.phone || "").includes(customerSearchQuery);
    return matchGrade && matchQ;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-neutral-900 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <Lock className="w-3 h-3 text-white" />
              SECRET TARGET PROMOTION
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-950">시크릿 타임세일 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            관리자가 직접 지정한 특정 회원(또는 VIP 등급)에게만 비밀스럽게 노출되는 단독 타깃 할인전입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-neutral-950 hover:bg-black text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 border border-neutral-800"
        >
          <Plus className="w-4 h-4 stroke-[3] text-white" />
          <span>새 시크릿 타임세일 개설</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>진행 중인 시크릿 세일</span>
            <Lock className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            {secretSalesList.filter((s) => s.status === "active").length} 개
          </p>
          <p className="text-xs text-neutral-500 mt-1">타깃 회원 전용 활성 프로모션</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>적용 상품 수</span>
            <ShoppingBag className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            {Array.from(new Set(secretSalesList.flatMap((s) => s.productIds || []))).length} 개
          </p>
          <p className="text-xs text-neutral-500 mt-1">시크릿 할인가 적용 상품</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>지정 대상 회원 수</span>
            <Users className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">
            {Array.from(new Set(secretSalesList.flatMap((s) => s.targetCustomerEmails || []))).length} 명
          </p>
          <p className="text-xs text-neutral-500 mt-1">개별 타깃 지정 회원</p>
        </div>
      </div>

      {/* Secret Sales List Cards */}
      <div className="space-y-4">
        {secretSalesList.length === 0 ? (
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900">개설된 시크릿 타임세일이 없습니다.</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              상단의 '새 시크릿 타임세일 개설' 버튼을 눌러 지정한 회원만을 위한 프라이빗 세일을 시작해보세요.
            </p>
          </div>
        ) : (
          secretSalesList.map((sale) => {
            const targetProducts = productsList.filter((p) => (sale.productIds || []).includes(p.id));
            const targetCustomers = customersList.filter((c) => (sale.targetCustomerEmails || []).includes(c.email));

            return (
              <div
                key={sale.id}
                className="bg-white border border-neutral-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Header of Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-neutral-900 text-white font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-neutral-800">
                        <Lock className="w-3 h-3 text-white" />
                        SECRET SALE {sale.discountRate}% OFF
                      </span>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          sale.status === "active"
                            ? "bg-neutral-100 text-neutral-900 border border-neutral-300"
                            : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                        }`}
                      >
                        {sale.status === "active" ? "● 진행중 (노출)" : "○ 일시정지"}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-neutral-950 mt-1">{sale.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(sale.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        sale.status === "active"
                          ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
                          : "bg-neutral-900 hover:bg-black text-white border-neutral-900"
                      }`}
                    >
                      {sale.status === "active" ? "세일 일시정지" : "세일 활성화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(sale)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors cursor-pointer"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSecretSale(sale.id)}
                      className="text-xs font-bold p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors cursor-pointer"
                      title="시크릿 세일 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Details: Target Customers & Target Products */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Column: Target Members */}
                  <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-neutral-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-neutral-900" />
                        노출 대상 회원 ({targetCustomers.length}명 직접 지정)
                      </span>
                      {sale.targetGrades && sale.targetGrades.length > 0 && (
                        <div className="flex items-center gap-1">
                          {sale.targetGrades.map((g) => (
                            <span key={g} className="text-[10px] font-black bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                              {g} 등급 전체
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {targetCustomers.length === 0 && (!sale.targetGrades || sale.targetGrades.length === 0) ? (
                        <span className="text-xs text-neutral-400">지정된 회원이 없습니다.</span>
                      ) : (
                        targetCustomers.map((cust) => (
                          <span
                            key={cust.id || cust.email}
                            className="bg-white border border-neutral-200 text-neutral-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                            {cust.name} ({cust.email})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Target Products */}
                  <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-neutral-800 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-neutral-900" />
                        시크릿 세일 적용 상품 ({targetProducts.length}개)
                      </span>
                      <span className="text-xs font-black text-neutral-900 font-mono">
                        {sale.discountRate}% 한정 특가
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-h-28">
                      {targetProducts.length === 0 ? (
                        <span className="text-xs text-neutral-400">지정된 상품이 없습니다.</span>
                      ) : (
                        targetProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white border border-neutral-200 p-1.5 rounded-xl flex items-center gap-2 shrink-0 shadow-2xs"
                          >
                            <img
                              src={prod.featuredImage?.url || "/product_1.webp"}
                              alt={prod.title}
                              className="w-8 h-10 object-cover rounded-lg bg-neutral-100 shrink-0"
                            />
                            <div className="max-w-[120px] truncate text-[11px] pr-1">
                              <p className="font-bold text-neutral-900 truncate">{prod.title}</p>
                              <p className="text-neutral-500 text-[10px] font-mono">
                                {formatPrice(prod.priceRange?.minVariantPrice?.amount || "0")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-black">
                  <Lock className="w-5 h-5 text-neutral-950" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingSecretSale ? "시크릿 타임세일 수정" : "새 시크릿 타임세일 개설"}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    지정된 회원에게만 단독 노출되는 프라이빗 타임세일을 설정합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSecretSale} className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-900">
              {/* 1. Title & Discount */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    시크릿 타임세일 프로모션 명칭 *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: [VIP 시크릿] 2026 S/S 시즌 프라이빗 40% 한정 특가"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-950 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      시크릿 할인율 (%) *
                    </label>
                    <div className="flex items-center gap-2">
                      {[20, 30, 35, 40, 50].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setDiscountRate(rate)}
                          className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            discountRate === rate
                              ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                              : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      세일 지속 시간 (타이머 카운트다운)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(e.target.value)}
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                      >
                        <option value="6">6시간</option>
                        <option value="12">12시간</option>
                        <option value="24">24시간 (하루)</option>
                        <option value="48">48시간 (2일)</option>
                        <option value="72">72시간 (3일)</option>
                        <option value="168">168시간 (1주일)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Target Grades Quick Filter */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <label className="block text-xs font-bold text-neutral-700">
                  🎯 대상 등급 일괄 지정 (선택)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {["VVIP", "VIP", "GOLD", "SILVER", "GENERAL"].map((grade) => {
                    const isChecked = selectedGrades.includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleGrade(grade)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{grade} 등급 전체</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Target Specific Customers (Direct Selection) */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700">
                    👤 특정 개별 회원 직접 지정 ({selectedCustomerEmails.length}명 선택됨)
                  </label>
                  <span className="text-[11px] text-neutral-500">회원 검색 후 클릭하여 추가</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="회원 이름, 이메일, 전화번호 검색..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>
                  <select
                    value={customerGradeFilter}
                    onChange={(e) => setCustomerGradeFilter(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  >
                    <option value="all">전체 등급</option>
                    <option value="VVIP">VVIP</option>
                    <option value="VIP">VIP</option>
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-2xl p-2 bg-neutral-50/50 space-y-1">
                  {filteredModalCustomers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-4">검색 결과가 없습니다.</p>
                  ) : (
                    filteredModalCustomers.map((cust) => {
                      const isSelected = selectedCustomerEmails.includes(cust.email);
                      return (
                        <div
                          key={cust.id || cust.email}
                          onClick={() => toggleCustomer(cust.email)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isSelected ? "bg-neutral-950 text-white font-bold" : "hover:bg-white bg-neutral-50 text-neutral-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                isSelected ? "bg-white text-neutral-950 border-white" : "bg-white border-neutral-300"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-extrabold">{cust.name}</span>
                            <span className={`font-mono text-[11px] truncate ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                              ({cust.email})
                            </span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${
                            isSelected ? "bg-neutral-800 text-white border-neutral-700" : "bg-white text-neutral-800 border-neutral-200"
                          }`}>
                            {cust.grade || "GENERAL"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Target Products Selection */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700">
                    🛍️ 시크릿 할인 적용 상품 선택 ({selectedProductIds.length}개 선택됨) *
                  </label>
                  <span className="text-[11px] text-neutral-500">상품 클릭하여 추가 / 해제</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="상품명 또는 상품번호 검색..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  >
                    <option value="all">전체 카테고리</option>
                    <option value="outer">Outer</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="bag">Bag</option>
                    <option value="shoes">Shoes</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-2xl p-2 bg-neutral-50/50 space-y-1">
                  {filteredModalProducts.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-4">등록 가능한 상품이 없습니다.</p>
                  ) : (
                    filteredModalProducts.map((prod) => {
                      const isSelected = selectedProductIds.includes(prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => toggleProduct(prod.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isSelected ? "bg-neutral-950 text-white font-bold" : "hover:bg-white bg-neutral-50 text-neutral-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                                isSelected ? "bg-white text-neutral-950 border-white" : "bg-white border-neutral-300"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <img
                              src={prod.featuredImage?.url || "/product_1.webp"}
                              alt={prod.title}
                              className="w-7 h-9 object-cover rounded bg-neutral-200 shrink-0"
                            />
                            <div className="truncate min-w-0">
                              <p className="font-extrabold truncate">{prod.title}</p>
                              <p className={`text-[10px] font-mono ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                                정가: {formatPrice(prod.priceRange?.minVariantPrice?.amount || "0")}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ml-2 ${
                            isSelected ? "bg-neutral-800 text-white border-neutral-700" : "bg-white text-neutral-500 border-neutral-200"
                          }`}>
                            {prod.categoryId}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white text-xs font-extrabold shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  {editingSecretSale ? "시크릿 세일 수정 완료" : "시크릿 타임세일 생성하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
