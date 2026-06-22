# 02 · Interfaces compartidas (el contrato entre los 3 Codes)

> Este archivo es lo que permite que los 3 Claude Codes trabajen **en paralelo sin pisarse**.
> Define quién es dueño de qué carpeta, las firmas exactas de lo compartido y la tabla de
> rutas. **Code 1 IMPLEMENTA estos archivos. Code 2 y Code 3 los CONSUMEN tal cual** (no los
> editan). Si algo de esto cambia, se anuncia en el canal del equipo antes de tocarlo.

---

## Estructura de carpetas y dueños

```txt
src/
  main.tsx                      # Code 1
  App.tsx                       # Code 1  ← router con TODAS las rutas (lazy)
  index.css                     # Code 1  ← Tailwind + tokens de color
  vite-env.d.ts                 # Code 1
  types/
    api.ts                      # Code 1  ← todos los DTOs + enums (sin any)
  lib/
    api.ts                      # Code 1  ← cliente HTTP (get/patch/post, ApiError)
  auth/
    AuthContext.tsx             # Code 1  ← useAuth(), AuthProvider
    ProtectedRoute.tsx          # Code 1
  layout/
    AppShell.tsx                # Code 1  ← nav lateral + <Outlet/>
  components/ui/                # Code 1  ← Spinner, ErrorState, EmptyState, Badge
  features/
    dashboard/                  # ◄ Code 1
    tropels/                    # ◄ Code 2   (CP2)
    signals/                    # ◄ Code 2   (CP3 + CP4)
    sectors/                    # ◄ Code 3   (CP5)
```

**Regla de oro:** cada Code solo edita su(s) carpeta(s). Lo de `lib/`, `auth/`, `types/`,
`layout/`, `components/ui/` y `App.tsx` es **propiedad exclusiva de Code 1**. Code 2 y Code 3
los importan, nunca los modifican. Esto elimina ~95% de los conflictos de merge.

---

## `src/types/api.ts` (lo crea Code 1, lo importan todos)

Firma esperada (Code 1 la implementa completa con todos los campos del contrato):

```ts
export type Species = 'BLOBITO' | 'CHISPA' | 'GRUNON' | 'DORMILON' | 'GLITCHY';
export type VitalState = 'ESTABLE' | 'HAMBRIENTO' | 'AGITADO' | 'MUTANDO' | 'CRITICO';
export type SignalType =
  | 'HAMBRE' | 'ABANDONO' | 'MUTACION' | 'FUGA'
  | 'CONFLICTO' | 'REPRODUCCION_MASIVA' | 'SENAL_CORRUPTA';
export type Severity = 'LEVE' | 'MODERADO' | 'GRAVE' | 'CRITICO';
export type SignalStatus = 'RECIBIDA' | 'PROCESANDO' | 'ATENDIDA';
export type Climate = 'PIXEL_FOREST' | 'NEON_CAVE' | 'CLOUD_AQUARIUM' | 'RETRO_ARCADE';

export interface User {
  id: string; displayName: string; email: string; teamCode: string; role: string;
}
export interface LoginResponse { token: string; expiresAt: string; user: User; }

export interface DashboardSummary {
  totalTropels: number; criticalTropels: number; openSignals: number;
  sectorStabilityAvg: number;
  signalsBySeverity: Record<Severity, number>;
  generatedAt: string;
}

export interface Tropel {
  id: string; name: string; species: Species; vitalState: VitalState;
  energyLevel: number; chaosIndex: number; mutationStage: number; guardianName: string;
  sector: { id: string; name: string; sectorCode: string };
  createdAt: string; updatedAt: string;
}
export interface Page<T> {
  content: T[]; totalElements: number; totalPages: number; currentPage: number; size: number;
}

export interface Signal {
  id: string; signalType: SignalType; severity: Severity; status: SignalStatus;
  rawContent: string;
  tropel: { id: string; name: string; species: Species };
  createdAt: string; updatedAt: string;
}
export interface SignalFeed {
  items: Signal[]; nextCursor: string | null; hasMore: boolean; totalEstimate: number;
}

export interface SectorListItem {
  id: string; sectorCode: string; name: string; climate: Climate;
  capacity: number; currentLoad: number; stabilityLevel: number;
}
export interface SectorsResponse { items: SectorListItem[]; }

export interface StoryStage {
  id: string; order: number; title: string; narrative: string; dominantEvent: string;
  metrics: Record<string, number>; assetKey: string; colorToken: string; progress: number;
}
export interface SectorStory {
  sector: { id: string; name: string; climate: Climate };
  stages: StoryStage[];
}
```

> **Prohibido `any` en respuestas de API** (invalida la entrega). Todo se tipa con esto.

---

## `src/lib/api.ts` (lo crea Code 1, lo importan todos)

Firma **fija** contra la que Code 2 y Code 3 programan desde el minuto cero:

```ts
export class ApiError extends Error {
  status: number;            // 400, 401, 404, 429, 500...
  code: string;              // 'VALIDATION_ERROR' | 'UNAUTHORIZED' | ...
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown);
}

export interface RequestOptions {
  // params: se serializan a query string; undefined/'' se OMITEN automáticamente
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;      // para cancelar (AbortController)
}

export const api: {
  get:   <T>(path: string, opts?: RequestOptions) => Promise<T>;
  post:  <T>(path: string, body: unknown, opts?: RequestOptions) => Promise<T>;
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) => Promise<T>;
};
```

Comportamiento garantizado por Code 1:

- Antepone `VITE_API_BASE_URL` a `path` (pasamos paths como `'/tropels'`, sin el base).
- Adjunta `Authorization: Bearer <token>` automáticamente (lee el token del storage de auth).
- Serializa `params` omitiendo `undefined` y `''`.
- En respuesta no-2xx: hace `throw new ApiError(...)` con el body de error parseado.
- Si la request se aborta, deja propagar el `AbortError` del navegador (los consumidores lo
  ignoran como "cancelada", no como error real).

Ejemplos de uso (Code 2 / Code 3):

```ts
const page = await api.get<Page<Tropel>>('/tropels', {
  params: { page: 0, size: 20, sort: 'updatedAt,desc', species: undefined },
  signal: controller.signal,
});

const updated = await api.patch<Signal>(`/signals/${id}/status`, { status: 'ATENDIDA' });
```

---

## `src/auth/AuthContext.tsx` (lo crea Code 1, lo importan todos)

```ts
export interface AuthValue {
  user: User | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  login: (creds: { teamCode: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}
export function useAuth(): AuthValue;
export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
```

- `status === 'checking'` mientras valida el token guardado contra `/auth/me` al recargar.
- El token se guarda en `localStorage` y `api` lo lee de ahí.

---

## `src/components/ui/` (lo crea Code 1, los demás los usan read-only)

Componentes mínimos disponibles para todos (props simples, sin librerías):

```ts
<Spinner size?="sm"|"md"|"lg" />
<ErrorState message: string onRetry?: () => void />
<EmptyState title: string hint?: string />
<Badge tone?="neutral"|"info"|"warn"|"danger"|"success">{children}</Badge>
```

> Si Code 2 o Code 3 necesitan un componente extra, lo crean **dentro de su propia carpeta**
> (ej. `features/signals/SignalCard.tsx`). No agregan archivos a `components/ui/`.

---

## Tabla de rutas (Code 1 las pre-cablea TODAS en `App.tsx`)

Code 1 declara estas rutas con `React.lazy` apuntando a archivos que Code 2/Code 3 crearán.
Así **nadie más toca `App.tsx`** y no hay conflicto en el router.

| Ruta | Componente (default export) | Dueño | Protegida |
|:-----|:----------------------------|:-----:|:---------:|
| `/login` | `features/auth/LoginPage` | Code 1 | no |
| `/` | redirige a `/dashboard` | Code 1 | sí |
| `/dashboard` | `features/dashboard/DashboardPage` | Code 1 | sí |
| `/tropels` | `features/tropels/TropelsPage` | Code 2 | sí |
| `/tropels/:id` | `features/tropels/TropelDetailPage` | Code 2 | sí |
| `/signals` | `features/signals/SignalsFeedPage` | Code 2 | sí |
| `/sectors` | `features/sectors/SectorsPage` | Code 3 | sí |
| `/sectors/:id/story` | `features/sectors/SectorStoryPage` | Code 3 | sí |

> El **detalle de Señal (CP4) NO es una ruta propia**: se abre como modal sobre el feed
> usando un search param `?signal=<id>` (ver `code-2`), para no perder posición de scroll.
> Por eso `/signals/:id` no está en el router.

Contrato de los componentes lazy: **cada uno debe tener `export default`** y renderizar su
propia pantalla completa (asumen que ya están dentro del `AppShell` y con sesión válida).

`App.tsx` (lo escribe Code 1) se verá así:

```tsx
const TropelsPage      = lazy(() => import('./features/tropels/TropelsPage'));
const TropelDetailPage = lazy(() => import('./features/tropels/TropelDetailPage'));
const SignalsFeedPage  = lazy(() => import('./features/signals/SignalsFeedPage'));
const SectorsPage      = lazy(() => import('./features/sectors/SectorsPage'));
const SectorStoryPage  = lazy(() => import('./features/sectors/SectorStoryPage'));
// ...rutas protegidas dentro de <AppShell/> con <Suspense fallback={<Spinner/>}>
```

---

## Variables de entorno

`.env` (la URL la entrega el TA; va al `.gitignore`):

```properties
VITE_API_BASE_URL=https://<backend-url>/api/v1
```

`.env.example` (sí se commitea):

```properties
VITE_API_BASE_URL=
```

`TEAM_CODE`, `EMAIL` y `PASSWORD` **no van en `.env`**: son credenciales que se escriben en
el formulario de login (Code 1 puede pre-rellenar el form en dev para ir rápido, pero no
hardcodear en producción).

---

## Convenciones que todos respetan

- TypeScript **estricto**, componentes en `.tsx`, **cero `any`** en respuestas de API.
- `npm run typecheck` (`tsc --noEmit`) y `npm run build` deben pasar sin errores.
- Tailwind para todo el estilo. Nada de MUI/Chakra/Ant/Mantine ni templates de dashboard.
- Nada de React Query/SWR/TanStack/RTK Query. Data a mano con `fetch` + hooks.
- Nada de librerías de infinite scroll. `IntersectionObserver` nativo.
- El estado de filtros/página vive en la **URL** (`useSearchParams`), no en estado local
  perdible.
- Commits pequeños y frecuentes en tu rama. Nunca commitear directo a `main` salvo Code 1
  en la fase de fundación.
