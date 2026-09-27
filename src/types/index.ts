/**
 * src/types/index.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 Single Source of Truth — ArchitectureSentinel v2.0
 *
 * المصدر الوحيد للحقيقة لـ:
 *   • Domain entities (User, Project, Analysis, Tenant, ...)
 *   • Auth DTOs (مطابقة 100% لـ Backend NestJS)
 *   • API contracts (Requests/Responses)
 *   • State machines (WorkflowState, HitLState)
 *   • WebSocket events
 *   • Utility types
 *
 * ✅ جميع Auth DTOs مطابقة لـ:
 *    • backend/src/auth/dto/register.dto.ts
 *    • backend/src/auth/dto/login.dto.ts
 *    • backend/src/auth/dto/change-password.dto.ts
 *    • backend/src/auth/dto/refresh.dto.ts
 *    • backend/src/auth/dto/auth-response.dto.ts
 *
 * ✅ يعيد تصدير جميع أنواع API من `./api`.
 * ✅ لا يستخدم `any` في أي مكان.
 *
 * @module types
 */

// ════════════════════════════════════════════════════════════
// 1. Enums & String Unions
// ════════════════════════════════════════════════════════════

/**
 * أدوار المستخدمين — مطابقة لـ Backend UserRole.
 *
 * ⚠️ ENGINEER مضاف لدعم فريق التحليل.
 */
export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER' | 'ENGINEER';

/**
 * حالات التحليل — مطابقة لـ Backend AnalysisStatus.
 *
 * ⚠️ تتضمن القيم من STATUS_LABELS في constants:
 *   QUEUED / RUNNING / COMPLETED / FAILED / CANCELLED
 */
export type AnalysisStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * حالات سير العمل (Workflow) — مطابقة لـ STATUS_LABELS.
 */
export type WorkflowStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'ANALYZED'
  | 'AWAITING_HUMAN'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED'
  | 'ESCALATED';

/** مستويات الخطورة في المراجعة */
export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** حالات المشروع */
export type ProjectStatus = 'active' | 'archived' | 'draft';

/** حالات المصادقة (تُستخدم في auth-store) */
export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

/** أنواع عقد AST المدعومة */
export type ASTNodeKind =
  | 'Program'
  | 'FunctionDeclaration'
  | 'VariableDeclaration'
  | 'ClassDeclaration'
  | 'IfStatement'
  | 'ReturnStatement'
  | 'CallExpression'
  | 'Identifier'
  | 'Literal';

// ════════════════════════════════════════════════════════════
// 2. Core Entities
// ════════════════════════════════════════════════════════════

/**
 * 🎯 User — مطابقة 100% لـ Backend User entity.
 *
 * ⚠️ IMPORTANT: تشمل `firstName` و `lastName` (منفصلين) كما يعيدها الـ Backend.
 *    الحقل `name` يبقى computed للتوافق الخلفي مع الكود القديم.
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Computed: `${firstName} ${lastName}` — للتوافق الخلفي */
  name: string;
  role: UserRole;
  tenantId: string | null;
  avatar?: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 🎯 SanitizedUser — نسخة آمنة للتخزين في الـ client.
 *
 * تُزيل الحقول الحساسة التي قد يعيدها الـ Backend:
 *   • passwordHash
 *   • refreshToken
 *   • internal metadata
 */
export type SanitizedUser = Omit<
  User,
  'passwordHash' | 'refreshToken'
>;

/** المستأجر (Tenant) — للـ Multi-tenancy */
export interface Tenant {
  id: string;
  name: string;
  description: string | null;
  slug?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** المشروع (Project) */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  status?: ProjectStatus;
  tenantId: string;
  analysesCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** قطعة مراجعة واحدة (ReviewChunk) */
export interface ReviewChunk {
  id?: string;
  filePath?: string;
  startLine: number;
  endLine: number;
  severity: Severity;
  message: string;
  suggestion?: string | null;
}

/** مراجعة الكود (CodeReview) */
export interface CodeReview {
  id: string;
  projectId: string;
  analysisId: string;
  status: AnalysisStatus;
  score: number | null;
  chunks: ReviewChunk[];
  createdAt: string;
  updatedAt: string;
}

/** عقدة AST (Recursive) */
export interface ASTNode {
  kind: ASTNodeKind | string;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  name?: string;
  value?: unknown;
  children?: ASTNode[];
  [key: string]: unknown;
}

/** قطعة vector embedding للـ RAG */
export interface VectorEmbeddingChunk {
  id?: string;
  content: string;
  metadata: Record<string, unknown>;
  vector?: number[];
  score?: number;
}

/** التحليل الكامل (Analysis) */
export interface Analysis {
  id: string;
  projectId: string;
  branch?: string | null;
  status: AnalysisStatus;
  workflowState?: WorkflowState;
  error?: string | null;
  review?: CodeReview | null;
  ast?: ASTNode | null;
  embeddings?: VectorEmbeddingChunk[] | null;
  progress?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

// ════════════════════════════════════════════════════════════
// 3. State Machines
// ════════════════════════════════════════════════════════════

/**
 * حالة سير عمل التحليل — Discriminated Union.
 *
 * تُستخدم في `analysis-store` لتتبع تقدم التحليل اللحظي.
 */
export type WorkflowState =
  | { status: 'IDLE' }
  | { status: 'PENDING'; queuedAt: string }
  | {
      status: 'PROCESSING';
      startedAt: string;
      progress: number;
      stage?: string;
    }
  | {
      status: 'COMPLETED';
      finishedAt: string;
      result: Analysis | unknown;
    }
  | { status: 'FAILED'; failedAt: string; error: string };

/**
 * حالة Human-in-the-Loop — Discriminated Union.
 */
export type HitLState =
  | { status: 'AWAITING_REVIEW'; reviewChunks: ReviewChunk[] }
  | { status: 'FEEDBACK_PROVIDED'; feedback: string; providedAt: string }
  | { status: 'RESOLVED'; resolvedAt: string };

// ════════════════════════════════════════════════════════════
// 4. Auth DTOs — Matching Backend exactly
// ════════════════════════════════════════════════════════════

/**
 * 🎯 LoginDto — يطابق `backend/src/auth/dto/login.dto.ts`
 *
 * Backend يُطبّق:
 *   • trim + lowercase على email
 *   • min 8 chars على password
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * 🎯 RegisterDto — يطابق `backend/src/auth/dto/register.dto.ts` تماماً.
 *
 * ⚠️ CRITICAL: الـ Backend يستقبل:
 *   • firstName  (required)
 *   • lastName   (required)
 *   • email      (required, unique)
 *   • password   (required, 8-128, uppercase + digit)
 *   • confirmPassword (required, must match password)
 *   • tenantId   (required for multi-tenancy)
 *
 * ✅ تم استبدال `name` المفرد بحقلين منفصلين.
 */
export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  tenantId: string;
}

/**
 * 🎯 ChangePasswordDto — يطابق `backend/src/auth/dto/change-password.dto.ts`
 */
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 🎯 RefreshDto — يطابق `backend/src/auth/dto/refresh.dto.ts`
 */
export interface RefreshDto {
  refreshToken: string;
}

// ════════════════════════════════════════════════════════════
// 5. Auth API Contracts
// ════════════════════════════════════════════════════════════

// ─────── Requests ───────
export type PostLoginRequest = LoginDto;
export type PostRegisterRequest = RegisterDto;
export type PostChangePasswordRequest = ChangePasswordDto;
export type PostRefreshRequest = RefreshDto;

// ─────── Responses ───────

/**
 * 🎯 PostLoginResponse — يطابق `AuthResponseDto` من الـ Backend.
 */
export interface PostLoginResponse {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * 🎯 PostRegisterResponse — نفس شكل PostLoginResponse.
 */
export interface PostRegisterResponse {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * 🎯 PostRefreshResponse — يدعم token rotation.
 *
 * ⚠️ refreshToken قد يكون مُدوَّراً من الـ Backend.
 *    إذا لم يُرسَل، نحتفظ بالقديم.
 */
export interface PostRefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * 🎯 GetMeResponse — endpoint `/auth/me`.
 */
export interface GetMeResponse {
  user: SanitizedUser;
}

/**
 * 🎯 LogoutResponse — endpoint `/auth/logout`.
 */
export interface LogoutResponse {
  success: boolean;
  message?: string;
}

// ════════════════════════════════════════════════════════════
// 6. Feature DTOs & Query Params
// ════════════════════════════════════════════════════════════

export interface CreateProjectDto {
  name: string;
  description?: string;
  repoUrl?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  repoUrl?: string;
  status?: ProjectStatus;
}

export interface CreateAnalysisDto {
  projectId?: string;
  branch?: string;
}

export interface SubmitHitLFeedbackDto {
  analysisId?: string;
  feedback: string;
  approved: boolean;
}

export interface GetProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetAnalysesParams {
  page?: number;
  limit?: number;
  status?: AnalysisStatus;
  projectId?: string;
}

// ════════════════════════════════════════════════════════════
// 7. API Response Wrappers
// ════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 🎯 ApiError — يطابق شكل الأخطاء من NestJS.
 *
 * ⚠️ يتضمن:
 *   • requestId  — لتتبع الطلب في الـ Backend logs
 *   • errors[]   — أخطاء الحقول من class-validator
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, unknown>;
  /** Request ID من الـ Backend (X-Request-ID) */
  requestId?: string;
  /** Field-level validation errors (NestJS format) */
  errors?: ValidationErrorField[];
}

/** خطأ حقل واحد من class-validator */
export interface ValidationErrorField {
  field: string;
  message: string;
  code?: string;
}

// ════════════════════════════════════════════════════════════
// 8. WebSocket Events
// ════════════════════════════════════════════════════════════

export type WsIncomingEvent =
  | {
      event: 'analysis:progress';
      payload: { analysisId: string; progress: number; stage: string };
    }
  | {
      event: 'analysis:complete';
      payload: { analysisId: string; result: Analysis };
    }
  | {
      event: 'hitl:request';
      payload: { analysisId: string; chunks: ReviewChunk[] };
    }
  | {
      event: 'notification';
      payload: { message: string; severity: 'info' | 'warn' | 'error' };
    };

export type WsOutgoingEvent =
  | { event: 'hitl:feedback'; payload: SubmitHitLFeedbackDto }
  | { event: 'analysis:cancel'; payload: { analysisId: string } };

// ════════════════════════════════════════════════════════════
// 9. Utility Types
// ════════════════════════════════════════════════════════════

export type Nullable<T> = T | null;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

// ════════════════════════════════════════════════════════════
// 10. ✅ Re-export from ./api
// ════════════════════════════════════════════════════════════

export * from './api';