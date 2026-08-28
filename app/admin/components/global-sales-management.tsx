"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  DollarSign,
  Percent,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Calculator,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import {
  GlobalSalesSettings,
  DEFAULT_GLOBAL_SETTINGS,
  getGlobalSalesSettings,
  saveGlobalSalesSettings,
  formatCurrencyWithTariff,
  fetchLatestLiveExchangeRates,
} from "@/lib/currency/currency-service";

export function GlobalSalesManagement() {
  const [settings, setSettings] = useState<GlobalSalesSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testKrwAmount, setTestKrwAmount] = useState<number>(100000);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState("");

  // Temporary input state for tariff rate
  const [tempTariffInput, setTempTariffInput] = useState<number>(30);
  // Modal confirm state for '관세 비율을 변경하시겠습니까?'
  const [pendingTariffConfirm, setPendingTariffConfirm] = useState<number | null>(null);

  useEffect(() => {
    const saved = getGlobalSalesSettings();
    setSettings(saved);
    setTempTariffInput(saved.tariffRatePercent || 30);
    if (saved.lastSyncTime) {
      setApiSuccessMsg(`실시간 자동동기화 완료 (${saved.lastSyncTime})`);
    }

    const doFetchRates = () => {
      setIsFetchingRates(true);
      fetchLatestLiveExchangeRates()
        .then((liveRates) => {
          if (liveRates) {
            const now = new Date();
            const syncTimestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:00`;
            const updated: GlobalSalesSettings = {
              ...saved,
              lastSyncTime: syncTimestamp,
              exchangeRates: liveRates,
            };
            setSettings(updated);
            saveGlobalSalesSettings(updated);
            setApiSuccessMsg(`실시간 자동동기화 완료 (${syncTimestamp})`);
          }
        })
        .catch((err) => console.error("Auto exchange rate error:", err))
        .finally(() => setIsFetchingRates(false));
    };

    // Initial fetch on mount
    doFetchRates();

    // 1-hour (60 minutes) periodic auto-sync interval
    const interval = setInterval(doFetchRates, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    saveGlobalSalesSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRequestTariffChange = (newVal: number) => {
    if (newVal === settings.tariffRatePercent) return;
    setPendingTariffConfirm(newVal);
  };

  const handleConfirmTariffChange = () => {
    if (pendingTariffConfirm === null) return;
    const updated: GlobalSalesSettings = {
      ...settings,
      tariffRatePercent: pendingTariffConfirm,
    };
    setSettings(updated);
    saveGlobalSalesSettings(updated);
    setPendingTariffConfirm(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCancelTariffChange = () => {
    setTempTariffInput(settings.tariffRatePercent);
    setPendingTariffConfirm(null);
  };

  const handleFetchLiveRates = async () => {
    try {
      setIsFetchingRates(true);
      const liveRates = await fetchLatestLiveExchangeRates();
      if (liveRates) {
        setSettings((prev) => ({
          ...prev,
          exchangeRates: liveRates,
        }));
        setApiSuccessMsg("오픈 환율 API에서 실시간 최신 환율 정보를 성공적으로 가져왔습니다!");
        setTimeout(() => setApiSuccessMsg(""), 3500);
      } else {
        alert("환율 정보를 가져오지 못했습니다. 네트워크 상태를 확인해 주세요.");
      }
    } catch (err) {
      console.error(err);
      alert("환율 정보 가져오기 실패");
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleReset = () => {
    if (confirm("해외 판매 및 환율 설정을 기본값(관세 30%)으로 초기화하시겠습니까?")) {
      setSettings(DEFAULT_GLOBAL_SETTINGS);
      saveGlobalSalesSettings(DEFAULT_GLOBAL_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
              <span>해외 판매가</span>
              <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">
                Global Commerce
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              해외 고객 결제 시 적용되는 **관세/해외비율** 및 **통화별 환율**을 자유롭게 조정합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>설정 저장하기</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {savedSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>해외 판매가 및 환율 설정이 성공적으로 저장되었습니다! 사이트 전체에 즉시 반영됩니다.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customs Tariff & Exchange Rate Settings (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Customs Tariff / Overseas Markup Rate */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-bold text-neutral-950">관세 및 해외 부가비율 설정</h2>
              </div>
              <span className="text-xs font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
                현재 {settings.tariffRatePercent}% 적용 중
              </span>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              원화(KRW) 판매가 대비 해외 국가 선택 시 가산할 **관세 / 통관비 / 해외 배송 부가 비율**을 입력합니다. (예: 30% 설정 시 원가의 1.30배로 자동 산정)
            </p>

            <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60">
              <label className="text-xs font-extrabold text-neutral-800 shrink-0">관세비율 (%)</label>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={tempTariffInput}
                  onChange={(e) => setTempTariffInput(parseFloat(e.target.value) || 0)}
                  onBlur={(e) => handleRequestTariffChange(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRequestTariffChange(tempTariffInput);
                    }
                  }}
                  className="w-full bg-white border border-neutral-300 font-mono font-bold text-neutral-950 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Currency Exchange Rates */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-neutral-950">국가별 기준 환율 설정 (1 외화 당 KRW)</h2>
              </div>

            </div>

            {apiSuccessMsg && (
              <div className="p-3 bg-sky-50 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{apiSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* USD */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇺🇸 미국 달러 (USD)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">$</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.USD.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / $</span>
                </div>
              </div>

              {/* JPY */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇯🇵 일본 엔화 (JPY)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">¥</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.JPY.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / ¥</span>
                </div>
              </div>

              {/* CNY */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇨🇳 중국 위안화 (CNY)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">¥ (CNY)</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.CNY.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / ¥</span>
                </div>
              </div>

              {/* EUR */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇪🇺 유럽 유로화 (EUR)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">€</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.EUR.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / €</span>
                </div>
              </div>

              {/* VND */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇻🇳 베트남 동 (VND)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">₫</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.VND.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / ₫</span>
                </div>
              </div>

              {/* THB */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span>🇹🇭 태국 바트 (THB)</span>
                  <span className="text-[10px] text-neutral-400 font-mono">฿</span>
                </div>
                <div className="flex items-center justify-between bg-neutral-100/90 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-neutral-900">
                  <span>{settings.exchangeRates.THB.toLocaleString()}</span>
                  <span className="text-[11px] font-sans font-bold text-neutral-500">원 / ฿</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Price Conversion Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-neutral-800">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-800">
              <div className="p-2 bg-sky-500 text-neutral-950 rounded-xl">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">실시간 해외 판매가 환산 시뮬레이터</h3>
                <p className="text-[11px] text-neutral-400">원화 기준 가격 입력 시 국가별 자동 환산액</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-bold">테스트 원화(KRW) 금액</label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  value={testKrwAmount}
                  onChange={(e) => setTestKrwAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-800 border border-neutral-700 font-mono font-extrabold text-white px-3.5 py-2.5 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-sky-400 pr-12"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                  원
                </span>
              </div>
            </div>

            {/* Calculated Results Box */}
            <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <div className="text-[11px] text-neutral-400 font-bold flex items-center justify-between pb-2 border-b border-neutral-800">
                <span>언어 / 통화</span>
                <span>적용 관세: +{settings.tariffRatePercent}%</span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                {/* KRW */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                  <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                    <span>🇰🇷</span>
                    <span>한국어 (KRW)</span>
                  </span>
                  <span className="font-extrabold text-white">
                    {formatCurrencyWithTariff(testKrwAmount, "ko", settings)}
                  </span>
                </div>

                {/* USD */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                  <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                    <span>🇺🇸</span>
                    <span>English (USD)</span>
                  </span>
                  <span className="font-extrabold text-sky-400">
                    {formatCurrencyWithTariff(testKrwAmount, "en", settings)}
                  </span>
                </div>

                {/* JPY */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                  <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                    <span>🇯🇵</span>
                    <span>日本語 (JPY)</span>
                  </span>
                  <span className="font-extrabold text-emerald-400">
                    {formatCurrencyWithTariff(testKrwAmount, "ja", settings)}
                  </span>
                </div>

                {/* CNY */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                  <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                    <span>🇨🇳</span>
                    <span>中文 (CNY)</span>
                  </span>
                  <span className="font-extrabold text-amber-400">
                    {formatCurrencyWithTariff(testKrwAmount, "zh-CN", settings)}
                  </span>
                </div>

                {/* EUR */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                    <span>🇪🇺</span>
                    <span>유럽 (EUR)</span>
                  </span>
                  <span className="font-extrabold text-purple-400">
                    {formatCurrencyWithTariff(testKrwAmount, "es", settings)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-neutral-400 leading-normal pt-2 border-t border-neutral-800">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                상단 [설정 저장하기] 버튼을 누르시면 메인 쇼핑몰에서 언어 전환 시 설정된 관세 비율과 환율에 따라 자동 표시됩니다.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION PROMPT DIALOG: 관세 마크업 비율 변경 확인 팝업 */}
      {/* ========================================================================= */}
      {pendingTariffConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 notranslate" translate="no">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-950">관세 마크업 비율을 변경하시겠습니까?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                설정하신 관세 비율이 해외 판매가 계산에 즉시 적용됩니다.
              </p>
              <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-mono font-bold text-neutral-900 flex items-center justify-center gap-2">
                <span className="text-neutral-500">기존 {settings.tariffRatePercent}%</span>
                <span className="text-sky-600 font-extrabold">➔</span>
                <span className="text-sky-600 font-black text-sm">변경 {pendingTariffConfirm}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelTariffChange}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all border border-neutral-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmTariffChange}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all shadow-md"
              >
                네, 변경합니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
