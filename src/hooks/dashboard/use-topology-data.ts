/**
 * Builds the topology graph from real project and analysis data.
 *
 * Positions are computed deterministically from the node id (hash-based) so a
 * project always lands at the same 3D coordinate. This preserves camera focus,
 * selection, and visual stability across renders.
 */

import { useMemo } from 'react';
import type { Analysis, Project } from '@/types';
import type {
  TopologyEdge,
  TopologyNode,
} from '@/components/3d/topology-view';

const HASH_MODULO = 360;
const BASE_RADIUS = 5;
const RADIUS_SPREAD = 3;
const HEIGHT_SPREAD = 5;

/**
 * djb2 string hash. Deterministic, dependency-free, uniform enough for spatial
 * layout of the expected graph size (tens to low hundreds of nodes).
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function computeStablePosition(id: string): [number, number, number] {
  const hash = hashString(id);
  const angle = ((hash % HASH_MODULO) * Math.PI) / 180;
  const radius = BASE_RADIUS + (hash % RADIUS_SPREAD);
  const height = (hash % HEIGHT_SPREAD) - HEIGHT_SPREAD / 2;

  return [Math.cos(angle) * radius, height, Math.sin(angle) * radius];
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export function useTopologyData(
  projects: Project[],
  analyses: Analysis[],
): TopologyData {
  return useMemo(() => {
    const projectNodes: TopologyNode[] = projects.map((project) => ({
      id: project.id,
      position: computeStablePosition(project.id),
      label: project.name,
      type: project.status === 'archived' ? 'default' : 'service',
      metadata: { analysesCount: project.analysesCount ?? 0 },
    }));

    const analysisNodes: TopologyNode[] = analyses.map((analysis) => ({
      id: `analysis-${analysis.id}`,
      position: computeStablePosition(`analysis-${analysis.id}`),
      label: `#${analysis.id.slice(0, 6)}`,
      type: 'queue',
      metadata: { projectId: analysis.projectId, status: analysis.status },
    }));

    const edges: TopologyEdge[] = analyses.map((analysis) => ({
      id: `edge-${analysis.id}`,
      source: analysis.projectId,
      target: `analysis-${analysis.id}`,
      weight: analysis.progress ?? 0,
      type: 'analysis-flow',
    }));

    return { nodes: [...projectNodes, ...analysisNodes], edges };
  }, [projects, analyses]);
}