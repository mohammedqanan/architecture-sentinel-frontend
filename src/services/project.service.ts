/**
 * src/services/project.service.ts
 * ════════════════════════════════════════════════════════════
 * Project service layer — thin, stateless wrapper over api-client.
 *
 * 🎯 Backend response contract (verified against NestJS):
 *   • POST   /projects       → { success: true, message: string, data: Project }
 *   • GET    /projects       → { success: true, data: Project[], total, limit }
 *   • GET    /projects/:id   → { success: true, data: Project }
 *   • PATCH  /projects/:id   → { success: true, message: string, data: Project }
 *   • DELETE /projects/:id   → 204 No Content
 *
 * @module project.service
 */

import { get, post, patch, del } from '@/lib/api-client';
import { API_ROUTES } from '@/constants';
import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  GetProjectsParams,
  GetProjectParams,
  PatchProjectParams,
  DeleteProjectParams,
} from '@/types';

// ════════════════════════════════════════════════════════════
// Response envelopes (matching the actual NestJS backend)
// ════════════════════════════════════════════════════════════

export interface SingleProjectResponse {
  success: boolean;
  message?: string;
  data: Project;
}

export interface PaginatedProjectsResponse {
  success: boolean;
  data: Project[];
  total: number;
  limit: number;
}

// ════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════

/**
 * Fetch a paginated list of projects with optional filters.
 */
export async function listProjects(
  params?: GetProjectsParams,
): Promise<PaginatedProjectsResponse> {
  const sanitisedParams = params
    ? {
        ...params,
        search: params.search?.trim() || undefined,
      }
    : undefined;

  return get<PaginatedProjectsResponse>(API_ROUTES.projects.list, {
    params: sanitisedParams,
  });
}

/**
 * Fetch a single project by its ID.
 */
export async function getProjectById(
  params: GetProjectParams,
): Promise<SingleProjectResponse> {
  return get<SingleProjectResponse>(API_ROUTES.projects.detail(params.id));
}

/**
 * Create a new project.
 */
export async function createProject(
  data: CreateProjectDto,
): Promise<SingleProjectResponse> {
  return post<SingleProjectResponse>(API_ROUTES.projects.list, data);
}

/**
 * Update an existing project.
 */
export async function updateProject(
  params: PatchProjectParams,
  data: UpdateProjectDto,
): Promise<SingleProjectResponse> {
  return patch<SingleProjectResponse>(
    API_ROUTES.projects.detail(params.id),
    data,
  );
}

/**
 * Delete a project (no response body).
 */
export async function deleteProject(
  params: DeleteProjectParams,
): Promise<void> {
  await del<void>(API_ROUTES.projects.detail(params.id));
}