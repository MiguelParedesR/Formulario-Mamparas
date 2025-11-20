// =============================================================
// CAMPOS – SUSTRACCIÓN DE CABLE RH
// =============================================================

export function obtenerCamposCable() {
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
            label: "Dirección / Destino",
            type: "text",
            placeholder: "Ej.: Av. Argentina – Tramo RH",
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
            id: "backupPuerto",
            label: "Reporte Backup Puerto (Foto)",
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
            placeholder: "Ej.: 65 km/h",
            required: false
        }
    ];
}
