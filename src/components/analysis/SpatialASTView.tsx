/**
 * 3D visualization of the analysis AST. The topology view is the same
 * component used on the dashboard, fed with AST-derived nodes.
 */

import React, { Suspense } from 'react';
import TopologyView from '@/components/3d/topology-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import type { ASTGraph } from '@/hooks/analysis/use-analysis-ast-nodes';

interface SpatialASTViewProps {
  graph: ASTGraph;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNodeClick?: (nodeId: string) => void;
}

const SpatialASTView: React.FC<SpatialASTViewProps> = ({
  graph,
  isLoading,
  isError,
  onRetry,
  onNodeClick,
}) => {
  const isEmpty = !isLoading && !isError && graph.nodes.length === 0;

  return (
    <GlassCard variant="default" padding="lg" className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">AST Topology</h2>
        <span className="text-xs text-gray-500">
          {graph.nodes.length} nodes
        </span>
      </header>

      <div className="h-96 rounded-lg overflow-hidden bg-black/30 relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <SpatialLoader size="md" message="Loading AST…" />
          </div>
        ) : isError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-red-400">Failed to load AST.</p>
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 bg-primary/20 rounded-lg text-primary text-sm hover:bg-primary/30 transition"
            >
              Retry
            </button>
          </div>
        ) : isEmpty ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-gray-500">
              AST not yet available. It appears once parsing completes.
            </p>
          </div>
        ) : (
          <ErrorBoundary fallbackMessage="3D view unavailable">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <SpatialLoader size="md" />
                </div>
              }
            >
              <TopologyView
                nodes={graph.nodes}
                edges={graph.edges}
                onNodeClick={onNodeClick}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </GlassCard>
  );
};

export default React.memo(SpatialASTView);