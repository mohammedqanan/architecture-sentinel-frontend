/**
 * Aggregates recent analyses across the given projects and keeps them fresh
 * via WebSocket events.
 *
 * Data flow:
 *   1. Initial fetch via useQueries (fan-out across project ids).
 *   2. Live updates received from the shared socket client are merged on top
 *      of the fetched data, keyed by analysis id.
 *
 * Note: live updates are held in a local Map rather than the analysis store
 * because the current store tracks a single active analysis, not a list.
 * This hook is the boundary that would migrate to a `recentAnalyses` slot in
 * the store if/when that becomes the single source of truth for the list.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { listAnalyses } from '@/services/analysis.service';
import { socketClient } from '@/lib/socket-client';
import type { Analysis } from '@/types';

interface ProgressPayload {
  analysisId: string;
  progress: number;
  stage?: string;
}

interface CompletePayload {
  analysisId: string;
  result: Analysis;
}

export interface LiveAnalysesResult {
  analyses: Analysis[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useLiveAnalyses(
  projectIds: string[],
  limit = 10,
): LiveAnalysesResult {
  const queries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: queryKeys.analyses.list({ projectId, limit }),
      queryFn: () => listAnalyses(projectId, { limit }),
      staleTime: 30_000,
      enabled: Boolean(projectId),
    })),
  });

  const [liveAnalyses, setLiveAnalyses] = useState<Map<string, Analysis>>(
    () => new Map(),
  );

  useEffect(() => {
    const handleProgress = (payload: ProgressPayload) => {
      setLiveAnalyses((prev) => {
        const existing = prev.get(payload.analysisId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(payload.analysisId, {
          ...existing,
          progress: payload.progress,
          status: 'RUNNING',
        });
        return next;
      });
    };

    const handleComplete = (payload: CompletePayload) => {
      setLiveAnalyses((prev) => {
        const next = new Map(prev);
        next.set(payload.analysisId, payload.result);
        return next;
      });
    };

    socketClient.on('analysis:progress', handleProgress);
    socketClient.on('analysis:complete', handleComplete);

    return () => {
      socketClient.off('analysis:progress', handleProgress);
      socketClient.off('analysis:complete', handleComplete);
    };
  }, []);

  const fetched = useMemo(() => {
    return queries
      .flatMap((q) => q.data?.items ?? [])
      .filter(Boolean);
  }, [queries]);

  const analyses = useMemo(() => {
    const byId = new Map<string, Analysis>();
    for (const a of fetched) byId.set(a.id, a);
    for (const [id, a] of liveAnalyses) byId.set(id, a);

    return Array.from(byId.values())
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }, [fetched, liveAnalyses, limit]);

  const refetch = () => {
    void Promise.all(queries.map((q) => q.refetch()));
  };

  return {
    analyses,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    refetch,
  };
}