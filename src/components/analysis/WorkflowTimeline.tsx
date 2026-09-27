/**
 * Five-stage pipeline visualization.
 *
 * The backend's `stage` field is a free-form string. We map it to one of the
 * known pipeline stages by inclusion; unknown stages are treated as
 * "in progress" at the closest known stage.
 */

import React from 'react';
import { Code2, GitBranch, Database, Brain, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'PARSING', label: 'Parsing', Icon: Code2 },
  { id: 'AST_GENERATION', label: 'Building AST', Icon: GitBranch },
  { id: 'RAG_RETRIEVAL', label: 'RAG Retrieval', Icon: Database },
  { id: 'SEMANTIC_ANALYSIS', label: 'Semantic Analysis', Icon: Brain },
  { id: 'COMPLETED', label: 'Complete', Icon: CheckCircle2 },
] as const;

type StageId = typeof STAGES[number]['id'];

interface WorkflowTimelineProps {
  /** Current free-form stage label from the backend. */
  stage: string | null;
  /** True when the analysis is currently running (animates the active node). */
  isActive: boolean;
  /** True when the analysis finished successfully. */
  isComplete: boolean;
}

function resolveStageIndex(stage: string | null, isComplete: boolean): number {
  if (isComplete) return STAGES.length - 1;
  if (!stage) return -1;

  const upper = stage.toUpperCase();
  const index = STAGES.findIndex((s) => upper.includes(s.id));
  return index;
}

const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  stage,
  isActive,
  isComplete,
}) => {
  const activeIndex = resolveStageIndex(stage, isComplete);

  return (
    <ol
      className="flex items-center gap-1 overflow-x-auto py-1"
      aria-label="Analysis pipeline stages"
    >
      {STAGES.map((s, index) => {
        const isDone = index < activeIndex || isComplete;
        const isCurrent = index === activeIndex && isActive && !isComplete;
        const isPending = index > activeIndex && !isComplete;

        return (
          <li key={s.id} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center gap-1.5 min-w-18">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border transition-colors',
                  isDone &&
                    'bg-green-500/20 border-green-500/40 text-green-400',
                  isCurrent &&
                    'bg-primary/20 border-primary/50 text-primary animate-pulse',
                  isPending &&
                    'bg-white/5 border-white/10 text-gray-500',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <s.Icon className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wide whitespace-nowrap',
                  isDone && 'text-green-400',
                  isCurrent && 'text-primary',
                  isPending && 'text-gray-500',
                )}
              >
                {s.label}
              </span>
            </div>

            {index < STAGES.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 rounded-full transition-colors',
                  isDone ? 'bg-green-500/50' : 'bg-white/10',
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default React.memo(WorkflowTimeline);
export type { StageId };