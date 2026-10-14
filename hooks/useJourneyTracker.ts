"use client";

import { useCallback } from "react";
import { trackCustomerJourney, TrackJourneyParams } from "@/lib/logging/journey-tracker";

/**
 * 리액트 컴포넌트용 고객 구매 여정 트래킹 커스텀 훅
 */
export function useJourneyTracker() {
  const track = useCallback((params: TrackJourneyParams) => {
    trackCustomerJourney(params);
  }, []);

  return { track };
}
