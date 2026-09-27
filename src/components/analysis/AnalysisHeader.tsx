/**
 * Analysis metadata header: ID, creation time, project link, status badge,
 * and primary actions (Cancel / Refresh / Back).
 */

import React from 'react';
import { ArrowLeft, RefreshCw, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import LiveProgressRing from './LiveProgressRing';
import { cn } from '@/lib/utils';
import type { AnalysisStatus } from '@/types';

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  QUEUED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
  RUNNING: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-500/30',
  FAILED: 'text-red-400 bg-red-400/10 border-red-500/30',
  CANCELLED: 'text-gray-400 bg-gray-400/10 border-gray-500/30',
};

interface AnalysisHeaderProps {
  analysisId: string;
  projectId: string;
  status: AnalysisStatus;
  createdAt: string;
  progress: number;
  isActive: boolean;
  isCancelling: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  onViewProject: () => void;
}

const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  analysisId,
  status,
  createdAt,
  progress,
  isActive,
  isCancelling,
  onBack,
  onRefresh,
  onCancel,
  onViewProject,
}) => {
  const canCancel = status === 'RUNNING' || status === 'QUEUED';

  return (
    <GlassCard variant="elevated" padding="lg">
      <div className="flex flex-wrap items-center gap-6">
        <LiveProgressRing
          value={progress}
          isActive={isActive}
          label={isActive ? 'Live' : undefined}
        />

        <div className="flex-1 min-w-50">
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/5 transition focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Back to project"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <h1 className="text-xl font-semibold text-white">
              Analysis #{analysisId.slice(0, 8)}
            </h1>
            <span
              className={cn(
                'px-2.5 py-0.5 text-xs font-mono rounded border',
                STATUS_STYLES[status],
              )}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-400 pl-9">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewProject}
            className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-primary"
          >
            View Project
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Refresh analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Cancel analysis"
            >
              <XCircle className="w-3.5 h-3.5" />
              {isCancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(AnalysisHeader);