# TropelCare Control Room

Consola operativa para la colonia de Tropeles de Tuckersoft. Maneja paginación de servidor,
filtros sincronizados con la URL, feed infinito basado en cursor, actualización de estado de
señales y una experiencia de scrollytelling (Sector Story Engine).

Construida para la hackathon **Pizza Protocol**. Consume una API cerrada provista por el curso
(el frontend no incluye ni reemplaza el backend).

---

## Integrantes

| Nombre | Código |
|:-------|:-------|
| Ferrel Valentino Infante Garcia  | 202510148  |
| Sebastian Gonzalo Cassas Matos  | 202510209  |
| Gabriel  | 202510 |

## Deploy

- **App:** https://_________________________   ← (abre directo en cualquier ruta)
- **Repo:** https://github.com/______________

---

## Stack

React 18 · TypeScript estricto · Vite · React Router · Tailwind CSS · Fetch API.
Sin librerías de data-fetching (React Query/SWR), sin librerías de UI (MUI/Chakra/etc.) y sin
librerías de infinite scroll: todo a mano según las reglas de la hackathon.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
git clone <repo-url>
cd tropelcare
npm install
cp .env.example .env     # y completar VITE_API_BASE_URL (la entrega el TA)
npm run dev
```

## Comandos

| Comando | Qué hace |
|:--------|:---------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Type-check + build de producción a `dist/` |
| `npm run typecheck` | `tsc --noEmit` (debe pasar sin errores) |
| `npm run preview` | Sirve el build localmente |

## Variables de entorno requeridas

| Variable | Descripción |
|:---------|:------------|
| `VITE_API_BASE_URL` | URL base de la API del equipo, incluyendo `/api/v1`. La entrega el TA. |

`TEAM_CODE`, `EMAIL` y `PASSWORD` **no son variables de entorno**: son credenciales que se
ingresan en el formulario de login.

---

## Checkpoints implementados

1. **Encender la consola** — login con credenciales del equipo, ruta privada, restauración de
   sesión vía `/auth/me`, logout, dashboard con datos reales y estados loading/error/vacío.
2. **Atlas de Tropeles** — paginación de servidor, filtros combinables, búsqueda, ordenamiento,
   estado completo en la URL (restaurable al recargar/compartir) y protección contra respuestas
   que llegan tarde.
3. **Feed Infinito** — infinite scroll por cursor con `IntersectionObserver`, deduplicación por
   ID, una sola carga en vuelo, cancelación de requests obsoletas, filtros en URL, fin de lista
   correcto y recuperación de error sin perder páginas.
4. **Atender una Señal** — detalle en modal (sin perder la posición del feed), `PATCH` de estado
   con la acción deshabilitada en vuelo, confirmación, manejo de error accionable y reflejo del
   cambio en el feed.
5. **Sector Story Engine** — scrollytelling con visual persistente por etapa, progreso de
   recorrido, CSS scroll-driven animations con fallback, View Transition API con fallback,
   soporte `prefers-reduced-motion`, navegación por teclado y paridad desktop/mobile.

---

## Decisiones técnicas importantes

- **URL como fuente de verdad** del estado de filtros/página/sort (`useSearchParams`), para
  restaurar al recargar y al compartir el enlace.
- **Capa de datos a mano** con `fetch` envuelto en un cliente tipado (`src/lib/api.ts`) que
  adjunta el JWT, serializa query params y normaliza errores a un `ApiError`. Sin React Query.
- **Protección contra respuestas tardías** combinando `AbortController` (cancela la request
  anterior) con un guard por secuencia/hash de filtros (descarta respuestas obsoletas).
- **Infinite scroll** con `IntersectionObserver` nativo, dedup por `Set` de IDs y un único
  fetch en vuelo a la vez.
- **Detalle de señal como modal vía search param** (`?signal=<id>`) para no desmontar el feed
  y conservar la posición de scroll; el resultado del `PATCH` se refleja en la lista por id.
- **Scrollytelling** con panel sticky y `IntersectionObserver` para la etapa activa; APIs
  modernas (scroll-driven animations, View Transitions) detectadas por feature-detect con
  fallback funcional y respeto a `prefers-reduced-motion`.
- **Deploy SPA** con `vercel.json` (rewrites a `index.html`) para que cualquier ruta abra
  directo, incluido el refresh en rutas profundas.

## Estructura

```txt
src/
  types/         tipos de la API (DTOs, enums)
  lib/           cliente HTTP tipado
  auth/          contexto de auth + ruta protegida
  layout/        shell de la app (nav + outlet)
  components/ui/ primitivos (Spinner, ErrorState, EmptyState, Badge)
  features/
    auth/        login
    dashboard/   KPIs
    tropels/     atlas (CP2)
    signals/     feed infinito + atender (CP3, CP4)
    sectors/     story engine (CP5)
```
