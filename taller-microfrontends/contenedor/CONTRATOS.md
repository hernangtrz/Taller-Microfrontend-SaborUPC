# Contratos de SaborUPC

Los micro frontends no se importan entre sí. Se comunican solo por eventos
publicados en `window` y por el contrato de montaje que el contenedor usa
para cargarlos. Este archivo es la fuente de verdad: cualquier cambio en un
evento se anota aquí antes de desplegarse.

## 1. Eventos

| Evento | Publicador | Consumidores | `detail` | Versión |
|---|---|---|---|---|
| `carrito:agregar` | mfe-catalogo | mfe-carrito | `{ id, nombre, precio }` | 1 (implícita) |
| `carrito:actualizado` | mfe-carrito | contenedor (contador) | `{ cantidad, total }` | 1 (implícita) |
| `usuario:cambio` | mfe-perfil | contenedor (saludo) | `{ nombre }` | 1 (implícita) |
| `pedido:confirmado` | mfe-carrito | mfe-seguimiento | `{ version, id, items[], total }` | 1 |
| `pedido:estado` | mfe-seguimiento | contenedor (notificación) | `{ version, id, estado }` | 1 |

Detalle de los tipos:

- `items[]`: arreglo de `{ nombre, cantidad, precio }`.
- `id` (pedido): texto único, formato `P` + marca de tiempo.
- `estado`: uno de `Recibido`, `En preparación`, `En camino`, `Entregado`.
- `total`, `precio`: números en pesos colombianos (COP).

## 2. Contratos de montaje

| Micro frontend | Ruta | Tipo | Contrato | Puerto |
|---|---|---|---|---|
| mfe-catalogo | `#/catalogo` | JS puro | `renderCatalogo(id)` / `unmountCatalogo(id)` | 8081 |
| mfe-carrito | `#/carrito` | JS puro | `renderCarrito(id)` / `unmountCarrito(id)` | 8082 |
| mfe-perfil | `#/perfil` | Web Component | etiqueta `<mfe-perfil>` | 8083 |
| mfe-seguimiento | `#/pedidos` | Vue 3 (CDN) | `renderSeguimiento(id)` / `unmountSeguimiento(id)` | 8084 |

El nombre en `registro.js` debe coincidir con el sufijo de las funciones
(`nombre: 'Seguimiento'` → `window.renderSeguimiento`).

## 3. Reglas de compatibilidad

1. **Agregar campos es compatible.** Un publicador puede añadir campos nuevos
   al `detail` sin avisar. Los consumidores solo leen los campos que conocen
   e ignoran el resto.
2. **Quitar, renombrar o cambiar el tipo de un campo rompe el contrato.**
   Requiere subir `version` y mantener la versión anterior publicándose
   durante un periodo de transición.
3. **Los consumidores no deben fallar ante un campo desconocido.**
4. Los eventos con campo `version` la incrementan solo en cambios que rompen
   (regla 2), no al agregar campos.

## 4. Historial de cambios

| Fecha | Cambio | Versión del evento |
|---|---|---|
| 2026-09-30 | Se crea `pedido:confirmado` y `pedido:estado` | 1 |