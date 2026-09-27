# ArchitectureSentinel Frontend

> **Verification note:** Every claim below is derived from the provided frontend source. Where a feature is declared but not wired into runtime, this is explicitly flagged in **§14 Known Gaps**. The `frontend/` codebase is a **Vite SPA** using **React Router**, not a Next.js application, despite the presence of `next` in `package.json` and `'use client'` directives on several files.

---

## 1. Overview

ArchitectureSentinel Frontend is a single-page application for AI-assisted code review. It provides authentication, project management, analysis launching, live analysis progress, AST topology visualization, RAG document browsing, and human-in-the-loop review.

It is composed of:

- **React 18** + **Vite 8** + **TypeScript 5.3**
- **React Router v7** for client-side routing
- **TanStack Query v5** for server-state
- **Zustand v4** for client-state
- **Axios** for HTTP with interceptor-based auth and tenant injection
- **socket.io-client** for real-time transport (wired but not mounted — see §7.4)
- **React Three Fiber** + **drei** + **postprocessing** for 3D topology and background scenes
- **Tailwind CSS v4** with OKLCH design tokens and a glass-morphic component layer

---

## 2. Verified Tech Stack

| Area | Technology | Version | Verified Source |
|---|---|---|---|
| Runtime | Node.js | `^20.19.0 \|\| >=22.12.0` (Vite 8 requirement) | `package.json` |
| Build | Vite | `^8.2.2` | `package.json`, `vite.config.ts` |
| Language | TypeScript | `5.3.3` | `package.json`, `tsconfig.app.json` |
| UI | React | `18.3.1` | `package.json` |
| Router | react-router-dom | `7.18.3` | `package.json` |
| Server state | @tanstack/react-query | `5.102.8` | `package.json` |
| Client state | zustand | `4.5.2` | `package.json` |
| HTTP | axios | `1.6.0` | `package.json` |
| Real-time | socket.io-client | `4.8.3` | `package.json` |
| 3D | three | `0.160.0` | `package.json` |
| 3D bindings | @react-three/fiber | `^8.15.16` | `package.json` |
| 3D helpers | @react-three/drei | `9.105.4` | `package.json` |
| 3D post-FX | @react-three/postprocessing | `2.16.2` | `package.json` |
| Post-processing core | postprocessing | `^6.39.4` | `package.json` |
| Animation | framer-motion | `^11.0.2` | `package.json` |
| Icons | lucide-react | `^1.41.0` (lockfile: `1.43.0`) | `package.json`, lockfile |
| Validation | zod | `3.22.0` | `package.json` |
| Class utils | clsx + tailwind-merge | `^2.1.1` / `^3.6.0` | `package.json` |
| Styling | tailwindcss | `4.3.3` | `package.json`, `index.css` |
| Polyfills | vite-plugin-node-polyfills | `^0.28.0` | `vite.config.ts` |
| Lint | eslint (flat) + typescript-eslint | `^10.9.0` / `^8.67.0` | `eslint.config.js` |

### 2.1 Declared but Not Wired

- **`next@14.2.15`** — declared in `dependencies`. The app is a Vite SPA. `'use client'` directives are artifacts of an earlier Next.js layout; Vite ignores them.
- **`tailwindcss-animate`** — declared in `dependencies` but no `@plugin "tailwindcss-animate"` directive observed in `index.css`.
- **`@tanstack/react-query-devtools`** — declared but not rendered anywhere in the observed entry chain.

---

## 3. Client Architecture & Route Topology

### 3.1 Entry Chain

```text
index.html
  └── /src/main.tsx
        ├── initAuthService()          // wires api-client getters BEFORE render
        └── <StrictMode>
            └── <QueryClientProvider client={getQueryClient()}>
                └── <BrowserRouter>
                    └── <App />         // route tree
```

`src/main.tsx` also guards `#root` existence and throws a fatal error if the DOM anchor is missing.

### 3.2 Route Tree (from `src/App.tsx`)

```text
/login                   PublicOnlyRoute → LoginPage
/register                PublicOnlyRoute → RegisterPage

<ProtectedRoute> (Outlet)
  /                      DashboardPage
  /projects              ProjectsPage
  /projects/new          NewProjectPage
  /projects/:id          ProjectDetailPage
  /analyses              AnalysesListPage
  /analyses/new          NewAnalysisPage
  /analyses/:id          AnalysisDetailPage

*                        NotFoundPage
```

**Route ordering rule:** static routes (`/projects/new`, `/analyses/new`) are declared before dynamic `:id` routes to avoid capture.

**Guards** are declarative components:

- `<ProtectedRoute>` waits for `isHydrating` from `useAuth`, then redirects to `/login` with `state.from = location` if unauthenticated.
- `<PublicOnlyRoute>` redirects to `/` if already authenticated.

### 3.3 Lazy Loading

Every page is `React.lazy()`-imported. A `<Suspense fallback={<RouteFallback />}>` wraps the route tree, and the entire tree is wrapped in `<ErrorBoundary>`.

### 3.4 Client-Side Route Constants

`src/constants/index.ts` exports `APP_ROUTES` (typed with `as const`) as the single source of truth for URLs. Additional routes (`tenants`, `reviews`, `webhooks`, `workflow`, `settings`) exist but **have no matching `<Route>` entries** in `App.tsx`.

### 3.5 Not Mounted: `src/app/layout.tsx`

The file `src/app/layout.tsx` describes itself as the "application shell orchestrator" and would:

- Rehydrate `ui-store`
- Initialize `initAuthService()` (duplicate)
- Choose between `BootstrapShell` / `AuthShell` / `AppShell`
- Sync `theme` to `<html>`
- Update `document.title`

**It is not rendered by `main.tsx`.** Its absence has direct consequences documented in §14.

---

## 4. HTTP Layer

### 4.1 `src/lib/api-client.ts`

Axios instance configured with:

- `baseURL`: `VITE_API_BASE_URL` (sanitized, no trailing slash), default `http://localhost:3000/api/v1`
- `timeout: 30_000`
- `withCredentials: true`

**Request interceptor:**

1. `Authorization: Bearer <accessToken>` unless `skipAuth: true`
2. `X-Tenant-Id: <tenantId>` unless `skipTenant: true`
3. `X-Request-ID: req_<timestamp>_<random>` if not already set

**Response interceptor:**

- **Unwraps `response.data`** — callers receive the body, not `AxiosResponse`.
- On `401`:
  - Skips retry if the URL is `/auth/refresh` or `skipAuth: true`
  - Otherwise triggers **single-flight refresh** via `refreshTokenGetter`
  - Retries the original request once (`_retry = true`)
- Non-401 errors are transformed to `ApiError` and rejected.

**Retry logic** (`request<T>()`):

- Exponential backoff: `100ms * 2^attempt`
- Retries on: no response (network), 5xx (except 501), 429, 408
- Max retries: `QUERY_DEFAULTS.retryCount` (2)

**Exports:**

- `get<T>`, `post<T,D>`, `put<T,D>`, `patch<T,D>`, `del<T>` — the correctly-typed helpers
- `apiClient` — raw Axios instance (see §14 for misuse consequences)
- `isApiError` type guard

### 4.2 Why This Matters

Because the interceptor unwraps `.data`, the service layer (`project.service.ts`, `analysis.service.ts`, `auth.service.ts`) correctly uses `get<T>()` / `post<T>()`. However, two Zustand stores call `apiClient.get<T>()` and then read `response.data.X` — which is `undefined`. See §14.

---

## 5. State Management

### 5.1 Server State — TanStack Query

`src/lib/query-client.ts` builds a singleton `QueryClient` (SSR-safe: fresh per call on server, shared on browser).

Default options:

- `staleTime`: `QUERY_DEFAULTS.staleTime` (60s)
- `gcTime`: 5 min
- `retry`: no retry on 4xx `ApiError`; up to 2 otherwise
- `retryDelay`: exponential, capped at 30s
- `refetchOnWindowFocus: false`
- Mutations: `retry: 0`, dev-only error logging

**Query key factory (`queryKeys`):**

```ts
queryKeys.auth.{all,user}
queryKeys.projects.{all,lists,list,details,detail}
queryKeys.analyses.{all,lists,list,details,detail,hitl,rag}
```

**Composition note:** `analyses` hooks compose keys manually (e.g., `[...queryKeys.analyses.detail(id), 'ast']`) rather than using `queryKeys.analyses.hitl(id)` / `.rag(id)` — the factory methods exist but are not consistently used.

### 5.2 Client State — Zustand

| Store | Persisted | Key | Notes |
|---|---|---|---|
| `auth-store.ts` | ✅ localStorage | `archsentinel_auth_state` | `partialize` = `{accessToken, refreshToken, expiresIn, user, tenantId}` |
| `project-store.ts` | ❌ | — | Projects list, filters, pagination, optimistic mutations |
| `analysis-store.ts` | ❌ | — | Current analysis, workflow state, AST, RAG docs, HitL |
| `ui-store.ts` | ✅ localStorage | `ui-store` | Theme + sidebar only. **`skipHydration: true`** |

**Discriminated unions** are used for state machines:

- `WorkflowState` — `IDLE | PENDING | PROCESSING | COMPLETED | FAILED`
- `HitLState` — `AWAITING_REVIEW | FEEDBACK_PROVIDED | RESOLVED`

Both are defined in `src/types/index.ts`.

**`useShallow`** from `zustand/react/shallow` is used in `topology-view.tsx`, `project-list.tsx`, and dashboard hooks to prevent re-renders from new object identities.

### 5.3 Store Activation — Critical

- `auth-store`: auto-hydrates.
- `project-store` / `analysis-store`: activate on first action call (`fetchProjects()`, etc.).
- `ui-store`: `skipHydration: true` — **requires a `persist.rehydrate()` call somewhere**. No caller exists in the current entry chain (`main.tsx`, `App.tsx`, or any mounted component). See §14.

---

## 6. Authentication Flow

### 6.1 Service

`src/services/auth.service.ts` exports:

- `initAuthService()` — must be called once at startup. Wires:
  1. `setAuthTokenGetter` — reads `accessToken` from `auth-store`
  2. `setRefreshTokenGetter` — single-flight refresh keyed by tenant ID
  3. `setLogoutCallback` — best-effort `POST /auth/logout` then clears state
  4. `setTenantIdGetter` — reads `tenantId` from `auth-store` (fallback: `sessionStorage`, then `DEFAULT_TENANT_ID`)
  5. `initMultiTabSync()` — `BroadcastChannel('archsentinel:auth')` broadcasting `LOGIN` / `LOGOUT`
- `authService` object with `login`, `register`, `refresh`, `logout`, `getCurrentUser`, `changePassword`, and synchronous getters
- Named re-exports (`login`, `register`, `logout`, `getMe`, `changePassword`, `refreshToken`)

### 6.2 Single-Flight Refresh

`RefreshManager.inflight: Map<tenantId, Promise<string>>` — concurrent 401s within the same tenant share one refresh call.

`RequestQueue` holds pending requests during refresh; flushes on success with the new token, rejects all on failure.

### 6.3 Token Storage — Verified Reality

- **Access token:** Zustand `auth-store` persisted to `localStorage` under `archsentinel_auth_state`.
- **Refresh token:** same store, same key.
- **Tenant ID:** Zustand store **and** `sessionStorage` under `STORAGE_KEYS.tenantId` (`archsentinel:tenant_id`).

**HttpOnly cookies are NOT used.** The backend sets `withCredentials: true` on the client and `refreshToken` is returned in the JSON response body. There is no observed flow where the refresh token is delivered as a cookie and read implicitly.

### 6.4 Frontend Guards

- `ProtectedRoute` (in `App.tsx`): uses `useAuth().isAuthenticated` and `.isHydrating`.
- `AuthGate` (in `components/guards/AuthGate.tsx`): uses `useAuthStore` directly — **only imported by the unmounted `AppShell.tsx`**.

Two divergent guard implementations exist; only `ProtectedRoute` is mounted.

---

## 7. Real-Time (Socket.IO)

### 7.1 Client

`src/lib/socket-client.ts`:

```ts
io(WS_BASE_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10_000,
  autoConnect: false,
});
```

`WS_BASE_URL` derives from `VITE_WS_BASE_URL` or `SOCKET_HTTP_BASE_URL.replace(/^http/, 'ws')`.

### 7.2 Lifecycle Hook

`src/hooks/use-socket.ts`:

- Auth-gated via `enabled` option
- Rebinds `socketClient.auth = { token: accessToken }` on token change
- Registers `connect` / `disconnect` / `connect_error`
- StrictMode-safe (`on` / `off` cleanup)

### 7.3 Event Contracts (from consumers)

| Event | Consumer | Source |
|---|---|---|
| `analysis:progress` | `use-analysis-workflow.ts`, `use-live-analyses.ts` | `WorkflowService` (backend) |
| `analysis:complete` | same | same |
| `analysis:failed` | `use-analysis-workflow.ts` | same |
| `hitl:request` | `use-analysis-workflow.ts` | same |

### 7.4 Critical Finding: Socket Is Not Mounted

Two `SocketProvider` implementations exist:

- `src/components/providers/SocketProvider.tsx` — imports `useSocket`, wraps children in fragments
- `src/components/providers/SocketProvider.tsx` (duplicate, imported by `app/shells/AppShell.tsx`) — simpler variant

Neither is rendered by `main.tsx` or `App.tsx`. `AppShell.tsx` (which would wrap `SocketProvider`) is itself unmounted.

**Consequence:** `socketClient.connect()` is never called. Real-time events do not fire. Analysis pages fall back to TanStack Query's `refetchInterval` (2000ms while status is `RUNNING` or `QUEUED`, from `use-analysis-workflow.ts`).

---

## 8. Real-Time Alternatives in Use

- **Analysis progress** — polling via `refetchInterval` in `use-analysis-workflow.ts`
- **Dashboard analyses** — polling via `useLiveAnalyses` (fan-out over per-project queries)
- **HitL state** — read from `analysis-store.hitlState`, which is populated only by the `hitl:request` WebSocket event. With WebSockets down, `hitlState` remains at its initial value (`AWAITING_REVIEW` with empty `reviewChunks`).

---

## 9. 3D / WebGL Layer

### 9.1 Components

| File | Purpose | State |
|---|---|---|
| `components/3d/node-graph.tsx` | R3F node spheres + edge lines | Present, wrapped by `React.memo` |
| `components/3d/topology-view.tsx` | Full topology scene (OrbitControls, Environment, Bloom) | Present, used by `TopologyCanvas` and `SpatialASTView` |
| `components/3d/SpatialBackground.tsx` | Auth background with `EffectComposer` | Present |
| `components/3d/spatial-background-shared.tsx` | Auth background v5.0 with WebGL context-loss recovery | Present, referenced by `auth/background.tsx` |
| `components/3d/ThreeDBackground.tsx` | Generic starfield + torus/icosahedron/sphere | Present, not observed in any mount chain |

### 9.2 Engineering Patterns Applied

- **`React.memo`** on all top-level scene components.
- **`useMemo`** for geometry / particle positions.
- **`useFrame`** for animation; **all store writes happen here only** (in `topology-view.tsx` — avoids render-phase mutations).
- **`useShallow`** for Zustand multi-field reads.
- **`ThreeEvent<MouseEvent>` / `ThreeEvent<PointerEvent>`** — R3F-specific event types, not DOM `MouseEvent`.
- **`useReducedMotion`** from Framer Motion — disables animation and reduces particle counts.
- **GPU disposal** — `topology-view.tsx` disposes geometry on unmount.
- **WebGL context recovery** — `spatial-background-shared.tsx` listens for `webglcontextlost` / `webglcontextrestored` and forces Canvas remount via `recoveryKey`.
- **`state.pointer`** (R3F built-in) instead of `window.addEventListener('mousemove')` in v5.0 background.

### 9.3 AST Graph Layout

`hooks/analysis/use-analysis-ast-nodes.ts`:

- Depth-first angular layout
- Constants: `MAX_DEPTH = 6`, `BASE_RADIUS = 1.5`, `DEPTH_RADIUS = 1.8`, `DEPTH_HEIGHT = 0.9`
- Deterministic: same AST → same coordinates

### 9.4 Dashboard Topology

`hooks/dashboard/use-topology-data.ts`:

- djb2 hash → `[cos(angle) * radius, height, sin(angle) * radius]`
- Constants: `HASH_MODULO = 360`, `BASE_RADIUS = 5`, `RADIUS_SPREAD = 3`, `HEIGHT_SPREAD = 5`
- Projects → `service` nodes, analyses → `queue` nodes, edges → `analysis-flow`

---

## 10. UI Patterns

### 10.1 Design System (`src/index.css`)

- **Tailwind v4** with `@theme` block and `@layer base/components/utilities`
- **OKLCH** color tokens: surfaces (`void`, `abyss`, `forge`, `anvil`), brand (`primary`, `secondary`, `accent`), text, semantic, and placeholder
- **Two themes** — `:root` (dark) + `.light` class on `<html>`; runtime tokens live in `@layer base`
- **Component tokens**: `.auth-card`, `.auth-field`, `.auth-button`, `.auth-divider`
- **Utilities**: `.text-brand-gradient`, `.glass-surface`, `.glow-*`, `.animate-shake`, `.animate-pulse-glow`, `.animate-aurora`
- **Placeholder overrides** declared outside layers for highest specificity
- **`100dvh`** on `html`/`body`/`#root` for taskbar compatibility
- **`prefers-reduced-motion`** disables animation durations globally
- **Autofill fix** for WebKit using `-webkit-box-shadow` insets

### 10.2 Component Tokens

- `.auth-field` — glass input with `data-validation` attribute driving border/background color
- `.auth-button` — Ember→Copper gradient CTA with a `::before` sheen and multi-layer `--glow-cta`
- `.auth-card` — layered shadow + `backdrop-filter: blur(32px) saturate(180%)`

### 10.3 RTL Support

- `AuthLayoutShell` uses logical properties (`ps-`, `pe-`, `rtl:rotate-180` on the arrow) at the JSX level
- No `dir="rtl"` is set on `<html>` in `index.html`; consumers must opt in
- `REGEX.name` uses `\p{L}` (Unicode letter class) to accept Arabic and other scripts
- No systematic RTL-first design is present; the theme is LTR by default

### 10.4 Accessibility

- ARIA on `AuthField` (`aria-invalid`, `aria-describedby`, `role="alert"` on errors)
- Combobox pattern in `ProjectSelector` (`role="combobox"`, `aria-activedescendant`, `role="listbox"`, `role="option"`)
- `SpatialLoader` uses `role="status"` + `aria-live="polite"`
- `ErrorBoundary` uses `role="alert"`
- `Sidebar` uses `aria-current="page"` on the active link
- `AdvancedOptions` uses `aria-expanded` + `aria-controls`
- Keyboard: Enter/Space on interactive `GlassCard`; Escape on `ProjectSelector`; Ctrl/Cmd+Enter on `BranchSelector`

### 10.5 Component Library (verified surface)

| Layer | Components |
|---|---|
| Layout | `MainLayout`, `Header`, `Sidebar` |
| Auth | `AuthLayoutShell`, `AuthField`, `AuthButton`, `AuthBackground` |
| UI primitives | `GlassCard`, `SpatialLoader`, `ErrorBoundary` |
| Dashboard | `MetricsBar`, `TopologyCanvas`, `RecentProjectsPanel`, `RecentAnalysesPanel`, `QuickActionsBar` |
| Project | `ProjectCard`, `ProjectList` |
| Analysis | `AnalysisHeader`, `WorkflowTimeline`, `SpatialASTView`, `RAGPanel`, `HitLPanel`, `LiveProgressRing`, `AnalysisErrorState`, `ASTViewer` |
| Analysis / launcher (unused) | `AdvancedOptions`, `BranchSelector`, `ProjectSelector`, `LaunchPreview` |
| 3D | `NodeGraph`, `TopologyView`, `SpatialBackground`, `ThreeDBackground` |

---

## 11. Data Flow Walkthrough

### 11.1 Login

```text
LoginPage.handleSubmit
  → useAuth().login({ email, password })
    → authService.login()
      → post<PostLoginResponse>('/auth/login', body, { skipAuth, headers: { X-Tenant-Id } })
        → api-client request interceptor: X-Tenant-Id injected
          → backend /auth/login
        ← response interceptor unwraps .data
      ← { accessToken, refreshToken, expiresIn, user, tokenType }
    → auth-store.setTokens + setUser + sessionStorage.setItem('archsentinel:tenant_id')
    → broadcastAuthEvent('LOGIN')
  → navigate(APP_ROUTES.home, { replace: true })
```

### 11.2 Analysis Detail

```text
AnalysisDetailPage
  → useAnalysisWorkflow(id)
    → useQuery(queryKey: [...analyses.detail(id)], queryFn: getAnalysis(id))
      → get<{analysis}>() → backend GET /analyses/:id
    → refetchInterval: 2000ms if status RUNNING | QUEUED
    → useEffect: subscribe to socket events (no-op — socket not mounted)
  → useAnalysisAst(id, enabled)
    → get<{ast}>() → GET /analyses/:id/ast
  → useAnalysisAstNodes(astQuery.data?.ast)
    → useMemo → { nodes, edges }
  → SpatialASTView → TopologyView (R3F)
```

### 11.3 Project Create

```text
NewProjectPage.handleSubmit
  → useCreateProject().mutateAsync({ name, description, repoUrl })
    → createProject() from project.service.ts
      → post<SingleProjectResponse>('/projects', data)
    ← { success, message, data: Project }
  → navigate(`/projects/${response.data.id}`, { replace: true })
```

---

## 12. Environment Variables

### 12.1 Declared in `src/vite-env.d.ts`

```
VITE_API_BASE_URL       string
VITE_WS_BASE_URL        string
VITE_APP_BASE_URL       string
VITE_APP_NAME           string
VITE_ENABLE_DEVTOOLS    string
VITE_ENABLE_ANALYTICS   string
VITE_ENABLE_MOCK_API    string
```

### 12.2 Read by `src/constants/index.ts`

| Key | Default |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` |
| `VITE_SOCKET_HTTP_BASE_URL` | derived by stripping `/api*` from `API_BASE_URL` |
| `VITE_WS_BASE_URL` | derived by replacing `http` → `ws` on `SOCKET_HTTP_BASE_URL` |
| `VITE_APP_BASE_URL` | `http://localhost:5173` |
| `VITE_DEFAULT_TENANT_ID` | `00000000-0000-4000-8000-000000000000` |
| `VITE_SOCKET_PATH` | `/socket.io` |
| `VITE_SOCKET_NAMESPACE` | `/` |

### 12.3 Example File (`.env`)

The provided `.env` sets:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_BASE_URL=ws://localhost:3000
VITE_APP_BASE_URL=http://localhost:5173
VITE_APP_NAME=ArchitectureSentinel
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_MOCK_API=false
```

There is no `.env.local.example` in the provided tree; the above is the effective example.

---

## 13. Local Frontend Onboarding

### 13.1 Prerequisites

- Node.js `^20.19.0 || >=22.12.0`
- npm `>=10`
- Backend running at `http://localhost:3000` (see backend README)

### 13.2 Install

```bash
cd frontend
npm install
```

### 13.3 Configure

Create `.env` (or `.env.local`) with the variables from §12.3.

### 13.4 Run

```bash
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc -b && vite build
npm run preview      # Preview production build
npm run lint         # ESLint flat config
```

### 13.5 Path Alias

Only one alias is configured in `tsconfig.app.json` and `vite.config.ts`:

```json
"@/*": ["./src/*"]
```

`baseUrl` is intentionally omitted (deprecated in TS 5.9). Relative paths in `paths` make this work without it.

### 13.6 Vite Config Highlights (`vite.config.ts`)

- Plugins: `@vitejs/plugin-react`, `vite-plugin-node-polyfills` (include: `['process']`)
- Alias: `@` → `${import.meta.dirname}/src`
- `optimizeDeps.include`: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `three-stdlib`
- Dev server: port `5173`
- Build target: `es2020`

---

## 14. Known Gaps & Verified Anomalies

Every item below is directly observable in the provided source. Nothing is speculative.

### 14.1 Socket.IO is Never Mounted

- `main.tsx` and `App.tsx` do not render any `SocketProvider`.
- Two `SocketProvider` implementations exist; neither is mounted.
- `socketClient.connect()` is never called from the entry chain.
- **Runtime effect:** real-time events (analysis progress, HitL requests) never arrive. Analysis progress relies on polling.

### 14.2 `src/app/layout.tsx` is Dead Code

- The shell orchestrator is not rendered by `main.tsx`.
- **Runtime effects:**
  - `ui-store` never rehydrates (§14.3)
  - `document.title` is never updated on navigation
  - `AppShell` / `AuthShell` / `BootstrapShell` are unreachable

### 14.3 `ui-store` Never Rehydrates

- `ui-store.ts` sets `skipHydration: true`.
- Only `src/app/layout.tsx` (unmounted) calls `useUIStore.persist.rehydrate()`.
- **Runtime effect:** theme and sidebar collapsed state are lost on reload. `theme` defaults to `"dark"` on every page load.

### 14.4 `project-store` and `analysis-store` Are Broken

Both use raw `apiClient.get<T>()` and then access `response.data.X`:

```ts
const response = await apiClient.get<PaginatedResponse<Project>>(...);
const { items, total, totalPages } = response.data;   // response IS the body
```

The response interceptor already unwraps `.data`, so `response.data` is `undefined`. Destructuring throws at runtime.

**Correct pattern** (used in `project.service.ts`, `analysis.service.ts`):

```ts
const response = await get<SingleProjectResponse>(url);
const { data } = response;   // data is the typed body
```

**Affected components:** `ProjectList` (via `useProjectStore`), any consumer of `analysis-store.fetchAnalysis` / `fetchAst` / `fetchRagDocuments` / `fetchHitLState`.

### 14.5 Duplicate APIs & Components

| Concept | Duplicate Locations |
|---|---|
| `SocketProvider` | `components/providers/SocketProvider.tsx` (×2 variants across two imports in the tree) |
| `SpatialBackground` | `components/3d/SpatialBackground.tsx`, `components/3d/spatial-background-shared.tsx` |
| `useAnalysisWorkflow` | `hooks/analysis/use-analysis-workflow.ts`, `hooks/use-analysis.ts` (store selector) |
| `useHitLState` | `hooks/use-analysis.ts` (query hook), `hooks/use-analysis.ts` (store selector, same file) |
| `useRagDocuments` | `hooks/use-analysis.ts` (query hook), `stores/analysis-store.ts` (store selector) |
| Auth guard | `ProtectedRoute` in `App.tsx`, `AuthGate.tsx` in `components/guards/` |
| `NewProjectPage` | `app/projects/new/page.tsx` (custom validation), an alternate Zod-based version in another file |

### 14.6 `next` Dependency Is Stale

- `next@14.2.15` is declared in `dependencies`.
- `next.config.mjs` is referenced by `tsconfig.node.json` `include` but not observed.
- `'use client'` directives appear at the top of ~12 files.
- **Runtime effect:** none — Vite ignores these artifacts. They are dead weight from a Next.js → Vite migration.

### 14.7 `/analyses/new` Uses a Minimal Launcher

The following exist but are **not** referenced by `app/analyses/new/page.tsx`:

- `hooks/analysis/use-new-analysis-form.ts`
- `hooks/analysis/use-recent-branches.ts`
- `components/analysis/AdvancedOptions.tsx`
- `components/analysis/BranchSelector.tsx`
- `components/analysis/ProjectSelector.tsx`
- `components/analysis/LaunchPreview.tsx`

The current page uses a plain `<select>` + `<input>`.

### 14.8 `/projects/:id` Analyses List Is a Placeholder

Renders a hardcoded `"0 total"` and `"No analyses have been run for this project yet."` No query is issued.

### 14.9 `APP_ROUTES` Entries Without Pages

`APP_ROUTES.tenants`, `.reviews`, `.webhooks`, `.workflow`, `.settings` are defined but have no matching `<Route>` in `App.tsx`. The sidebar link to `APP_ROUTES.settings` navigates to `/settings`, which falls through to `NotFoundPage`.

### 14.10 Auth Response Contract Divergence

- Backend `AuthResponseDto.user` is `Partial<User>` from the entity's `toSafeObject()` — includes `firstName`, `lastName` but **not** a computed `name`.
- Frontend `SanitizedUser` type declares `name: string` (marked "Computed: `${firstName} ${lastName}`").
- `Header.tsx` reads `user?.name` to compute initials; on a fresh login, this will be `undefined` unless the backend computes `name`.
- **Runtime effect:** avatar initials render as `'?'` unless the backend or a transformer adds `name`.

### 14.11 Analysis Response Envelope Divergence

- Frontend `analysis.service.ts` types expect `{ analysis }` for `getAnalysis` and `{ analysis }` for `createAnalysis`.
- Backend `AnalysesController` (stub) returns `{ success, data }` and, for create, `{ success, analysis }`.
- `use-analysis-workflow.ts` compensates with a runtime `extractAnalysis()` that tries `.data`, then `.analysis`, then raw. This is a workaround, not a stable contract.

### 14.12 Request-ID Format Is Not a UUID

- `api-client.ts` generates `req_<timestamp>_<random>`.
- Backend `GlobalExceptionFilter` generates `req_<uuid-prefix>`.
- No shared correlation format exists between the two sides.

### 14.13 `queryKeys.analyses.hitl` / `.rag` Are Defined but Unused

`query-client.ts` exposes these key helpers, but `use-analysis.ts` composes keys manually:

```ts
queryKey: [...queryKeys.analyses.detail(id), 'ast']
queryKey: [...queryKeys.analyses.detail(id), 'rag', { page, limit }]
queryKey: [...queryKeys.analyses.detail(id), 'hitl']
```

Cache invalidation via `queryKeys.analyses.hitl(id)` will not match the manually-composed keys.

### 14.14 `lucide-react` Version Range Is Unusual

- `package.json` declares `"lucide-react": "^1.41.0"`.
- `package-lock.json` resolves to `1.43.0`.
- The upstream `lucide-react` package uses `0.x` versioning. Verify the registry source before treating this as canonical.

### 14.15 `tailwindcss-animate` Is Declared but Not Loaded

Tailwind v4 requires `@plugin "tailwindcss-animate"` in the CSS entry to activate the plugin. No such directive exists in `index.css`. Any `animate-*` classes specific to that plugin will not work.

---

## 15. File Reference Map

| Path | Responsibility |
|---|---|
| `index.html` | Root HTML, dark class on `<html>`, mounts `#root` |
| `src/main.tsx` | Entry: `initAuthService()` + providers |
| `src/App.tsx` | Route tree, `ProtectedRoute`, `PublicOnlyRoute` |
| `src/index.css` | Design tokens, theme, component layer |
| `src/vite-env.d.ts` | `ImportMetaEnv` shape |
| `src/types/index.ts` | Domain types, DTOs, discriminated unions |
| `src/types/api.ts` | Request/response contracts |
| `src/types/three-jsx.d.ts` | R3F JSX namespace augmentation |
| `src/constants/index.ts` | Routes, env, headers, regex, storage keys |
| `src/lib/api-client.ts` | Axios + interceptors |
| `src/lib/query-client.ts` | QueryClient + key factory |
| `src/lib/socket-client.ts` | Socket.IO singleton |
| `src/lib/react-utils.ts` | `assignRef`, `useMergeRefs`, `useStableCallback` |
| `src/lib/utils.ts` | `cn()` |
| `src/services/auth.service.ts` | Auth API + init wiring + refresh manager |
| `src/services/project.service.ts` | Project API |
| `src/services/analysis.service.ts` | Analysis API |
| `src/stores/auth-store.ts` | Auth state (persisted) |
| `src/stores/project-store.ts` | Project state (broken — §14.4) |
| `src/stores/analysis-store.ts` | Analysis state (broken — §14.4) |
| `src/stores/ui-store.ts` | UI state (`skipHydration: true` — §14.3) |
| `src/hooks/use-auth.ts` | Auth facade (concurrency + mount safety) |
| `src/hooks/use-project.ts` | Project queries/mutations + store selectors |
| `src/hooks/use-analysis.ts` | Analysis queries/mutations + store selectors |
| `src/hooks/use-socket.ts` | Socket lifecycle |
| `src/hooks/analysis/use-analysis-workflow.ts` | Analysis polling + WS wiring |
| `src/hooks/analysis/use-analysis-ast-nodes.ts` | AST → topology |
| `src/hooks/analysis/use-new-analysis-form.ts` | Launcher form (unused by current page) |
| `src/hooks/dashboard/use-dashboard-metrics.ts` | KPI computation |
| `src/hooks/dashboard/use-live-analyses.ts` | Multi-project analysis fan-out |
| `src/hooks/dashboard/use-topology-data.ts` | Project + analysis topology |
| `src/utils/validation.ts` | Zod schemas |
| `src/utils/helpers.ts` | debounce, throttle, deepClone, formatDate, truncate, generateId, pick, omit, isEmpty |
| `src/components/**` | UI, layout, auth, dashboard, project, analysis, 3D |
| `src/app/**` | Route pages + unmounted shells |

---

## 16. Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Dev server on port 5173 |
| `build` | `tsc -b && vite build` | Type-check all projects then build |
| `lint` | `eslint .` | ESLint flat config |
| `preview` | `vite preview` | Serve production build |

---

## 17. License

`"private": true` in `package.json`. No license file observed.