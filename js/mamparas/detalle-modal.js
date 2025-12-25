const MODAL_CONTAINER_ID = 'mampara-detalle-modal-container';

let activeCarouselImages = [];
let activeCarouselIndex = 0;

// --- Sidebar-aware Positioning ---

function getSidebarWidth() {
    if (window.innerWidth < 1024) return '0px'; // No sidebar on mobile
    if (document.body.classList.contains('sidebar-hidden')) return '0px';

    const rootStyles = getComputedStyle(document.documentElement);
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    
    return collapsed
        ? rootStyles.getPropertyValue('--sidebar-width-collapsed').trim() || '72px'
        : rootStyles.getPropertyValue('--sidebar-width').trim() || '250px';
}

// --- Modal Creation ---

function getModalContainer() {
    let container = document.getElementById(MODAL_CONTAINER_ID);
    if (!container) {
        console.error(`#${MODAL_CONTAINER_ID} not found. Appending to body.`);
        container = document.createElement('div');
        container.id = MODAL_CONTAINER_ID;
        document.body.appendChild(container);
    }
    return container;
}

const createPrimaryModalHTML = (registro) => {
    const { incorreccion, detalle, imagenes } = parseRegistro(registro);
    const labels = ["Foto Panorámica", "Foto Altura", "Foto Lateral"];
    const sidebarWidth = getSidebarWidth();

    return `
    <div id="mampara-detalle-modal-backdrop" class="fixed inset-0 bg-gray-900 bg-opacity-50 z-[1000]"></div>
    <div id="mampara-detalle-modal" 
         class="fixed inset-0 z-[1010] flex items-center justify-center p-4" 
         style="left: ${sidebarWidth}; width: calc(100% - ${sidebarWidth});"
         role="dialog" 
         aria-modal="true">
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto">
            <div class="p-6 sm:p-8">
                <div class="flex justify-between items-start">
                    <div class="space-y-2">
                        <h2 class="text-xl font-bold text-gray-900">Detalle de Inspección</h2>
                        <p class="text-sm text-gray-600">Tipo: <span class="font-semibold">${incorreccion}</span></p>
                    </div>
                    <button id="close-primary-modal" type="button" class="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
                <div class="mt-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                        <div>
                            <p class="text-gray-500">Separación Lateral Central</p>
                            <p class="text-lg font-semibold">${detalle.separacion_lateral_central ? detalle.separacion_lateral_central + ' cm' : 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Altura de Mampara</p>
                            <p class="text-lg font-semibold">${detalle.altura_mampara ? detalle.altura_mampara + ' cm' : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="mt-6">
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidencias</p>
                        <div id="mampara-image-thumbnails" class="grid grid-cols-3 gap-4">
                            ${imagenes.map((url, index) => `
                                <div class="text-center">
                                    <button data-index="${index}" class="thumbnail-button w-full h-24 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-500 focus:outline-none focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md">
                                        <img src="${url}" alt="${labels[index] || 'Evidencia ' + (index + 1)}" class="w-full h-full object-cover">
                                    </button>
                                    <p class="text-xs text-gray-600 mt-2">${labels[index] || 'Evidencia ' + (index + 1)}</p>
                                </div>
                            `).join('')}
                            ${imagenes.length === 0 ? '<p class="col-span-3 text-sm text-gray-500 text-center py-8">No hay imágenes de evidencia.</p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

const createCarouselModalHTML = () => `
    <div id="mampara-carousel-backdrop" class="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-[1100]"></div>
    <div id="mampara-carousel-modal" class="fixed inset-0 z-[1110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div class="relative w-full h-full flex flex-col items-center justify-center">
            <button id="close-carousel-modal" class="absolute top-4 right-4 text-white text-5xl opacity-80 hover:opacity-100 transition">&times;</button>
            <img id="carousel-image" src="" class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl">
            <button id="carousel-prev" class="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 p-2 rounded-full text-4xl hover:bg-opacity-60 transition">❮</button>
            <button id="carousel-next" class="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 p-2 rounded-full text-4xl hover:bg-opacity-60 transition">❯</button>
        </div>
    </div>`;

// --- Data Parsing ---

function parseRegistro(registro) {
    // This function remains the same as the previous correct version
    let detalle = {};
    let imagenes = [];
    let detalleObj = null;
    if (typeof registro.detalle === "string" && registro.detalle.startsWith('{')) {
        try {
            detalleObj = JSON.parse(registro.detalle);
        } catch (e) {
            console.error("Error parsing registro.detalle JSON:", e);
        }
    } else if (typeof registro.detalle === "object" && registro.detalle !== null) {
        detalleObj = registro.detalle;
    }

    if (detalleObj) {
        const datos = detalleObj.datos || {};
        const imagenesDetalle = detalleObj.imagenes || {};
        detalle = {
            separacion_lateral_central: datos.separacion_lateral_central || registro.separacion_central,
            altura_mampara: datos.altura_mampara || registro.altura_mampara,
        };
        imagenes = [
            imagenesDetalle.foto_panoramica_unidad || registro.foto_unidad,
            imagenesDetalle.foto_altura_mampara,
            imagenesDetalle.foto_lateral_central
        ].filter(Boolean);
    } else {
        detalle = {
            separacion_lateral_central: registro.separacion_central,
            altura_mampara: registro.altura_mampara,
        };
        imagenes = [
            registro.foto_panoramica_url || registro.foto_unidad,
            registro.foto_altura_url,
            registro.foto_lateral_url
        ].filter(Boolean);
    }
    imagenes = [...new Set(imagenes)];
    return { incorreccion: registro.incorreccion || 'N/A', detalle, imagenes };
}

// --- Modal Logic ---

function openCarousel(index) {
    const container = getModalContainer();
    container.insertAdjacentHTML('beforeend', createCarouselModalHTML());

    const imageElement = document.getElementById('carousel-image');
    activeCarouselIndex = index;
    imageElement.src = activeCarouselImages[activeCarouselIndex];

    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (activeCarouselImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    const showPrev = () => {
        activeCarouselIndex = (activeCarouselIndex - 1 + activeCarouselImages.length) % activeCarouselImages.length;
        imageElement.src = activeCarouselImages[activeCarouselIndex];
    };

    const showNext = () => {
        activeCarouselIndex = (activeCarouselIndex + 1) % activeCarouselImages.length;
        imageElement.src = activeCarouselImages[activeCarouselIndex];
    };

    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);
    
    const close = () => {
        const carousel = document.getElementById('mampara-carousel-modal');
        const backdrop = document.getElementById('mampara-carousel-backdrop');
        if (carousel) carousel.remove();
        if (backdrop) backdrop.remove();
        document.removeEventListener('keydown', onCarouselKeydown);
    };

    const onCarouselKeydown = (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
    };

    document.getElementById('close-carousel-modal').addEventListener('click', close);
    document.getElementById('mampara-carousel-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', onCarouselKeydown);
}

export function mostrarDetalleMampara(registro) {
    const container = getModalContainer();
    container.innerHTML = createPrimaryModalHTML(registro);

    const { imagenes } = parseRegistro(registro);
    activeCarouselImages = imagenes;

    document.querySelectorAll('.thumbnail-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            openCarousel(index);
        });
    });

    const close = () => {
        container.innerHTML = '';
        document.removeEventListener('keydown', onPrimaryModalKeydown);
        window.removeEventListener('sidebar:state-change', updateModalPosition);
    };

    const onPrimaryModalKeydown = (e) => {
        if (e.key === 'Escape') close();
    };
    
    const updateModalPosition = () => {
        const modal = document.getElementById('mampara-detalle-modal');
        if(modal) {
            const sidebarWidth = getSidebarWidth();
            modal.style.left = sidebarWidth;
            modal.style.width = `calc(100% - ${sidebarWidth})`;
        }
    };

    document.getElementById('close-primary-modal').addEventListener('click', close);
    document.getElementById('mampara-detalle-modal-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', onPrimaryModalKeydown);
    
    // Listen for sidebar changes to reposition the modal
    window.addEventListener('sidebar:state-change', updateModalPosition);
}