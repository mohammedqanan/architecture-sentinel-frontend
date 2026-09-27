/**
 * src/hooks/analysis/use-analysis-workflow.ts
 * ════════════════════════════════════════════════════════════
 * Analysis workflow state — unified React Query + Zustand + WS.
 *
 * 🎯 Backend contract:
 *   GET /analyses/:id → { success: true, data: Analysis }
 *
 * @module use-analysis-workflow
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { getAnalysis, cancelAnalysis } from '@/services/analysis.service';
import { queryKeys } from '@/lib/query-client';
import { socketClient } from '@/lib/socket-client';
import { useAnalysisStore } from '@/stores/analysis-store';
import type {
  Analysis,
  HitLState,
  ReviewChunk,
  WorkflowState,
} from '@/types';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const ACTIVE_REFETCH_MS = 2_000;

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface ProgressEvent {
  analysisId: string;
  progress: number;
  stage?: string;
}

interface CompleteEvent {
  analysisId: string;
  result: Analysis;
}

interface HitlRequestEvent {
  analysisId: string;
  chunks: ReviewChunk[];
}

export interface AnalysisWorkflowResult {
  analysis: Analysis | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  progress: number;
  workflowState: WorkflowState;
  stage: string | null;
  refetch: () => void;
  cancel: () => Promise<void>;
  isCancelling: boolean;
}

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

/**
 * 🎯 Normalizes the query response to the Analysis object.
 *
 * Backend currently wraps responses as `{ success, data: Analysis }`.
 * Legacy contracts may return `{ analysis: Analysis }` or a raw Analysis.
 *
 * @param response - Raw query response (unknown shape).
 * @returns The Analysis object, or `undefined` if not present.
 */
function extractAnalysis(response: unknown): Analysis | undefined {
  if (!response || typeof response !== 'object') return undefined;

  const r = response as Record<string, unknown>;

  // Shape 1: { success, data: Analysis }  ← current backend
  if (r.data && typeof r.data === 'object') {
    return r.data as Analysis;
  }

  // Shape 2: { analysis: Analysis }       ← legacy
  if (r.analysis && typeof r.analysis === 'object') {
    return r.analysis as Analysis;
  }

  // Shape 3: raw Analysis
  if (typeof r.id === 'string' && typeof r.status === 'string') {
    return response as Analysis;
  }

  return undefined;
}

/** Extracts the status string safely. */
function extractStatus(response: unknown): string | undefined {
  return extractAnalysis(response)?.status;
}

function extractStage(state: WorkflowState): string | null {
  if (state.status !== 'PROCESSING') return null;
  return 'stage' in state ? (state.stage ?? null) : null;
}

// ════════════════════════════════════════════════════════════
// Hook
// ════════════════════════════════════════════════════════════

export function useAnalysisWorkflow(
  analysisId: string,
): AnalysisWorkflowResult {
  const queryClient = useQueryClient();

  const setCurrentAnalysisId = useAnalysisStore((s) => s.setCurrentAnalysisId);
  const updateProgress = useAnalysisStore((s) => s.updateProgress);
  const setAnalysisComplete = useAnalysisStore((s) => s.setAnalysisComplete);
  const setAnalysisFailed = useAnalysisStore((s) => s.setAnalysisFailed);
  const setHitLState = useAnalysisStore((s) => s.setHitLState);
  const progress = useAnalysisStore((s) => s.progress);
  const workflowState = useAnalysisStore((s) => s.workflowState);

  // ───── Query ─────
  const query = useQuery({
    queryKey: queryKeys.analyses.detail(analysisId),
    queryFn: () => getAnalysis(analysisId),
    enabled: Boolean(analysisId),

    /**
     * 🎯 FIXED: safe `refetchInterval` that:
     *   1. Guards against `undefined` at every level.
     *   2. Reads the status from the normalized Analysis object.
     *   3. Never throws — returns `false` as a safe default.
     */
    refetchInterval: (q) => {
      const status = extractStatus(q.state.data);
      return status === 'RUNNING' || status === 'QUEUED'
        ? ACTIVE_REFETCH_MS
        : false;
    },

    refetchIntervalInBackground: false,
  });

  // ───── Current analysis ID sync ─────
  useEffect(() => {
    if (analysisId) setCurrentAnalysisId(analysisId);
  }, [analysisId, setCurrentAnalysisId]);

  // ───── Socket wiring ─────
  useEffect(() => {
    if (!analysisId) return;

    const onProgress = (payload: ProgressEvent): void => {
      if (payload.analysisId !== analysisId) return;
      updateProgress(payload);
    };

    const onComplete = (payload: CompleteEvent): void => {
      if (payload.analysisId !== analysisId) return;
      setAnalysisComplete(payload);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.detail(analysisId),
      });
    };

    const onFailed = (payload: { analysisId: string; error: string }): void => {
      if (payload.analysisId !== analysisId) return;
      setAnalysisFailed(payload);
    };

    const onHitl = (payload: HitlRequestEvent): void => {
      if (payload.analysisId !== analysisId) return;
      const state: HitLState = {
        status: 'AWAITING_REVIEW',
        reviewChunks: payload.chunks,
      };
      setHitLState({ analysisId: payload.analysisId, state });
    };

    socketClient.on('analysis:progress', onProgress);
    socketClient.on('analysis:complete', onComplete);
    socketClient.on('analysis:failed', onFailed);
    socketClient.on('hitl:request', onHitl);

    return () => {
      socketClient.off('analysis:progress', onProgress);
      socketClient.off('analysis:complete', onComplete);
      socketClient.off('analysis:failed', onFailed);
      socketClient.off('hitl:request', onHitl);
    };
  }, [
    analysisId,
    updateProgress,
    setAnalysisComplete,
    setAnalysisFailed,
    setHitLState,
    queryClient,
  ]);

  // ───── Cancel mutation ─────
  const cancelMutation = useMutation({
    mutationFn: () => cancelAnalysis(analysisId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.detail(analysisId),
      });
    },
  });

  // ───── Derived ─────
  const analysis = extractAnalysis(query.data);

  return {
    analysis,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    progress: progress || analysis?.progress || 0,
    workflowState,
    stage: extractStage(workflowState),
    refetch: () => void query.refetch(),
    cancel: async () => {
      await cancelMutation.mutateAsync();
    },
    isCancelling: cancelMutation.isPending,
  };
}