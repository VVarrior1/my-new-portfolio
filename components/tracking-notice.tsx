"use client";

import { useSearchParams } from "next/navigation";

export function TrackingNotice() {
  const state = useSearchParams().get("tracking");
  if (state !== "on" && state !== "off") return null;

  return (
    <p role="status" className="mt-8 rounded-md border border-rule bg-paper-raised px-4 py-3">
      {state === "off"
        ? "Done. Visits from this browser are no longer counted."
        : "Done. Visits from this browser are counted again."}
    </p>
  );
}
