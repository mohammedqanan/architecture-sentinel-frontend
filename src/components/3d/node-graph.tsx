'use client';

/**
 * src/components/3d/node-graph.tsx
 *
 * Interactive 3D node graph component for React Three Fiber.
 * Renders nodes as spheres with labels and edges as lines.
 * Supports selection, hover, and edge highlighting.
 * Stateless – data and callbacks are passed via props.
 *
 * ✅ جميع عناصر Three.js معروفة بفضل jsxImportSource
 * ✅ يستخدم ThreeEvent لضمان التوافق النوعي للحدث
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// ============================================================
// Constants
// ============================================================

const NODE_COLORS: Record<string, string> = {
  service: '#3B82F6',
  database: '#8B5CF6',
  queue: '#06B6D4',
  default: '#F1F5F9',
};

const NODE_SIZE = 0.6;
const SELECTED_SCALE = 1.4;
const HIGHLIGHT_EDGE_COLOR = '#3B82F6';
const DEFAULT_EDGE_COLOR = '#4B5563';
const LERP_SPEED = 0.1;

// ============================================================
// Types
// ============================================================

export interface NodeGraphNode {
  id: string;
  position: [number, number, number];
  label?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface NodeGraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

export interface NodeGraphProps {
  nodes: NodeGraphNode[];
  edges: NodeGraphEdge[];
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

// ============================================================
// Subcomponent: NodeSphere
// ============================================================

interface NodeSphereProps {
  node: NodeGraphNode;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

const NodeSphere: React.FC<NodeSphereProps> = ({
  node,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = NODE_COLORS[node.type ?? 'default'] || NODE_COLORS.default;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect();
    },
    [onSelect]
  );

  const handlePointerOver = useCallback(() => {
    onHover(true);
  }, [onHover]);

  const handlePointerOut = useCallback(() => {
    onHover(false);
  }, [onHover]);

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isSelected ? SELECTED_SCALE : 1;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        LERP_SPEED
      );
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[NODE_SIZE, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected || isHovered ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.3 : 0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[NODE_SIZE * 1.6, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}

      {node.label && (
        <Text
          position={[0, NODE_SIZE * 1.8, 0]}
          fontSize={0.4}
          color="#F1F5F9"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#080C14"
        >
          {node.label}
        </Text>
      )}
    </group>
  );
};

// ============================================================
// Subcomponent: EdgeLines
// ============================================================

interface EdgeLinesProps {
  edges: NodeGraphEdge[];
  nodes: NodeGraphNode[];
  selectedNodeId?: string | null;
}

const EdgeLines: React.FC<EdgeLinesProps> = ({ edges, nodes, selectedNodeId }) => {
  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const defaultColor = new THREE.Color(DEFAULT_EDGE_COLOR);
    const highlightColor = new THREE.Color(HIGHLIGHT_EDGE_COLOR);

    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) return;

      const isConnected =
        selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const color = isConnected ? highlightColor : defaultColor;

      pos.push(...source.position, ...target.position);
      col.push(color.r, color.g, color.b);
      col.push(color.r, color.g, color.b);
    });

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
    };
  }, [edges, nodes, selectedNodeId]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors attach="material" transparent opacity={0.6} />
    </lineSegments>
  );
};

// ============================================================
// Main Component
// ============================================================

const NodeGraph: React.FC<NodeGraphProps> = ({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeSelect,
  onNodeHover,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      onNodeSelect?.(nodeId);
    },
    [onNodeSelect]
  );

  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setHoveredNodeId(nodeId);
      onNodeHover?.(nodeId);
    },
    [onNodeHover]
  );

  return (
    <>
      <EdgeLines edges={edges} nodes={nodes} selectedNodeId={selectedNodeId} />
      {nodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          onSelect={() => handleNodeSelect(node.id)}
          onHover={(hovered) => handleNodeHover(hovered ? node.id : null)}
        />
      ))}
    </>
  );
};

export default React.memo(NodeGraph);