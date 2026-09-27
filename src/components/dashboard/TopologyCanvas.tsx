/**
 * Isolated 3D topology canvas. Receives pre-computed nodes/edges so it stays
 * a pure consumer and never triggers data fetching on its own.
 */

import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import TopologyView, {
  type TopologyEdge,
  type TopologyNode,
} from '@/components/3d/topology-view';

interface TopologyCanvasProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  onNodeClick: (nodeId: string) => void;
}

const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodes,
  edges,
  onNodeClick,
}) => {
  return (
    <GlassCard variant="glow" padding="lg" className="h-96 overflow-hidden">
      <h2 className="text-lg font-semibold text-white mb-3">Project Topology</h2>
      <div className="w-full h-80 rounded-lg overflow-hidden bg-black/30">
        <ErrorBoundary fallbackMessage="3D visualization unavailable">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <SpatialLoader size="md" message="Preparing 3D scene…" />
              </div>
            }
          >
            <TopologyView
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </GlassCard>
  );
};

export default React.memo(TopologyCanvas);