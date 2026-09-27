'use client';

/**
 * src/hooks/use-webgl.ts
 *
 * Custom React hook for managing the WebGL / Three.js rendering environment.
 * Orchestrates renderer lifecycle, performance quality, viewport synchronisation,
 * resize handling, and memory cleanup for 3D topology views.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../stores/ui-store';
import { WEBGL_QUALITY, THEME } from '../constants';
import type { WebGLQualityPreset } from '../constants';

// ============================================================
// Return Type Interface
// ============================================================

export interface UseWebGLReturn {
  /** Ref to attach to the container div where the canvas will be rendered. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The Three.js WebGL renderer instance. */
  renderer: THREE.WebGLRenderer | null;
  /** The Three.js scene instance. */
  scene: THREE.Scene | null;
  /** The Three.js perspective camera instance. */
  camera: THREE.PerspectiveCamera | null;
  /** The current quality preset. */
  quality: WebGLQualityPreset;
  /** Function to change the quality preset. */
  setQuality: (level: WebGLQualityPreset) => void;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useWebGL(
  initialQuality: WebGLQualityPreset = 'medium'
): UseWebGLReturn {
  // ---- Refs ----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameId = useRef<number | null>(null);
  const isMounted = useRef(true);

  // ---- UI Store state ----
  const cameraPosition = useUIStore((state) => state.cameraPosition);
  const zoom = useUIStore((state) => state.zoom);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);

  // ---- Quality state ----
  const [quality, setQualityState] = useState<WebGLQualityPreset>(initialQuality);

  // ---- Memoised quality config ----
  const qualityConfig = useMemo(() => WEBGL_QUALITY[quality], [quality]);

  // ---- Initialisation & Cleanup ----
  useEffect(() => {
    // Guard SSR
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    isMounted.current = true;

    // --- Create scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.colors.background);
    sceneRef.current = scene;

    // --- Create camera ---
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    // --- Create renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: qualityConfig.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityConfig.pixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Resize observer ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // --- Animation loop ---
    function animate() {
      if (!isMounted.current) return;
      frameId.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // --- Cleanup ---
    return () => {
      isMounted.current = false;

      // Cancel animation frame
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
        frameId.current = null;
      }

      // Remove resize observer
      resizeObserver.disconnect();

      // Remove renderer from DOM
      if (renderer.domElement.parentNode) {
        renderer.domElement.remove();
      }

      // Dispose renderer
      renderer.dispose();

      // Dispose scene (traverse and dispose geometries/materials safely)
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });

      // Clear refs
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [qualityConfig, cameraPosition, zoom]);

  // ---- Sync camera position from store to camera ----
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraPosition]);

  // ---- Sync zoom from store to camera ----
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom = zoom;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  // ---- Optional: Focus on selected node ----
  useEffect(() => {
    if (selectedNodeId && cameraRef.current) {
      // Placeholder for focus animation logic
    }
  }, [selectedNodeId]);

  // ---- Quality setter ----
  const setQuality = useCallback((level: WebGLQualityPreset) => {
    setQualityState(level);
  }, []);

  // ---- Return ----
  return {
    containerRef,
    renderer: rendererRef.current,
    scene: sceneRef.current,
    camera: cameraRef.current,
    quality,
    setQuality,
  };
}