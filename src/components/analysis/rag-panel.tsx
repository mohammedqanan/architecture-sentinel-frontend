'use client';

/**
 * src/components/analysis/rag-panel.tsx
 * ════════════════════════════════════════════════════════════
 * RAG Panel — displays retrieved vector-embedding chunks.
 *
 * Architecture:
 *   • `analysisId` is passed explicitly as a prop (source of truth = URL).
 *   • Pagination is LOCAL state — no need to pollute the global store.
 *   • Data fetching via `useRagDocuments` (TanStack Query).
 *
 * @module components/analysis/rag-panel
 */

import React, { useState } from 'react';

import { useRagDocuments } from '@/hooks/use-analysis';
import { GlassCard } from '@/components/ui/glass-card';
import { SpatialLoader } from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

export interface RAGPanelProps {
  /** Analysis ID — passed from the route param. */
  analysisId: string;
}

interface ConfidenceInfo {
  color: string;
  label: string;
}

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function getConfidenceInfo(score = 0): ConfidenceInfo {
  if (score >= 0.7) return { color: 'text-green-400', label: 'High' };
  if (score >= 0.4) return { color: 'text-yellow-400', label: 'Medium' };
  return { color: 'text-red-400', label: 'Low' };
}

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const RAGPanel: React.FC<RAGPanelProps> = ({ analysisId }) => {
  // ───── Local pagination state ─────
  const [page, setPage] = useState<number>(DEFAULT_PAGE);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);

  // ───── Expand/collapse per document ─────
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ───── Data fetching ─────
  const { data, isLoading, isError, refetch } = useRagDocuments(
    analysisId,
    page,
    limit,
  );

  const documents = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // ───── Handlers ─────
  const toggleExpand = (id: string): void => {
    if (!id) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToPage = (next: number): void => {
    if (next >= 1 && next <= totalPages) {
      setPage(next);
    }
  };

  const handleLimitChange = (nextLimit: number): void => {
    setLimit(nextLimit);
    setPage(DEFAULT_PAGE); // reset page on limit change
  };

  // ════════════════════════════════════════════════════════
  // States: no analysis / loading / error / empty
  // ════════════════════════════════════════════════════════

  if (!analysisId) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No analysis selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <SpatialLoader size="md" message="Loading RAG documents…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">Failed to load RAG documents.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No relevant documents found for this analysis.
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {documents.map((doc, idx) => {
        const docId = doc.id ?? `doc-${idx}`;
        const score = doc.score ?? 0;
        const content = doc.content ?? '';
        const filePath = doc.metadata?.filePath
          ? String(doc.metadata.filePath)
          : 'Unknown file';
        const startLine =
          doc.metadata?.startLine !== undefined
            ? String(doc.metadata.startLine)
            : '?';
        const endLine =
          doc.metadata?.endLine !== undefined
            ? String(doc.metadata.endLine)
            : '?';

        const { color: scoreColor, label: scoreLabel } =
          getConfidenceInfo(score);
        const isExpanded = expanded.has(docId);
        const preview = content.slice(0, 300);

        return (
          <GlassCard
            key={docId}
            variant="default"
            padding="md"
            className="space-y-2"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono text-gray-400 truncate">
                  {filePath}
                </div>
                <div className="text-xs text-gray-500">
                  Lines {startLine} – {endLine}
                </div>
              </div>
              <div className={cn('text-sm font-semibold shrink-0', scoreColor)}>
                {scoreLabel} ({Math.round(score * 100)}%)
              </div>
            </div>

            <div className="text-sm text-gray-300 font-mono bg-black/20 p-2 rounded whitespace-pre-wrap wrap-break-word">
              {isExpanded ? content : preview}
              {!isExpanded && content.length > preview.length && (
                <span className="text-gray-500"> …</span>
              )}
            </div>

            {content.length > preview.length && (
              <button
                type="button"
                onClick={() => toggleExpand(docId)}
                className="text-xs text-primary hover:underline focus:outline-none"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </GlassCard>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>
              Showing {documents.length} of {total} documents
            </span>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1 text-gray-300"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
            >
              Prev
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RAGPanel);