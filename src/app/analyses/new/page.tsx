/**
 * src/app/analyses/new/page.tsx
 * ════════════════════════════════════════════════════════════
 * New Analysis launcher — form + project/branch selection.
 *
 * Route: /analyses/new
 *
 * 🎯 Backend contract (verified):
 *   GET  /projects  → { success, data: Project[], total, limit }
 *   POST /analyses  → { analysis: Analysis }        ← NOT { data }!
 *
 * @module NewAnalysisPage
 */

import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/main-layout';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';

import { useProjectsList } from '@/hooks/use-project';
import { useCreateAnalysis } from '@/hooks/use-analysis';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  // ───── Projects for the dropdown ─────
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjectsList({ limit: 100 });

  // 🎯 FIXED: backend returns { success, data: Project[], total, limit }
  const projects: Project[] = projectsData?.data ?? [];

  // ───── Mutation ─────
  const createAnalysisMutation = useCreateAnalysis();

  // ───── Form state ─────
  const [projectId, setProjectId] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // ───── Submit ─────
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    if (!projectId) {
      setLocalError('Please select a project.');
      return;
    }

    try {
      const result = await createAnalysisMutation.mutateAsync({
        projectId,
        data: { branch: branch.trim() || undefined },
      });

      // 🎯 FIXED: analysis endpoint returns { analysis: Analysis }, not { data }
      addToast('Analysis started successfully!', 'success');
      navigate(APP_ROUTES.analysisDetail(result.analysis.id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start analysis.';
      setLocalError(message);
      addToast(message, 'error');
    }
  };

  const handleRetryOrCreate = (): void => {
    if (projectsError) {
      void refetchProjects();
    } else {
      navigate(APP_ROUTES.projects);
    }
  };

  // ════════════════════════════════════════════════════════
  // Loading
  // ════════════════════════════════════════════════════════

  if (projectsLoading) {
    return (
      <MainLayout pageTitle="New Analysis">
        <div className="flex justify-center py-12">
          <SpatialLoader size="lg" message="Loading projects…" />
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Error / Empty
  // ════════════════════════════════════════════════════════

  if (projectsError || projects.length === 0) {
    return (
      <MainLayout pageTitle="New Analysis">
        <div className="text-center py-12">
          <p className="text-gray-500">
            {projectsError
              ? 'Failed to load projects.'
              : 'No projects available.'}
          </p>
          <button
            type="button"
            onClick={handleRetryOrCreate}
            className="mt-4 inline-block px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
          >
            {projectsError ? 'Retry' : 'Create a project'}
          </button>
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════

  return (
    <MainLayout pageTitle="New Analysis">
      <div className="max-w-lg mx-auto">
        <GlassCard variant="glow" padding="lg" className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Start a New Analysis
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Select a project and optionally specify a branch/commit.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project selection */}
            <div>
              <label
                htmlFor="project"
                className="block text-sm font-medium text-gray-300"
              >
                Project <span className="text-red-400">*</span>
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                disabled={createAnalysisMutation.isPending}
              >
                <option value="">Select a project</option>
                {projects.map((p: Project) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch input */}
            <div>
              <label
                htmlFor="branch"
                className="block text-sm font-medium text-gray-300"
              >
                Branch / Commit{' '}
                <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="mt-1 w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-gray-200 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., main, develop, or commit SHA"
                disabled={createAnalysisMutation.isPending}
              />
            </div>

            {/* Errors */}
            {localError && (
              <div
                className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20"
                role="alert"
              >
                {localError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={createAnalysisMutation.isPending}
              className={cn(
                'w-full py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-medium hover:bg-primary/30 transition',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                createAnalysisMutation.isPending &&
                  'opacity-50 cursor-not-allowed',
              )}
            >
              {createAnalysisMutation.isPending ? (
                <SpatialLoader size="sm" />
              ) : (
                'Start Analysis'
              )}
            </button>
          </form>
        </GlassCard>
      </div>
    </MainLayout>
  );
};

export default React.memo(NewAnalysisPage);