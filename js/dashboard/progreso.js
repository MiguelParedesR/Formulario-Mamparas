// =============================================================
// progreso.js
// Cálculo estandarizado del avance de un informe de incidencia
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

    const llaves = Object.keys(datos);
    if (llaves.length === 0) return progresoVacio();

    let completados = 0;
    let faltantes = [];

    for (const key of llaves) {
        const valor = datos[key];

        // IMÁGENES O ARCHIVOS
        if (Array.isArray(valor)) {
            if (valor.length > 0) completados++;
            else faltantes.push(key);
            continue;
        }

        // TEXTO, FECHA, NÚMEROS, ETC.
        if (valor !== null && valor !== undefined && valor !== "") {
            completados++;
        } else {
            faltantes.push(key);
        }
    }

    const total = llaves.length;
    const porcentaje = Math.round((completados / total) * 100);
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
 * Devuelve un progreso vacío
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

    // colores dinámicos
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
// CÁLCULO AUTOMÁTICO MIENTRAS SE ESCRIBE
// =============================================================

/**
 * Inicializa listeners para recalcular el avance en tiempo real
 * @param {Function} obtenerDatos - Función que devuelve un objeto con todos los campos del formulario
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
