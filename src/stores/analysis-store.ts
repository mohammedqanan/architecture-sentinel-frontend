/**
 * src/stores/analysis-store.ts
 *
 * Zustand store for managing code analyses, real-time progress, AST, RAG documents,
 * and Human-in-the-Loop (HitL) state. Consumes WebSocket events via public actions.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient } from '../lib/api-client';
import { getQueryClient, queryKeys } from '../lib/query-client';
import { API_ROUTES, PAGINATION_DEFAULTS, ERROR_MESSAGES } from '../constants';
import type {
  Analysis,
  ASTNode,
  VectorEmbeddingChunk,
  HitLState,
  WorkflowState,
  SubmitHitLFeedbackDto,
  PaginatedResponse,
} from '../types';

// ===== Helper: map Analysis to WorkflowState =====

function mapAnalysisToWorkflowState(analysis: Analysis): WorkflowState {
  const { status, progress, error, completedAt } = analysis;
  switch (status) {
    case 'QUEUED':
      return { status: 'PENDING', queuedAt: analysis.createdAt };
    case 'RUNNING':
      return { status: 'PROCESSING', startedAt: analysis.updatedAt, progress: progress ?? 0 };
    case 'COMPLETED':
      return { status: 'COMPLETED', finishedAt: completedAt ?? analysis.updatedAt, result: analysis };
    case 'FAILED':
      return { status: 'FAILED', failedAt: completedAt ?? analysis.updatedAt, error: error ?? 'Unknown error' };
    case 'CANCELLED':
      return { status: 'IDLE' };
    default:
      return { status: 'IDLE' };
  }
}

// ===== State Interface =====

interface AnalysisState {
  // Current analysis
  currentAnalysisId: string | null;
  analysis: Analysis | null;

  // Workflow & HitL states (discriminated unions)
  workflowState: WorkflowState;
  hitlState: HitLState;

  // Progress (real‑time)
  progress: number; // 0-100
  stage: string | null;

  // AST
  ast: ASTNode | null;

  // RAG documents (paginated)
  ragDocuments: VectorEmbeddingChunk[];
  ragPage: number;
  ragLimit: number;
  ragTotal: number;
  ragTotalPages: number;

  // UI state
  loadingAction: 'fetch' | 'fetchAst' | 'fetchRag' | 'fetchHitl' | 'submitFeedback' | 'cancel' | null;
  error: string | null;

  // ===== Actions =====
  fetchAnalysis: (id: string) => Promise<void>;
  fetchAst: (id: string) => Promise<void>;
  fetchRagDocuments: (id: string, page?: number, limit?: number) => Promise<void>;
  fetchHitLState: (id: string) => Promise<void>;

  submitHitLFeedback: (analysisId: string, feedback: SubmitHitLFeedbackDto) => Promise<void>;
  cancelAnalysis: (id: string) => Promise<void>;

  // Real‑time event handlers
  updateProgress: (payload: { analysisId: string; progress: number; stage?: string }) => void;
  setAnalysisComplete: (payload: { analysisId: string; result: Analysis }) => void;
  setAnalysisFailed: (payload: { analysisId: string; error: string }) => void;
  setHitLState: (payload: { analysisId: string; state: HitLState }) => void;

  // Selection
  setCurrentAnalysisId: (id: string | null) => void;

  // Reset
  reset: () => void;
}

// ===== Initial State =====

const initialState: Omit<
  AnalysisState,
  | 'fetchAnalysis'
  | 'fetchAst'
  | 'fetchRagDocuments'
  | 'fetchHitLState'
  | 'submitHitLFeedback'
  | 'cancelAnalysis'
  | 'updateProgress'
  | 'setAnalysisComplete'
  | 'setAnalysisFailed'
  | 'setHitLState'
  | 'setCurrentAnalysisId'
  | 'reset'
> = {
  currentAnalysisId: null,
  analysis: null,
  workflowState: { status: 'IDLE' },
  hitlState: { status: 'AWAITING_REVIEW', reviewChunks: [] },
  progress: 0,
  stage: null,
  ast: null,
  ragDocuments: [],
  ragPage: PAGINATION_DEFAULTS.page,
  ragLimit: PAGINATION_DEFAULTS.limit,
  ragTotal: 0,
  ragTotalPages: 0,
  loadingAction: null,
  error: null,
};

// ===== Store Implementation =====

export const useAnalysisStore = create<AnalysisState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ---- Fetch Actions ----

      fetchAnalysis: async (id: string) => {
        set({ loadingAction: 'fetch', error: null });
        try {
          const response = await apiClient.get<{ analysis: Analysis }>(
            API_ROUTES.analyses.detail(id)
          );
          const { analysis } = response.data;
          set({
            analysis,
            currentAnalysisId: analysis.id,
            workflowState: mapAnalysisToWorkflowState(analysis),
            progress: analysis.status === 'COMPLETED' ? 100 : analysis.progress ?? 0,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          set({
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      fetchAst: async (id: string) => {
        set({ loadingAction: 'fetchAst', error: null });
        try {
          const response = await apiClient.get<{ ast: ASTNode }>(
            `${API_ROUTES.analyses.detail(id)}/ast`
          );
          set({
            ast: response.data.ast,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          set({
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      fetchRagDocuments: async (id: string, page = get().ragPage, limit = get().ragLimit) => {
        set({ loadingAction: 'fetchRag', error: null });
        try {
          const response = await apiClient.get<PaginatedResponse<VectorEmbeddingChunk>>(
            `${API_ROUTES.analyses.detail(id)}/rag/documents`,
            { params: { page, limit } }
          );
          const { items, page: currentPage, limit: currentLimit, total, totalPages } = response.data;
          set({
            ragDocuments: items,
            ragPage: currentPage,
            ragLimit: currentLimit,
            ragTotal: total,
            ragTotalPages: totalPages,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          set({
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      fetchHitLState: async (id: string) => {
        set({ loadingAction: 'fetchHitl', error: null });
        try {
          const response = await apiClient.get<{ state: HitLState }>(
            API_ROUTES.analyses.hitlState(id)
          );
          set({
            hitlState: response.data.state,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          set({
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      // ---- Mutations ----

      submitHitLFeedback: async (analysisId: string, feedback: SubmitHitLFeedbackDto) => {
        const previousHitl = get().hitlState;
        // Optimistic update
        set({
          hitlState: {
            status: 'FEEDBACK_PROVIDED',
            feedback: feedback.feedback,
            providedAt: new Date().toISOString(),
          },
          loadingAction: 'submitFeedback',
          error: null,
        });

        try {
          await apiClient.post(
            API_ROUTES.analyses.hitlFeedback(analysisId),
            feedback
          );
          // Sync with backend
          await get().fetchHitLState(analysisId);
          set({ loadingAction: null });
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.analyses.detail(analysisId),
          });
        } catch (error) {
          // Rollback
          set({
            hitlState: previousHitl,
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      cancelAnalysis: async (id: string) => {
        set({ loadingAction: 'cancel', error: null });
        try {
          await apiClient.post(API_ROUTES.analyses.cancel(id), {});
          set((state) => ({
            analysis: state.analysis ? { ...state.analysis, status: 'CANCELLED' } : null,
            workflowState: { status: 'IDLE' },
            loadingAction: null,
            error: null,
          }));
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.analyses.detail(id),
          });
        } catch (error) {
          set({
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      // ---- Real‑time event handlers ----

      updateProgress: (payload) => {
        const { analysisId, progress, stage } = payload;
        if (get().currentAnalysisId !== analysisId) return;
        set({
          progress: Math.min(100, progress),
          stage: stage ?? get().stage,
          workflowState: {
            status: 'PROCESSING',
            startedAt: get().workflowState.status === 'PROCESSING'
              ? (get().workflowState as Extract<WorkflowState, { status: 'PROCESSING' }>).startedAt
              : new Date().toISOString(),
            progress,
          },
        });
      },

      setAnalysisComplete: (payload) => {
        const { analysisId, result } = payload;
        if (get().currentAnalysisId !== analysisId) return;
        set({
          analysis: result,
          workflowState: {
            status: 'COMPLETED',
            finishedAt: new Date().toISOString(),
            result,
          },
          progress: 100,
          stage: null,
        });
        getQueryClient().invalidateQueries({
          queryKey: queryKeys.analyses.detail(analysisId),
        });
      },

      setAnalysisFailed: (payload) => {
        const { analysisId, error } = payload;
        if (get().currentAnalysisId !== analysisId) return;
        set({
          workflowState: {
            status: 'FAILED',
            failedAt: new Date().toISOString(),
            error,
          },
          progress: 0,
          stage: null,
          error,
        });
      },

      setHitLState: (payload) => {
        const { analysisId, state } = payload;
        if (get().currentAnalysisId !== analysisId) return;
        set({ hitlState: state });
      },

      // ---- Selection ----

      setCurrentAnalysisId: (id: string | null) => {
        set({ currentAnalysisId: id });
        if (id === null) {
          set({
            analysis: null,
            ast: null,
            ragDocuments: [],
            progress: 0,
            stage: null,
            hitlState: { status: 'AWAITING_REVIEW', reviewChunks: [] },
            workflowState: { status: 'IDLE' },
            error: null,
          });
        }
      },

      // ---- Reset ----

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'AnalysisStore' }
  )
);

// ===== Selectors =====

export const useCurrentAnalysis = () => useAnalysisStore((state) => state.analysis);
export const useAnalysisProgress = () => useAnalysisStore((state) => state.progress);
export const useAnalysisWorkflow = () => useAnalysisStore((state) => state.workflowState);
export const useHitLState = () => useAnalysisStore((state) => state.hitlState);
export const useAst = () => useAnalysisStore((state) => state.ast);
export const useRagDocuments = () => useAnalysisStore((state) => state.ragDocuments);
export const useRagPagination = () =>
  useAnalysisStore((state) => ({
    page: state.ragPage,
    limit: state.ragLimit,
    total: state.ragTotal,
    totalPages: state.ragTotalPages,
  }));
export const useAnalysisLoading = () => useAnalysisStore((state) => state.loadingAction);
export const useAnalysisError = () => useAnalysisStore((state) => state.error);