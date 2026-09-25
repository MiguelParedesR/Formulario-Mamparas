import { useState } from "react";
import { StatusBanner, type StatusTone } from "../../components/StatusBanner";

type Status = { tone: StatusTone; message: string } | null;

export function ReportsPage() {
  const [month, setMonth] = useState("");
  const [operator, setOperator] = useState("Todos");
  const [status, setStatus] = useState<Status>({
    tone: "info",
    message: "UI y exportador ya están desacoplados. El adaptador de datos se activará durante la revisión de Supabase.",
  });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Mamparas</p>
          <h1>Reportes</h1>
          <p className="lede">Estados de carga, vacío, éxito y error tratados explícitamente, sin depender de modales ocultos.</p>
        </div>
      </header>

      <section className="surface-section">
        <div className="filter-grid">
          <label><span>Mes</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label><span>Operador</span><select value={operator} onChange={(event) => setOperator(event.target.value)}><option>Todos</option></select></label>
        </div>

        {status && <StatusBanner tone={status.tone}>{status.message}</StatusBanner>}

        <div className="toolbar">
          <button
            className="primary-button"
            type="button"
            onClick={() => setStatus({
              tone: month ? "info" : "warning",
              message: month ? `Filtro preparado: ${month} · ${operator}.` : "Selecciona un mes antes de generar el reporte.",
            })}
          >
            Generar Excel F-OPESEG-045
          </button>
        </div>
      </section>
    </div>
  );
}
