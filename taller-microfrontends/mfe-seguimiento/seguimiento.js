// Micro frontend: SEGUIMIENTO  (Vue 3 por CDN, sin compilación)
// Contrato: window.renderSeguimiento(idContenedor) / window.unmountSeguimiento(idContenedor)
// Escucha:  'pedido:confirmado'  { version, id, items, total }
// Publica:  'pedido:estado'      { version, id, estado }
(function () {
    const VERSION = '1.0.0';
    const ESTADOS = ['Recibido', 'En preparación', 'En camino', 'Entregado'];
    const INTERVALO = 5000;
    const VUE_URL = 'https://unpkg.com/vue@3.4.38/dist/vue.global.prod.js';
    const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    const CSS = `
    .seg-titulo { color: #0b4f8a; margin: 0 0 4px; }
    .seg-version { font-size: 12px; color: #888; }
    .seg-vacio { color: #777; margin-top: 16px; }
    .seg-pedido { background: #fff; border: 1px solid #dde3ea; border-radius: 6px; padding: 16px; margin-top: 16px; }
    .seg-cab { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .seg-items { margin: 0 0 12px; padding-left: 18px; color: #555; font-size: 14px; }
    .seg-pasos { display: flex; gap: 6px; flex-wrap: wrap; }
    .seg-paso { padding: 4px 10px; border-radius: 12px; background: #eceff3; color: #888; font-size: 13px; }
    .seg-hecho { background: #d5ebd4; color: #1b7a3e; }
    .seg-actual { background: #3e9f3a; color: #fff; font-weight: bold; }
  `;

    function asegurarEstilos() {
        if (document.getElementById('seg-estilos')) return;
        const s = document.createElement('style');
        s.id = 'seg-estilos';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ---- CAPA DE DATOS: vive mientras el script esté cargado
    const pedidos = [];      // [{ id, items, total, estado }]  estado = índice en ESTADOS
    let refrescar = null;    // función de la vista; null si no está en pantalla

    window.addEventListener('pedido:confirmado', function (e) {
        const p = e.detail;
        pedidos.unshift({ id: p.id, items: p.items, total: p.total, estado: 0 });
        if (refrescar) refrescar();
    });

    setInterval(function () {
        pedidos.forEach(function (p) {
            if (p.estado < ESTADOS.length - 1) {
                p.estado += 1;
                window.dispatchEvent(new CustomEvent('pedido:estado', {
                    detail: { version: 1, id: p.id, estado: ESTADOS[p.estado] }
                }));
            }
        });
        if (refrescar) refrescar();
    }, INTERVALO);

    // ---- CAPA DE VISTA: Vue 3, se carga bajo demanda desde el CDN
    let vuePromesa = null;
    function cargarVue() {
        if (window.Vue) return Promise.resolve();
        if (!vuePromesa) {
            vuePromesa = new Promise(function (resolve, reject) {
                const s = document.createElement('script');
                s.src = VUE_URL;
                s.onload = resolve;
                s.onerror = function () { vuePromesa = null; reject(new Error('No se pudo cargar Vue')); };
                document.head.appendChild(s);
            });
        }
        return vuePromesa;
    }

    let app = null;
    let turno = 0;   // evita montar si el usuario ya salió mientras Vue descargaba

    window.renderSeguimiento = async function (idContenedor) {
        const miTurno = ++turno;
        const raiz = document.getElementById(idContenedor);
        asegurarEstilos();
        try {
            await cargarVue();
        } catch (err) {
            if (miTurno === turno) raiz.innerHTML = '<p class="app-error">No se pudo cargar Vue desde el CDN.</p>';
            console.error(err);
            return;
        }
        if (miTurno !== turno) return;

        const { createApp, ref } = window.Vue;
        app = createApp({
            setup() {
                const lista = ref([]);
                function sincronizar() { lista.value = pedidos.map(p => ({ ...p })); }
                sincronizar();
                refrescar = sincronizar;
                return { lista, ESTADOS, pesos, VERSION };
            },
            template: `
        <h2 class="seg-titulo">Seguimiento de pedidos</h2>
        <span class="seg-version">mfe-seguimiento v{{ VERSION }} · Vue 3</span>
        <p v-if="!lista.length" class="seg-vacio">Aún no hay pedidos. Confirma uno desde el carrito.</p>
        <article v-for="p in lista" :key="p.id" class="seg-pedido">
          <div class="seg-cab"><b>{{ p.id }}</b><span>{{ pesos.format(p.total) }}</span></div>
          <ul class="seg-items"><li v-for="it in p.items">{{ it.cantidad }} × {{ it.nombre }}</li></ul>
          <div class="seg-pasos">
            <span v-for="(e, i) in ESTADOS" :key="e" class="seg-paso"
                  :class="{ 'seg-hecho': i <= p.estado, 'seg-actual': i === p.estado }">{{ e }}</span>
          </div>
        </article>`
        });
        app.mount('#' + idContenedor);
    };

    window.unmountSeguimiento = function (idContenedor) {
        turno++;
        refrescar = null;
        if (app) { app.unmount(); app = null; }
        document.getElementById(idContenedor).innerHTML = '';
    };
})();