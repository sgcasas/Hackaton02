# 00 · Plan general — TropelCare Control Room

## Qué hay que construir (resumen)

Una consola operativa en **React 18 + TypeScript estricto + Vite + React Router + Tailwind**
que consume una API cerrada (ya existe, nos la dan). Cinco checkpoints, evaluación
**todo-o-nada**: los 5 completos y demostrables en el deploy = **20**; uno incompleto o una
validación que falla = **0**.

| CP | Nombre | Dificultad | Dueño |
|:--:|:-------|:----------:|:-----:|
| 1 | Encender la consola (login, sesión, dashboard) | fácil | Code 1 |
| 2 | Atlas de Tropeles (paginación + filtros + URL) | media | Code 2 |
| 3 | Feed infinito (cursor + dedup + cancelación) | media | Code 2 |
| 4 | Atender una señal (detalle + PATCH estado) | media | Code 2 |
| 5 | Sector Story Engine (scrollytelling) | **hard** | Code 3 |

Además, requisitos globales que también deben cumplirse o es **0**:

- `npm run typecheck` sin errores.
- `npm run build` sin errores.
- **Cero `any`** para respuestas de API.
- El deploy **abre directamente en cualquier ruta** (deep-link, refresh en `/sectors/x/story`
  no debe dar 404).
- Sin data hardcodeada, sin paginación simulada en cliente, sin botón "Cargar más"
  (debe ser infinite scroll real).

---

## Por qué el reparto es por carpetas y no por checkpoint

Con 3 Claude Codes en paralelo, lo que mata una hackathon de 2h son los **conflictos de
merge** y la **fundación compartida**. La solución:

1. **Code 1 construye la fundación primero** (tipos, cliente HTTP, auth, router con todas
   las rutas ya cableadas, layout, UI base) y la sube a `main` lo antes posible.
2. Code 2 y Code 3 son **dueños de carpetas distintas** (`features/tropels` + `features/signals`
   vs `features/sectors`) y programan contra interfaces ya definidas en
   `02-interfaces-compartidas.md`.
3. Nadie más toca `App.tsx`, `lib/`, `auth/`, `types/`: son de Code 1.

Resultado: los merges son casi triviales porque cada quien escribe en su propio directorio.

---

## Flujo de Git (recomendado: ramas + handshake de fundación)

Repo único en GitHub. Tres ramas de trabajo + `main`.

```txt
main                         ← fundación + integración final (Code 1 manda aquí)
  feat/foundation  (Code 1)  ← se mergea a main MUY rápido (~min 20)
  feat/atlas-feed  (Code 2)  ← CP2 + CP3 + CP4
  feat/story       (Code 3)  ← CP5
```

### Fase 0 — Arranque (minuto 0)

Una sola persona crea el repo y hace el primer commit con el scaffold base de Vite. Esto lo
hace **Code 1**:

```bash
npm create vite@latest tropelcare -- --template react-ts
cd tropelcare && npm i && npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
npm i react-router-dom
git init && git add -A && git commit -m "chore: scaffold vite+ts+tailwind+router"
git branch -M main
git remote add origin <url-del-repo> && git push -u origin main
```

### Fase 1 — Fundación (min 0–20)

- **Code 1** trabaja en `main` (o `feat/foundation`) y construye toda la fundación + login +
  dashboard. Apenas la fundación compila (`tsc --noEmit` ok), hace **push a `main`**.
- **Code 2 y Code 3** arrancan **en paralelo** en sus ramas, partiendo del scaffold:
  ```bash
  git checkout -b feat/atlas-feed origin/main   # Code 2
  git checkout -b feat/story      origin/main   # Code 3
  ```
  Mientras Code 1 termina, ellos ya escriben la parte que **no depende** de la fundación
  (markup de filtros, CSS del scrollytelling, hooks de IntersectionObserver, etc.).

### Handshake de fundación (≈ min 20)

Cuando Code 1 hace push de la fundación a `main`, Code 2 y Code 3 la traen:

```bash
git fetch origin && git merge origin/main   # o: git rebase origin/main
```

Desde aquí ya tienen `api`, `useAuth`, los tipos y el router reales. Borran cualquier stub
temporal que hayan usado.

### Fase 2 — Features en paralelo (min 20–90)

Cada Code avanza en su rama, commits chicos y frecuentes. Si alguien necesita un cambio en lo
compartido, **lo pide a Code 1**; nadie más edita `lib/`, `auth/`, `types/`, `App.tsx`.

### Fase 3 — Integración (min 90–110)

1. Code 2 y Code 3 hacen `git merge origin/main` para estar al día, resuelven (casi no hay
   conflictos por el reparto de carpetas), y abren PR → `main`.
2. Code 1 mergea ambos PRs a `main`.
3. En `main`: `npm run typecheck && npm run build`. Se arregla lo que rompa.

### Fase 4 — Deploy y verificación (min 110–120)

- Code 1 despliega `main` a Vercel, configura `VITE_API_BASE_URL` y `vercel.json` con
  rewrites SPA (deep-links).
- Los 3 corren **las validaciones del TA** sobre el deploy real (ver checklist abajo).

> **Alternativa más simple si las ramas se complican:** trabajar todos en `main` con
> **rebase frecuente** (`git pull --rebase` antes de cada push). Como cada quien edita
> carpetas distintas, los conflictos son mínimos. Funciona porque el reparto de archivos ya
> está aislado. Úsenla solo si el flujo de ramas les está costando tiempo.

### Git worktrees (opcional, para correr 3 Claude Codes a la vez en la misma máquina)

Si los 3 Codes corren en una sola máquina, usen worktrees para no pelear por el working dir:

```bash
git worktree add ../tropel-code2 feat/atlas-feed
git worktree add ../tropel-code3 feat/story
```

Cada Claude Code abre su propio directorio. Comparten el mismo `.git`.

---

## Timeline objetivo (2 horas)

| Tiempo | Code 1 | Code 2 | Code 3 |
|:------:|:-------|:-------|:-------|
| 0:00–0:20 | Scaffold + fundación + login | Leer docs + filtros UI + hook fetch | Leer docs + CSS scrollytelling + IO |
| ~0:20 | **Push fundación a main** | Merge main, conectar `api` real | Merge main, conectar `api` real |
| 0:20–1:00 | Dashboard + estados + vercel.json | CP2 Atlas (URL + stale guard) | CP5 visual + etapas activas |
| 1:00–1:30 | Pulir layout + deploy preview | CP3 feed + CP4 atender | CP5 scroll-driven + view transitions + a11y |
| 1:30–1:50 | Integrar PRs en main | Merge + fix typecheck | Merge + fix typecheck |
| 1:50–2:00 | Deploy final | Validar CP2/3/4 en deploy | Validar CP5 en deploy |

---

## Checklist final de evaluación (correr en el DEPLOY, no en local)

**CP1** — Abrir `/dashboard` sin sesión → manda a login. Login → entra. Recargar → sigue
logueado. Logout → vuelve a login. Dashboard muestra datos reales (no ceros hardcodeados).

**CP2** — Cambiar filtros y página rápido; cambiar el sort durante una request; copiar la URL
y abrirla en otra pestaña (mismo estado); en Network no aparecen resultados de una request
vieja pisando a la nueva.

**CP3** — Scroll rápido por varias páginas (carga sola, sin botón); cambiar filtros con una
request en vuelo (se cancela/descarta y reinicia); forzar un error en una página posterior
(no borra lo cargado, ofrece reintentar); en Network: **una sola** request adicional a la vez
y **sin IDs repetidos**.

**CP4** — Abrir una señal desde una página avanzada del feed (no pierde la posición); cambiar
estado (botón se deshabilita mientras va la request, muestra confirmación); volver y ver el
estado actualizado en el feed; forzar error en el PATCH → mensaje accionable + estado previo
intacto + permite reintentar.

**CP5** — Recorrer toda la historia en desktop; cambiar a mobile (mismo comportamiento);
activar reduced motion (sin animaciones, contenido completo visible); navegar por teclado (sin
perder contenido); las métricas del panel corresponden a la etapa activa.

**Globales** — `npm run typecheck` ok · `npm run build` ok · cero `any` en respuestas API ·
el deploy abre directo en cualquier ruta (probar refrescar en `/sectors/<id>/story`).

---

## Lo que invalida la entrega (releer antes de entregar)

- Data hardcodeada o paginación simulada en cliente.
- Botón "Cargar más" en vez de infinite scroll.
- Una actualización (PATCH) que no maneja loading o error.
- Una animación que ignora `prefers-reduced-motion`.
- `any` en respuestas de API.
- Deploy que no abre directo en una ruta profunda.

---

## Archivos de este paquete

- `01-contrato-api.md` — contrato congelado de la API (todos lo leen).
- `02-interfaces-compartidas.md` — dueños de carpetas + firmas compartidas + rutas (todos).
- `code-1-fundacion.md` — instrucciones + prompt de Code 1.
- `code-2-atlas-feed.md` — instrucciones + prompt de Code 2.
- `code-3-story-engine.md` — instrucciones + prompt de Code 3.
- `README.md` (en la raíz) — plantilla del README entregable.
