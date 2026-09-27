/**
 * src/constants/index.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 Central registry of constants — ArchitectureSentinel v2.2
 *
 * Single Source of Truth for:
 *   • API endpoints and routes
 *   • Environment variables (Vite)
 *   • Multi-tenant defaults
 *   • Password requirements (synced with Backend)
 *   • Extended regular expressions
 *   • Storage keys and custom headers
 *   • Status and severity labels
 *   • User-facing error messages
 *   • WebSocket / Socket.IO configuration  ← 🆕 v2.2
 *
 * ✅ Uses Vite's `import.meta.env` (browser-safe).
 * ❌ Does NOT use `process.env` (undefined in browser).
 * ✅ Full compatibility with Backend RegisterDto and LoginDto.
 * ✅ Multi-tenancy support via `DEFAULT_TENANT_ID`.
 *
 * 🆕 v2.2 Changes:
 *   ✅ Added `SOCKET_PATH`         — matches NestJS @WebSocketGateway path
 *   ✅ Added `SOCKET_NAMESPACE`    — default namespace "/"
 *   ✅ Added `SOCKET_TRANSPORTS`   — ['websocket'] for direct connection
 *   ✅ Expanded `SOCKET_CONFIG`    — full Socket.IO options object
 *   ✅ Added `SOCKET_HTTP_BASE_URL` — HTTP origin for Socket.IO handshake
 *      (Socket.IO requires http/https, NOT ws/wss — unlike raw WebSocket)
 *
 * @module constants
 */

// ════════════════════════════════════════════════════════════
// 1. Private Helpers
// ════════════════════════════════════════════════════════════

/**
 * Safe environment variable accessor with optional fallback.
 * In Vite, names MUST start with `VITE_` to be visible to the client.
 */
const getEnv = (key: string, fallback?: string): string => {
  const value = import.meta.env[key] as string | undefined;

  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;

    if (import.meta.env.PROD) {
      throw new Error(`❌ Missing required environment variable: ${key}`);
    }

    console.warn(
      `⚠️ Optional environment variable ${key} is not set. Using empty string.`,
    );
    return '';
  }

  return value;
};

/** Removes trailing slashes from a URL. */
const sanitizeUrl = (url: string): string => url.replace(/\/+$/, '');

/** Ensures the path starts and ends with exactly one `/`. */
const sanitizeSocketPath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed) return '/socket.io';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, '') || '/socket.io';
};

// ════════════════════════════════════════════════════════════
// 2. Environment Variables & Base URLs
// ════════════════════════════════════════════════════════════

/**
 * Base URL for REST API requests.
 *
 * Default: 'http://localhost:3000/api/v1'
 */
export const API_BASE_URL: string = sanitizeUrl(
  getEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1'),
);

/**
 * HTTP origin (without `/api/v1`) — used for Socket.IO handshake.
 *
 * 🎯 WHY SEPARATE FROM `API_BASE_URL`:
 *   - `API_BASE_URL` includes `/api/v1` (REST versioning).
 *   - Socket.IO is mounted at the HTTP root with its own path
 *     (`/socket.io`), NOT under `/api/v1`.
 *
 *   Example:
 *     API_BASE_URL = 'http://localhost:3000/api/v1'
 *     SOCKET_HTTP_BASE_URL = 'http://localhost:3000'
 *
 * Derivation: strip the trailing `/api/v1` (or any `/api*` segment).
 */
export const SOCKET_HTTP_BASE_URL: string = sanitizeUrl(
  getEnv(
    'VITE_SOCKET_HTTP_BASE_URL',
    API_BASE_URL.replace(/\/api(?:\/v\d+)?$/, ''),
  ),
);

/**
 * Raw WebSocket base URL (ws:// or wss://).
 * ⚠️ Used only for raw WebSocket clients, NOT for Socket.IO.
 */
export const WS_BASE_URL: string = sanitizeUrl(
  (() => {
    const envUrl = getEnv('VITE_WS_BASE_URL', '');
    if (envUrl) return envUrl;
    return SOCKET_HTTP_BASE_URL.replace(/^http/, 'ws');
  })(),
);

/**
 * Frontend app base URL (for absolute links, emails, sharing).
 * Default: 'http://localhost:5173'
 */
export const APP_BASE_URL: string = sanitizeUrl(
  getEnv('VITE_APP_BASE_URL', 'http://localhost:5173'),
);

// ════════════════════════════════════════════════════════════
// 3. Multi-Tenant Defaults
// ════════════════════════════════════════════════════════════

/**
 * 🎯 Default tenant ID for MVP / single-tenant deployments.
 *
 * ⚠️ MUST be a valid UUID v4:
 *   • Frontend sends it as `X-Tenant-Id` header.
 *   • Backend validates via `@TenantId()` decorator.
 *   • Regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
 *
 * ⚠️ MANDATORY DB SETUP after changing this value:
 *   INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
 *   VALUES (
 *     '00000000-0000-4000-8000-000000000000',
 *     'Default Tenant',
 *     'default',
 *     true,
 *     NOW(),
 *     NOW()
 *   ) ON CONFLICT (id) DO NOTHING;
 */
export const DEFAULT_TENANT_ID: string = getEnv(
  'VITE_DEFAULT_TENANT_ID',
  '00000000-0000-4000-8000-000000000000',
);

// ════════════════════════════════════════════════════════════
// 4. Runtime Environment
// ════════════════════════════════════════════════════════════

export const NODE_ENV: string = import.meta.env.MODE;
export const IS_DEV: boolean = NODE_ENV === 'development';
export const IS_PROD: boolean = NODE_ENV === 'production';
export const IS_TEST: boolean = NODE_ENV === 'test';

// ════════════════════════════════════════════════════════════
// 5. API Routes
// ════════════════════════════════════════════════════════════

/**
 * REST API endpoint paths — all relative to `API_BASE_URL`.
 */
export const API_ROUTES = {
  // ───── Authentication ─────
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },

  // ───── Tenants ─────
  tenants: {
    list: '/tenants',
    create: '/tenants',
    byId: (id: string): string => `/tenants/${id}`,
    bySlug: (slug: string): string => `/tenants/slug/${slug}`,
    toggleStatus: (id: string): string => `/tenants/${id}/toggle-status`,
  },

  // ───── Projects ─────
  projects: {
    list: '/projects',
    create: '/projects',
    byId: (id: string): string => `/projects/${id}`,
    bySlug: (slug: string): string => `/projects/slug/${slug}`,
    update: (id: string): string => `/projects/${id}`,
    delete: (id: string): string => `/projects/${id}`,
    toggleStatus: (id: string): string => `/projects/${id}/toggle-status`,
    stats: (id: string): string => `/projects/${id}/stats`,
    members: (id: string): string => `/projects/${id}/members`,
    settings: (id: string): string => `/projects/${id}/settings`,
    branches: (id: string): string => `/projects/${id}/branches`,
    repositories: (id: string): string => `/projects/${id}/repositories`,
    analyses: (projectId: string): string =>
      `/projects/${projectId}/analyses`,
    analysesByBranch: (projectId: string, branch: string): string =>
      `/projects/${projectId}/branches/${encodeURIComponent(branch)}/analyses`,
    detail: (id: string): string => `/projects/${id}`,
  },

  // ───── Analyses ─────
  analyses: {
    list: '/analyses',
    create: '/analyses',
    byId: (id: string): string => `/analyses/${id}`,
    detail: (id: string): string => `/analyses/${id}`,
    update: (id: string): string => `/analyses/${id}`,
    delete: (id: string): string => `/analyses/${id}`,
    status: (id: string): string => `/analyses/${id}/status`,
    results: (id: string): string => `/analyses/${id}/results`,
    reprocess: (id: string): string => `/analyses/${id}/reprocess`,
    cancel: (id: string): string => `/analyses/${id}/cancel`,
    metrics: (id: string): string => `/analyses/${id}/metrics`,
    ast: (id: string): string => `/analyses/${id}/ast`,
    ragDocuments: (id: string): string => `/analyses/${id}/rag/documents`,
    hitlState: (id: string): string => `/analyses/${id}/hitl/state`,
    hitlFeedback: (id: string): string => `/analyses/${id}/hitl/feedback`,
    byProject: (projectId: string): string =>
      `/projects/${projectId}/analyses`,
    byBranch: (projectId: string, branch: string): string =>
      `/projects/${projectId}/branches/${encodeURIComponent(branch)}/analyses`,
    mine: '/analyses/mine',
    pending: '/analyses/pending',
    awaitingHuman: '/analyses/awaiting-human',
  },

  // ───── Webhooks ─────
  webhooks: {
    list: '/webhooks',
    configs: '/webhooks/configs',
    configById: (id: string): string => `/webhooks/configs/${id}`,
  },

  // ───── Reviews ─────
  reviews: {
    list: '/code-reviews',
    byId: (id: string): string => `/code-reviews/${id}`,
    status: (id: string): string => `/code-reviews/${id}/status`,
    reprocess: (id: string): string => `/code-reviews/${id}/reprocess`,
  },

  // ───── Workflow ─────
  workflow: {
    approve: (id: string): string => `/workflow/${id}/approve`,
    reject: (id: string): string => `/workflow/${id}/reject`,
    escalate: (id: string): string => `/workflow/${id}/escalate`,
    history: (id: string): string => `/workflow/${id}/history`,
    status: (id: string): string => `/workflow/${id}/status`,
    retry: (id: string): string => `/workflow/${id}/retry`,
  },

  // ───── Health ─────
  health: {
    basic: '/health',
    ready: '/health/ready',
    live: '/health/live',
    detailed: '/health/detailed',
  },
} as const;

// ════════════════════════════════════════════════════════════
// 6. App Routes
// ════════════════════════════════════════════════════════════

export const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  tenants: '/tenants',
  tenantDetail: (id: string): string => `/tenants/${id}`,
  projects: '/projects',
  projectDetail: (id: string): string => `/projects/${id}`,
  projectAnalyses: (projectId: string): string =>
    `/projects/${projectId}/analyses`,
  analyses: '/analyses',
  analysisDetail: (id: string): string => `/analyses/${id}`,
  newAnalysis: '/analyses/new',
  reviews: '/reviews',
  reviewDetail: (id: string): string => `/reviews/${id}`,
  webhooks: '/webhooks',
  workflow: '/workflow',
  settings: '/settings',
} as const;

// ════════════════════════════════════════════════════════════
// 7. Pagination
// ════════════════════════════════════════════════════════════

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  maxLimit: 100,
} as const;

// ════════════════════════════════════════════════════════════
// 8. TanStack Query Defaults
// ════════════════════════════════════════════════════════════

export const QUERY_DEFAULTS = {
  /** Data considered fresh for 1 minute. */
  staleTime: 60_000,
  /** Cache retention in memory: 5 minutes. */
  gcTime: 5 * 60_000,
  /** Retry count for failed requests. */
  retryCount: 2,
  /** Refetch on window focus — disabled by default. */
  refetchOnWindowFocus: false,
} as const;

// ════════════════════════════════════════════════════════════
// 9. 🆕 Socket.IO / WebSocket Configuration
// ════════════════════════════════════════════════════════════

/**
 * 🎯 Socket.IO endpoint path.
 *
 * MUST match NestJS `@WebSocketGateway({ path })`.
 * Default: '/socket.io' (Socket.IO library default).
 *
 * Backend log confirmation:
 *   `WebSocket server running with ... path: /socket.io`
 *
 * ⚠️ Changing this without updating the backend will break real-time
 *    communication SILENTLY (no errors, just no events received).
 */
export const SOCKET_PATH: string = sanitizeSocketPath(
  getEnv('VITE_SOCKET_PATH', '/socket.io'),
);

/**
 * 🎯 Socket.IO namespace.
 * Default: '/' (the root namespace).
 */
export const SOCKET_NAMESPACE: string = getEnv(
  'VITE_SOCKET_NAMESPACE',
  '/',
);

/**
 * 🎯 Socket.IO transports.
 *
 * - `['websocket']`        → direct WebSocket (fastest, no HTTP polling).
 * - `['polling','websocket']` → fallback for restrictive proxies.
 *
 * We use WebSocket-only because NestJS backend runs with the default
 * Socket.IO adapter, which supports WebSocket natively.
 */
export const SOCKET_TRANSPORTS: readonly string[] = ['websocket'] as const;

/**
 * 🎯 Full Socket.IO options object.
 * Centralizes every Socket.IO setting for consistency.
 */
export const SOCKET_CONFIG = {
  /** Connection path on the server. */
  path: SOCKET_PATH,
  /** Namespace to connect to. */
  namespace: SOCKET_NAMESPACE,
  /** Allowed transports (in order of preference). */
  transports: SOCKET_TRANSPORTS,
  /** Max reconnection attempts before giving up. */
  reconnectionAttempts: 5,
  /** Delay between reconnection attempts (ms). */
  reconnectionDelay: 1000,
  /** Max delay between reconnection attempts (ms). */
  maxReconnectionDelay: 5000,
  /** Connection timeout (ms). */
  timeout: 10_000,
  /** Whether to auto-connect on instantiation. */
  autoConnect: true,
  /** Enable reconnection. */
  reconnection: true,
} as const;

/**
 * 🎯 Convenience type for consumers.
 */
export type SocketConfig = typeof SOCKET_CONFIG;

// ════════════════════════════════════════════════════════════
// 10. WebGL Quality Presets
// ════════════════════════════════════════════════════════════

export const WEBGL_QUALITY = {
  low: {
    pixelRatio: 1,
    shadowMapSize: 512,
    antialias: false,
    maxLights: 2,
  },
  medium: {
    pixelRatio: 1.5,
    shadowMapSize: 1024,
    antialias: true,
    maxLights: 4,
  },
  high: {
    pixelRatio: 2,
    shadowMapSize: 2048,
    antialias: true,
    maxLights: 8,
  },
} as const;

// ════════════════════════════════════════════════════════════
// 11. Animation Durations
// ════════════════════════════════════════════════════════════

export const ANIMATION_DURATIONS = {
  fastest: 150,
  fast: 300,
  normal: 500,
  slow: 800,
  slower: 1200,
} as const;

// ════════════════════════════════════════════════════════════
// 12. Password Requirements (synced with Backend)
// ════════════════════════════════════════════════════════════

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: false,
} as const;

// ════════════════════════════════════════════════════════════
// 13. Theme Constants
// ════════════════════════════════════════════════════════════

export const THEME = {
  colors: {
    background: '#080C14',
    void: '#0A0B0F',
    abyss: '#0F1116',
    forge: '#16181F',
    anvil: '#1E2029',
    primary: '#E8A33D',
    primaryHover: '#F5B658',
    secondary: '#5B7FA8',
    accent: '#C66B3D',
    success: '#7BA05B',
    warning: '#E07A3F',
    error: '#B8412E',
    valid: '#6B9B7C',
    text: '#F5F2ED',
    textSecondary: '#B5AFA5',
    textMuted: '#7D7870',
    glassBg: 'rgba(255,255,255,0.05)',
    glassBorder: 'rgba(255,255,255,0.10)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },
} as const;

// ════════════════════════════════════════════════════════════
// 14. Extended Regex
// ════════════════════════════════════════════════════════════

export const REGEX = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  repoUrl: /^https?:\/\/(?:www\.)?github\.com\/[\w-]+\/[\w-]+(?:\/)?$/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^a-zA-Z0-9]/,
  name: /^[\p{L}\s'-]+$/u,
} as const;

// ════════════════════════════════════════════════════════════
// 15. Storage Keys
// ════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  accessToken: 'as_access_token',
  refreshToken: 'as_refresh_token',
  tenantId: 'archsentinel:tenant_id',
  authState: 'archsentinel:auth',
  user: 'as_user',
  themePreference: 'architecture-sentinel-theme',
  sidebarCollapsed: 'architecture-sentinel-sidebar-collapsed',
  lastProjectId: 'architecture-sentinel-last-project',
} as const;

// ════════════════════════════════════════════════════════════
// 16. Custom Headers
// ════════════════════════════════════════════════════════════

export const HEADERS = {
  tenantId: 'X-Tenant-Id',
  requestId: 'X-Request-ID',
  rateLimitLimit: 'X-RateLimit-Limit',
  rateLimitRemaining: 'X-RateLimit-Remaining',
  rateLimitReset: 'X-RateLimit-Reset',
} as const;

// ════════════════════════════════════════════════════════════
// 17. Status & Severity Labels
// ════════════════════════════════════════════════════════════

export const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  ANALYZED: 'Analyzed',
  AWAITING_HUMAN: 'Awaiting Human Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
} as const;

export const SEVERITY_LABELS = {
  INFO: 'Information',
  WARNING: 'Warning',
  ERROR: 'Error',
  CRITICAL: 'Critical',
} as const;

// ════════════════════════════════════════════════════════════
// 18. Error Messages
// ════════════════════════════════════════════════════════════

export const ERROR_MESSAGES = {
  network: 'Unable to connect to the server. Please check your network.',
  unauthorized: 'Your session has expired. Please log in again.',
  forbidden: 'You do not have permission to perform this action.',
  invalidCredentials: 'Invalid email or password.',
  emailExists: 'This email is already registered.',
  registrationFailed: 'Registration failed. Please try again.',
  loginFailed: 'Login failed. Please try again.',
  notFound: 'The requested resource was not found.',
  validation: 'Please check the form for errors.',
  generic: 'Something went wrong. Please try again later.',
  fileTooLarge: 'The uploaded file exceeds the maximum allowed size.',
  analysisFailed: 'The analysis could not be completed. Please try again.',
} as const;

// ════════════════════════════════════════════════════════════
// 19. Utility Types
// ════════════════════════════════════════════════════════════

export type ThemeColors = typeof THEME.colors;
export type WebGLQualityPreset = keyof typeof WEBGL_QUALITY;
export type PaginationLimit = typeof PAGINATION_DEFAULTS['limit'];
export type AnimationDurationKey = keyof typeof ANIMATION_DURATIONS;
export type StorageKey = keyof typeof STORAGE_KEYS;
export type PasswordRequirements = typeof PASSWORD_REQUIREMENTS;
export type HeaderKey = keyof typeof HEADERS;