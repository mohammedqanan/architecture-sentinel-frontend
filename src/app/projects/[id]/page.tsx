/**
 * src/app/projects/[id]/page.tsx
 * ════════════════════════════════════════════════════════════
 * Project Detail — metadata, actions, and (future) analyses list.
 *
 * Route: /projects/:id
 *
 * 🎯 Backend contract:
 *   GET /projects/:id → { success: true, data: Project }
 *
 * @module ProjectDetailPage
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/main-layout';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';

import {
  useProject,
  useDeleteProject,
  useUpdateProject,
} from '@/hooks/use-project';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? '';
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  // ───── Fetch project ─────
  const {
    data: projectResponse,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorObj,
    refetch: refetchProject,
  } = useProject(projectId);

  // 🎯 NEW: backend returns { success, message?, data: Project }
  const project = projectResponse?.data;

  // ───── Mutations ─────
  const deleteProjectMutation = useDeleteProject();
  const updateProjectMutation = useUpdateProject();

  const [isDeleting, setIsDeleting] = useState(false);

  // ════════════════════════════════════════════════════════
  // Handlers
  // ════════════════════════════════════════════════════════

  const handleNewAnalysis = (): void => {
    navigate(APP_ROUTES.newAnalysis);
  };

  const handleEdit = (): void => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleArchive = async (): Promise<void> => {
    if (!project) return;
    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    const label = newStatus === 'archived' ? 'archive' : 'unarchive';

    if (!window.confirm(`Are you sure you want to ${label} this project?`)) {
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        data: { status: newStatus },
      });
      addToast(`Project ${label}d successfully`, 'success');
      void refetchProject();
    } catch {
      addToast('Failed to update project status', 'error');
    }
  };

  const handleDelete = async (): Promise<void> => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this project? This action cannot be undone.',
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      addToast('Project deleted successfully', 'success');
      navigate(APP_ROUTES.projects);
    } catch {
      addToast('Failed to delete project', 'error');
      setIsDeleting(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // Loading
  // ════════════════════════════════════════════════════════

  if (projectLoading) {
    return (
      <MainLayout pageTitle="Loading…">
        <div className="flex justify-center py-12">
          <SpatialLoader size="lg" message="Loading project…" />
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Error
  // ════════════════════════════════════════════════════════

  if (projectError || !project) {
    const errorMessage =
      projectErrorObj instanceof Error
        ? projectErrorObj.message
        : 'Project not found';

    return (
      <MainLayout pageTitle="Project not found">
        <div className="p-4 text-center">
          <p className="text-red-400">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.projects)}
            className="mt-2 px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
          >
            Back to Projects
          </button>
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════

  const statusColor =
    project.status === 'archived'
      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      : 'bg-green-500/20 text-green-400 border-green-500/30';

  return (
    <MainLayout pageTitle={project.name}>
      <div className="space-y-6">
        {/* ───── Project Info Card ───── */}
        <GlassCard variant="elevated" padding="lg" className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={cn(
                'px-3 py-1 text-xs font-mono rounded border',
                statusColor,
              )}
            >
              {project.status ?? 'active'}
            </span>
          </div>

          {project.description && (
            <p className="text-gray-300">{project.description}</p>
          )}

          {project.repoUrl && (
            <div className="text-sm">
              <span className="text-gray-400">Repository: </span>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {project.repoUrl}
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary hover:bg-primary/30 transition"
            >
              + New Analysis
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition"
            >
              Edit Project
            </button>
            <button
              type="button"
              onClick={() => void handleArchive()}
              className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition"
            >
              {project.status === 'archived' ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting…' : 'Delete Project'}
            </button>
          </div>
        </GlassCard>

        {/* ───── Analyses Card ───── */}
        <GlassCard variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Analyses</h2>
            <span className="text-sm text-gray-400">0 total</span>
          </div>

          <p className="text-gray-500 text-center py-4">
            No analyses have been run for this project yet.
          </p>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
            >
              Start the first analysis
            </button>
          </div>
        </GlassCard>
      </div>
    </MainLayout>
  );
};

export default React.memo(ProjectDetailPage);