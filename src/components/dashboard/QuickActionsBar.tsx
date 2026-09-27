/**
 * Primary calls-to-action on the dashboard.
 */

import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

interface QuickActionsBarProps {
  onNewProject: () => void;
  onNewAnalysis: () => void;
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onNewProject,
  onNewAnalysis,
}) => {
  return (
    <section
      aria-label="Quick actions"
      className="flex flex-wrap gap-4 justify-center pt-2"
    >
      <button
        type="button"
        onClick={onNewProject}
        className="flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/30 rounded-lg text-primary font-medium hover:bg-primary/30 transition focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>
      <button
        type="button"
        onClick={onNewAnalysis}
        className="flex items-center gap-2 px-6 py-3 bg-secondary/20 border border-secondary/30 rounded-lg text-secondary font-medium hover:bg-secondary/30 transition focus:outline-none focus:ring-2 focus:ring-secondary"
      >
        <Sparkles className="w-4 h-4" />
        New Analysis
      </button>
    </section>
  );
};

export default React.memo(QuickActionsBar);