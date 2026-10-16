"use client";

import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Box,
  Clock,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  X,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

interface InboundStockManagementProps {
  inboundSchedulesList: any[];
  setInboundSchedulesList: React.Dispatch<React.SetStateAction<any[]>>;
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  inboundSearchQuery: string;
  setInboundSearchQuery: (val: string) => void;
  inboundStatusFilter: string;
  setInboundStatusFilter: (val: string) => void;
  setIsAddInboundModalOpen: (val: boolean) => void;
  setSelectedInboundItem: (item: any) => void;
  setNewInboundDate: (val: string) => void;
  handleUpdateInboundStatus: (id: string, status: string) => void;
  handleDeleteInboundSchedule: (id: string) => void;
  isAddInboundModalOpen?: boolean;
  selectedInboundItem?: any;
  newInboundDate?: string;
  newInboundTitle?: string;
  setNewInboundTitle?: (val: string) => void;
  newInboundQuantity?: number;
  setNewInboundQuantity?: (val: number) => void;
  newInboundSupplier?: string;
  setNewInboundSupplier?: (val: string) => void;
  newInboundWarehouse?: string;
  setNewInboundWarehouse?: (val: string) => void;
  newInboundNotes?: string;
  setNewInboundNotes?: (val: string) => void;
  newInboundStatus?: string;
  setNewInboundStatus?: (val: string) => void;
  handleAddInboundSchedule?: (e?: React.FormEvent) => void;
}

export function InboundStockManagement({
  inboundSchedulesList,
  setInboundSchedulesList,
  calendarDate,
  setCalendarDate,
  inboundSearchQuery,
  setInboundSearchQuery,
  inboundStatusFilter,
  setInboundStatusFilter,
  setIsAddInboundModalOpen,
  setSelectedInboundItem,
  setNewInboundDate,
  handleUpdateInboundStatus,
  handleDeleteInboundSchedule,
  isAddInboundModalOpen,
  selectedInboundItem,
  newInboundDate = new Date().toISOString().split("T")[0],
  newInboundTitle = "",
  setNewInboundTitle = () => {},
  newInboundQuantity = 100,
  setNewInboundQuantity = () => {},
  newInboundSupplier = "",
  setNewInboundSupplier = () => {},
  newInboundWarehouse = "제1물류센터 A구역",
  setNewInboundWarehouse = () => {},
  newInboundNotes = "",
  setNewInboundNotes = () => {},
  newInboundStatus = "Scheduled",
  setNewInboundStatus = () => {},
  handleAddInboundSchedule,
}: InboundStockManagementProps) {
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    calendarCells.push({
      day: d,
      dateStr: `${currentYear}-${monthStr}-${dayStr}`,
    });
  }

  const realTodayObj = new Date();
  const realTodayStr = `${realTodayObj.getFullYear()}-${String(realTodayObj.getMonth() + 1).padStart(2, "0")}-${String(realTodayObj.getDate()).padStart(2, "0")}`;
  const realTodayFormattedMMDD = `${realTodayObj.getMonth() + 1}/${realTodayObj.getDate()}`;

  const monthTotalQty = inboundSchedulesList.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const todayCount = inboundSchedulesList.filter((s) => s.date === realTodayStr).length;
  const inProgressCount = inboundSchedulesList.filter((s) => s.status === "In Progress").length;
  const completedCount = inboundSchedulesList.filter((s) => s.status === "Completed").length;

  const filteredInboundList = inboundSchedulesList.filter((item) => {
    const pTitle = String(item.productTitle || item.title || "").toLowerCase();
    const supplier = String(item.supplier || "").toLowerCase();
    const warehouse = String(item.warehouse || "").toLowerCase();
    const id = String(item.id || "").toLowerCase();
    const q = inboundSearchQuery.toLowerCase().trim();

    const matchesSearch =
      !q ||
      pTitle.includes(q) ||
      supplier.includes(q) ||
      warehouse.includes(q) ||
      id.includes(q);
    const matchesStatus =
      inboundStatusFilter === "all" || item.status === inboundStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportInboundExcel = () => {
    if (inboundSchedulesList.length === 0) {
      alert("다운로드할 입고 일정 데이터가 없습니다.");
      return;
    }

    try {
      const exportData = inboundSchedulesList.map((item, index) => ({
        "번호": index + 1,
        "입고번호": item.id || "-",
        "입고일자": item.date || "-",
        "품목명": item.productTitle || item.title || "-",
        "수량": Number(item.quantity || 0),
        "공급처": item.supplier || "-",
        "입고창고": item.warehouse || "-",
        "진행상태": item.status === "Completed" ? "입고 완료" : item.status === "In Progress" ? "검수 진행 중" : "입고 대기",
        "비고/메모": item.notes || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "입고일정");
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `초이콤마_입고일정_${today}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("입고 일정 엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            재고 관리 & 입고 캘린더 (Stock Management Calendar)
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            공급업체 발주 상품의 월별/일별 입고 일정 시각화, 물류 입고 검수 진행 현황 및 재고 수량 동기화
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {inboundSchedulesList.length > 0 && (
            <button
              type="button"
              onClick={handleExportInboundExcel}
              className="bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="입고 일정 목록 엑셀 다운로드 (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>입고일정 다운로드 (.xlsx)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setNewInboundDate(realTodayStr);
              setIsAddInboundModalOpen(true);
            }}
            className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ 신규 입고 일정 등록</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>이번 달 총 입고 수량</span>
            <Box className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{monthTotalQty.toLocaleString()} 개</p>
          <p className="text-xs text-neutral-500 mt-1">입고 예정 및 완료 총합계</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>오늘 입고 예정 ({realTodayFormattedMMDD})</span>
            <Clock className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{todayCount} 건</p>
          <p className="text-xs text-neutral-600 font-bold mt-1">금일 물류 창고 도착 예정</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>입고 검수 진행 중</span>
            <Archive className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{inProgressCount} 건</p>
          <p className="text-xs text-neutral-600 font-bold mt-1">창고 하차 및 검수 작업 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>입고 완료 (이번달)</span>
            <CheckCircle2 className="w-4 h-4 text-neutral-900" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{completedCount} 건</p>
          <p className="text-xs text-neutral-600 font-bold mt-1">재고 수량 등록 완료</p>
        </div>
      </div>

      {/* Calendar View Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-neutral-950 font-mono">
              {currentYear}년 {currentMonth + 1}월 입고 일정 캘린더
            </h2>
            <span className="bg-neutral-900 text-white border border-neutral-800 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
              CALENDAR
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                className="p-1.5 hover:bg-white rounded-lg text-neutral-700 transition-colors cursor-pointer"
                title="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1 text-xs font-bold text-neutral-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                오늘 ({currentYear}.{String(currentMonth + 1).padStart(2, "0")})
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                className="p-1.5 hover:bg-white rounded-lg text-neutral-700 transition-colors cursor-pointer"
                title="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-xs font-bold ml-4 pl-4 border-l border-neutral-200">
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 입고 대기
              </span>
              <span className="flex items-center gap-1.5 text-sky-800">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> 검수 진행 중
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 입고 완료
              </span>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-neutral-600 pb-2">
          <div className="text-rose-600">일 (Sun)</div>
          <div>월 (Mon)</div>
          <div>화 (Tue)</div>
          <div>수 (Wed)</div>
          <div>목 (Thu)</div>
          <div>금 (Fri)</div>
          <div className="text-sky-600">토 (Sat)</div>
        </div>

        {/* Calendar Grid Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[110px] bg-neutral-50/50 border border-neutral-100 rounded-2xl p-2"
                />
              );
            }

            const itemsOnDay = inboundSchedulesList.filter((s) => s.date === cell.dateStr);
            const isToday = cell.dateStr === realTodayStr;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between group ${
                  isToday
                    ? "bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-white border-neutral-200/80 hover:border-neutral-400 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-mono font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-neutral-800"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                        TODAY
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {itemsOnDay.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedInboundItem(item)}
                        className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-2xs border ${
                          item.status === "Completed"
                            ? "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100"
                            : item.status === "In Progress"
                            ? "bg-sky-50 text-sky-950 border-sky-300 hover:bg-sky-100"
                            : "bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100"
                        }`}
                        title={`[${item.id}] ${item.productTitle || item.title || "입고 품목"} (${item.quantity}개) - ${item.supplier || "공급처 미지정"}`}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="truncate font-extrabold">{item.productTitle || item.title || "미지정 품목"}</span>
                          <span className="font-mono text-[10px] shrink-0 bg-white/80 px-1 rounded font-black">
                            +{item.quantity}개
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] mt-1 opacity-90 font-mono">
                          <span>
                            {item.status === "Completed"
                              ? "● 완료"
                              : item.status === "In Progress"
                              ? "⏳ 검수중"
                              : "📦 대기"}
                          </span>
                          <span className="truncate max-w-[65px]">{(item.warehouse || "물류센터").split(" ")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewInboundDate(cell.dateStr);
                      setIsAddInboundModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-neutral-400 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-emerald-50 rounded-md cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    입고추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inbound Schedule Table Section */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm space-y-4 p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-neutral-950">입고 예정 & 완료 상세 목록</h3>
            <p className="text-xs text-neutral-500">입고 일자별 수량, 공급업체 정보 및 입고 상태를 한눈에 관리합니다.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="상품명, 공급업체, 창고 검색..."
                value={inboundSearchQuery}
                onChange={(e) => setInboundSearchQuery(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 w-52 md:w-64"
              />
            </div>

            <select
              value={inboundStatusFilter}
              onChange={(e) => setInboundStatusFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="Scheduled">📦 입고 대기</option>
              <option value="In Progress">⏳ 검수 진행 중</option>
              <option value="Completed">🟢 입고 완료</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200/70">
          <table className="w-full text-left text-sm text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">입고 일자</th>
                <th className="py-3.5 px-4">입고 번호</th>
                <th className="py-3.5 px-4">상품명 / 메모</th>
                <th className="py-3.5 px-4">입고 예정 수량</th>
                <th className="py-3.5 px-4">공급업체 / 물류 창고</th>
                <th className="py-3.5 px-4">진행 상태 (클릭시 전환)</th>
                <th className="py-3.5 px-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredInboundList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-500 text-xs">
                    검색 조건에 일치하는 입고 일정이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredInboundList.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-950 text-xs">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-neutral-900 text-sm">{item.productTitle || item.title || "미지정 품목"}</p>
                      <p className="text-[11px] text-neutral-500 truncate max-w-xs">{item.notes || "-"}</p>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700 font-mono">
                      +{Number(item.quantity || 0).toLocaleString()} 개
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-bold text-neutral-900">{item.supplier || "-"}</p>
                      <p className="text-[11px] text-neutral-500">{item.warehouse || "-"}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleUpdateInboundStatus(item.id, item.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105 ${
                          item.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "In Progress"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.status === "Completed"
                          ? "🟢 입고 완료 ↺"
                          : item.status === "In Progress"
                          ? "⏳ 검수 진행 중 ↺"
                          : "📦 입고 대기 ↺"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedInboundItem(item)}
                          className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          title="상세 정보 및 수정"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInboundSchedule(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ADD INBOUND SCHEDULE MODAL */}
      {isAddInboundModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950">신규 입고 일정 등록</h3>
                  <p className="text-xs text-neutral-500">입고 예정 상품과 날짜, 수량 및 공급업체를 등록합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddInboundModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInboundSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">입고 예정 일자 *</label>
                <input
                  type="date"
                  required
                  value={newInboundDate}
                  onChange={(e) => setNewInboundDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">입고 상품명 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 클래식 울 블렌드 트위드 재킷"
                  value={newInboundTitle}
                  onChange={(e) => setNewInboundTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">입고 수량 (개) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newInboundQuantity}
                    onChange={(e) => setNewInboundQuantity(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">입고 상태</label>
                  <select
                    value={newInboundStatus}
                    onChange={(e) => setNewInboundStatus(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Scheduled">📦 입고 대기</option>
                    <option value="In Progress">⏳ 검수 진행 중</option>
                    <option value="Completed">🟢 입고 완료</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">공급업체 (발주처)</label>
                  <input
                    type="text"
                    placeholder="예: (주)한진방직 / 성수공장"
                    value={newInboundSupplier}
                    onChange={(e) => setNewInboundSupplier(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">도착 창고 / 구역</label>
                  <select
                    value={newInboundWarehouse}
                    onChange={(e) => setNewInboundWarehouse(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="제1물류센터 A구역">제1물류센터 A구역</option>
                    <option value="제2물류센터 B구역">제2물류센터 B구역</option>
                    <option value="제1물류센터 C구역">제1물류센터 C구역</option>
                    <option value="제3물류센터 (잡화)">제3물류센터 (잡화)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">특이사항 / 입고 메모</label>
                <textarea
                  rows={2}
                  placeholder="검수 수량, 패키징 사양, 비고 메모 등"
                  value={newInboundNotes}
                  onChange={(e) => setNewInboundNotes(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-950 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddInboundModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-emerald-200" />
                  <span>입고 일정 등록</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INBOUND ITEM DETAIL & EDIT MODAL */}
      {selectedInboundItem && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-950">입고 상세 정보</h3>
                  <p className="text-xs text-neutral-500 font-mono">{selectedInboundItem.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInboundItem(null)}
                className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-bold">입고 일자:</span>
                  <span className="font-mono font-extrabold text-neutral-950">{selectedInboundItem.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-bold">입고 상품명:</span>
                  <span className="font-extrabold text-neutral-950">{selectedInboundItem.productTitle || selectedInboundItem.title || "미지정 품목"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-bold">입고 예정 수량:</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">+{(selectedInboundItem.quantity || 0).toLocaleString()} 개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-bold">공급업체 (발주처):</span>
                  <span className="font-bold text-neutral-900">{selectedInboundItem.supplier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-bold">도착 창고:</span>
                  <span className="font-bold text-neutral-900">{selectedInboundItem.warehouse}</span>
                </div>
                {selectedInboundItem.notes && (
                  <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-600">
                    <span className="font-bold text-neutral-500 block mb-0.5">메모 / 특이사항:</span>
                    {selectedInboundItem.notes}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">입고 진행 상태 원클릭 변경</label>
                <button
                  type="button"
                  onClick={() => handleUpdateInboundStatus(selectedInboundItem.id, selectedInboundItem.status)}
                  className={`w-full py-3 rounded-2xl font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${selectedInboundItem.status === "Completed"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                      : selectedInboundItem.status === "In Progress"
                        ? "bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100"
                        : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                    }`}
                >
                  <span>
                    {selectedInboundItem.status === "Completed"
                      ? "🟢 입고 완료 상태 (클릭하여 📦 대기 상태로 변경)"
                      : selectedInboundItem.status === "In Progress"
                        ? "⏳ 검수 진행 중 (클릭하여 🟢 입고 완료로 변경)"
                        : "📦 입고 대기 상태 (클릭하여 ⏳ 검수 진행으로 변경)"}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteInboundSchedule(selectedInboundItem.id)}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer border border-rose-200 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>일정 삭제</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInboundItem(null)}
                className="px-5 py-2 rounded-xl bg-neutral-950 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
