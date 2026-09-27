/**
 * Recent analyses list panel — real-time aware.
 * Rows are clickable and navigate to the analysis detail route.
 */

import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';
import type { Analysis, AnalysisStatus } from '@/types';

const statusStyles: Record<AnalysisStatus, string> = {
  QUEUED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
  RUNNING: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-500/30',
  FAILED: 'text-red-400 bg-red-400/10 border-red-500/30',
  CANCELLED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
};

interface RecentAnalysesPanelProps {
  analyses: Analysis[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAnalysisClick: (id: string) => void;
}

const RecentAnalysesPanel: React.FC<RecentAnalysesPanelProps> = ({
  analyses,
  isLoading,
  isError,
  onRetry,
  onAnalysisClick,
}) => {
  return (
    <GlassCard variant="default" padding="lg" className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent Analyses</h2>
        <span className="text-xs text-gray-500" aria-live="polite">
          {analyses.length} shown
        </span>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <SpatialLoader size="sm" message="Loading analyses…" />
        </div>
      ) : isError ? (
        <div className="text-center py-6">
          <p className="text-red-400 text-sm mb-2">Failed to load analyses.</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 bg-primary/20 rounded-lg text-primary text-sm hover:bg-primary/30 transition"
          >
            Retry
          </button>
        </div>
      ) : analyses.length === 0 ? (
        <p className="text-gray-500 text-center py-6 text-sm">
          No analyses yet. Start one from a project.
        </p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {analyses.map((analysis) => (
            <li key={analysis.id}>
              <button
                type="button"
                onClick={() => onAnalysisClick(analysis.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    Analysis #{analysis.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Project: {analysis.projectId.slice(0, 8)}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-mono rounded border shrink-0',
                    statusStyles[analysis.status],
                  )}
                >
                  {analysis.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
};

export default React.memo(RecentAnalysesPanel);