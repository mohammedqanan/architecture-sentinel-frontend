/**
 * src/stores/ui-store.ts
 *
 * Zustand store for global UI state: theme, sidebar, modals, loading overlay,
 * 3D viewport, and toast notifications. Uses persist for theme and sidebar.
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

// ===== Types =====

/** Available theme options. */
export type Theme = 'dark' | 'light';

/** Toast notification types. */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/** A single toast notification. */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, default 5000
}

/** A modal instance in the stack. */
export interface Modal {
  id: string;
  type: string; // e.g., 'createProject', 'confirmDelete'
  data?: unknown;
}

/** 3D camera position. */
export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

// ===== State Interface =====

interface UIState {
  // Theme
  theme: Theme;

  // Sidebar
  sidebarCollapsed: boolean;

  // Modals (stack)
  modals: Modal[];

  // Global loading overlay (counter)
  loadingCount: number;

  // 3D Viewport
  cameraPosition: CameraPosition;
  zoom: number;
  selectedNodeId: string | null;

  // Notifications
  toasts: Toast[];

  // ===== Actions =====
  // Theme
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals
  openModal: (type: string, data?: unknown) => string; // returns modal ID
  closeModal: (id: string) => void;
  closeTopModal: () => void;
  closeAllModals: () => void;

  // Loading overlay
  showLoading: () => void;
  hideLoading: () => void;
  resetLoading: () => void;

  // 3D Viewport
  setCameraPosition: (position: Partial<CameraPosition>) => void;
  setZoom: (zoom: number) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // Toasts
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ===== Defaults =====

const DEFAULT_CAMERA_POSITION: CameraPosition = { x: 0, y: 0, z: 10 };
const DEFAULT_TOAST_DURATION = 5000;

// ===== Initial State =====

const initialState: Omit<
  UIState,
  | 'toggleTheme'
  | 'setTheme'
  | 'toggleSidebar'
  | 'setSidebarCollapsed'
  | 'openModal'
  | 'closeModal'
  | 'closeTopModal'
  | 'closeAllModals'
  | 'showLoading'
  | 'hideLoading'
  | 'resetLoading'
  | 'setCameraPosition'
  | 'setZoom'
  | 'setSelectedNode'
  | 'addToast'
  | 'removeToast'
  | 'clearToasts'
> = {
  theme: 'dark',
  sidebarCollapsed: false,
  modals: [],
  loadingCount: 0,
  cameraPosition: DEFAULT_CAMERA_POSITION,
  zoom: 1,
  selectedNodeId: null,
  toasts: [],
};

// ===== Store Implementation =====

/**
 * UI store with devtools and persistence for theme & sidebar.
 * Uses skipHydration: true to avoid SSR hydration mismatches.
 * The application layout should call `useUIStore.persist.rehydrate()`
 * inside a `useEffect` on the client to load persisted state.
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ---- Theme ----

        toggleTheme: () => {
          set((state) => ({
            theme: state.theme === 'dark' ? 'light' : 'dark',
          }));
        },

        setTheme: (theme: Theme) => {
          set({ theme });
        },

        // ---- Sidebar ----

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed });
        },

        // ---- Modals ----

        openModal: (type: string, data?: unknown) => {
          const id = `modal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          set((state) => ({
            modals: [...state.modals, { id, type, data }],
          }));
          return id;
        },

        closeModal: (id: string) => {
          set((state) => ({
            modals: state.modals.filter((modal) => modal.id !== id),
          }));
        },

        closeTopModal: () => {
          set((state) => ({
            modals: state.modals.slice(0, -1),
          }));
        },

        closeAllModals: () => {
          set({ modals: [] });
        },

        // ---- Loading Overlay ----

        showLoading: () => {
          set((state) => ({ loadingCount: state.loadingCount + 1 }));
        },

        hideLoading: () => {
          set((state) => ({
            loadingCount: Math.max(0, state.loadingCount - 1),
          }));
        },

        resetLoading: () => {
          set({ loadingCount: 0 });
        },

        // ---- 3D Viewport ----

        setCameraPosition: (position: Partial<CameraPosition>) => {
          set((state) => ({
            cameraPosition: { ...state.cameraPosition, ...position },
          }));
        },

        setZoom: (zoom: number) => {
          set({ zoom: Math.max(0.1, zoom) });
        },

        setSelectedNode: (nodeId: string | null) => {
          set({ selectedNodeId: nodeId });
        },

        // ---- Toasts ----

        addToast: (message: string, type: ToastType = 'info', duration: number = DEFAULT_TOAST_DURATION) => {
          const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const toast: Toast = {
            id,
            message: message.slice(0, 255), // prevent excessive length
            type,
            duration,
          };
          set((state) => ({
            toasts: [...state.toasts, toast],
          }));

          // Auto-remove after duration
          if (duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, duration);
          }
          return id;
        },

        removeToast: (id: string) => {
          set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
          }));
        },

        clearToasts: () => {
          set({ toasts: [] });
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          // Only persist theme and sidebar; everything else is ephemeral.
        }),
        storage: createJSONStorage(() => localStorage),
        skipHydration: true, // Important: hydrate manually in layout useEffect
      }
    ),
    { name: 'UIStore' }
  )
);

// ===== Selectors =====

export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarState = () => useUIStore((state) => state.sidebarCollapsed);
export const useModalStack = () => useUIStore((state) => state.modals);
export const useIsLoading = () => useUIStore((state) => state.loadingCount > 0);
export const useViewport = () =>
  useUIStore((state) => ({
    position: state.cameraPosition,
    zoom: state.zoom,
    selectedNode: state.selectedNodeId,
  }));
export const useToasts = () => useUIStore((state) => state.toasts);

/**
 * Convenience hook that bundles all UI store actions.
 */
export const useUIStoreActions = () =>
  useUIStore((state) => ({
    toggleTheme: state.toggleTheme,
    setTheme: state.setTheme,
    toggleSidebar: state.toggleSidebar,
    setSidebarCollapsed: state.setSidebarCollapsed,
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeTopModal: state.closeTopModal,
    closeAllModals: state.closeAllModals,
    showLoading: state.showLoading,
    hideLoading: state.hideLoading,
    resetLoading: state.resetLoading,
    setCameraPosition: state.setCameraPosition,
    setZoom: state.setZoom,
    setSelectedNode: state.setSelectedNode,
    addToast: state.addToast,
    removeToast: state.removeToast,
    clearToasts: state.clearToasts,
  }));