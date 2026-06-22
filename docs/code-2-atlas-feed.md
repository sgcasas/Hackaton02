# Code 2 — Atlas de Tropeles · Feed Infinito · Atender Señal

**Cubre:** Checkpoint 2 + Checkpoint 3 + Checkpoint 4.
Son tres CPs "media", pero juntos son la mayor carga del equipo. Lo bueno: comparten patrones
(fetch a mano, estado en URL, cancelación) y el modelo de Señales se reutiliza entre CP3 y CP4.

Lee antes: `00-plan-general.md`, `01-contrato-api.md`, `02-interfaces-compartidas.md`.

---

## Eres dueño de

```txt
src/features/tropels/   → TropelsPage.tsx, TropelDetailPage.tsx, + componentes/hooks propios
src/features/signals/   → SignalsFeedPage.tsx, + SignalDetailModal, hooks propios
```

Importas (no editas) de Code 1: `api`, `ApiError` (`src/lib/api`), tipos (`src/types/api`),
`useAuth`, y los componentes `Spinner/ErrorState/EmptyState/Badge` (`src/components/ui`).

Mientras Code 1 termina la fundación (~min 20), adelanta lo que **no** depende de ella: el
markup de los filtros, los hooks de IntersectionObserver, la UI de las cards. Si necesitas
compilar antes, crea un stub local de `api` y bórralo tras el handshake.

---

## Checkpoint 2 — Atlas de Tropeles (`features/tropels/TropelsPage.tsx`)

`GET /tropels` con `page,size,species,vitalState,sectorId,q,sort`. **Todo el estado vive en la
URL** vía `useSearchParams`. Esto resuelve de golpe: restaurar al recargar y al compartir URL.

### Patrón de estado-en-URL

```ts
const [sp, setSp] = useSearchParams();
const page   = Number(sp.get('page') ?? 0);
const size   = Number(sp.get('size') ?? 20);     // validar ∈ {10,20,50}
const sort   = sp.get('sort') ?? 'updatedAt,desc';
const species = sp.get('species') ?? undefined;  // etc. para vitalState, sectorId, q
```
Cambiar un filtro = `setSp(next)` (y **resetear `page` a 0** cuando cambia un filtro/sort).
Para sectores del dropdown: `GET /sectors` una vez.

### Protección contra respuestas tardías (lo que el TA fuerza)

El TA va a "alterar el ordenamiento durante una request" y revisar que **no se pinte una
respuesta vieja**. Doble defensa:

1. **AbortController** en el `useEffect` que dispara la búsqueda: aborta la request anterior
   en el cleanup cuando cambian los params.
2. **Guard por secuencia**: un `useRef` con un id incremental; al resolver, si el id no es el
   último, descarta el resultado.

```ts
const reqId = useRef(0);
useEffect(() => {
  const id = ++reqId.current;
  const ctrl = new AbortController();
  setLoading(true); setError(null);
  api.get<Page<Tropel>>('/tropels', {
    params: { page, size, sort, species, vitalState, sectorId, q },
    signal: ctrl.signal,
  })
    .then(res => { if (id === reqId.current) { setData(res); setLoading(false); } })
    .catch(err => {
      if (err.name === 'AbortError') return;            // cancelada: ignorar
      if (id === reqId.current) { setError(err); setLoading(false); }
    });
  return () => ctrl.abort();
}, [page, size, sort, species, vitalState, sectorId, q]);
```

### UI

- Tabla/grid de Tropeles (`name`, `species`, `vitalState` con `<Badge>`, `chaosIndex`,
  `energyLevel`, sector).
- Filtros combinables: selects de `species`, `vitalState`, `sectorId`; input de búsqueda `q`
  (con debounce ~300ms antes de escribir a la URL); select de `sort` (los 3 permitidos);
  select de `size` (10/20/50).
- Paginación servidor: prev/next + indicador `currentPage+1 / totalPages`. **Nada de paginar
  en cliente.**
- **Sin layout shift**: reserva altura para la tabla; loading = skeleton/overlay sutil, no
  desmontar la tabla. Estados: loading, error (`<ErrorState onRetry/>`), vacío
  (`<EmptyState/>` cuando `content.length===0`).
- `TropelDetailPage.tsx` (`/tropels/:id`): `GET /tropels/:id`, loading/error, link de vuelta.
  (Es sencillo; el detalle pesado es el de Señales.)

### Validación TA (CP2)

Cambiar filtros/página rápido · cambiar sort durante una request · copiar URL y abrir en otra
pestaña (mismo estado) · en Network no debe pintarse el resultado de una request anterior.

---

## Checkpoint 3 — Feed Infinito (`features/signals/SignalsFeedPage.tsx`)

`GET /signals/feed` cursor-based → `{ items, nextCursor, hasMore, totalEstimate }`. Filtros
(`signalType, severity, status, q`) **en la URL**. Infinite scroll real con
`IntersectionObserver` (NADA de botón "Cargar más" → invalida la entrega).

### Hook recomendado: `useSignalFeed(filters)`

Estado interno: `items: Signal[]`, `seenIds: Set<string>`, `cursor: string|null`,
`hasMore: boolean`, `loading: boolean`, `error: ApiError|null`.

Requisitos exactos (los prueba el TA):

- **Una sola carga adicional en vuelo**: un `loadingRef` (useRef boolean). Si ya hay una carga,
  el observer no dispara otra.
- **Deduplicación por ID**: al concatenar, filtra los que ya están en `seenIds`; actualiza el
  set. (El backend no repite, pero esto te cubre ante dobles disparos.)
- **Cancelar/descartar requests obsoletas**: cada cambio de filtros = nuevo `AbortController` +
  reset total (items=[], cursor=null, seenIds vacío). Las respuestas de un filtro viejo se
  descartan (guard por "hash de filtros activo", igual que el reqId de CP2).
- **Fin de lista correcto**: cuando `hasMore===false`, deja de observar y muestra un marcador
  de fin.
- **Recuperación de error sin borrar páginas**: si falla la carga de una página posterior,
  **conserva los items ya cargados** y muestra un botón "Reintentar" que reintenta SOLO la
  página fallida (mismo cursor).

```ts
const sentinelRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = sentinelRef.current; if (!el) return;
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore();   // loadMore respeta loadingRef + hasMore
  }, { rootMargin: '200px' });
  io.observe(el);
  return () => io.disconnect();
}, [loadMore]);
```

### Conservar posición al abrir/cerrar el detalle (clave para CP3 + CP4)

**No conviertas el detalle en una ruta** (`/signals/:id` desmontaría el feed y perderías el
scroll). En su lugar:

- Abre el detalle como **modal/panel** controlado por un search param: `?signal=<id>`.
- `SignalsFeedPage` lee `sp.get('signal')`; si existe, renderiza `<SignalDetailModal id=...>`
  **encima** del feed, que sigue montado → scroll y estado intactos.
- Cerrar el modal = quitar el param. El feed nunca se desmontó.

Esto satisface a la vez "conservación de posición al abrir y cerrar un detalle" (CP3) y "abrir
el detalle sin perder la posición anterior" (CP4).

### Validación TA (CP3)

Scroll rápido por varias páginas (auto, sin botón) · cambiar filtros con request en vuelo
(reinicia limpio) · forzar error en página posterior (no borra lo cargado, reintenta) · en
Network: **una** carga adicional a la vez y **cero IDs repetidos**.

---

## Checkpoint 4 — Atender una Señal (`features/signals/SignalDetailModal.tsx`)

Detalle de la señal + cambiar estado con `PATCH /signals/:id/status`.

- Al abrir, `GET /signals/:id` (loading/error reales). Muestra `signalType`, `severity`,
  `status`, `rawContent`, `tropel`, fechas.
- Acción: botones **PROCESANDO** y **ATENDIDA** (los únicos válidos; no `RECIBIDA`).
- Mientras el PATCH está en vuelo: **deshabilita los botones** y muestra spinner en el botón.
- Éxito: muestra **confirmación** y actualiza el estado mostrado con el Signal DTO devuelto.
- Error (el TA fuerza un 500 en el PATCH): muestra **error accionable** ("No se pudo
  actualizar. Reintentar"), **conserva el estado anterior** (no cambies nada en optimista) y
  permite reintentar.
- **Reflejar el resultado en el feed al volver**: el modal recibe un callback
  `onUpdated(updated: Signal)` de `SignalsFeedPage`. Al hacer PATCH ok, llama
  `onUpdated(updated)`; el feed reemplaza ese item en su lista por id. Como el feed nunca se
  desmontó, al cerrar el modal el nuevo estado ya está visible.

```ts
// en SignalsFeedPage
const handleUpdated = (s: Signal) =>
  setItems(prev => prev.map(it => it.id === s.id ? s : it));
```

### Validación TA (CP4)

Abrir una señal desde una página avanzada del feed (sin perder posición) · actualizar estado
(botón deshabilitado mientras va, confirmación al terminar) · volver y ver estado + posición
correctos · forzar error y comprobar que permite reintentar con el estado previo intacto.

---

## Cosas que invalidan TU parte (no las hagas)

- Botón "Cargar más" en vez de infinite scroll → **0**.
- Paginación o filtrado simulado en cliente (cargar todo y filtrar en JS) → **0**.
- PATCH sin manejo de loading/error → **0**.
- `any` en las respuestas (`Page<Tropel>`, `SignalFeed`, `Signal`) → **0**.
- Pintar una respuesta vieja sobre una nueva (sin guard) → falla CP2/CP3.

---

## PROMPT DE ARRANQUE (pégalo en Code 2)

```text
Eres Code 2 en una hackathon de frontend de 2 horas (equipo de 3, 3 Claude Codes en paralelo).
App: "TropelCare Control Room" — React 18 + TS estricto + Vite + React Router + Tailwind, que
consume una API cerrada que YA existe (no la creamos). Evaluación todo-o-nada: los 5
checkpoints = 20, uno falla = 0.

Tu rol: Checkpoint 2 (Atlas de Tropeles), Checkpoint 3 (feed infinito de Señales) y
Checkpoint 4 (atender una señal con PATCH). Trabajas en la rama feat/atlas-feed.

Lee primero y respeta:
- docs/00-plan-general.md
- docs/01-contrato-api.md
- docs/02-interfaces-compartidas.md
- docs/code-2-atlas-feed.md   ← tus instrucciones detalladas

Reglas duras:
- Eres dueño SOLO de src/features/tropels y src/features/signals. Importas (sin editar) de
  Code 1: `api` y `ApiError` (src/lib/api), los tipos (src/types/api), useAuth, y los
  componentes Spinner/ErrorState/EmptyState/Badge (src/components/ui). No toques App.tsx ni
  nada compartido; si necesitas un cambio ahí, pídemelo.
- TS estricto, CERO `any` en respuestas de API.
- Estado de filtros/página/sort SIEMPRE en la URL (useSearchParams).
- Infinite scroll real con IntersectionObserver. PROHIBIDO botón "Cargar más" y prohibido
  paginar/filtrar en cliente: ambos invalidan la entrega.
- Protección contra respuestas tardías: AbortController + guard por secuencia/hash de filtros.
- El detalle de Señal (CP4) NO es una ruta: es un modal controlado por ?signal=<id> para no
  perder la posición de scroll del feed, y al hacer PATCH ok refleja el cambio en el feed.

Mientras Code 1 sube la fundación (~min 20), adelanta lo que no dependa de ella (UI de
filtros, hook de IntersectionObserver, markup de cards). Cuando Code 1 avise "fundación lista",
haz `git fetch && git merge origin/main` y conecta el `api` real.

Plan: empieza por CP2 (Atlas con estado en URL + guard de respuestas tardías), luego CP3
(feed infinito con dedup, single-in-flight, cancelación, fin de lista, recuperación de error),
luego CP4 (modal de detalle + PATCH con loading/error/confirmación + reflejo en feed).

Antes de escribir, dime en 6 líneas tu plan de archivos y hooks. Luego ejecuta CP2.
```
