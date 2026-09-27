/**
 * src/types/api.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 API Contracts — ArchitectureSentinel v2.0
 *
 * المصدر الموحّد لأنواع الطلبات والاستجابات لكل endpoint.
 *
 * ✅ يعتمد على الأنواع الأساسية من `./index.ts` (DRY).
 * ✅ يستخدم `ProjectStatus` و `AnalysisStatus` بدل قيم hardcoded.
 * ✅ يتوافق مع Backend DTOs 100%.
 * ✅ لا يوجد `any`.
 * ✅ يعيد تصدير `ApiError` و `ValidationErrorField`.
 *
 * ⚠️ IMPORTANT:
 *    جميع الـ Responses تتضمن:
 *      • Success shapes  — للبيانات الصحيحة
 *      • Error propagation  — عبر `ApiError` من `api-client`
 *
 * @module api
 */

import type {
  LoginDto,
  RegisterDto,
  RefreshDto,
  ChangePasswordDto,
  SanitizedUser,
  Project,
  ProjectStatus,
  Analysis,
  AnalysisStatus,
  PaginatedResponse,
  CreateProjectDto,
  UpdateProjectDto,
  CreateAnalysisDto,
  SubmitHitLFeedbackDto,
  HitLState,
  VectorEmbeddingChunk,
  ApiError,
  ValidationErrorField,
} from './index';

// ════════════════════════════════════════════════════════════
// 1. Auth — Requests & Responses
// ════════════════════════════════════════════════════════════

// ─────── Login ───────

/** POST /auth/login */
export type PostLoginRequest = LoginDto;

/**
 * POST /auth/login — Response
 *
 * ⚠️ مطابق لـ `backend/src/auth/dto/auth-response.dto.ts`.
 */
export interface PostLoginResponse {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// ─────── Register ───────

/** POST /auth/register */
export type PostRegisterRequest = RegisterDto;

/**
 * POST /auth/register — Response
 *
 * ⚠️ نفس شكل PostLoginResponse (auto-login after register).
 */
export type PostRegisterResponse = PostLoginResponse;

// ─────── Refresh ───────

/** POST /auth/refresh */
export type PostRefreshRequest = RefreshDto;

/**
 * POST /auth/refresh — Response
 *
 * ⚠️ يدعم token rotation:
 *    `refreshToken` قد يكون مُدوَّراً من الـ Backend.
 */
export interface PostRefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// ─────── Change Password ───────

/** POST /auth/change-password */
export type PostChangePasswordRequest = ChangePasswordDto;

/** POST /auth/change-password — Response */
export interface PostChangePasswordResponse {
  success: boolean;
  message?: string;
}

// ─────── Logout ───────

/** POST /auth/logout — Request (no body) */
export type PostLogoutRequest = void;

/** POST /auth/logout — Response */
export interface PostLogoutResponse {
  success: boolean;
  message?: string;
}

// ─────── Get Me ───────

/** GET /auth/me — Response */
export interface GetMeResponse {
  user: SanitizedUser;
}

// ════════════════════════════════════════════════════════════
// 2. Projects — Requests & Responses
// ════════════════════════════════════════════════════════════

/**
 * GET /projects — Query Parameters
 *
 * ✅ يستخدم `ProjectStatus` بدل hardcoded strings.
 */
export interface GetProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** GET /projects — Response */
export type GetProjectsResponse = PaginatedResponse<Project>;

// ─────── Single Project ───────

/** GET /projects/:id — Path Params */
export interface GetProjectParams {
  id: string;
}

/** GET /projects/:id — Response */
export interface GetProjectResponse {
  project: Project;
}

// ─────── Create Project ───────

/** POST /projects — Request */
export type PostProjectRequest = CreateProjectDto;

/** POST /projects — Response */
export interface PostProjectResponse {
  project: Project;
}

// ─────── Update Project ───────

/** PATCH /projects/:id — Path Params */
export interface PatchProjectParams {
  id: string;
}

/** PATCH /projects/:id — Request */
export type PatchProjectRequest = UpdateProjectDto;

/** PATCH /projects/:id — Response */
export interface PatchProjectResponse {
  project: Project;
}

// ─────── Delete Project ───────

/** DELETE /projects/:id — Path Params */
export interface DeleteProjectParams {
  id: string;
}

/** DELETE /projects/:id — Response */
export interface DeleteProjectResponse {
  success: true;
}

// ════════════════════════════════════════════════════════════
// 3. Analyses — Requests & Responses
// ════════════════════════════════════════════════════════════

/**
 * GET /projects/:projectId/analyses — Query Parameters
 *
 * ✅ يستخدم `AnalysisStatus` بدل hardcoded strings.
 */
export interface GetAnalysesParams {
  projectId: string;
  page?: number;
  limit?: number;
  status?: AnalysisStatus | 'all';
}

/** GET /projects/:projectId/analyses — Response */
export type GetAnalysesResponse = PaginatedResponse<Analysis>;

// ─────── Single Analysis ───────

/** GET /analyses/:id — Path Params */
export interface GetAnalysisParams {
  id: string;
}

/** GET /analyses/:id — Response */
export interface GetAnalysisResponse {
  analysis: Analysis;
}

// ─────── Create Analysis ───────

/**
 * POST /projects/:projectId/analyses — Path Params
 *
 * ⚠️ projectId يأتي من URL، والـ body يحتوي على branch فقط.
 */
export interface PostAnalysisParams {
  projectId: string;
}

/** POST /projects/:projectId/analyses — Request */
export type PostAnalysisRequest = Omit<CreateAnalysisDto, 'projectId'>;

/** POST /projects/:projectId/analyses — Response */
export interface PostAnalysisResponse {
  analysis: Analysis;
}

// ─────── Cancel Analysis ───────

/** POST /analyses/:id/cancel — Path Params */
export interface PostCancelAnalysisParams {
  id: string;
}

/** POST /analyses/:id/cancel — Response */
export interface PostCancelAnalysisResponse {
  success: true;
}

// ─────── Delete Analysis ───────

/** DELETE /analyses/:id — Path Params */
export interface DeleteAnalysisParams {
  id: string;
}

/** DELETE /analyses/:id — Response */
export interface DeleteAnalysisResponse {
  success: true;
}

// ════════════════════════════════════════════════════════════
// 4. HitL (Human-in-the-Loop)
// ════════════════════════════════════════════════════════════

// ─────── Get State ───────

/** GET /analyses/:id/hitl/state — Path Params */
export interface GetHitLStateParams {
  id: string;
}

/** GET /analyses/:id/hitl/state — Response */
export interface GetHitLStateResponse {
  state: HitLState;
}

// ─────── Submit Feedback ───────

/** POST /analyses/:id/hitl/feedback — Path Params */
export interface PostHitLFeedbackParams {
  id: string;
}

/** POST /analyses/:id/hitl/feedback — Request */
export type PostHitLFeedbackRequest = SubmitHitLFeedbackDto;

/** POST /analyses/:id/hitl/feedback — Response */
export interface PostHitLFeedbackResponse {
  status: 'FEEDBACK_RECEIVED';
}

// ════════════════════════════════════════════════════════════
// 5. RAG (Retrieval-Augmented Generation)
// ════════════════════════════════════════════════════════════

/** GET /analyses/:id/rag/documents — Path + Query Params */
export interface GetRagDocumentsParams {
  id: string;
  page?: number;
  limit?: number;
}

/** GET /analyses/:id/rag/documents — Response */
export type GetRagDocumentsResponse = PaginatedResponse<VectorEmbeddingChunk>;

// ════════════════════════════════════════════════════════════
// 6. AST (Abstract Syntax Tree)
// ════════════════════════════════════════════════════════════

/** GET /analyses/:id/ast — Path Params */
export interface GetAstParams {
  id: string;
}

/** GET /analyses/:id/ast — Response */
export interface GetAstResponse {
  ast: import('./index').ASTNode;
}

// ════════════════════════════════════════════════════════════
// 7. Re-exports from ./index
// ════════════════════════════════════════════════════════════

/**
 * إعادة تصدير `ApiError` و `ValidationErrorField`
 * لاستخدامها مباشرة من `@/types/api`.
 */
export type { ApiError, ValidationErrorField };

// ════════════════════════════════════════════════════════════
// 8. Utility Type — API Endpoint Descriptor
// ════════════════════════════════════════════════════════════

/**
 * 🎯 وصف موحّد لأي endpoint.
 *
 * يُستخدم للتوثيق والـ testing.
 *
 * @example
 * ```ts
 * const loginEndpoint: ApiEndpointDefinition<PostLoginRequest, PostLoginResponse> = {
 *   method: 'POST',
 *   path: '/auth/login',
 *   requiresAuth: false,
 * };
 * ```
 */
export interface ApiEndpointDefinition<Req = unknown, Res = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requiresAuth?: boolean;
  /** Optional description (للتوثيق) */
  description?: string;
  /** Request shape (للتوثيق) */
  _request?: Req;
  /** Response shape (للتوثيق) */
  _response?: Res;
}