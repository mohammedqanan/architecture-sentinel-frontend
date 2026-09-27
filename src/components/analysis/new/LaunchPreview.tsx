/**
 * Summary card + primary launch button.
 */

import React from 'react';
import { Rocket, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';
import type { AnalysisDepth } from '@/hooks/analysis/use-new-analysis-form';

const DEPTH_LABEL: Record<AnalysisDepth, string> = {
  quick: 'Quick',
  standard: 'Standard',
  deep: 'Deep',
};

interface LaunchPreviewProps {
  project: Project | null;
  branch: string;
  depth: AnalysisDepth;
  isSubmitting: boolean;
  canSubmit: boolean;
  onLaunch: () => void;
}

const LaunchPreview: React.FC<LaunchPreviewProps> = ({
  project,
  branch,
  depth,
  isSubmitting,
  canSubmit,
  onLaunch,
}) => {
  const largeRepo = (project?.analysesCount ?? 0) > 50;

  return (
    <GlassCard variant="glow" padding="lg" className="space-y-4">
      <h2 className="text-xs font-semibold text-white uppercase tracking-wide">
        Launch preview
      </h2>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Project</dt>
          <dd className="text-gray-200 truncate text-right">
            {project?.name ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Branch</dt>
          <dd className="text-gray-200 truncate text-right">
            {branch.trim() || 'Default branch'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Depth</dt>
          <dd className="text-gray-200">{DEPTH_LABEL[depth]}</dd>
        </div>
      </dl>

      {largeRepo && (
        <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            This project has run many analyses. Expect longer processing times.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onLaunch}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium',
          'bg-primary/20 border border-primary/30 text-primary',
          'hover:bg-primary/30 transition',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#080C14]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <SpatialLoader size="sm" />
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            Launch analysis
          </>
        )}
      </button>

      <p className="text-[10px] text-gray-500 text-center">
        Tip: press <kbd className="px-1 rounded bg-white/5">Ctrl</kbd>+
        <kbd className="px-1 rounded bg-white/5">Enter</kbd> to submit
      </p>
    </GlassCard>
  );
};

export default React.memo(LaunchPreview);