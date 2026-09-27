/**
 * Converts an AST into a topology graph (nodes + edges) suitable for the 3D
 * viewer. Uses a depth-first angular layout so siblings share a slice of the
 * parent's angular range — this keeps subtrees spatially coherent.
 *
 * Deterministic: the same AST always yields the same coordinates.
 */

import { useMemo } from 'react';
import type { ASTNode } from '@/types';
import type {
  TopologyEdge,
  TopologyNode,
} from '@/components/3d/topology-view';

const MAX_DEPTH = 6;
const BASE_RADIUS = 1.5;
const DEPTH_RADIUS = 1.8;
const DEPTH_HEIGHT = 0.9;

export interface ASTGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

function mapKind(kind: string): TopologyNode['type'] {
  if (kind.includes('Function') || kind.includes('Declaration')) return 'service';
  if (kind.includes('Class') || kind.includes('Interface')) return 'database';
  if (kind.includes('Expression') || kind.includes('Call')) return 'queue';
  return 'default';
}

function traverse(
  node: ASTNode,
  parentId: string | null,
  depth: number,
  index: number,
  angleStart: number,
  angleEnd: number,
  nodes: TopologyNode[],
  edges: TopologyEdge[],
): void {
  if (depth > MAX_DEPTH) return;

  const nodeId = `ast-${depth}-${index}-${node.kind}`;
  const midAngle = (angleStart + angleEnd) / 2;
  const radius = BASE_RADIUS + depth * DEPTH_RADIUS;

  nodes.push({
    id: nodeId,
    position: [
      Math.cos(midAngle) * radius,
      -depth * DEPTH_HEIGHT,
      Math.sin(midAngle) * radius,
    ],
    label: node.name ?? node.kind,
    type: mapKind(node.kind),
    metadata: { depth, kind: node.kind },
  });

  if (parentId) {
    edges.push({
      id: `ast-edge-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      weight: 1 - depth * 0.12,
      type: 'ast',
    });
  }

  const children = node.children ?? [];
  if (children.length === 0) return;

  const span = (angleEnd - angleStart) / children.length;
  children.forEach((child, i) => {
    traverse(
      child,
      nodeId,
      depth + 1,
      i,
      angleStart + i * span,
      angleStart + (i + 1) * span,
      nodes,
      edges,
    );
  });
}

export function useAnalysisAstNodes(ast: ASTNode | null | undefined): ASTGraph {
  return useMemo<ASTGraph>(() => {
    if (!ast) return { nodes: [], edges: [] };

    const nodes: TopologyNode[] = [];
    const edges: TopologyEdge[] = [];
    traverse(ast, null, 0, 0, 0, Math.PI * 2, nodes, edges);
    return { nodes, edges };
  }, [ast]);
}