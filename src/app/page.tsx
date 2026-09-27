/**
 * src/app/page.tsx
 * ════════════════════════════════════════════════════════════
 * Dashboard orchestrator — composition only.
 *
 * @module DashboardPage
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/main-layout';
import MetricsBar from '@/components/dashboard/MetricsBar';
import TopologyCanvas from '@/components/dashboard/TopologyCanvas';
import RecentProjectsPanel from '@/components/dashboard/RecentProjectsPanel';
import RecentAnalysesPanel from '@/components/dashboard/RecentAnalysesPanel';
import QuickActionsBar from '@/components/dashboard/QuickActionsBar';
import { SpatialLoader } from '@/components/ui/spatial-loader';

import { useProjectsList } from '@/hooks/use-project';
import { useDashboardMetrics } from '@/hooks/dashboard/use-dashboard-metrics';
import { useTopologyData } from '@/hooks/dashboard/use-topology-data';
import { useLiveAnalyses } from '@/hooks/dashboard/use-live-analyses';
import { APP_ROUTES } from '@/constants';

const DASHBOARD_PROJECT_LIMIT = 20;
const RECENT_PROJECTS_COUNT = 5;
const RECENT_ANALYSES_LIMIT = 10;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjectsList({
    limit: DASHBOARD_PROJECT_LIMIT,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const liveAnalyses = useLiveAnalyses(projectIds, RECENT_ANALYSES_LIMIT);
  const metrics = useDashboardMetrics(projects, liveAnalyses.analyses);
  const topology = useTopologyData(projects, liveAnalyses.analyses);

  const recentProjects = useMemo(
    () => projects.slice(0, RECENT_PROJECTS_COUNT),
    [projects],
  );

  if (projectsLoading) {
    return (
      <MainLayout pageTitle="Dashboard">
        <div className="flex justify-center py-16">
          <SpatialLoader size="lg" message="Loading dashboard…" />
        </div>
      </MainLayout>
    );
  }

  if (projectsError) {
    return (
      <MainLayout pageTitle="Dashboard">
        <div className="p-6 text-center">
          <p className="text-red-400 mb-3">Failed to load dashboard data.</p>
          <button
            type="button"
            onClick={() => void refetchProjects()}
            className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Dashboard">
      <div className="space-y-6">
        <MetricsBar metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentProjectsPanel
            projects={recentProjects}
            onProjectClick={(id) => navigate(APP_ROUTES.projectDetail(id))}
            onViewAll={() => navigate(APP_ROUTES.projects)}
          />
          <RecentAnalysesPanel
            analyses={liveAnalyses.analyses}
            isLoading={liveAnalyses.isLoading}
            isError={liveAnalyses.isError}
            onRetry={liveAnalyses.refetch}
            onAnalysisClick={(id) =>
              navigate(APP_ROUTES.analysisDetail(id))
            }
          />
        </div>

        <TopologyCanvas
          nodes={topology.nodes}
          edges={topology.edges}
          onNodeClick={(id) => navigate(APP_ROUTES.projectDetail(id))}
        />

        <QuickActionsBar
          onNewProject={() => navigate('/projects/new')}
          onNewAnalysis={() => navigate(APP_ROUTES.newAnalysis)}
        />
      </div>
    </MainLayout>
  );
};

export default React.memo(DashboardPage);