/**
 * Recent projects list panel.
 */

import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import ProjectCard from '@/components/project/project-card';
import type { Project } from '@/types';

interface RecentProjectsPanelProps {
  projects: Project[];
  onProjectClick: (id: string) => void;
  onViewAll: () => void;
}

const RecentProjectsPanel: React.FC<RecentProjectsPanelProps> = ({
  projects,
  onProjectClick,
  onViewAll,
}) => {
  return (
    <GlassCard variant="default" padding="lg" className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded px-1"
        >
          View all
        </button>
      </header>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-6 text-sm">
          No projects yet. Create your first project to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onClick={onProjectClick} />
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
};

export default React.memo(RecentProjectsPanel);