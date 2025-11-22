// =============================================================
// progreso.js
// CÃ¡lculo estandarizado del avance de un informe de incidencia
// Compatible con formulario.js, registros.js, dashboard y DOCX.
// =============================================================

/**
 * Calcula el porcentaje de avance del informe
 * @param {Object} datos - Objeto con los campos del formulario
 * @returns {{
 *   porcentaje: number,
 *   completados: number,
 *   total: number,
 *   faltantes: string[],
 *   estado: "BORRADOR" | "COMPLETO"
 * }}
 */
export function calcularProgresoInforme(datos = {}) {
    if (!datos) return progresoVacio();

    const basicos = [
        { key: "asunto", valor: datos.asunto },
        { key: "dirigidoA", valor: datos.dirigido_a ?? datos.dirigidoA },
        { key: "remitente", valor: datos.remitente },
        { key: "fechaInforme", valor: datos.fecha_informe ?? datos.fechaInforme },
        { key: "analisis", valor: datos.analisis },
        { key: "conclusiones", valor: datos.conclusiones },
        { key: "recomendaciones", valor: datos.recomendaciones }
    ];

    let completados = 0;
    const faltantes = [];

    basicos.forEach(({ key, valor }) => {
        if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
            completados++;
        } else {
            faltantes.push(key);
        }
    });

    let total = basicos.length;

    const anexos = datos.anexos;
    if (Array.isArray(anexos) && anexos.length > 0) {
        total += 1;
        completados += 1;
    }

    const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);
    const estado = porcentaje === 100 ? "COMPLETO" : "BORRADOR";

    return {
        porcentaje,
        completados,
        total,
        faltantes,
        estado
    };
}

/**
 * Devuelve un progreso vacÃ­o
 */
function progresoVacio() {
    return {
        porcentaje: 0,
        completados: 0,
        total: 0,
        faltantes: [],
        estado: "BORRADOR"
    };
}

// =============================================================
// APLICAR PROGRESO A LA UI DEL FORMULARIO TAILWIND
// =============================================================

/**
 * Aplica el porcentaje a la barra de progreso del formulario
 * @param {number} porcentaje
 */
export function actualizarBarraProgreso(porcentaje) {
    const barra = document.getElementById("progressBar");
    const label = document.getElementById("progressLabel");
    const status = document.getElementById("progressStatus");

    if (!barra || !label || !status) return;

    barra.style.width = `${porcentaje}%`;

    // colores dinÃ¡micos
    if (porcentaje < 50) barra.className = "h-2 bg-red-500 rounded-full transition-all duration-300";
    else if (porcentaje < 99) barra.className = "h-2 bg-amber-500 rounded-full transition-all duration-300";
    else barra.className = "h-2 bg-green-600 rounded-full transition-all duration-300";

    label.textContent = `${porcentaje}%`;

    if (porcentaje === 100) {
        status.textContent = "Informe completo. Puedes exportar o finalizar.";
        status.className = "mt-1 text-[11px] text-green-700 font-semibold";
    } else {
        status.textContent = "Puedes guardar como borrador. Campos pendientes.";
        status.className = "mt-1 text-[11px] text-gray-500";
    }
}

// =============================================================
// CÃLCULO AUTOMÃTICO MIENTRAS SE ESCRIBE
// =============================================================

/**
 * Inicializa listeners para recalcular el avance en tiempo real
 * @param {Function} obtenerDatos - FunciÃ³n que devuelve un objeto con todos los campos del formulario
 */
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

    // primer render
    setTimeout(recalcular, 150);
}

// =============================================================
// COMPATIBILIDAD CON REGISTROS (TABLA GLOBAL)
// =============================================================

/**
 * Calcula progreso para la tabla de registros
 */
export function obtenerEstadoListado(informe) {
    const progreso = calcularProgresoInforme(informe);

    let color = "bg-red-500";
    if (progreso.porcentaje >= 50 && progreso.porcentaje < 100) color = "bg-amber-500";
    if (progreso.porcentaje === 100) color = "bg-green-600";

    return {
        porcentaje: progreso.porcentaje,
        estado: progreso.estado,
        color
    };
}

