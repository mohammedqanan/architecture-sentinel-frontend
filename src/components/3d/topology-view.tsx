'use client';

/**
 * src/components/3d/topology-view.tsx
 *
 * 3D Topology View — interactive network graph with nodes and edges.
 * Built with React Three Fiber and Drei, featuring cyberpunk aesthetics,
 * node selection, camera sync with the UI store, and glow effects.
 *
 * ════════════════════════════════════════════════════════════
 * Architecture Notes:
 * ════════════════════════════════════════════════════════════
 *
 * ✅ R3F event types: uses `ThreeEvent<MouseEvent>` — NOT `React.MouseEvent`.
 *    R3F events carry raycaster metadata (intersection, object, ray, ...),
 *    and do NOT implement the DOM MouseEvent interface.
 *
 * ✅ Zustand selectors: uses `useShallow` for multi-field reads to avoid
 *    infinite re-renders caused by new object identities on every render.
 *
 * ✅ Ref typing: uses `useRef<T | null>(null)` (React 18 canonical form).
 *
 * ✅ Single source of truth: camera state is written by `useFrame` only
 *    (removed duplicate writes from `useEffect`).
 *
 * ✅ Zustand + strict mode safe: no state writes during render.
 *
 * @module components/3d/topology-view
 */

import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

// ============================================================
// Public Types
// ============================================================

export type TopologyNodeType = 'service' | 'database' | 'queue' | 'default';

export interface TopologyNode {
  id: string;
  position: [number, number, number];
  label?: string;
  type?: TopologyNodeType;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

export interface TopologyViewProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  className?: string;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================
// Constants
// ============================================================

/** Node color palette, keyed by node type. */
const NODE_COLORS: Record<TopologyNodeType, string> = {
  service: '#3B82F6',
  database: '#8B5CF6',
  queue: '#06B6D4',
  default: '#F1F5F9',
};

/** Edge line styling. */
const EDGE_COLOR = '#4B5563';
const EDGE_OPACITY = 0.5;

/** Node sphere radii (selected vs idle). */
const NODE_RADIUS_IDLE = 0.6;
const NODE_RADIUS_SELECTED = 0.8;
const NODE_HOVER_SCALE = 1.2;

// ============================================================
// Node Mesh
// ============================================================

interface NodeMeshProps {
  node: TopologyNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const NodeMesh: React.FC<NodeMeshProps> = React.memo(
  ({ node, isSelected, onSelect }) => {
    const meshRef = useRef<THREE.Mesh | null>(null);

    const color = useMemo(
      () => NODE_COLORS[node.type ?? 'default'],
      [node.type],
    );

    // ✅ R3F event type — NOT React.MouseEvent
    const handleClick = useCallback(
      (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(node.id);
      },
      [node.id, onSelect],
    );

    const handlePointerOver = useCallback(
      (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        if (meshRef.current) {
          meshRef.current.scale.setScalar(NODE_HOVER_SCALE);
        }
        document.body.style.cursor = 'pointer';
      },
      [],
    );

    const handlePointerOut = useCallback(
      (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        if (meshRef.current) {
          meshRef.current.scale.setScalar(1);
        }
        document.body.style.cursor = 'auto';
      },
      [],
    );

    // ✅ Cleanup cursor on unmount
    useEffect(() => {
      return () => {
        document.body.style.cursor = 'auto';
      };
    }, []);

    const radius = isSelected ? NODE_RADIUS_SELECTED : NODE_RADIUS_IDLE;

    return (
      <mesh
        ref={meshRef}
        position={node.position}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        userData={{ nodeId: node.id }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : 0}
          roughness={0.2}
          metalness={0.8}
        />

        {/* Selection halo */}
        {isSelected && (
          <mesh>
            <sphereGeometry args={[1.0, 32, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        )}
      </mesh>
    );
  },
);
NodeMesh.displayName = 'NodeMesh';

// ============================================================
// Edge Lines
// ============================================================

interface EdgeLinesProps {
  edges: TopologyEdge[];
  nodes: TopologyNode[];
}

const EdgeLines: React.FC<EdgeLinesProps> = ({ edges, nodes }) => {
  const geometry = useMemo(() => {
    const positionBuffer: number[] = [];

    // Build lookup map ONCE — O(N) instead of O(N*E)
    const nodeMap = new Map<string, TopologyNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        positionBuffer.push(
          source.position[0],
          source.position[1],
          source.position[2],
          target.position[0],
          target.position[1],
          target.position[2],
        );
      }
    }

    const bufferGeo = new THREE.BufferGeometry();
    bufferGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positionBuffer, 3),
    );
    return bufferGeo;
  }, [edges, nodes]);

  // ✅ Dispose geometry on change/unmount to avoid GPU leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={EDGE_COLOR}
        transparent
        opacity={EDGE_OPACITY}
      />
    </lineSegments>
  );
};

// ============================================================
// Scene (internal)
// ============================================================

interface TopologySceneProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  onNodeClick?: (nodeId: string) => void;
}

const TopologyScene: React.FC<TopologySceneProps> = ({
  nodes,
  edges,
  onNodeClick,
}) => {
  // ✅ useShallow prevents infinite re-render from new object identity
  const {
    selectedNodeId,
    setCameraPosition,
    setZoom,
    setSelectedNode,
  } = useUIStore(
    useShallow((state) => ({
      selectedNodeId: state.selectedNodeId,
      setCameraPosition: state.setCameraPosition,
      setZoom: state.setZoom,
      setSelectedNode: state.setSelectedNode,
    })),
  );

  const camera = useThree((state) => state.camera);

  const handleNodeSelect = useCallback(
    (id: string) => {
      setSelectedNode(id);
      onNodeClick?.(id);
    },
    [setSelectedNode, onNodeClick],
  );

  // ✅ Refs for change detection (React 18 canonical typing)
  const prevPosRef = useRef<THREE.Vector3 | null>(null);
  const prevZoomRef = useRef<number | null>(null);

  // ✅ Single writer: only useFrame writes to the store
  useFrame(() => {
    if (!camera) return;

    const pos = camera.position;
    const zoomVal = camera.zoom;

    const posChanged =
      !prevPosRef.current || !prevPosRef.current.equals(pos);
    const zoomChanged = prevZoomRef.current !== zoomVal;

    if (!posChanged && !zoomChanged) return;

    prevPosRef.current = pos.clone();
    prevZoomRef.current = zoomVal;

    setCameraPosition({ x: pos.x, y: pos.y, z: pos.z });
    setZoom(zoomVal);
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      {/* Environment */}
      <Environment preset="city" />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom intensity={0.3} radius={0.2} luminanceThreshold={0.1} />
      </EffectComposer>

      {/* Topology */}
      <EdgeLines edges={edges} nodes={nodes} />

      {nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          onSelect={handleNodeSelect}
        />
      ))}
    </>
  );
};

// ============================================================
// Main Component
// ============================================================

const TopologyView: React.FC<TopologyViewProps> = ({
  nodes,
  edges,
  className,
  onNodeClick,
}) => {
  // ✅ useShallow for multi-field read
  const { cameraPosition, zoom } = useUIStore(
    useShallow((state) => ({
      cameraPosition: state.cameraPosition,
      zoom: state.zoom,
    })),
  );

  if (!nodes.length) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center text-gray-500',
          className,
        )}
      >
        No topology data available.
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full relative', className)}>
      <Canvas
        camera={{
          position: [cameraPosition.x, cameraPosition.y, cameraPosition.z],
          // ⚠️ `zoom` on a PerspectiveCamera has NO effect (FOV-based).
          //    Kept only for parity with the store; a real zoom would use
          //    an OrthographicCamera. Left as-is to preserve behavior.
          zoom,
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <TopologyScene
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
        />
      </Canvas>
    </div>
  );
};

export default React.memo(TopologyView);