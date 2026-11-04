@AGENTS.md

# Proyecto: APP_NAME — 100 planes en Bogotá

App móvil con ~100 planes curados en Bogotá. El usuario explora el catálogo, va al
lugar, hace check-in con foto (validado a ≤150 m en el servidor), califica 1–10,
comenta y ve su progreso ("23/100"). El nombre definitivo aún no existe: usar
`APP_NAME` en `app.json` y en la UI.

## Stack (no cambiar sin preguntar al usuario)

- Expo SDK 58 + TypeScript estricto + Expo Router (rutas en `src/app/`)
- NativeWind para estilos, `expo-image` para imágenes
- TanStack Query para data fetching (optimistic updates en ratings y comentarios)
- Supabase: Postgres + PostGIS, Auth (magic link; Google OAuth preparado), Storage, RLS
- `expo-location`, `expo-image-picker`, `react-native-maps`
- npm (hay `package-lock.json`): usar `npx`, no `bunx`
- **Preguntar antes de añadir cualquier dependencia fuera de esta lista.**

## Fuera de alcance del MVP

Seguir usuarios, feed social, notificaciones, recomendaciones a usuarios específicos.

## Plan por fases (detenerse al final de cada una para que el usuario pruebe)

1. ✅ Supabase: migraciones, RLS, RPC, seed
2. ✅ Cliente Supabase, auth y navegación (tabs: Explorar, Mapa, Perfil)
3. ✅ Catálogo, detalle y mapa
4. ✅ Check-in con foto
5. ✅ Ratings, comentarios y perfil con progreso

Al cerrar cada fase: qué se hizo, qué configurar en el dashboard de Supabase, cómo probarlo.

## Backend (Supabase)

- Proyecto remoto: ref `rfdiohzmarurcqgydfxp` (el MCP de `.mcp.json` apunta a él).
- Migraciones versionadas en `supabase/migrations/`. Crear nuevas con
  `supabase migration new <nombre>`; nunca editar una migración ya aplicada en remoto.
- Seed en `supabase/seed.sql`: 10 planes **placeholder** (slug `placeholder-*`,
  descripción `[PLACEHOLDER]`). El usuario cura los 100 reales.
- Tablas: `profiles`, `plans`, `check_ins`, `ratings`, `comments` (todas con RLS).
- Reglas clave:
  - El cliente **nunca** inserta en `check_ins`: solo la RPC `check_in(plan_id, lat, lng, photo_path)`.
    Errores que devuelve en `message`: `not_authenticated`, `invalid_location`,
    `plan_not_found`, `too_far` (detail `distance_m=<n>`), `invalid_photo`, `already_checked_in`.
  - Ratings y comentarios solo si existe check-in del usuario en ese plan (lo valida RLS).
  - `plans.rating_avg` / `rating_count` los mantiene un trigger; no calcular en el cliente.
  - En `plans` solo se editan `lat`/`lng`; `location` (geography) es columna generada.
  - Fotos: bucket privado `check-in-photos`, ruta `<user_id>/<archivo>`; mostrar con URLs firmadas.
  - Todo requiere sesión: `anon` no tiene acceso a ninguna tabla.
  - Privilegios explícitos (`grant ... to authenticated`) en cada tabla nueva: Supabase ya
    no expone tablas nuevas a la Data API automáticamente. Activar RLS siempre.
  - Funciones `security definer` solo en el esquema `private`, con `set search_path = ''`.

### Cómo probar y aplicar cambios de BD (sin Docker)

**No usar Docker ni el stack local de Supabase.** Todo se prueba contra el proyecto remoto con
el MCP de Supabase:

1. Crear el archivo con `supabase migration new <nombre>` y escribir el SQL.
2. Ensayo: `execute_sql` con el SQL + pruebas, terminando en `raise exception` para que se revierta.
3. Aplicar: `apply_migration` con el mismo SQL.
4. `list_migrations` y renombrar el archivo local a la versión remota, para que
   `supabase db push` no lo vuelva a aplicar.
5. `get_advisors` (security y performance) y regenerar tipos con `generate_typescript_types`.

`supabase/scripts/rls_smoke_test.sql` es una prueba de RLS/RPC que se revierte sola
(ejecutarla con `execute_sql` o en el SQL Editor).

## App (cliente)

- `src/lib/supabase.ts`: cliente tipado; sesión persistida con `expo-sqlite/localStorage`, flujo PKCE.
- `src/lib/auth.ts`: magic link, Google OAuth (opcional, `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED`), sign out.
- `src/providers/auth-provider.tsx`: `useAuth()` → `{ session, isLoading }`.
- `src/lib/query-client.ts`: QueryClient de TanStack Query.
- Navegación: `src/app/_layout.tsx` usa `Stack.Protected`. Sin sesión: `sign-in`, `auth/callback`.
  Con sesión: `(tabs)` con NativeTabs (`index` = Explorar, `mapa`, `perfil`) y `plan/[id]`
  (detalle, se apila sobre las tabs).
- Datos: `usePlans()` trae el catálogo completo (~100 filas) una sola vez (`plansQueryKey`) y lo
  comparten lista, mapa y detalle (`usePlan(id)` usa `select` sobre la misma caché). El filtro
  por categoría es local. Comentarios: `usePlanComments(planId)` con autor embebido (`author:profiles`).
- Categorías: etiquetas y colores en `src/constants/categories.ts`; la lista sale del enum generado.
- Check-in: modal `plan/[id]/check-in`. `useCurrentLocation()` (expo-location vía useQuery, sin
  caché), foto con expo-image-picker, y `submitCheckIn()` en `src/lib/check-in.ts`: sube la foto a
  `<user_id>/<plan_id>-<ts>.<ext>`, llama a la RPC y, si falla, borra la foto. La distancia que se
  muestra (`src/lib/geo.ts`, `CHECK_IN_RADIUS_M`) es solo UX; la valida el servidor.
- `useMyCheckIns()` / `useMyCheckIn(planId)` comparten la caché `['check-ins', userId]`.
  Fotos privadas: `useCheckInPhotoUrls(paths)` (URLs firmadas en lote) y en expo-image usar
  `cacheKey: photo_path` porque la URL firmada cambia.
- Permisos (textos en español) configurados con los plugins de expo-location y expo-image-picker en
  app.json; solo aplican en development/production builds, no en Expo Go.
- Ratings: `useMyRatings()` / `useMyRating(planId)` (caché `['my-ratings', userId]`) y
  `useRatePlan(planId)`: upsert con optimistic update; al terminar invalida `plansQueryKey` para
  traer el promedio que calcula el trigger (nunca calcularlo en el cliente).
- Comentarios: `useAddComment(planId)` inserta con optimistic update (id con prefijo
  `optimistic-`, se muestra "Publicando…"); si falla, revierte la lista y devuelve el borrador al input.
- Calificar y comentar solo se muestran con check-in (`OnlyAfterCheckIn` en el detalle); RLS lo exige igual.
- Perfil: progreso `check-ins / planes` y cuadrícula de 3 columnas con las fotos de check-in
  (URLs firmadas en lote) y la nota del usuario.
- Mapa: `react-native-maps` (funciona en Expo Go). Para builds de tienda con Google Maps hace
  falta API key vía el config plugin `react-native-maps` en app.json.
- El magic link vuelve a `auth/callback?code=...` (`Linking.createURL`); al haber sesión el guard
  redirige solo a las tabs.
- Typed routes en Windows genera `/index` en lugar de `/` para `(tabs)/index`: evitar `href="/"`
  y dejar que los guards de `Stack.Protected` redirijan.
- Estilos con NativeWind v4 (Tailwind v3): `className`, `dark:` para modo oscuro, color `primary`
  en `tailwind.config.js`.

## Convenciones de código

- Código simple y legible, sin sobreingeniería.
- Tipos de BD generados en `src/types/database.ts` (MCP `generate_typescript_types` o
  `npm run db:types`); no escribirlos a mano.
- Variables de entorno en `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
  Nunca hardcodear credenciales.
- Pantallas en `src/app/`; componentes, hooks y utilidades fuera de `src/app/`.
- Alias de imports: `@/` → `src/`.

## Comandos

```bash
npx expo start                 # dev server
npm run lint                   # expo lint (ESLint 9, eslint-config-expo)
npm run typecheck              # tsc --noEmit
npx expo install <paquete>     # instalar dependencias (versiones compatibles con el SDK)

npx expo export --platform ios --platform android --output-dir <tmp>  # verifica que compile el bundle
npx expo-doctor                # diagnóstico de dependencias

supabase migration new <name>  # nueva migración (luego aplicar vía MCP, ver arriba)
npm run db:types               # tipos desde el proyecto remoto (requiere `supabase login`)
```

Antes de dar una tarea por terminada: `npm run lint` y `npm run typecheck`.
