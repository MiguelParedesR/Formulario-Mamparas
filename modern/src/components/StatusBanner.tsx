import type { ReactNode } from "react";

export type StatusTone = "info" | "warning" | "success" | "error";

export function StatusBanner({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <div className={`status-banner status-${tone}`} role={tone === "error" || tone === "warning" ? "alert" : "status"}>
      {children}
    </div>
  );
}
