/**
 * src/hooks/use-project.ts
 * ════════════════════════════════════════════════════════════
 * Project domain hooks — TanStack Query bindings.
 *
 * @module use-project
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useProjectStore } from '@/stores/project-store';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '@/services/project.service';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  GetProjectsParams,
} from '@/types';

// ════════════════════════════════════════════════════════════
// Queries
// ════════════════════════════════════════════════════════════

/**
 * Fetch a paginated list of projects with optional filters.
 */
export function useProjectsList(params?: GetProjectsParams) {
  const sanitisedParams = params
    ? Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined),
      )
    : {};

  return useQuery({
    queryKey: queryKeys.projects.list(sanitisedParams),
    queryFn: () => listProjects(params),
    staleTime: 60_000,
  });
}

/**
 * Fetch a single project by ID.
 */
export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => getProjectById({ id: projectId }),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}

export const useProject = useProjectDetail;

// ════════════════════════════════════════════════════════════
// Mutations
// ════════════════════════════════════════════════════════════

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      updateProject({ id }, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject({ id }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });
    },
  });
}

// ════════════════════════════════════════════════════════════
// Store selectors
// ════════════════════════════════════════════════════════════

export const useProjects = () => useProjectStore((s) => s.projects);
export const useCurrentProject = () => useProjectStore((s) => s.currentProject);
export const useCurrentProjectId = () =>
  useProjectStore((s) => s.currentProjectId);
export const useProjectFilters = () =>
  useProjectStore((s) => ({
    search: s.search,
    status: s.status,
    page: s.page,
    limit: s.limit,
    total: s.total,
    totalPages: s.totalPages,
  }));
export const useProjectLoading = () => useProjectStore((s) => s.loadingAction);
export const useProjectError = () => useProjectStore((s) => s.error);
export const useProjectStoreActions = () =>
  useProjectStore((s) => ({
    fetchProjects: s.fetchProjects,
    fetchProjectById: s.fetchProjectById,
    setCurrentProjectId: s.setCurrentProjectId,
    setSearch: s.setSearch,
    setStatus: s.setStatus,
    setPage: s.setPage,
    setLimit: s.setLimit,
    reset: s.reset,
  }));