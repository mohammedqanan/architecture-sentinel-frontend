/**
 * Computes dashboard KPIs from real project and analysis data.
 * No placeholder values, no fabricated counts.
 */

import { useMemo } from 'react';
import type { Analysis, Project } from '@/types';

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalAnalyses: number;
  pendingReviews: number;
}

/**
 * Derives four KPI values. Memoised because the input arrays can be large
 * and the downstream metric bar re-renders on unrelated dashboard updates.
 */
export function useDashboardMetrics(
  projects: Project[],
  analyses: Analysis[],
): DashboardMetrics {
  return useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const totalAnalyses = projects.reduce(
      (sum, p) => sum + (p.analysesCount ?? 0),
      0,
    );
    const pendingReviews = analyses.filter(
      (a) => a.status === 'RUNNING' || a.status === 'QUEUED',
    ).length;

    return { totalProjects, activeProjects, totalAnalyses, pendingReviews };
  }, [projects, analyses]);
}