"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Truck,
  Building2,
  Phone,
  Mail,
  Clock,
  Save,
  RotateCcw,
  CheckCircle2,
  FolderGit2,
  ArrowRight,
  PackageCheck,
} from "lucide-react";

interface StoreSettingsManagementProps {
  triggerToast: (msg: string) => void;
  onNavigateGitData?: () => void;
}

interface StoreInfo {
  storeName: string;
  storeSlogan: string;
  adminId: string;
  csPhone: string;
  csEmail: string;
  currency: string;
  operatingHours: string;
}

interface ShippingPolicy {
  defaultShippingFee: number;
  freeShippingThreshold: number;
  remoteAreaFee: number;
  returnShippingFee: number;
}

interface CjLogisticsInfo {
  clientCode: string;
  contractNo: string;
  senderName: string;
  senderTel: string;
  senderZip: string;
  senderAddr1: string;
  senderAddr2: string;
}

const DEFAULT_STORE_INFO: StoreInfo = {
  storeName: "choicomma",
  storeSlogan: "CONTEMPORARY SIGNATURE FASHION",
  adminId: "admin",
  csPhone: "02-579-1171",
  csEmail: "help@choicomma.com",
  currency: "KRW (₩)",
  operatingHours: "평일 10:00 ~ 18:00 (점심 12:30 ~ 13:30 / 주말·공휴일 휴무)",
};

const DEFAULT_SHIPPING_POLICY: ShippingPolicy = {
  defaultShippingFee: 3000,
  freeShippingThreshold: 50000,
  remoteAreaFee: 3000,
  returnShippingFee: 6000,
};

const DEFAULT_CJ_LOGISTICS: CjLogisticsInfo = {
  clientCode: "choicomma",
  contractNo: "7108803854",
  senderName: "주식회사 초이콤마",
  senderTel: "02-579-1171",
  senderZip: "06307",
  senderAddr1: "서울특별시 강남구 개포로22길 12",
  senderAddr2: "6층(개포동)",
};

export function StoreSettingsManagement({
  triggerToast,
  onNavigateGitData,
}: StoreSettingsManagementProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // States
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE_INFO);
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy>(DEFAULT_SHIPPING_POLICY);
  const [cjLogistics, setCjLogistics] = useState<CjLogisticsInfo>(DEFAULT_CJ_LOGISTICS);

  // Fetch from /api/admin/site-settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/site-settings", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.store_info) {
              setStoreInfo((prev) => ({ ...prev, ...s.store_info }));
            }
            if (s.shipping_policy) {
              setShippingPolicy((prev) => ({
                defaultShippingFee: typeof s.shipping_policy.defaultShippingFee === "number" ? s.shipping_policy.defaultShippingFee : 3000,
                freeShippingThreshold: typeof s.shipping_policy.freeShippingThreshold === "number" ? s.shipping_policy.freeShippingThreshold : 50000,
                remoteAreaFee: typeof s.shipping_policy.remoteAreaFee === "number" ? s.shipping_policy.remoteAreaFee : 3000,
                returnShippingFee: typeof s.shipping_policy.returnShippingFee === "number" ? s.shipping_policy.returnShippingFee : 6000,
              }));
            }
            if (s.cj_logistics) {
              setCjLogistics((prev) => ({ ...prev, ...s.cj_logistics }));
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load site settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        store_info: storeInfo,
        shipping_policy: shippingPolicy,
        cj_logistics: cjLogistics,
      };

      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSavedSuccess(true);
        triggerToast("스토어 운영 및 배송 물류 설정이 안전하게 저장되었습니다.");

        // Dispatch events so storefront and admin components synchronize
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("site_settings_updated"));
          window.dispatchEvent(new CustomEvent("storage"));
        }

        setTimeout(() => setSavedSuccess(false), 3500);
      } else {
        throw new Error("설정 저장에 실패했습니다.");
      }
    } catch (err: any) {
      alert(`저장 오류: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("스토어 운영 설정을 초기 기본값으로 되돌리시겠습니까?")) {
      setStoreInfo(DEFAULT_STORE_INFO);
      setShippingPolicy(DEFAULT_SHIPPING_POLICY);
      setCjLogistics(DEFAULT_CJ_LOGISTICS);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neutral-900 text-white rounded-2xl shadow-sm shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-950 flex items-center gap-2">
              <span>스토어 및 물류 설정</span>
              <span className="text-xs bg-neutral-900 text-white font-bold px-2.5 py-0.5 rounded-full">
                Store Operations
              </span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-500 mt-1">
              초이콤마 브랜드 기본 운영 정보, 배송비 정책 및 CJ대한통운 물류 계약 정보를 관리합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-neutral-950 hover:bg-neutral-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "저장 중..." : "설정 저장하기"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>스토어 설정이 data/site-settings.json 파일에 안전하게 원자적 저장되었습니다.</span>
        </div>
      )}

      {/* Section 1: Store General Profile */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-700" />
            <h2 className="text-base font-extrabold text-neutral-950">스토어 기본 운영 정보</h2>
          </div>
          <span className="text-[11px] font-bold text-neutral-400">
            data/site-settings.json (store_info)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              스토어명 (Brand Name)
            </label>
            <input
              type="text"
              value={storeInfo.storeName}
              onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              브랜드 슬로건
            </label>
            <input
              type="text"
              value={storeInfo.storeSlogan}
              onChange={(e) => setStoreInfo({ ...storeInfo, storeSlogan: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              대표 관리자 계정 ID
            </label>
            <input
              type="text"
              value={storeInfo.adminId}
              onChange={(e) => setStoreInfo({ ...storeInfo, adminId: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              기본 결제 통화 (Currency)
            </label>
            <input
              type="text"
              value={storeInfo.currency}
              disabled
              className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              고객센터 대표 전화 (CS Phone)
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={storeInfo.csPhone}
                onChange={(e) => setStoreInfo({ ...storeInfo, csPhone: e.target.value })}
                className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              고객센터 공식 이메일 (CS Email)
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={storeInfo.csEmail}
                onChange={(e) => setStoreInfo({ ...storeInfo, csEmail: e.target.value })}
                className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              고객센터 운영 시간 안내
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={storeInfo.operatingHours}
                onChange={(e) => setStoreInfo({ ...storeInfo, operatingHours: e.target.value })}
                className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Shipping Policy Settings */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-extrabold text-neutral-950">배송비 정책 설정</h2>
          </div>
          <span className="text-[11px] font-bold text-neutral-400">
            data/site-settings.json (shipping_policy)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2">
            <label className="text-xs font-bold text-neutral-700 block">기본 배송비</label>
            <div className="relative">
              <input
                type="number"
                step="500"
                value={shippingPolicy.defaultShippingFee}
                onChange={(e) => setShippingPolicy({ ...shippingPolicy, defaultShippingFee: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">원</span>
            </div>
            <p className="text-[10px] text-neutral-500">일반 주문 시 부과 기본 배송료</p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-2">
            <label className="text-xs font-extrabold text-emerald-900 block">무료 배송 기준액</label>
            <div className="relative">
              <input
                type="number"
                step="5000"
                value={shippingPolicy.freeShippingThreshold}
                onChange={(e) => setShippingPolicy({ ...shippingPolicy, freeShippingThreshold: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">원</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-bold">이 금액 이상 주문 시 배송비 무료</p>
          </div>

          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2">
            <label className="text-xs font-bold text-neutral-700 block">도서산간/제주 추가비</label>
            <div className="relative">
              <input
                type="number"
                step="500"
                value={shippingPolicy.remoteAreaFee}
                onChange={(e) => setShippingPolicy({ ...shippingPolicy, remoteAreaFee: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">원</span>
            </div>
            <p className="text-[10px] text-neutral-500">도서산간 배송 시 추가 가산료</p>
          </div>

          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2">
            <label className="text-xs font-bold text-neutral-700 block">반품/교환 배송비</label>
            <div className="relative">
              <input
                type="number"
                step="500"
                value={shippingPolicy.returnShippingFee}
                onChange={(e) => setShippingPolicy({ ...shippingPolicy, returnShippingFee: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">원</span>
            </div>
            <p className="text-[10px] text-neutral-500">단순변심 교환/반품 시 청구 기준</p>
          </div>
        </div>
      </div>

      {/* Section 3: CJ Logistics Shipping Contract Details */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-600" />
            <h2 className="text-base font-extrabold text-neutral-950">CJ대한통운 물류 계약 정보</h2>
          </div>
          <span className="text-[11px] font-bold text-neutral-400">
            data/site-settings.json (cj_logistics)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              CJ대한통운 고객사 코드 (Client Code)
            </label>
            <input
              type="text"
              value={cjLogistics.clientCode}
              onChange={(e) => setCjLogistics({ ...cjLogistics, clientCode: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 font-mono focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              계약 번호 (Contract No)
            </label>
            <input
              type="text"
              value={cjLogistics.contractNo}
              onChange={(e) => setCjLogistics({ ...cjLogistics, contractNo: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 font-mono focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              발송인 상호 (Sender Name)
            </label>
            <input
              type="text"
              value={cjLogistics.senderName}
              onChange={(e) => setCjLogistics({ ...cjLogistics, senderName: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              발송인 대표 전화번호 (Sender Tel)
            </label>
            <input
              type="text"
              value={cjLogistics.senderTel}
              onChange={(e) => setCjLogistics({ ...cjLogistics, senderTel: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              발송인 우편번호 (Sender Zip)
            </label>
            <input
              type="text"
              value={cjLogistics.senderZip}
              onChange={(e) => setCjLogistics({ ...cjLogistics, senderZip: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 font-mono focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              발송지 기본 주소 (Address 1)
            </label>
            <input
              type="text"
              value={cjLogistics.senderAddr1}
              onChange={(e) => setCjLogistics({ ...cjLogistics, senderAddr1: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              발송지 상세 주소 (Address 2)
            </label>
            <input
              type="text"
              value={cjLogistics.senderAddr2}
              onChange={(e) => setCjLogistics({ ...cjLogistics, senderAddr2: e.target.value })}
              className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Git Data Ledger Integration Shortcut */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-extrabold flex items-center gap-2">
              <span>Git 데이터 원장 통합 관제 센터</span>
              <span className="text-[10px] bg-emerald-500 text-neutral-950 font-black px-2 py-0.5 rounded-full">
                12개 원장 100% 정상
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              카탈로그, 주문, 배송, 회원, 쿠폰 등 전체 원장의 상태 검사, 단일/일괄 JSON 백업 및 복원을 진행합니다.
            </p>
          </div>
        </div>

        {onNavigateGitData && (
          <button
            type="button"
            onClick={onNavigateGitData}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer shrink-0 self-start sm:self-center"
          >
            <span>원장 관제 바로가기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
