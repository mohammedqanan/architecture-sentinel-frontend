/**
 * src/stores/project-store.ts
 *
 * Zustand store for managing project data.
 * Handles CRUD operations with optimistic updates and automatic rollback on failure.
 * Synchronises with the backend and invalidates React Query caches after mutations.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient } from '../lib/api-client';
import { getQueryClient, queryKeys } from '../lib/query-client';
import { API_ROUTES, PAGINATION_DEFAULTS, ERROR_MESSAGES } from '../constants';
import type { Project, CreateProjectDto, UpdateProjectDto, PaginatedResponse, ProjectStatus } from '../types';

// ===== State Interface =====

interface ProjectState {
  // Data
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;

  // Filters & Pagination
  search: string;
  status: 'active' | 'archived' | 'all';
  page: number;
  limit: number;
  total: number;
  totalPages: number;

  // UI state
  loadingAction: 'fetch' | 'create' | 'update' | 'delete' | null;
  error: string | null;

  // ===== Actions =====
  fetchProjects: (resetPage?: boolean) => Promise<void>;
  fetchProjectById: (id: string) => Promise<void>;

  createProject: (data: CreateProjectDto) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectDto) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  setCurrentProjectId: (id: string | null) => void;

  setSearch: (search: string) => void;
  setStatus: (status: 'active' | 'archived' | 'all') => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  reset: () => void;
}

// ===== Initial State =====

const initialState: Omit<
  ProjectState,
  | 'fetchProjects'
  | 'fetchProjectById'
  | 'createProject'
  | 'updateProject'
  | 'deleteProject'
  | 'setCurrentProjectId'
  | 'setSearch'
  | 'setStatus'
  | 'setPage'
  | 'setLimit'
  | 'reset'
> = {
  projects: [],
  currentProjectId: null,
  currentProject: null,
  search: '',
  status: 'all',
  page: PAGINATION_DEFAULTS.page,
  limit: PAGINATION_DEFAULTS.limit,
  total: 0,
  totalPages: 0,
  loadingAction: null,
  error: null,
};

// ===== Store Implementation =====

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ---- Fetch Actions ----

      fetchProjects: async (resetPage = false) => {
        const state = get();
        const page = resetPage ? PAGINATION_DEFAULTS.page : state.page;
        set({ loadingAction: 'fetch', error: null });

        try {
          const response = await apiClient.get<PaginatedResponse<Project>>(
            API_ROUTES.projects.list,
            {
              params: {
                page,
                limit: state.limit,
                search: state.search || undefined,
                status: state.status !== 'all' ? state.status : undefined,
              },
            }
          );

          const { items, total, totalPages, page: currentPage, limit: currentLimit } = response.data;

          set({
            projects: items,
            total,
            totalPages,
            page: currentPage,
            limit: currentLimit,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : ERROR_MESSAGES.generic;
          set({
            loadingAction: null,
            error: message,
          });
        }
      },

      fetchProjectById: async (id: string) => {
        set({ loadingAction: 'fetch', error: null });

        try {
          const response = await apiClient.get<{ project: Project }>(
            API_ROUTES.projects.detail(id)
          );

          const { project } = response.data;

          set({
            currentProject: project,
            currentProjectId: project.id,
            loadingAction: null,
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : ERROR_MESSAGES.generic;
          set({
            loadingAction: null,
            error: message,
          });
        }
      },

      // ---- Mutations (Optimistic) ----

      createProject: async (data: CreateProjectDto) => {
        const state = get();

        // Optimistic temporary project
        const tempId = `temp-${Date.now()}`;
        const optimisticProject: Project = {
          id: tempId,
          name: data.name,
          description: data.description ?? null,
          repoUrl: data.repoUrl ?? null,
          tenantId: 'temp-tenant-id', // Temporary placeholder until resolved by server
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const previousProjects = state.projects;

        // Apply optimistic update
        set({
          projects: [optimisticProject, ...previousProjects],
          loadingAction: 'create',
          error: null,
        });

        try {
          const response = await apiClient.post<{ project: Project }>(
            API_ROUTES.projects.list,
            data
          );

          const serverProject = response.data.project;

          // Replace temporary project with the real one
          const updatedProjects = get().projects.map((p) =>
            p.id === tempId ? serverProject : p
          );

          set({
            projects: updatedProjects,
            currentProject:
              get().currentProject?.id === tempId
                ? serverProject
                : get().currentProject,
            currentProjectId:
              get().currentProjectId === tempId
                ? serverProject.id
                : get().currentProjectId,
            loadingAction: null,
            error: null,
          });

          // Invalidate React Query caches
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.projects.lists(),
          });

          return serverProject;
        } catch (error) {
          // Rollback
          set({
            projects: previousProjects,
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      updateProject: async (id: string, data: UpdateProjectDto) => {
        const state = get();
        const previousProjects = state.projects;
        const previousCurrent = state.currentProject;

        // Optimistically update in list and current with proper status type conversion
        const updatePayload = {
          ...data,
          status: data.status ? (data.status as ProjectStatus) : undefined,
          updatedAt: new Date().toISOString(),
        };

        const updatedProjects = state.projects.map((p) =>
          p.id === id
            ? { ...p, ...updatePayload }
            : p
        );

        const updatedCurrent =
          state.currentProject?.id === id
            ? { ...state.currentProject, ...updatePayload }
            : state.currentProject;

        set({
          projects: updatedProjects,
          currentProject: updatedCurrent,
          loadingAction: 'update',
          error: null,
        });

        try {
          const response = await apiClient.patch<{ project: Project }>(
            API_ROUTES.projects.detail(id),
            data
          );

          const serverProject = response.data.project;

          // Sync with server response
          const finalProjects = get().projects.map((p) =>
            p.id === id ? serverProject : p
          );
          const finalCurrent =
            get().currentProject?.id === id
              ? serverProject
              : get().currentProject;

          set({
            projects: finalProjects,
            currentProject: finalCurrent,
            loadingAction: null,
            error: null,
          });

          // Invalidate React Query caches
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.projects.lists(),
          });
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.projects.detail(id),
          });

          return serverProject;
        } catch (error) {
          // Rollback
          set({
            projects: previousProjects,
            currentProject: previousCurrent,
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      deleteProject: async (id: string) => {
        const state = get();
        const previousProjects = state.projects;
        const previousCurrent = state.currentProject;

        // Optimistically remove
        const filteredProjects = state.projects.filter((p) => p.id !== id);
        const newCurrent =
          state.currentProject?.id === id ? null : state.currentProject;

        set({
          projects: filteredProjects,
          currentProject: newCurrent,
          currentProjectId: newCurrent?.id ?? null,
          loadingAction: 'delete',
          error: null,
        });

        try {
          // ✅ استخدم apiClient.delete بدلاً من apiClient.del
          await apiClient.delete(API_ROUTES.projects.detail(id));

          set({
            loadingAction: null,
            error: null,
          });

          // Invalidate React Query caches
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.projects.lists(),
          });
        } catch (error) {
          // Rollback
          set({
            projects: previousProjects,
            currentProject: previousCurrent,
            loadingAction: null,
            error: error instanceof Error ? error.message : ERROR_MESSAGES.generic,
          });
          throw error;
        }
      },

      // ---- Selection ----

      setCurrentProjectId: (id: string | null) => {
        const project = id ? get().projects.find((p) => p.id === id) ?? null : null;
        set({
          currentProjectId: id,
          currentProject: project,
        });
      },

      // ---- Filters ----

      setSearch: (search: string) => {
        set({ search, page: PAGINATION_DEFAULTS.page });
        get().fetchProjects(true);
      },

      setStatus: (status: 'active' | 'archived' | 'all') => {
        set({ status, page: PAGINATION_DEFAULTS.page });
        get().fetchProjects(true);
      },

      setPage: (page: number) => {
        set({ page });
        get().fetchProjects(false);
      },

      setLimit: (limit: number) => {
        set({ limit, page: PAGINATION_DEFAULTS.page });
        get().fetchProjects(true);
      },

      // ---- Reset ----

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'ProjectStore' }
  )
);

// ===== Selectors (for component consumption) =====

/**
 * Returns the current selected project.
 */
export const useCurrentProject = () =>
  useProjectStore((state) => state.currentProject);

/**
 * Returns the list of projects.
 */
export const useProjects = () => useProjectStore((state) => state.projects);

/**
 * Returns the current filter and pagination state.
 */
export const useProjectFilters = () =>
  useProjectStore((state) => ({
    search: state.search,
    status: state.status,
    page: state.page,
    limit: state.limit,
    total: state.total,
    totalPages: state.totalPages,
  }));

/**
 * Returns the current loading action (or null if idle).
 */
export const useProjectLoading = () =>
  useProjectStore((state) => state.loadingAction);

/**
 * Returns the current error message (or null).
 */
export const useProjectError = () => useProjectStore((state) => state.error);