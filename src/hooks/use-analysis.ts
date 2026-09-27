/**
 * src/hooks/use-analysis.ts
 *
 * Analysis domain hooks — React Query-powered server-state management
 * with real-time client-state access via Zustand store selectors.
 * Primary interface for components to fetch, cache, and mutate analysis data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { useAnalysisStore } from '../stores/analysis-store';
import {
  listAnalyses,
  getAnalysis,
  getAst,
  getRagDocuments,
  getHitLState,
  createAnalysis,
  cancelAnalysis,
  submitHitLFeedback,
} from '../services/analysis.service';
import type {
  CreateAnalysisDto,
  SubmitHitLFeedbackDto,
  GetAnalysesParams,
} from '../types';

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Fetch a paginated list of analyses for a specific project.
 * @param projectId - The ID of the project.
 * @param params - Optional pagination and filtering parameters.
 */
export function useAnalysesList(
  projectId: string,
  params?: Omit<GetAnalysesParams, 'projectId'>
) {
  return useQuery({
    queryKey: queryKeys.analyses.list({ projectId, ...params }),
    queryFn: () => listAnalyses(projectId, params),
    staleTime: 30_000, // 30 seconds – analyses change often
    enabled: !!projectId,
  });
}

/**
 * Fetch a single analysis by ID.
 * @param analysisId - The ID of the analysis.
 */
export function useAnalysis(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.analyses.detail(analysisId),
    queryFn: () => getAnalysis(analysisId),
    enabled: !!analysisId,
  });
}

/**
 * Fetch the AST for a given analysis.
 * Usually lazy-loaded; use `enabled` to control when it runs.
 * @param analysisId - The ID of the analysis.
 * @param enabled - Whether the query should run (default: true).
 */
export function useAnalysisAst(analysisId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.analyses.detail(analysisId), 'ast'],
    queryFn: () => getAst(analysisId),
    enabled: !!analysisId && enabled,
    staleTime: 300_000, // 5 minutes – AST is static once generated
  });
}

/**
 * Fetch paginated RAG documents for an analysis.
 * Includes page and limit in the query key for automatic refetch on change.
 * @param analysisId - The ID of the analysis.
 * @param page - Page number (default: 1).
 * @param limit - Items per page (default: 10).
 */
export function useRagDocuments(analysisId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.analyses.detail(analysisId), 'rag', { page, limit }],
    queryFn: () => getRagDocuments(analysisId, page, limit),
    enabled: !!analysisId,
  });
}

/**
 * Fetch the current HitL state for an analysis.
 * @param analysisId - The ID of the analysis.
 * @param enabled - Whether the query should run (default: true).
 */
export function useHitLState(analysisId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.analyses.detail(analysisId), 'hitl'],
    queryFn: () => getHitLState(analysisId),
    enabled: !!analysisId && enabled,
    staleTime: 10_000, // 10 seconds – state may change frequently via WebSocket
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Create a new analysis for a project.
 * On success, invalidates the analyses list for the project.
 */
export function useCreateAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateAnalysisDto }) =>
      createAnalysis(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.list({ projectId }),
      });
    },
  });
}

/**
 * Cancel an ongoing analysis.
 * On success, invalidates the analysis detail and list caches.
 */
export function useCancelAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) => cancelAnalysis(analysisId),
    onSuccess: (_, analysisId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.detail(analysisId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.lists(),
      });
    },
  });
}

/**
 * Submit feedback for a HitL request.
 * On success, invalidates the HitL state and analysis detail caches.
 */
export function useSubmitHitLFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ analysisId, feedback }: { analysisId: string; feedback: SubmitHitLFeedbackDto }) =>
      submitHitLFeedback(analysisId, feedback),
    onSuccess: (_, { analysisId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.analyses.detail(analysisId), 'hitl'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.detail(analysisId),
      });
    },
  });
}

// ============================================================
// RE‑EXPORT STORE SELECTORS (Real‑time State)
// ============================================================
// These selectors provide access to the WebSocket-driven live state
// without requiring components to import the store directly.

/**
 * Returns the current analysis object from the store (live state).
 */
export const useCurrentAnalysis = () => useAnalysisStore((state) => state.analysis);

/**
 * Returns the current analysis progress percentage (0-100) from the store.
 */
export const useAnalysisProgress = () => useAnalysisStore((state) => state.progress);

/**
 * Returns the current workflow state from the store.
 */
export const useAnalysisWorkflow = () => useAnalysisStore((state) => state.workflowState);

/**
 * Returns the current HitL state from the store (live WebSocket state).
 * Use this for real-time updates; use useHitLState() for server-cached state.
 */
export const useHitLStoreState = () => useAnalysisStore((state) => state.hitlState);

/**
 * Returns the current AST from the store.
 */
export const useAstStore = () => useAnalysisStore((state) => state.ast);

/**
 * Returns the current list of RAG documents from the store.
 */
export const useRagStoreDocuments = () => useAnalysisStore((state) => state.ragDocuments);

/**
 * Returns the current loading action from the store.
 */
export const useAnalysisLoadingAction = () => useAnalysisStore((state) => state.loadingAction);

/**
 * Returns the current error from the store.
 */
export const useAnalysisStoreError = () => useAnalysisStore((state) => state.error);