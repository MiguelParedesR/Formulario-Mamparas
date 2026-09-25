import type { ReactNode } from "react";
import type { RouteKey } from "../app/App";

const nav: Array<{ key: RouteKey; label: string; icon: string }> = [
  { key: "dashboard", label: "Inicio", icon: "⌂" },
  { key: "incidencias", label: "Incidencias", icon: "!" },
  { key: "mamparas", label: "Mamparas", icon: "▥" },
  { key: "registros", label: "Registros", icon: "≡" },
  { key: "reportes", label: "Reportes", icon: "⇩" },
];

export function AppShell({ current, onNavigate, children }: {
  current: RouteKey;
  onNavigate: (route: RouteKey) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TPP</div>
          <div><strong>Seguridad</strong><span>Operaciones</span></div>
        </div>
        <nav aria-label="Principal">
          {nav.map((item) => (
            <button
              key={item.key}
              className={current === item.key ? "nav-item is-active" : "nav-item"}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><span className="status-dot" aria-hidden="true" /> Plataforma en modernización</div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
