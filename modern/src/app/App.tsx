import { useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ReportsPage } from "../features/mamparas/ReportsPage";

export type RouteKey = "dashboard" | "incidencias" | "mamparas" | "registros" | "reportes";

export function App() {
  const initial = useMemo<RouteKey>(() => {
    const hash = window.location.hash.replace("#/", "") as RouteKey;
    return ["incidencias", "mamparas", "registros", "reportes"].includes(hash) ? hash : "dashboard";
  }, []);
  const [route, setRoute] = useState<RouteKey>(initial);

  const navigate = (next: RouteKey) => {
    window.location.hash = next === "dashboard" ? "/" : `/${next}`;
    setRoute(next);
  };

  return (
    <AppShell current={route} onNavigate={navigate}>
      {route === "dashboard" && <DashboardPage onNavigate={navigate} />}
      {route === "reportes" && <ReportsPage />}
      {route !== "dashboard" && route !== "reportes" && (
        <section className="surface-section">
          <p className="eyebrow">Migración progresiva</p>
          <h1>{route === "incidencias" ? "Incidencias" : route === "mamparas" ? "Mamparas" : "Registros"}</h1>
          <p className="lede">Este módulo se está trasladando al dominio tipado conservando las reglas operativas existentes.</p>
        </section>
      )}
    </AppShell>
  );
}
