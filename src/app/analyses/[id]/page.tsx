/**
 * src/app/analyses/[id]/page.tsx
 * ════════════════════════════════════════════════════════════
 * Analysis Detail — composition-only orchestrator.
 *
 * Route: /analyses/:id
 *
 * Responsibilities:
 *   • Fetch analysis state via `useAnalysisWorkflow`
 *   • Fetch AST via `useAnalysisAst`
 *   • Compose presentational components (header, timeline, AST, RAG, HitL)
 *
 * ❌ NO business logic here.
 * ❌ NO direct API calls.
 * ✅ All data comes from hooks.
 *
 * @module AnalysisDetailPage
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/main-layout';
import AnalysisHeader from '@/components/analysis/AnalysisHeader';
import WorkflowTimeline from '@/components/analysis/WorkflowTimeline';
import SpatialASTView from '@/components/analysis/SpatialASTView';
import AnalysisErrorState from '@/components/analysis/AnalysisErrorState';
import RAGPanel from '@/components/analysis/rag-panel';
import HitLPanel from '@/components/analysis/hitl-panel';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import { useAnalysisWorkflow } from '@/hooks/analysis/use-analysis-workflow';
import { useAnalysisAstNodes } from '@/hooks/analysis/use-analysis-ast-nodes';
import { useAnalysisAst } from '@/hooks/use-analysis';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const analysisId = id ?? '';
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  // ───── Workflow state ─────
  const workflow = useAnalysisWorkflow(analysisId);
  const { analysis } = workflow;

  // ───── AST query (only when relevant) ─────
  const isAstRelevant = useMemo(
    () =>
      Boolean(analysisId) &&
      (analysis?.status === 'COMPLETED' || analysis?.status === 'RUNNING'),
    [analysisId, analysis?.status],
  );

  const astQuery = useAnalysisAst(analysisId, isAstRelevant);
  const graph = useAnalysisAstNodes(astQuery.data?.ast ?? null);

  // ───── Handlers ─────
  const goBack = (): void => {
    if (analysis?.projectId) {
      navigate(APP_ROUTES.projectDetail(analysis.projectId));
    } else {
      navigate(APP_ROUTES.projects);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!window.confirm('Cancel this analysis?')) return;
    try {
      await workflow.cancel();
      addToast('Analysis cancelled', 'success');
    } catch {
      addToast('Failed to cancel analysis', 'error');
    }
  };

  // ───── Loading ─────
  if (workflow.isLoading) {
    return (
      <MainLayout pageTitle="Loading Analysis…">
        <div className="flex justify-center py-16">
          <SpatialLoader size="lg" message="Loading analysis…" />
        </div>
      </MainLayout>
    );
  }

  // ───── Error ─────
  if (workflow.isError || !analysis) {
    return (
      <MainLayout pageTitle="Analysis">
        <AnalysisErrorState
          message={workflow.errorMessage}
          onRetry={workflow.refetch}
          onBack={goBack}
        />
      </MainLayout>
    );
  }

  const isActive =
    analysis.status === 'RUNNING' || analysis.status === 'QUEUED';

  // ───── Render ─────
  return (
    <MainLayout pageTitle={`Analysis ${analysis.id.slice(0, 8)}`}>
      <div className="space-y-5">
        <AnalysisHeader
          analysisId={analysis.id}
          projectId={analysis.projectId}
          status={analysis.status}
          createdAt={analysis.createdAt}
          progress={workflow.progress}
          isActive={isActive}
          isCancelling={workflow.isCancelling}
          onBack={goBack}
          onRefresh={workflow.refetch}
          onCancel={handleCancel}
          onViewProject={() =>
            navigate(APP_ROUTES.projectDetail(analysis.projectId))
          }
        />

        <GlassCard variant="default" padding="md">
          <WorkflowTimeline
            stage={workflow.stage}
            isActive={isActive}
            isComplete={analysis.status === 'COMPLETED'}
          />
        </GlassCard>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <SpatialASTView
              graph={graph}
              isLoading={astQuery.isLoading}
              isError={astQuery.isError}
              onRetry={() => void astQuery.refetch()}
            />
          </div>

          <div className="space-y-5">
            <ErrorBoundary fallbackMessage="RAG panel unavailable">
              <RAGPanel analysisId={analysis.id} />
            </ErrorBoundary>
            <ErrorBoundary fallbackMessage="HitL panel unavailable">
              <HitLPanel analysisId={analysis.id} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default React.memo(AnalysisDetailPage);