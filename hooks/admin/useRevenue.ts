"use client";

import { useState } from "react";

export function useRevenue() {
  // Revenue Management State
  const [revenueSelectedYear, setRevenueSelectedYear] = useState<string>("all");
  const [revenueSelectedMonth, setRevenueSelectedMonth] = useState<string>("all");
  const [revenueFilterPeriod, setRevenueFilterPeriod] = useState<"today" | "7days" | "thisMonth" | "lastMonth" | "year">("thisMonth");
  const [revenueStatusFilter, setRevenueStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [revenueSearchQuery, setRevenueSearchQuery] = useState("");

  return {
    revenueSelectedYear,
    setRevenueSelectedYear,
    revenueSelectedMonth,
    setRevenueSelectedMonth,
    revenueFilterPeriod,
    setRevenueFilterPeriod,
    revenueStatusFilter,
    setRevenueStatusFilter,
    revenueSearchQuery,
    setRevenueSearchQuery,
  };
}
