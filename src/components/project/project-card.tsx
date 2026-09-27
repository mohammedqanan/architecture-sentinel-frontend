'use client';

/**
 * src/components/project/project-card.tsx
 *
 * Standalone Project Card component – displays a single project's key information
 * and provides interaction hooks. Purely presentational and stateless.
 */

import React, { useCallback } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

// ============================================================
// Props Interface
// ============================================================

export interface ProjectCardProps {
  /** The project data to display. */
  project: Project;
  /** Callback when the card is clicked (e.g., for navigation). */
  onClick?: (projectId: string) => void;
  /** Callback for the Edit action. */
  onEdit?: (projectId: string) => void;
  /** Callback for the Archive action. */
  onArchive?: (projectId: string) => void;
  /** Callback for the Delete action. */
  onDelete?: (projectId: string) => void;
  /** Callback for the Duplicate action. */
  onDuplicate?: (projectId: string) => void;
  /** Additional class names for the card. */
  className?: string;
}

// ============================================================
// Constants
// ============================================================

const statusMap: Record<string, { label: string; color: string }> = {
  active: {
    label: 'Active',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
};

// ============================================================
// Component Implementation
// ============================================================

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onEdit,
  onArchive,
  onDelete,
  onDuplicate,
  className,
}) => {
  const handleCardClick = useCallback(() => {
    if (onClick) onClick(project.id);
  }, [onClick, project.id]);

  const handleAction = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, action: (id: string) => void) => {
      e.stopPropagation();
      action(project.id);
    },
    [project.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleCardClick();
      }
    },
    [onClick, handleCardClick]
  );

  const status = project.status || 'active';
  const statusInfo = statusMap[status] || statusMap.active;

  return (
    <GlassCard
      variant={onClick ? 'interactive' : 'default'}
      padding="md"
      className={cn(
        'flex flex-col gap-2',
        onClick ? 'cursor-pointer hover:border-primary/50' : '',
        className
      )}
      onClick={handleCardClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Header: name + status badge */}
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-mono rounded border',
            statusInfo.color
          )}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
      )}

      {/* Metadata line */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
        {project.repoUrl && (
          <span className="truncate max-w-50">🔗 {project.repoUrl}</span>
        )}
        <span>📅 {new Date(project.createdAt).toLocaleDateString()}</span>
        {project.analysesCount !== undefined && (
          <span>📊 {project.analysesCount} analyses</span>
        )}
      </div>

      {/* Action buttons */}
      {(onEdit || onArchive || onDelete || onDuplicate) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => handleAction(e, onEdit)}
              className="text-xs text-gray-400 hover:text-primary transition"
            >
              Edit
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => handleAction(e, onDuplicate)}
              className="text-xs text-gray-400 hover:text-primary transition"
            >
              Duplicate
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={(e) => handleAction(e, onArchive)}
              className="text-xs text-gray-400 hover:text-yellow-400 transition"
            >
              Archive
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => handleAction(e, onDelete)}
              className="text-xs text-gray-400 hover:text-red-400 transition"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
};

// ============================================================
// Exports
// ============================================================

export default React.memo(ProjectCard);