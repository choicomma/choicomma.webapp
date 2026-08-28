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
} from "lucide-react";

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
    const matchesSearch =
      item.productTitle.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
      item.warehouse.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(inboundSearchQuery.toLowerCase());
    const matchesStatus =
      inboundStatusFilter === "all" || item.status === inboundStatusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <button
          type="button"
          onClick={() => {
            setNewInboundDate(realTodayStr);
            setIsAddInboundModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-200" />
          <span>+ 신규 입고 일정 등록</span>
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>이번 달 총 입고 수량</span>
            <Box className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{monthTotalQty.toLocaleString()} 개</p>
          <p className="text-xs text-neutral-500 mt-1">입고 예정 및 완료 총합계</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>오늘 입고 예정 ({realTodayFormattedMMDD})</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{todayCount} 건</p>
          <p className="text-xs text-emerald-700 font-bold mt-1">금일 물류 창고 도착 예정</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>입고 검수 진행 중</span>
            <Archive className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-sky-600 mt-2">{inProgressCount} 건</p>
          <p className="text-xs text-sky-700 font-bold mt-1">창고 하차 및 검수 작업 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>입고 완료 (이번달)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{completedCount} 건</p>
          <p className="text-xs text-emerald-700 font-bold mt-1">재고 수량 등록 완료</p>
        </div>
      </div>

      {/* Calendar View Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-neutral-950 font-mono">
              {currentYear}년 {currentMonth + 1}월 입고 일정 캘린더
            </h2>
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
              LIVE CALENDAR
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
                        title={`[${item.id}] ${item.productTitle} (${item.quantity}개) - ${item.supplier}`}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="truncate font-extrabold">{item.productTitle}</span>
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
                          <span className="truncate max-w-[65px]">{item.warehouse.split(" ")[0]}</span>
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
                      <p className="font-bold text-neutral-900 text-sm">{item.productTitle}</p>
                      <p className="text-[11px] text-neutral-500 truncate max-w-xs">{item.notes}</p>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700 font-mono">
                      +{item.quantity.toLocaleString()} 개
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-bold text-neutral-900">{item.supplier}</p>
                      <p className="text-[11px] text-neutral-500">{item.warehouse}</p>
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
    </div>
  );
}
