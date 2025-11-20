// =============================================================
// CAMPOS – SINIESTRO GENERAL
// =============================================================

export function obtenerCamposSiniestro() {
    return [
        {
            id: "fechaHecho",
            label: "Fecha del hecho",
            type: "date",
            required: false
        },
        {
            id: "horaHecho",
            label: "Hora del hecho",
            type: "time",
            required: false
        },
        {
            id: "direccionDestino",
            label: "Lugar del siniestro",
            type: "text",
            placeholder: "Ej.: Ramal acceso – Línea Amarilla",
            required: false
        },
        {
            id: "reporteGps",
            label: "Reporte GPS (Archivo Excel)",
            type: "file",
            accept: ".xlsx,.xls",
            required: false
        },
        {
            id: "reporteCustodia",
            label: "Reporte de Custodia (Foto)",
            type: "file",
            accept: "image/*",
            required: false
        },
        {
            id: "ocurrenciasRuta",
            label: "Ocurrencias en ruta",
            type: "textarea",
            placeholder: "Describe las ocurrencias…",
            required: false
        },
        {
            id: "paradasNoAutorizadas",
            label: "Paradas no autorizadas",
            type: "textarea",
            placeholder: "Describe las paradas no autorizadas…",
            required: false
        },
        {
            id: "velocidadPromedio",
            label: "Velocidad promedio UT",
            type: "number",
            placeholder: "Ej.: 63 km/h",
            required: false
        },
        {
            id: "unidadesInvolucradas",
            label: "Unidades involucradas",
            type: "text",
            placeholder: "Placas + empresas afectadas",
            required: false
        }
    ];
}
