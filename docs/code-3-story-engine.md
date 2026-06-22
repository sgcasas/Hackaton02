# Code 3 — Sector Story Engine (Checkpoint 5, el reto HARD)

**Cubre:** Checkpoint 5 — el corazón de la hackathon. Es el más difícil y el más fácil de
hacer mal "decorativo". Lee con calma los requisitos: el TA valida **comportamiento real**,
no que se vea animado.

Lee antes: `00-plan-general.md`, `01-contrato-api.md`, `02-interfaces-compartidas.md`.

---

## Eres dueño de

```txt
src/features/sectors/   → SectorsPage.tsx, SectorStoryPage.tsx, + componentes/hooks/CSS propios
```

Importas (no editas) de Code 1: `api` (`src/lib/api`), tipos `SectorsResponse`, `SectorStory`,
`StoryStage` (`src/types/api`), y `Spinner/ErrorState/EmptyState` (`src/components/ui`).

Mientras Code 1 termina la fundación (~min 20), adelanta TODO el CSS del scrollytelling, el
mapeo `colorToken`→tema, `assetKey`→patrón visual, y el hook de etapa activa con datos mock
locales (luego cambias el mock por `api.get<SectorStory>`).

---

## Las dos pantallas

### `SectorsPage.tsx` (`/sectors`) — resumen

`GET /sectors` → lista de sectores (cards con `name`, `climate`, `stabilityLevel`,
`currentLoad/capacity`). Cada card lleva a `/sectors/:id/story`. Esta es la pantalla "resumen"
desde la que se hace la **View Transition** hacia la historia.

### `SectorStoryPage.tsx` (`/sectors/:id/story`) — scrollytelling

`GET /sectors/:id/story` → `{ sector, stages[8] }`. Aquí va todo el reto.

---

## Requisitos del CP5 y cómo resolver cada uno

### 1. Narrativa por etapas activadas por scroll + visual persistente que cambia

Layout de scrollytelling clásico:

- Un **panel visual sticky** (`position: sticky; top: 0; height: 100vh`) que **no se desmonta**
  y cambia según la etapa activa (color, patrón del `assetKey`, métricas).
- Una columna de **8 bloques narrativos** altos (uno por etapa), que el usuario recorre con
  scroll. Cada bloque muestra `title`, `narrative`, `dominantEvent`.
- En **desktop**: dos columnas (visual sticky a un lado, narrativa al otro). En **mobile**: el
  visual sticky arriba (`top:0`, ~45vh) y la narrativa debajo. Mismo comportamiento, distinto
  acomodo. Usa breakpoints de Tailwind.

**Detección de etapa activa** con IntersectionObserver (robusto y con buen fallback):

```ts
const [active, setActive] = useState(0);
useEffect(() => {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx));
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });  // "línea central" del viewport
  stageRefs.current.forEach(el => el && obs.observe(el));
  return () => obs.disconnect();
}, [stages.length]);
```

El panel visual usa `stages[active]`: `colorToken` define el tema, `metrics` se muestran
(stability/energy/alerts...), `assetKey` elige un patrón CSS. **Las métricas DEBEN
corresponder a la etapa activa** (el TA lo verifica explícitamente).

> `colorToken` (`emerald`, etc.) → mapea a clases/variables CSS propias. `assetKey`
> (`pixel-forest-dawn`, etc.) → mapea a un patrón visual hecho con CSS (gradientes,
> `radial-gradient`, grid, shapes). **Nada de video, GIF, canvas pregrabado ni lista de cards
> con animación decorativa** → eso invalida la entrega.

### 2. Progreso del recorrido

Barra de progreso del scroll (0→1 a lo largo de la historia).

- **Con scroll-driven animations** (preferido): una barra con
  `animation-timeline: scroll()` que escala en X según el avance.
  ```css
  @supports (animation-timeline: scroll()) {
    .progress-bar { transform-origin: left; animation: grow linear; animation-timeline: scroll(root block); }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  }
  ```
- **Fallback** sin soporte: listener de scroll en JS que calcula `scrollTop/(scrollHeight-clientHeight)`
  y setea el width. (También sirve mostrar `active/(stages.length-1)`.)

### 3. CSS Scroll-driven Animations con soporte + fallback funcional

- **Feature-detect**: `const supportsSDA = CSS.supports('animation-timeline: scroll()')`
  (o `view()`), y/o `@supports (animation-timeline: scroll())` en CSS.
- Si hay soporte: la barra de progreso y/o transiciones de entrada de cada bloque usan
  `animation-timeline: view()`.
- Si NO hay soporte: el IntersectionObserver de arriba ya da el comportamiento equivalente
  (etapa activa + progreso por JS). **El contenido se ve completo igual.** El fallback debe
  ser *funcional*, no "se rompe".

Doc de referencia permitido:
https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations

### 4. View Transition API entre resumen e historia con soporte + fallback

Al navegar de `SectorsPage` (resumen) → `SectorStoryPage` (historia):

```ts
function goToStory(id: string) {
  if ('startViewTransition' in document && !prefersReducedMotion()) {
    (document as any).startViewTransition(() => navigate(`/sectors/${id}/story`));
  } else {
    navigate(`/sectors/${id}/story`);        // fallback: navegación normal
  }
}
```

Para un morph bonito, dale `view-transition-name` a un elemento compartido (ej. el título o el
bloque de color del sector) en ambas pantallas. Si no hay soporte, navega normal (o un fade CSS).
Doc: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API

### 5. `prefers-reduced-motion`

- En CSS: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`
  y desactiva las scroll-driven animations.
- En JS: `const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;`
  → si es true, **no** llames `startViewTransition`, y cambia de etapa al instante.
- **Clave**: con reduced motion, **todo el contenido debe seguir visible y accesible** (las 8
  etapas, sus textos y métricas). Nunca escondas contenido detrás de una animación que no
  corre. Una animación que ignora reduced motion **invalida la entrega**.

### 6. Navegación por teclado sin perder contenido

- El contenedor de la historia es enfocable (`tabIndex={0}`). Con `ArrowDown`/`ArrowUp` (y
  opcionalmente `j`/`k` o `PageUp/PageDown`) se avanza/retrocede de etapa: actualiza `active`
  y hace `stageRefs.current[next]?.scrollIntoView({ behavior: prefersRM ? 'auto':'smooth', block:'center' })`.
- Todas las etapas deben ser **alcanzables por teclado** y su texto presente en el DOM (no
  generado solo al hacer scroll con mouse). Foco visible.
- Que `Tab` recorra los controles (links, botones) sin saltarse contenido.

### 7. Estados

`GET /sectors/:id/story` con loading (`<Spinner/>`), error (`<ErrorState onRetry/>`), y el
caso ok con 8 etapas. Sector inexistente → 404 del backend → muestra error con vuelta a
`/sectors`.

---

## Validación TA (CP5) — tenlo a la vista mientras construyes

1. Recorrer toda la historia en **desktop**: el visual sticky cambia por etapa, progreso avanza.
2. Cambiar a **mobile**: mismo comportamiento (visual arriba, narrativa abajo).
3. Activar **reduced motion**: sin animaciones, **todo el contenido visible**, cambios al
   instante.
4. Navegar por **teclado**: flechas mueven etapa, foco visible, nada de contenido perdido.
5. Verificar que **las métricas correspondan a la etapa activa**.

Y los globales: `typecheck` ok, `build` ok, deep-link en deploy ok (refrescar en
`/sectors/<id>/story` debe funcionar — eso lo asegura el `vercel.json` de Code 1), cero `any`.

---

## Trampa común (no caigas)

"Una lista de cards con animación decorativa" **NO cuenta** y es rechazo directo. Tiene que ser
un scrollytelling de verdad: visual persistente que se transforma según la etapa activada por
el scroll, con datos del endpoint. Construye el visual con CSS, no con imágenes pregrabadas.

---

## PROMPT DE ARRANQUE (pégalo en Code 3)

```text
Eres Code 3 en una hackathon de frontend de 2 horas (equipo de 3, 3 Claude Codes en paralelo).
App: "TropelCare Control Room" — React 18 + TS estricto + Vite + React Router + Tailwind, que
consume una API cerrada que YA existe (no la creamos). Evaluación todo-o-nada: los 5
checkpoints = 20, uno falla = 0.

Tu rol: Checkpoint 5, el "Sector Story Engine" — una experiencia de scrollytelling real basada
SOLO en datos del endpoint /sectors/:id/story. Es el reto hard. Trabajas en la rama feat/story.

Lee primero y respeta:
- docs/00-plan-general.md
- docs/01-contrato-api.md
- docs/02-interfaces-compartidas.md
- docs/code-3-story-engine.md   ← tus instrucciones detalladas

Reglas duras:
- Eres dueño SOLO de src/features/sectors. Importas (sin editar) de Code 1: `api`
  (src/lib/api), los tipos SectorsResponse/SectorStory/StoryStage (src/types/api) y
  Spinner/ErrorState/EmptyState. No toques App.tsx ni nada compartido; si necesitas un cambio,
  pídemelo.
- TS estricto, CERO `any` en respuestas de API.
- Scrollytelling REAL: visual persistente (sticky) que cambia según la etapa activada por
  scroll, con métricas que corresponden a la etapa activa. PROHIBIDO video, GIF, canvas
  pregrabado o lista de cards con animación decorativa: invalida la entrega.
- Debes implementar: narrativa por etapas con IntersectionObserver, barra de progreso,
  CSS scroll-driven animations CON feature-detect y fallback funcional, View Transition API
  entre /sectors y /sectors/:id/story con fallback, comportamiento equivalente desktop/mobile,
  prefers-reduced-motion (todo el contenido visible y cambios instantáneos), y navegación por
  teclado (flechas mueven de etapa, foco visible, sin perder contenido).
- El visual se construye con CSS mapeando colorToken→tema y assetKey→patrón. Nada de URLs de
  imagen generadas.

Mientras Code 1 sube la fundación (~min 20), adelanta TODO el CSS y la lógica de etapa activa
con datos mock locales; luego cambia el mock por `api.get<SectorStory>('/sectors/:id/story')`.
Cuando Code 1 avise "fundación lista", haz `git fetch && git merge origin/main`.

Plan: 1) SectorsPage (lista, cards, link a story). 2) SectorStoryPage: layout sticky + 8
bloques + IntersectionObserver de etapa activa + panel visual con métricas de la etapa.
3) Progreso + scroll-driven con fallback. 4) View Transition con fallback. 5) reduced-motion +
teclado + responsive.

Antes de escribir, dime en 6 líneas tu plan de layout y cómo harás el fallback de cada API
moderna. Luego ejecuta la pantalla de lista y el esqueleto del scrollytelling.
```
