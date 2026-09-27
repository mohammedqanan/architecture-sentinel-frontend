/**
 * src/app/analyses/page.tsx
 * ════════════════════════════════════════════════════════════
 * Analyses List — aggregates analyses across ALL user projects.
 *
 * Route: /analyses
 *
 * 🎯 Backend contract:
 *   GET /projects → { success, data: Project[], total, limit }
 *
 * @module AnalysesListPage
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/main-layout';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';

import { useProjectsList } from '@/hooks/use-project';
import { useLiveAnalyses } from '@/hooks/dashboard/use-live-analyses';
import { APP_ROUTES } from '@/constants';
import type { Analysis, AnalysisStatus, Project } from '@/types';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

/**
 * 🎯 PROJECT_LIMIT must not exceed `GetProjectsDto.limit` @Max(100)
 *    on the backend, otherwise the request is rejected with 422.
 */
const PROJECT_LIMIT = 100;
const ANALYSES_LIMIT = 200;

type StatusFilter = 'all' | AnalysisStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  QUEUED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
  RUNNING: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-500/30',
  FAILED: 'text-red-400 bg-red-400/10 border-red-500/30',
  CANCELLED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const AnalysesListPage: React.FC = () => {
  const navigate = useNavigate();

  // ───── Fetch all projects ─────
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjectsList({ limit: PROJECT_LIMIT });

  const projects: Project[] = useMemo(
    () => projectsData?.data ?? [],
    [projectsData],
  );

  const projectIds: string[] = useMemo(
    () => projects.map((p: Project) => p.id),
    [projects],
  );

  // ───── Aggregate analyses across all projects ─────
  const liveAnalyses = useLiveAnalyses(projectIds, ANALYSES_LIMIT);

  // ───── Local filters ─────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = liveAnalyses.analyses;

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => a.id.toLowerCase().includes(q));
    }

    return list;
  }, [liveAnalyses.analyses, statusFilter, search]);

  // ════════════════════════════════════════════════════════
  // Loading
  // ════════════════════════════════════════════════════════

  if (projectsLoading) {
    return (
      <MainLayout pageTitle="Analyses">
        <div className="flex justify-center py-16">
          <SpatialLoader size="lg" message="Loading projects…" />
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Error
  // ════════════════════════════════════════════════════════

  if (projectsError) {
    return (
      <MainLayout pageTitle="Analyses">
        <GlassCard
          variant="elevated"
          padding="lg"
          className="max-w-md mx-auto text-center space-y-3"
        >
          <p className="text-red-400">Failed to load projects.</p>
          <button
            type="button"
            onClick={() => void refetchProjects()}
            className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
          >
            Retry
          </button>
        </GlassCard>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Empty (no projects)
  // ════════════════════════════════════════════════════════

  if (projects.length === 0) {
    return (
      <MainLayout pageTitle="Analyses">
        <GlassCard
          variant="elevated"
          padding="lg"
          className="max-w-md mx-auto text-center space-y-3"
        >
          <p className="text-gray-400">
            You need a project before you can create an analysis.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.projects)}
            className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
          >
            Go to Projects
          </button>
        </GlassCard>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════

  return (
    <MainLayout pageTitle="Analyses">
      <div className="space-y-6">
        {/* Filters + action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by analysis ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'px-4 py-2 bg-black/30 border border-white/10 rounded-lg',
                'text-sm text-gray-200 placeholder-gray-500',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                'w-64',
              )}
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              className={cn(
                'px-4 py-2 bg-black/30 border border-white/10 rounded-lg',
                'text-sm text-gray-200',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.newAnalysis)}
            className="px-6 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary font-medium hover:bg-primary/30 transition"
          >
            + New Analysis
          </button>
        </div>

        {/* State: loading analyses */}
        {liveAnalyses.isLoading ? (
          <div className="flex justify-center py-12">
            <SpatialLoader size="lg" message="Loading analyses…" />
          </div>
        ) : liveAnalyses.isError ? (
          <GlassCard
            variant="elevated"
            padding="lg"
            className="text-center space-y-3"
          >
            <p className="text-red-400">Failed to load analyses.</p>
            <button
              type="button"
              onClick={() => liveAnalyses.refetch()}
              className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
            >
              Retry
            </button>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard
            variant="elevated"
            padding="lg"
            className="text-center space-y-3"
          >
            <p className="text-gray-500">
              {liveAnalyses.analyses.length === 0
                ? 'No analyses yet. Start one from a project.'
                : 'No analyses match the current filters.'}
            </p>
            {liveAnalyses.analyses.length === 0 && (
              <button
                type="button"
                onClick={() => navigate(APP_ROUTES.newAnalysis)}
                className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
              >
                Start your first analysis
              </button>
            )}
          </GlassCard>
        ) : (
          <>
            <div className="text-sm text-gray-500">
              Showing {filtered.length} of {liveAnalyses.analyses.length}{' '}
              analyses
            </div>

            <div className="space-y-3">
              {filtered.map((analysis: Analysis) => (
                <AnalysisRow
                  key={analysis.id}
                  analysis={analysis}
                  onClick={() =>
                    navigate(APP_ROUTES.analysisDetail(analysis.id))
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

// ════════════════════════════════════════════════════════════
// Sub-component: AnalysisRow
// ════════════════════════════════════════════════════════════

interface AnalysisRowProps {
  analysis: Analysis;
  onClick: () => void;
}

const AnalysisRow: React.FC<AnalysisRowProps> = React.memo(
  ({ analysis, onClick }) => {
    const statusStyle = STATUS_STYLES[analysis.status];

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      },
      [onClick],
    );

    return (
      <GlassCard
        variant="interactive"
        padding="md"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between gap-4 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            Analysis #{analysis.id.slice(0, 8)}
          </p>
          <p className="text-xs text-gray-400 truncate">
            Project: {analysis.projectId.slice(0, 8)}
            {typeof analysis.branch === 'string' && analysis.branch
              ? ` · Branch: ${analysis.branch}`
              : ''}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Created: {new Date(analysis.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {analysis.status === 'RUNNING' &&
            typeof analysis.progress === 'number' && (
              <span className="text-xs text-yellow-400 tabular-nums">
                {Math.round(analysis.progress)}%
              </span>
            )}
          <span
            className={cn(
              'px-2.5 py-1 text-xs font-mono rounded border',
              statusStyle,
            )}
          >
            {analysis.status}
          </span>
        </div>
      </GlassCard>
    );
  },
);

AnalysisRow.displayName = 'AnalysisRow';

export default React.memo(AnalysesListPage);