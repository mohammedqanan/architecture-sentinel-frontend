'use client';

/**
 * src/components/project/project-list.tsx
 * ════════════════════════════════════════════════════════════
 *
 * Project List — paginated, filterable list of projects.
 *
 * Fixes applied:
 *   ✅ Defensive access to `projects` (never undefined at render).
 *   ✅ `useShallow` on Zustand selector — prevents infinite re-renders
 *      caused by returning a new object identity on every render.
 *   ✅ Proper error / loading / empty states.
 *   ✅ `useCallback` for stable handlers.
 *   ✅ `React.memo` on card subcomponent.
 *
 * @module components/project/project-list
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useProjectStore } from '@/stores/project-store';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

// ════════════════════════════════════════════════════════════
// Project Card
// ════════════════════════════════════════════════════════════

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard = React.memo<ProjectCardProps>(({ project, onClick }) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <GlassCard
      variant="interactive"
      padding="md"
      className={cn(
        'cursor-pointer hover:border-primary/50 transition-all',
        'flex flex-col justify-between',
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-gray-400 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 border-t border-white/5 pt-2">
        <span className="truncate">
          {project.repoUrl ? `🔗 ${project.repoUrl}` : 'No repo'}
        </span>
        <span className="shrink-0">
          Created: {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>
    </GlassCard>
  );
});

ProjectCard.displayName = 'ProjectCard';

// ════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════

const ProjectList: React.FC = () => {
  const navigate = useNavigate();

  // ✅ useShallow — prevents infinite re-render from new object identity
  const {
    projects,
    loadingAction,
    error,
    search,
    status,
    page,
    limit,
    total,
    totalPages,
    fetchProjects,
    setSearch,
    setStatus,
    setPage,
  } = useProjectStore(
    useShallow((state) => ({
      projects: state.projects,
      loadingAction: state.loadingAction,
      error: state.error,
      search: state.search,
      status: state.status,
      page: state.page,
      limit: state.limit,
      total: state.total,
      totalPages: state.totalPages,
      fetchProjects: state.fetchProjects,
      setSearch: state.setSearch,
      setStatus: state.setStatus,
      setPage: state.setPage,
    })),
  );

  // ✅ Defensive default — never trust external state to be defined
  const safeProjects: Project[] = Array.isArray(projects) ? projects : [];
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.max(1, Number(page) || 1);
  const safeTotal = Number(total) || safeProjects.length;
  const safeLimit = Number(limit) || 10;

  // ════════════════════════════════════════════════════════════
  // Local debounced search
  // ════════════════════════════════════════════════════════════

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search, setSearch]);

  // ════════════════════════════════════════════════════════════
  // Fetch on mount
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // ════════════════════════════════════════════════════════════
  // Handlers
  // ════════════════════════════════════════════════════════════

  const handleProjectClick = useCallback(
    (projectId: string) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate],
  );

  const handleCreateProject = useCallback(() => {
    navigate('/projects/new');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const goToPage = useCallback(
    (pageNum: number) => {
      if (pageNum >= 1 && pageNum <= safeTotalPages) {
        setPage(pageNum);
      }
    },
    [safeTotalPages, setPage],
  );

  // ════════════════════════════════════════════════════════════
  // Status options
  // ════════════════════════════════════════════════════════════

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
    ],
    [],
  );

  // ════════════════════════════════════════════════════════════
  // Early returns — loading / error / empty
  // ════════════════════════════════════════════════════════════

  if (loadingAction === 'fetch') {
    return (
      <div className="flex justify-center py-12">
        <SpatialLoader size="lg" message="Loading projects..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">Failed to load projects: {error}</p>
        <button
          onClick={handleRetry}
          className="mt-2 px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (safeProjects.length === 0 && !loadingAction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No projects found.</p>
        <button
          onClick={handleCreateProject}
          className="mt-4 px-6 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
        >
          Create your first project
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search projects..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className={cn(
              'px-4 py-2 bg-black/30 border border-white/10 rounded-lg',
              'text-sm text-gray-200 placeholder-gray-500',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'w-64',
            )}
          />
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'all' | 'active' | 'archived')
            }
            className={cn(
              'px-4 py-2 bg-black/30 border border-white/10 rounded-lg',
              'text-sm text-gray-200',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            )}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreateProject}
          className="px-6 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary font-medium hover:bg-primary/30 transition"
        >
          + New Project
        </button>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {safeTotalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm text-gray-500">
            Showing {safeProjects.length} of {safeTotal} projects (limit{' '}
            {safeLimit} / page)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>
            <span className="text-sm text-gray-400">
              Page {safePage} of {safeTotalPages}
            </span>
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= safeTotalPages}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProjectList);