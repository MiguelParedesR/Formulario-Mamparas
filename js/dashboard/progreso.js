// =============================================================
// progreso.js
// Regla canónica de avance para informes de incidencia.
// Un informe completo exige contenido real en todas sus secciones,
// datos específicos por tipo y al menos una evidencia.
// =============================================================

function tieneContenidoReal(valor) {
  if (valor === null || valor === undefined) return false;

  const texto = String(valor);
  return texto
    .split("\n")
    .map((linea) => linea.replace(/^\s*\d+[.)-]?\s*/, "").trim())
    .some(Boolean);
}

export function calcularProgresoInforme(datos = {}) {
  if (!datos) return progresoVacio();

  const tipo = (datos.tipo_incidencia || datos.tipo || "").toUpperCase();
  const campos = datos.campos || {};
  const valorExtraBase = campos.valorExtra || {};
  const valorExtra = {
    contenedor: valorExtraBase.contenedor ?? campos.contenedor ?? null,
    placa: valorExtraBase.placa ?? campos.placa ?? null,
  };

  const basicos = [
    { key: "asunto", valor: datos.asunto, texto: false },
    { key: "dirigidoA", valor: datos.dirigido_a ?? datos.dirigidoA, texto: false },
    { key: "remitente", valor: datos.remitente, texto: false },
    { key: "fechaInforme", valor: datos.fecha_informe ?? datos.fechaInforme, texto: false },
    { key: "introduccion", valor: campos.introduccion ?? datos.introduccion, texto: true },
    { key: "hechos", valor: campos.hechos, texto: true },
    { key: "analisis", valor: datos.analisis, texto: true },
    { key: "conclusiones", valor: datos.conclusiones, texto: true },
    { key: "recomendaciones", valor: datos.recomendaciones, texto: true },
  ];

  if (tipo === "CABLE" || tipo === "MERCADERIA") {
    basicos.push({ key: "contenedor", valor: valorExtra.contenedor, texto: false });
  } else if (tipo === "CHOQUE") {
    basicos.push({ key: "placa", valor: valorExtra.placa, texto: false });
  } else if (tipo === "SINIESTRO") {
    basicos.push({ key: "contenedor", valor: valorExtra.contenedor, texto: false });
    basicos.push({ key: "placa", valor: valorExtra.placa, texto: false });
  }

  let completados = 0;
  const faltantes = [];

  basicos.forEach(({ key, valor, texto }) => {
    const completo = texto
      ? tieneContenidoReal(valor)
      : valor !== null && valor !== undefined && String(valor).trim() !== "";

    if (completo) completados += 1;
    else faltantes.push(key);
  });

  // Evidencias forman parte de la regla de completitud.
  const anexos = Array.isArray(datos.anexos) ? datos.anexos : [];
  const tieneAnexos = anexos.length > 0;
  const total = basicos.length + 1;

  if (tieneAnexos) completados += 1;
  else faltantes.push("anexos");

  const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);
  const estado = porcentaje === 100 ? "COMPLETO" : "BORRADOR";

  return {
    porcentaje,
    completados,
    total,
    faltantes,
    estado,
  };
}

function progresoVacio() {
  return {
    porcentaje: 0,
    completados: 0,
    total: 0,
    faltantes: [],
    estado: "BORRADOR",
  };
}

export function actualizarBarraProgreso(porcentaje) {
  const barra = document.getElementById("progressBar");
  const label = document.getElementById("progressLabel");
  const status = document.getElementById("progressStatus");

  if (barra) barra.style.width = `${porcentaje}%`;
  if (label) label.textContent = `${porcentaje}%`;

  if (status) {
    if (porcentaje === 100) {
      status.textContent = "Informe completo. Puedes exportar o finalizar.";
      status.className = "form-status form-status--success is-visible";
    } else {
      status.textContent = "Puedes guardar como borrador. Aún hay campos pendientes.";
      status.className = "form-status form-status--info is-visible";
    }
  }
}

export function activarAutoProgreso(obtenerDatos) {
  const form = document.getElementById("form-incidencia");
  if (!form) return;

  const recalcular = () => {
    const datos = obtenerDatos();
    const progreso = calcularProgresoInforme(datos);
    actualizarBarraProgreso(progreso.porcentaje);
  };

  form.addEventListener("input", recalcular);
  form.addEventListener("change", recalcular);
  setTimeout(recalcular, 150);
}

export function obtenerEstadoListado(informe) {
  const progreso = calcularProgresoInforme(informe);

  let color = "red";
  if (progreso.porcentaje >= 50 && progreso.porcentaje < 100) color = "amber";
  if (progreso.porcentaje === 100) color = "green";

  return {
    porcentaje: progreso.porcentaje,
    estado: progreso.estado,
    color,
  };
}
