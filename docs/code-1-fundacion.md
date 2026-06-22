# Code 1 — Fundación · Auth · Dashboard · Deploy

**Cubre:** Checkpoint 1 + toda la infraestructura compartida + el deploy.
**Eres el que desbloquea a Code 2 y Code 3.** Tu prioridad #1 es subir la fundación a `main`
lo antes posible (objetivo: minuto 20). Todo lo demás viene después.

Lee antes: `00-plan-general.md`, `01-contrato-api.md`, `02-interfaces-compartidas.md`.

---

## Eres dueño de

```txt
src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts
src/types/api.ts
src/lib/api.ts
src/auth/AuthContext.tsx, src/auth/ProtectedRoute.tsx
src/layout/AppShell.tsx
src/components/ui/   (Spinner, ErrorState, EmptyState, Badge)
src/features/auth/LoginPage.tsx
src/features/dashboard/DashboardPage.tsx
vercel.json, .env.example, README.md, tailwind.config.js, package.json scripts
```

**Nadie más edita estos archivos.** Si Code 2/3 piden un cambio en lo compartido, lo haces tú.

---

## Orden de trabajo (crítico: fundación primero)

### Bloque A — Fundación que desbloquea (hazlo y haz PUSH a `main` ya)

1. **Scaffold** (si no está): Vite `react-ts`, Tailwind (`@tailwind base/components/utilities`
   en `index.css`), React Router, scripts en `package.json`:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "tsc -b && vite build",
     "typecheck": "tsc --noEmit",
     "preview": "vite preview"
   }
   ```
   `tsconfig` con `"strict": true`. Si no está, actívalo.

2. **`src/types/api.ts`** — todos los DTOs y enums tal como están en
   `02-interfaces-compartidas.md`. Sin `any`.

3. **`src/lib/api.ts`** — cliente HTTP con la firma exacta del doc 02:
   - lee `import.meta.env.VITE_API_BASE_URL`;
   - lee el token de `localStorage` (key `tropelcare_token`) y manda `Authorization: Bearer`;
   - serializa `params` omitiendo `undefined` y `''`;
   - en no-2xx parsea el body `{error,message,...}` y hace `throw new ApiError(status, error, message, details)`;
   - acepta `signal` y deja propagar `AbortError`.
   Esqueleto:
   ```ts
   const BASE = import.meta.env.VITE_API_BASE_URL as string;
   function buildQuery(params?: Record<string, string|number|undefined>) {
     if (!params) return '';
     const q = new URLSearchParams();
     for (const [k, v] of Object.entries(params))
       if (v !== undefined && v !== '') q.set(k, String(v));
     const s = q.toString(); return s ? `?${s}` : '';
   }
   async function request<T>(method: string, path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
     const token = localStorage.getItem('tropelcare_token');
     const res = await fetch(`${BASE}${path}${buildQuery(opts?.params)}`, {
       method,
       headers: {
         'Content-Type': 'application/json',
         ...(token ? { Authorization: `Bearer ${token}` } : {}),
       },
       body: body !== undefined ? JSON.stringify(body) : undefined,
       signal: opts?.signal,
     });
     if (!res.ok) {
       let payload: any = {};
       try { payload = await res.json(); } catch { /* ignore */ }
       throw new ApiError(res.status, payload.error ?? 'ERROR', payload.message ?? res.statusText, payload.details);
     }
     if (res.status === 204) return undefined as T;
     return res.json() as Promise<T>;
   }
   export const api = {
     get:   <T>(p: string, o?: RequestOptions) => request<T>('GET', p, undefined, o),
     post:  <T>(p: string, b: unknown, o?: RequestOptions) => request<T>('POST', p, b, o),
     patch: <T>(p: string, b: unknown, o?: RequestOptions) => request<T>('PATCH', p, b, o),
   };
   ```

4. **`src/auth/AuthContext.tsx`** — `AuthProvider` + `useAuth()` con la firma del doc 02:
   - guarda token en `localStorage` (`tropelcare_token`);
   - al montar, si hay token, `status='checking'` y llama `GET /auth/me`; si responde, hidrata
     `user` y `status='authenticated'`; si falla (401), limpia y `status='unauthenticated'`;
   - `login()` hace `POST /auth/login`, guarda token, hidrata user;
   - `logout()` limpia token y user.

5. **`src/auth/ProtectedRoute.tsx`** — si `status==='checking'` muestra `<Spinner/>`; si
   `'unauthenticated'` `<Navigate to="/login" replace/>`; si `'authenticated'` renderiza
   `<Outlet/>`.

6. **`src/components/ui/`** — `Spinner`, `ErrorState({message,onRetry})`,
   `EmptyState({title,hint})`, `Badge({tone,children})`. Simples, Tailwind.

7. **`src/layout/AppShell.tsx`** — nav (Dashboard, Tropeles, Señales, Sectores) + `<Outlet/>`
   + botón Logout. Usa `<NavLink>`.

8. **`src/App.tsx`** — **declara TODAS las rutas con `React.lazy`** según la tabla del doc 02,
   aunque los archivos de Code 2/3 aún no existan (Vite no falla hasta que se navega a ellas;
   y para cuando integren, ya existirán). Estructura:
   ```tsx
   <BrowserRouter>
     <AuthProvider>
       <Suspense fallback={<Spinner/>}>
         <Routes>
           <Route path="/login" element={<LoginPage/>} />
           <Route element={<ProtectedRoute/>}>
             <Route element={<AppShell/>}>
               <Route index element={<Navigate to="/dashboard" replace/>} />
               <Route path="dashboard" element={<DashboardPage/>} />
               <Route path="tropels" element={<TropelsPage/>} />
               <Route path="tropels/:id" element={<TropelDetailPage/>} />
               <Route path="signals" element={<SignalsFeedPage/>} />
               <Route path="sectors" element={<SectorsPage/>} />
               <Route path="sectors/:id/story" element={<SectorStoryPage/>} />
             </Route>
           </Route>
           <Route path="*" element={<Navigate to="/dashboard" replace/>} />
         </Routes>
       </Suspense>
     </AuthProvider>
   </BrowserRouter>
   ```

> ✅ **En cuanto A compile (`npm run typecheck` ok), haz commit + push a `main`** y avisa al
> equipo: "fundación lista". A partir de aquí Code 2 y Code 3 dejan de estar bloqueados.

### Bloque B — CP1 (después del push)

9. **`features/auth/LoginPage.tsx`** — form con `teamCode`, `email`, `password`. NO uses
   `<form>` con submit nativo problemático; un `<form onSubmit>` con `preventDefault` está
   bien. Llama `useAuth().login(...)`. Maneja loading (botón deshabilitado + spinner) y error
   (mensaje del `ApiError`). Si ya está autenticado, redirige a `/dashboard`. Puedes
   pre-rellenar credenciales en dev para ir rápido (no en prod).

10. **`features/dashboard/DashboardPage.tsx`** — `GET /dashboard/summary`. Estados:
    - **loading**: skeleton/spinner sin mover layout;
    - **error**: `<ErrorState onRetry={refetch}/>`;
    - **empty**: improbable, pero contempla `null`;
    - **ok**: tarjetas KPI (`totalTropels`, `criticalTropels`, `openSignals`,
      `sectorStabilityAvg`) + desglose `signalsBySeverity`.
    Usa un hook simple `useDashboard()` con `useEffect` + `AbortController` en cleanup.

### Bloque C — Deploy (tuyo, en la fase de integración)

11. **`vercel.json`** (deep-links SPA — sin esto, refrescar en `/sectors/x/story` da 404 y es
    **0**):
    ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```
12. **`.env.example`** con `VITE_API_BASE_URL=` y `.gitignore` con `.env`.
13. Deploy a Vercel: build `npm run build`, output `dist`, env var `VITE_API_BASE_URL` con la
    URL real del backend del equipo. Verifica que **refrescar en una ruta profunda funcione**.
14. Mantienes el **README** (plantilla en la raíz del repo) con integrantes, instalación,
    variables, link del deploy y decisiones técnicas.

---

## Validaciones que tu parte debe pasar (CP1)

1. Abrir `/dashboard` sin sesión → redirige a `/login`.
2. Login con credenciales del equipo → entra al dashboard con datos reales.
3. Recargar la página → sigue logueado (gracias a `/auth/me`).
4. Logout → vuelve a `/login` y `/dashboard` queda protegido otra vez.

Y los globales: `typecheck` ok, `build` ok, deep-link en deploy ok, cero `any`.

---

## PROMPT DE ARRANQUE (pégalo en Code 1)

```text
Eres Code 1 en una hackathon de frontend de 2 horas (equipo de 3, trabajamos con 3 Claude
Codes en paralelo). Construimos "TropelCare Control Room": React 18 + TypeScript estricto +
Vite + React Router + Tailwind, que consume una API cerrada que ya existe (NO la creamos).
Evaluación todo-o-nada: 5 checkpoints completos = 20, uno falla = 0.

Tu rol: FUNDACIÓN compartida + Checkpoint 1 (auth/dashboard) + deploy. Eres quien desbloquea
a Code 2 y Code 3, así que tu prioridad absoluta es dejar la fundación compilando y subida a
`main` lo antes posible.

Lee primero estos archivos del repo y respétalos al pie de la letra:
- docs/00-plan-general.md
- docs/01-contrato-api.md
- docs/02-interfaces-compartidas.md
- docs/code-1-fundacion.md   ← tus instrucciones detalladas

Reglas duras:
- Eres dueño exclusivo de: src/types, src/lib, src/auth, src/layout, src/components/ui,
  src/App.tsx, src/features/auth, src/features/dashboard, vercel.json, README, scripts.
  Nadie más edita eso; Code 2 y Code 3 SOLO importan tus interfaces.
- TypeScript estricto, CERO `any` en respuestas de API. `npm run typecheck` y `npm run build`
  deben pasar.
- En App.tsx declara TODAS las rutas de la tabla del doc 02 con React.lazy, incluidas las de
  Code 2 y Code 3 (sus archivos aún no existen; está bien).
- vercel.json con rewrites SPA (deep-links) es obligatorio o la entrega es 0.

Plan de ejecución:
1) Scaffold (si falta) + Bloque A del doc code-1 (types, api client, auth, ProtectedRoute,
   ui base, AppShell, App.tsx con todas las rutas). En cuanto compile, commit + push a main y
   avísame para desbloquear a los demás.
2) Bloque B: LoginPage y DashboardPage con loading/error/empty reales contra el backend.
3) Bloque C: vercel.json, .env.example, deploy a Vercel, verificar deep-link, mantener README.

Empieza por el Bloque A. Antes de escribir, dime en 5 líneas tu plan y qué archivos vas a
crear primero. Luego ejecuta.
```
