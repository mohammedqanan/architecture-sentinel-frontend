/**
 * src/services/analysis.service.ts
 *
 * Analysis service layer — stateless, typed wrapper over the api-client
 * for all analysis‑related operations. Provides CRUD, sub‑resource fetching,
 * and HitL feedback submission. All errors propagate as ApiError.
 *
 * ✅ Uses `get` and `post` from api-client (which return data directly)
 * ❌ Does NOT use apiClient.get / apiClient.post directly (would return AxiosResponse)
 */

import { get, post } from '../lib/api-client';
import { API_ROUTES } from '../constants';
import type {
  Analysis,
  PaginatedResponse,
  ASTNode,
  VectorEmbeddingChunk,
  HitLState,
  CreateAnalysisDto,
  SubmitHitLFeedbackDto,
  GetAnalysesParams,
} from '../types';

// ============================================================
// Analysis CRUD
// ============================================================

/**
 * Fetch a paginated list of analyses for a given project.
 * @param projectId - The ID of the project.
 * @param params - Optional pagination and filtering parameters.
 * @returns Paginated list of analyses.
 */
export async function listAnalyses(
  projectId: string,
  params?: Omit<GetAnalysesParams, 'projectId'>
): Promise<PaginatedResponse<Analysis>> {
  const url = API_ROUTES.projects.analyses(projectId);
  return get<PaginatedResponse<Analysis>>(url, { params });
}

/**
 * Fetch a single analysis by its ID.
 * @param analysisId - The ID of the analysis.
 * @returns The analysis object.
 */
export async function getAnalysis(
  analysisId: string
): Promise<{ analysis: Analysis }> {
  const url = API_ROUTES.analyses.detail(analysisId);
  return get<{ analysis: Analysis }>(url);
}

/**
 * Create a new analysis for a project.
 * @param projectId - The ID of the project.
 * @param data - The analysis creation DTO.
 * @returns The created analysis.
 */
export async function createAnalysis(
  projectId: string,
  data: CreateAnalysisDto
): Promise<{ analysis: Analysis }> {
  const url = API_ROUTES.projects.analyses(projectId);
  return post<{ analysis: Analysis }>(url, data);
}

/**
 * Cancel an ongoing analysis.
 * @param analysisId - The ID of the analysis to cancel.
 * @returns Success indicator.
 */
export async function cancelAnalysis(
  analysisId: string
): Promise<{ success: true }> {
  const url = API_ROUTES.analyses.cancel(analysisId);
  return post<{ success: true }>(url, {});
}

// ============================================================
// Sub‑resource Fetching
// ============================================================

/**
 * Fetch the Abstract Syntax Tree (AST) for a given analysis.
 * @param analysisId - The ID of the analysis.
 * @returns The AST node.
 */
export async function getAst(analysisId: string): Promise<{ ast: ASTNode }> {
  const url = `${API_ROUTES.analyses.detail(analysisId)}/ast`;
  return get<{ ast: ASTNode }>(url);
}

/**
 * Fetch paginated RAG documents (vector embedding chunks) for an analysis.
 * @param analysisId - The ID of the analysis.
 * @param page - Page number (defaults to store's current page).
 * @param limit - Items per page (defaults to store's current limit).
 * @returns Paginated list of vector embedding chunks.
 */
export async function getRagDocuments(
  analysisId: string,
  page?: number,
  limit?: number
): Promise<PaginatedResponse<VectorEmbeddingChunk>> {
  const url = `${API_ROUTES.analyses.detail(analysisId)}/rag/documents`;
  return get<PaginatedResponse<VectorEmbeddingChunk>>(url, {
    params: { page, limit },
  });
}

// ============================================================
// HitL (Human‑in‑the‑Loop)
// ============================================================

/**
 * Fetch the current HitL state for an analysis.
 * @param analysisId - The ID of the analysis.
 * @returns The HitL state object.
 */
export async function getHitLState(
  analysisId: string
): Promise<{ state: HitLState }> {
  const url = API_ROUTES.analyses.hitlState(analysisId);
  return get<{ state: HitLState }>(url);
}

/**
 * Submit feedback for a HitL request.
 * @param analysisId - The ID of the analysis.
 * @param feedback - The feedback DTO.
 * @returns Confirmation of receipt.
 */
export async function submitHitLFeedback(
  analysisId: string,
  feedback: SubmitHitLFeedbackDto
): Promise<{ status: 'FEEDBACK_RECEIVED' }> {
  const url = API_ROUTES.analyses.hitlFeedback(analysisId);
  return post<{ status: 'FEEDBACK_RECEIVED' }>(url, feedback);
}