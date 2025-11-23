// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas

window.mostrarDetalle = function (detalle) {
  const modal = document.getElementById("detalleModal");
  const contenido = document.getElementById("detalleContenido");

  if (!modal || !contenido) return;

  if (!detalle || typeof detalle !== "object") {
    contenido.innerHTML = `
      <tr><td class="py-2 text-gray-600">Sin detalle disponible.</td></tr>
    `;
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    return;
  }

  if (detalle.tipo === "Mampara") {
    contenido.innerHTML = `
      <tr>
        <th class="text-left py-1 pr-2 text-gray-700">Separación central</th>
        <td class="py-1">${detalle.separacion_lateral_central || "-"} cm</td>
      </tr>

      <tr>
        <th class="text-left py-1 pr-2 text-gray-700">Altura mampara</th>
        <td class="py-1">${detalle.altura_mampara || "-"} cm</td>
      </tr>

      <tr>
        <th class="text-left py-1 pr-2 text-gray-700">Fotos</th>
        <td class="py-2 flex gap-3">
          ${renderFoto(detalle.foto_panoramica_unidad)}
          ${renderFoto(detalle.foto_altura_mampara)}
          ${renderFoto(detalle.foto_lateral_central)}
        </td>
      </tr>
    `;
  } else {
    contenido.innerHTML = `
      <tr>
        <th class="text-left py-1 pr-2 text-gray-700">Descripción</th>
        <td class="py-1">${detalle.observacion_texto || "-"}</td>
      </tr>

      <tr>
        <th class="text-left py-1 pr-2 text-gray-700">Foto</th>
        <td class="py-2">
          ${renderFoto(detalle.foto_observacion)}
        </td>
      </tr>
    `;
  }

  modal.style.display = "flex";
  modal.classList.remove("hidden");
};

window.renderFoto = function (url) {
  if (!url) return "";
  return `
    <img
      src="${url}"
      class="w-20 h-20 rounded-lg border shadow cursor-pointer object-cover"
      onclick="verImagenAmpliada('${url}')"
    />
  `;
};

window.verImagenAmpliada = function (url) {
  const img = document.getElementById("imagenAmpliadaSrc");
  const modal = document.getElementById("imagenAmpliada");

  if (img && modal) {
    img.src = url;
    modal.style.display = "flex";
    modal.classList.remove("hidden");
  }
};

window.cerrarDetalle = function () {
  const modal = document.getElementById("detalleModal");
  if (modal) modal.style.display = "none";
};

window.cerrarImagenAmpliada = function () {
  const modal = document.getElementById("imagenAmpliada");
  if (modal) modal.style.display = "none";
};

console.log("QA Mamparas: archivo corregido");
