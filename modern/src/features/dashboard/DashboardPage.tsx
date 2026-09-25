import type { RouteKey } from "../../app/App";

const actions: Array<{ route: RouteKey; title: string; description: string; meta: string }> = [
  { route: "incidencias", title: "Incidencias", description: "Crear y gestionar informes operativos.", meta: "4 tipos" },
  { route: "mamparas", title: "Mamparas", description: "Registrar inspecciones, medidas y evidencias.", meta: "Inspecciones" },
  { route: "registros", title: "Registros", description: "Consultar históricos y detalles.", meta: "Histórico" },
  { route: "reportes", title: "Reportes", description: "Generar documentos y Excel corporativo.", meta: "F-OPESEG-045" },
];

export function DashboardPage({ onNavigate }: { onNavigate: (route: RouteKey) => void }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Terminales Portuarios Peruanos</p>
          <h1>Centro de Seguridad</h1>
          <p className="lede">Una sola superficie para registrar, revisar y exportar información operativa.</p>
        </div>
        <div className="health-pill"><span /> Operativo</div>
      </header>
      <section className="action-list" aria-label="Módulos">
        {actions.map((action) => (
          <button className="action-row" key={action.route} onClick={() => onNavigate(action.route)} type="button">
            <div><strong>{action.title}</strong><p>{action.description}</p></div>
            <div className="row-meta"><span>{action.meta}</span><b aria-hidden="true">›</b></div>
          </button>
        ))}
      </section>
    </div>
  );
}
