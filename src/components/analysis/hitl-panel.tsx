'use client';

/**
 * src/components/analysis/hitl-panel.tsx
 * ════════════════════════════════════════════════════════════
 * Human-in-the-Loop (HitL) Panel.
 *
 * Architecture:
 *   • `analysisId` is passed explicitly as a prop (source of truth = URL).
 *   • `hitlState` is read from `useAnalysisStore` — it's populated by
 *     the WebSocket `hitl:request` event, not by URL params.
 *   • Feedback submission via `useSubmitHitLFeedback` (TanStack Query).
 *
 * @module components/analysis/hitl-panel
 */

import React, { useState } from 'react';

import { useAnalysisStore } from '@/stores/analysis-store';
import { useSubmitHitLFeedback } from '@/hooks/use-analysis';
import { useUIStore } from '@/stores/ui-store';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';
import type { ReviewChunk } from '@/types';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

export interface HitLPanelProps {
  /** Analysis ID — passed from the route param. */
  analysisId: string;
}

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
  CRITICAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

const HitLStatusMessage: React.FC<{ status: string }> = ({ status }) => {
  const messages: Record<string, string> = {
    AWAITING_REVIEW: 'Pending review',
    FEEDBACK_PROVIDED: 'Feedback submitted — awaiting resolution',
    RESOLVED: 'Analysis resolved',
  };
  return (
    <span className="text-sm font-medium text-gray-400">
      {messages[status] ?? status}
    </span>
  );
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const HitLPanel: React.FC<HitLPanelProps> = ({ analysisId }) => {
  // ───── HitL state from store (real-time via WebSocket) ─────
  const hitlState = useAnalysisStore((state) => state.hitlState);
  const addToast = useUIStore((state) => state.addToast);

  // ───── Local form state ─────
  const [feedback, setFeedback] = useState('');
  const [approved, setApproved] = useState<boolean | null>(null);
  const [touched, setTouched] = useState(false);

  // ───── Mutation ─────
  const { mutate, isPending } = useSubmitHitLFeedback();

  // ───── Derived ─────
  const isAwaitingReview = hitlState.status === 'AWAITING_REVIEW';
  const reviewChunks = isAwaitingReview ? hitlState.reviewChunks : [];

  // ───── Submit ─────
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!analysisId) return;

    setTouched(true);

    if (approved === null) {
      addToast('Please approve or reject the analysis.', 'warning');
      return;
    }
    if (feedback.trim().length === 0) {
      addToast('Please provide feedback details.', 'warning');
      return;
    }

    mutate(
      {
        analysisId,
        feedback: { feedback: feedback.trim(), approved },
      },
      {
        onSuccess: () => {
          addToast('Feedback submitted successfully!', 'success');
          setFeedback('');
          setApproved(null);
          setTouched(false);
        },
        onError: (error) => {
          addToast(
            error instanceof Error
              ? error.message
              : 'Failed to submit feedback.',
            'error',
          );
        },
      },
    );
  };

  // ════════════════════════════════════════════════════════
  // States: no analysis / not awaiting review
  // ════════════════════════════════════════════════════════

  if (!analysisId) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No analysis selected.
      </div>
    );
  }

  if (!isAwaitingReview) {
    return (
      <GlassCard variant="default" padding="lg" className="text-center">
        <div className="text-lg font-semibold text-white">HitL Status</div>
        <HitLStatusMessage status={hitlState.status} />
        {hitlState.status === 'FEEDBACK_PROVIDED' && (
          <p className="mt-2 text-sm text-gray-400">
            Your feedback has been recorded. The analysis will be resolved
            once processed.
          </p>
        )}
        {hitlState.status === 'RESOLVED' && (
          <p className="mt-2 text-sm text-gray-400">
            This analysis has been resolved. No further action is required.
          </p>
        )}
      </GlassCard>
    );
  }

  // ════════════════════════════════════════════════════════
  // Render: awaiting review
  // ════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Human-in-the-Loop Review
        </h3>
        <HitLStatusMessage status={hitlState.status} />
      </div>

      {/* Review chunks */}
      {reviewChunks.length === 0 ? (
        <div className="text-gray-500 text-center">
          No review chunks available.
        </div>
      ) : (
        <div className="space-y-4">
          {reviewChunks.map((chunk: ReviewChunk, idx: number) => (
            <GlassCard
              key={chunk.id ?? idx}
              variant="default"
              padding="md"
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-mono rounded border',
                    SEVERITY_COLORS[chunk.severity] ??
                      'bg-gray-500/20 text-gray-400 border-gray-500/30',
                  )}
                >
                  {chunk.severity}
                </span>
                <span className="text-sm text-gray-400">
                  Lines {chunk.startLine} – {chunk.endLine}
                </span>
              </div>
              <p className="text-sm text-gray-300">{chunk.message}</p>
              {chunk.suggestion && (
                <div className="mt-1 text-sm text-gray-400 bg-black/20 p-2 rounded border border-white/5 font-mono">
                  💡 {chunk.suggestion}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Feedback form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feedback"
            className="block text-sm font-medium text-gray-300"
          >
            Your feedback{' '}
            <span className="text-gray-500">(required)</span>
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 p-3 text-sm text-gray-200 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Describe your reasoning, concerns, or approval…"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="approve"
              name="decision"
              value="approve"
              checked={approved === true}
              onChange={() => setApproved(true)}
              disabled={isPending}
              className="text-primary focus:ring-primary"
            />
            <label htmlFor="approve" className="text-sm text-gray-300">
              Approve
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="reject"
              name="decision"
              value="reject"
              checked={approved === false}
              onChange={() => setApproved(false)}
              disabled={isPending}
              className="text-red-500 focus:ring-red-500"
            />
            <label htmlFor="reject" className="text-sm text-gray-300">
              Reject
            </label>
          </div>
        </div>

        {touched && approved === null && (
          <p className="text-sm text-yellow-400">
            Please select Approve or Reject.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-medium hover:bg-primary/30 transition',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
            isPending && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isPending ? <SpatialLoader size="sm" /> : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default React.memo(HitLPanel);