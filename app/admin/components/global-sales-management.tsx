"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Percent,
  RefreshCw,
  Save,
  CheckCircle2,
  Calculator,
  SlidersHorizontal,
  Info,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  GlobalSalesSettings,
  DEFAULT_GLOBAL_SETTINGS,
  getGlobalSalesSettings,
  saveGlobalSalesSettings,
  formatCurrencyWithTariff,
  fetchLatestLiveExchangeRates,
} from "@/lib/currency/currency-service";

interface CurrencyConfig {
  key: keyof GlobalSalesSettings["exchangeRates"];
  name: string;
  flag: string;
  symbol: string;
  unit: string;
  step: string;
  desc: string;
  defaultVal: number;
}

const CURRENCY_CONFIGS: CurrencyConfig[] = [
  { key: "USD", name: "미국 달러", flag: "🇺🇸", symbol: "$", unit: "원 / $", step: "1", desc: "글로벌 기축통화 (USD)", defaultVal: 1350 },
  { key: "JPY", name: "일본 엔화", flag: "🇯🇵", symbol: "¥", unit: "원 / ¥", step: "0.01", desc: "1엔 당 KRW (100엔 환산 기준)", defaultVal: 9.0 },
  { key: "CNY", name: "중국 위안화", flag: "🇨🇳", symbol: "¥", unit: "원 / ¥", step: "0.1", desc: "중국 위안 (CNY)", defaultVal: 185 },
  { key: "EUR", name: "유럽 유로화", flag: "🇪🇺", symbol: "€", unit: "원 / €", step: "1", desc: "유로존 단일통화 (EUR)", defaultVal: 1470 },
  { key: "VND", name: "베트남 동", flag: "🇻🇳", symbol: "₫", unit: "원 / ₫", step: "0.001", desc: "베트남 동 (10,000동 = ~550원)", defaultVal: 0.055 },
  { key: "THB", name: "태국 바트", flag: "🇹🇭", symbol: "฿", unit: "원 / ฿", step: "0.1", desc: "태국 바트 (THB)", defaultVal: 38 },
  { key: "IDR", name: "인도네시아 루피아", flag: "🇮🇩", symbol: "Rp", unit: "원 / Rp", step: "0.001", desc: "인도네시아 루피아 (10,000Rp = ~850원)", defaultVal: 0.085 },
];

const SIMULATOR_LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷", curr: "KRW", isBase: true },
  { code: "en", name: "English", flag: "🇺🇸", curr: "USD", isBase: false },
  { code: "ja", name: "日本語", flag: "🇯🇵", curr: "JPY", isBase: false },
  { code: "zh-CN", name: "中文 (简体)", flag: "🇨🇳", curr: "CNY", isBase: false },
  { code: "es", name: "Español / Europe", flag: "🇪🇺", curr: "EUR", isBase: false },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳", curr: "VND", isBase: false },
  { code: "th", name: "ไทย", flag: "🇹🇭", curr: "THB", isBase: false },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩", curr: "IDR", isBase: false },
];

const TARIFF_PRESETS = [0, 10, 20, 30, 40, 50];
const TEST_PRICE_PRESETS = [30000, 50000, 100000, 250000, 500000];

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
      setApiSuccessMsg(`실시간 동기화 완료 (${saved.lastSyncTime})`);
    }

    const doFetchRates = () => {
      setIsFetchingRates(true);
      fetchLatestLiveExchangeRates()
        .then((liveRates) => {
          if (liveRates) {
            const now = new Date();
            const syncTimestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:00`;
            const current = getGlobalSalesSettings();
            const updated: GlobalSalesSettings = {
              ...current,
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

    // 1-hour periodic auto-sync
    const interval = setInterval(doFetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    saveGlobalSalesSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUpdateExchangeRate = (key: keyof GlobalSalesSettings["exchangeRates"], value: number) => {
    if (isNaN(value) || value <= 0) return;
    setSettings((prev) => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [key]: value,
      },
    }));
  };

  const handleResetCurrencyRate = (key: keyof GlobalSalesSettings["exchangeRates"], defaultVal: number) => {
    setSettings((prev) => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [key]: defaultVal,
      },
    }));
  };

  const handleQuickTariffSelect = (percent: number) => {
    setTempTariffInput(percent);
    setSettings((prev) => ({
      ...prev,
      tariffRatePercent: percent,
    }));
  };

  const handleRequestTariffChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(200, newVal));
    if (clamped === settings.tariffRatePercent) return;
    setPendingTariffConfirm(clamped);
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
        const now = new Date();
        const syncTimestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const updated: GlobalSalesSettings = {
          ...settings,
          lastSyncTime: syncTimestamp,
          exchangeRates: liveRates,
        };
        setSettings(updated);
        saveGlobalSalesSettings(updated);
        setApiSuccessMsg(`실시간 최신 환율 정보를 성공적으로 동기화했습니다! (${syncTimestamp})`);
        setTimeout(() => setApiSuccessMsg(""), 4000);
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
    if (confirm("해외 판매 및 환율 설정을 시스템 기본값(관세 30% 및 표준 환율)으로 초기화하시겠습니까?")) {
      setSettings(DEFAULT_GLOBAL_SETTINGS);
      setTempTariffInput(DEFAULT_GLOBAL_SETTINGS.tariffRatePercent);
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
          <div className="p-3.5 bg-neutral-900 text-white rounded-2xl shadow-sm shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
              <span>글로벌 판매가 및 환율 관리</span>
              <span className="text-xs bg-amber-400 text-neutral-950 font-black px-2.5 py-0.5 rounded-full">
                Global Commerce
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              해외 고객 결제 시 적용되는 **관세/해외비율** 및 **통화별 기준 환율**을 실시간 연동하고 자유롭게 조정합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 transition-all cursor-pointer"
            title="기본 설정으로 복원"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>

          <button
            type="button"
            disabled={isFetchingRates}
            onClick={handleFetchLiveRates}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRates ? "animate-spin" : ""}`} />
            <span>{isFetchingRates ? "환율 동기화 중..." : "실시간 환율 동기화"}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-neutral-950 hover:bg-neutral-800 shadow-md transition-all cursor-pointer"
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
        {/* Left Column: Customs Tariff & Exchange Rate Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Customs Tariff / Overseas Markup Rate */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-bold text-neutral-950">관세 및 해외 부가비율 설정</h2>
              </div>
              <span className="text-xs font-black text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-xl">
                현재 +{settings.tariffRatePercent}% 적용 중
              </span>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              원화(KRW) 판매가 대비 해외 국가 선택 시 가산할 **관세 / 통관비 / 해외 배송 부가 비율**을 입력합니다. (예: 30% 설정 시 원가의 1.30배로 자동 산정)
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider block">
                추천 관세 비율 프리셋
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {TARIFF_PRESETS.map((p) => {
                  const isSelected = settings.tariffRatePercent === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleQuickTariffSelect(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-neutral-950 text-white shadow-xs"
                          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {p === 0 ? "0% (무관세)" : p === 30 ? "30% (표준 권장)" : `+${p}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider + Input Box */}
            <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-neutral-800">
                  직접 입력 및 슬라이더 조절
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={tempTariffInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTempTariffInput(val);
                      setSettings((prev) => ({ ...prev, tariffRatePercent: val }));
                    }}
                    onBlur={(e) => handleRequestTariffChange(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRequestTariffChange(tempTariffInput);
                      }
                    }}
                    className="w-full bg-white border border-neutral-300 font-mono font-bold text-neutral-950 px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    %
                  </span>
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.tariffRatePercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTempTariffInput(val);
                  setSettings((prev) => ({ ...prev, tariffRatePercent: val }));
                }}
                className="w-full accent-sky-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span>0% (원가 환산)</span>
                <span className="font-sans font-bold text-sky-700">
                  가산 배율: ×{(1 + settings.tariffRatePercent / 100).toFixed(2)}배
                </span>
                <span>100% (2배 환산)</span>
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFetchingRates}
                  onClick={handleFetchLiveRates}
                  className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingRates ? "animate-spin" : ""}`} />
                  <span>환율 새로고침</span>
                </button>
              </div>
            </div>

            {apiSuccessMsg && (
              <div className="p-3 bg-sky-50 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{apiSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CURRENCY_CONFIGS.map((cfg) => {
                const currentVal = settings.exchangeRates[cfg.key];
                const isModified = currentVal !== cfg.defaultVal;

                return (
                  <div
                    key={cfg.key}
                    className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <span>{cfg.flag}</span>
                        <span>{cfg.name} ({cfg.key})</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleResetCurrencyRate(cfg.key, cfg.defaultVal)}
                            className="text-[10px] text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer"
                            title={`기본값(${cfg.defaultVal})으로 복원`}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[10px] text-neutral-400 font-mono">{cfg.symbol}</span>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step={cfg.step}
                        min="0.001"
                        value={currentVal}
                        onChange={(e) => handleUpdateExchangeRate(cfg.key, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl px-3 py-2 text-xs font-mono font-black text-neutral-900 focus:outline-none transition-colors pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-sans font-bold text-neutral-400 pointer-events-none">
                        {cfg.unit}
                      </span>
                    </div>

                    <p className="text-[10px] text-neutral-400 leading-tight">
                      {cfg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Price Conversion Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl space-y-5 border border-neutral-800">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-800">
              <div className="p-2 bg-amber-400 text-neutral-950 rounded-xl shadow-xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">실시간 해외 판매가 환산 시뮬레이터</h3>
                <p className="text-[11px] text-neutral-400">원화 기준 가격 입력 시 국가별 자동 환산액</p>
              </div>
            </div>

            {/* Test Amount Input */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-bold block">테스트 원화(KRW) 금액</label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  value={testKrwAmount}
                  onChange={(e) => setTestKrwAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-800 border border-neutral-700 font-mono font-extrabold text-white px-3.5 py-2.5 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-amber-400 pr-12"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                  원
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {TEST_PRICE_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTestKrwAmount(amt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      testKrwAmount === amt
                        ? "bg-amber-400 text-neutral-950 font-extrabold"
                        : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    }`}
                  >
                    {amt.toLocaleString()}원
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Results Box */}
            <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <div className="text-[11px] text-neutral-400 font-bold flex items-center justify-between pb-2 border-b border-neutral-800">
                <span>언어 / 통화</span>
                <span className="text-amber-400 font-mono">적용 관세: +{settings.tariffRatePercent}%</span>
              </div>

              <div className="space-y-2 text-xs font-mono divide-y divide-neutral-900/60">
                {SIMULATOR_LANGUAGES.map((item) => {
                  const converted = formatCurrencyWithTariff(testKrwAmount, item.code, settings);

                  return (
                    <div key={item.code} className="flex items-center justify-between pt-1.5 pb-0.5">
                      <span className="text-neutral-400 font-sans font-medium flex items-center gap-1.5">
                        <span>{item.flag}</span>
                        <span>{item.name} ({item.curr})</span>
                      </span>
                      <span
                        className={`font-extrabold ${
                          item.isBase
                            ? "text-white"
                            : item.curr === "USD"
                            ? "text-sky-400"
                            : item.curr === "JPY"
                            ? "text-emerald-400"
                            : item.curr === "CNY"
                            ? "text-amber-400"
                            : item.curr === "EUR"
                            ? "text-purple-400"
                            : "text-neutral-200"
                        }`}
                      >
                        {converted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formula Explanatory Card */}
            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>계산 원리 및 소수점 처리</span>
              </div>
              <p className="text-neutral-400 font-mono leading-relaxed text-[10px]">
                해외가 = ⌈(KRW 원가 × {1 + settings.tariffRatePercent / 100}) ÷ 환율⌉
              </p>
              <p className="text-neutral-500 text-[10px] leading-relaxed">
                해외 결제 시 통화 가치 손실을 방지하기 위해 올림(Math.ceil) 처리되며, 메인 쇼핑몰 언어 선택 시 실시간 자동 적용됩니다.
              </p>
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
                <span className="text-neutral-500">기존 +{settings.tariffRatePercent}%</span>
                <span className="text-sky-600 font-extrabold">➔</span>
                <span className="text-sky-600 font-black text-sm">변경 +{pendingTariffConfirm}%</span>
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

