import { Suspense } from "react";
import ResultsControls from "./components/results-controls";

export default function ShopLoading() {
  return (
    <div>
      <Suspense>
        <ResultsControls collections={[]} products={[]} />
      </Suspense>
      <div className="grid grid-cols-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="aspect-square bg-linear-30 from-muted to-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
