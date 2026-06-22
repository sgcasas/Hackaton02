# 01 · Contrato de la API (referencia congelada)

> Esta es la **única fuente de verdad** del backend para el frontend. El backend ya existe
> y nos lo entregan cerrado. **No se inventa ningún campo, enum ni endpoint.** Si algo no
> está aquí ni en Swagger, no existe.
>
> El contrato real y completo está en `API_DOCUMENTATION_URL` (Swagger UI). Este archivo es
> el resumen operativo. **Ante cualquier duda, gana Swagger.**

Prefijo de todas las rutas: `/api/v1` (ya incluido en `VITE_API_BASE_URL`).

---

## Autenticación

Rutas protegidas requieren header:

```txt
Authorization: Bearer <jwt_token>
```

### POST `/auth/login`

Body:

```json
{ "teamCode": "TEAM-0XX", "email": "operator@tuckersoft.com", "password": "..." }
```

Respuesta `200`:

```json
{
  "token": "jwt",
  "expiresAt": "2026-06-22T20:00:00Z",
  "user": {
    "id": "usr_001",
    "displayName": "Operator 1",
    "email": "operator@tuckersoft.com",
    "teamCode": "TEAM-001",
    "role": "OPERATOR"
  }
}
```

### GET `/auth/me`  (JWT)

Restaura la sesión. Devuelve el mismo objeto `user` (o equivalente) si el token es válido;
`401` si no lo es.

---

## Dashboard

### GET `/dashboard/summary`  (JWT)

```json
{
  "totalTropels": 120,
  "criticalTropels": 14,
  "openSignals": 83,
  "sectorStabilityAvg": 68,
  "signalsBySeverity": { "LEVE": 210, "MODERADO": 190, "GRAVE": 120, "CRITICO": 80 },
  "generatedAt": "2026-06-22T15:00:00Z"
}
```

---

## Tropeles (paginación clásica)

### GET `/tropels`  (JWT)

Query params:

| Parámetro | Regla |
|:----------|:------|
| `page` | inicia en **0**, default 0 |
| `size` | **10, 20 o 50** (default 20). Otro valor → `400` |
| `species` | filtro opcional (enum `species`) |
| `vitalState` | filtro opcional (enum `vitalState`) |
| `sectorId` | filtro opcional |
| `q` | búsqueda opcional, máx **80** caracteres |
| `sort` | **solo** `name,asc` · `updatedAt,desc` · `chaosIndex,desc` |

Respuesta `200`:

```json
{
  "content": [ /* Tropel DTO[] */ ],
  "totalElements": 120,
  "totalPages": 6,
  "currentPage": 0,
  "size": 20
}
```

### GET `/tropels/{id}`  (JWT) → un Tropel DTO. ID de otro workspace = `404`.

### Tropel DTO

```json
{
  "id": "trp_001",
  "name": "Pixelin",
  "species": "CHISPA",
  "vitalState": "AGITADO",
  "energyLevel": 72,
  "chaosIndex": 31,
  "mutationStage": 2,
  "guardianName": "Ada",
  "sector": { "id": "sec_001", "name": "Bosque Norte", "sectorCode": "SEC-01" },
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-22T14:30:00Z"
}
```

---

## Señales (feed cursor-based)

### GET `/signals/feed`  (JWT)

Query params:

| Parámetro | Regla |
|:----------|:------|
| `cursor` | cursor **opaco** recibido antes. Omitir en la primera página |
| `limit` | default **15**, máximo **30** |
| `signalType` | filtro opcional (enum `signalType`) |
| `severity` | filtro opcional (enum `severity`) |
| `status` | filtro opcional (enum `status`) |
| `q` | búsqueda opcional |

Respuesta `200`:

```json
{
  "items": [ /* Signal DTO[] */ ],
  "nextCursor": "cursor_opaco_o_null",
  "hasMore": true,
  "totalEstimate": 600
}
```

Reglas del feed (importantes para CP3):

- Orden estable: `createdAt DESC`, luego `id DESC`.
- El cursor es **opaco** (incluye un hash de los filtros). **Si cambias un filtro, el cursor
  anterior deja de ser válido** → al cambiar filtros hay que reiniciar el feed (cursor a
  `null`, lista vacía).
- No repite IDs entre páginas (igual hacemos dedup defensivo en cliente).
- El dataset **no cambia solo** durante la evaluación.

### GET `/signals/{id}`  (JWT) → un Signal DTO. Otro workspace = `404`.

### Signal DTO

```json
{
  "id": "sig_001",
  "signalType": "HAMBRE",
  "severity": "GRAVE",
  "status": "RECIBIDA",
  "rawContent": "Patron de energia por debajo del umbral",
  "tropel": { "id": "trp_001", "name": "Pixelin", "species": "CHISPA" },
  "createdAt": "2026-06-22T14:00:00Z",
  "updatedAt": "2026-06-22T14:00:00Z"
}
```

### PATCH `/signals/{id}/status`  (JWT)

Body:

```json
{ "status": "ATENDIDA" }
```

- **Solo** acepta `PROCESANDO` o `ATENDIDA` (no `RECIBIDA`).
- Respuesta `200` = **Signal DTO completo actualizado** (con `updatedAt` nuevo).
- No requiere headers especiales, ETag, ni optimistic update.

---

## Sectores y Story

### GET `/sectors`  (JWT)

```json
{
  "items": [
    {
      "id": "sec_001",
      "sectorCode": "SEC-01",
      "name": "Bosque Norte",
      "climate": "PIXEL_FOREST",
      "capacity": 20,
      "currentLoad": 13,
      "stabilityLevel": 68
    }
  ]
}
```

### GET `/sectors/{id}/story`  (JWT)

Devuelve el sector y **exactamente 8 etapas ordenadas** (`order` 0..7):

```json
{
  "sector": { "id": "sec_001", "name": "Bosque Norte", "climate": "PIXEL_FOREST" },
  "stages": [
    {
      "id": "stage_001",
      "order": 0,
      "title": "Primer pulso",
      "narrative": "La actividad despierta entre pixeles verdes.",
      "dominantEvent": "HAMBRE",
      "metrics": { "stability": 68, "energy": 72, "alerts": 4 },
      "assetKey": "pixel-forest-dawn",
      "colorToken": "emerald",
      "progress": 0
    }
  ]
}
```

- `assetKey` y `colorToken` son **identificadores**, no URLs. El visual se construye con CSS
  y assets locales (mapeamos `colorToken` → clases/variables; `assetKey` → un patrón CSS).
- `metrics` es JSON libre validado; lo mostramos en el panel visual de la etapa activa.

---

## Enums permitidos (copiar tal cual a `types/api.ts`)

```txt
species:    BLOBITO · CHISPA · GRUNON · DORMILON · GLITCHY
vitalState: ESTABLE · HAMBRIENTO · AGITADO · MUTANDO · CRITICO
signalType: HAMBRE · ABANDONO · MUTACION · FUGA · CONFLICTO · REPRODUCCION_MASIVA · SENAL_CORRUPTA
severity:   LEVE · MODERADO · GRAVE · CRITICO
status:     RECIBIDA · PROCESANDO · ATENDIDA   (PATCH solo PROCESANDO/ATENDIDA)
climate:    PIXEL_FOREST · NEON_CAVE · CLOUD_AQUARIUM · RETRO_ARCADE
```

---

## Errores (formato único)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Parametro size invalido",
  "timestamp": "2026-06-22T15:00:00Z",
  "path": "/api/v1/tropels",
  "details": {}
}
```

Códigos: `400 VALIDATION_ERROR` · `401 UNAUTHORIZED` · `404 NOT_FOUND` ·
`429 RATE_LIMITED` (con `Retry-After`) · `500 INTERNAL_ERROR`.

> El cliente HTTP (`src/lib/api.ts`) normaliza todo esto a un `ApiError` tipado. Ver
> `02-interfaces-compartidas.md`.

---

## Detalle clave para CP3 y CP4 (lo que el TA va a forzar)

El backend tiene una herramienta docente privada (no aparece en Swagger) que el TA usa para:

- meter **delay** (0–3000 ms) en la siguiente request,
- forzar un **500** en la siguiente lectura,
- forzar un **500** en el siguiente PATCH.

El efecto se consume **una sola vez**. Por eso CP2/CP3/CP4 deben sobrevivir a:
respuestas que llegan tarde y fuera de orden, y errores puntuales **sin perder** lo ya
cargado. No es teoría: lo van a probar en vivo.
