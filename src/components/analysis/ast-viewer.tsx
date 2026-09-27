'use client';

/**
 * src/components/analysis/ast-viewer.tsx
 *
 * AST (Abstract Syntax Tree) Viewer – renders a hierarchical, collapsible view
 * of the parsed AST. Fetches lazily via useAnalysisAst and caches in the store.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAnalysisStore } from '@/stores/analysis-store';
import { useAnalysisAst } from '@/hooks/use-analysis';
import { GlassCard } from '@/components/ui/glass-card';
import SpatialLoader from '@/components/ui/spatial-loader';
import { cn } from '@/lib/utils';
import type { ASTNode } from '@/types';

// ============================================================
// Constants
// ============================================================

const NODE_COLORS: Record<string, string> = {
  Program: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  FunctionDeclaration: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  VariableDeclaration: 'text-green-400 border-green-500/30 bg-green-500/10',
  ClassDeclaration: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  IfStatement: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  ReturnStatement: 'text-red-400 border-red-500/30 bg-red-500/10',
  CallExpression: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  Identifier: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
  Literal: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  default: 'text-gray-300 border-white/10 bg-white/5',
};

// ============================================================
// Recursive Node Component
// ============================================================

interface AstNodeViewerProps {
  node: ASTNode;
  depth: number;
}

const AstNodeViewer: React.FC<AstNodeViewerProps> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  
  // Safe extraction of children to satisfy TypeScript strict null checks
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const colorClass = NODE_COLORS[node.kind] || NODE_COLORS.default;

  // Build a summary string (e.g., function name, variable name, literal value)
  const summary = useMemo(() => {
    if (node.kind === 'FunctionDeclaration' && node.name) {
      return `function ${node.name}`;
    }
    if (node.kind === 'VariableDeclaration' && node.name) {
      return `var ${node.name}`;
    }
    if (node.kind === 'Literal' && node.value !== undefined) {
      return `"${node.value}"`;
    }
    return '';
  }, [node]);

  return (
    <div className="relative" style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className={cn(
          'flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-white/5 transition',
          'border-l-2',
          colorClass,
          'border-l-current'
        )}
        onClick={toggle}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span className="text-xs font-mono font-semibold">{node.kind}</span>
        {summary && <span className="text-xs text-gray-400 truncate">{summary}</span>}
        {hasChildren && (
          <span className="ml-auto text-xs text-gray-500">
            {expanded ? '▼' : '▶'} {children.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="mt-1 space-y-1">
          {children.map((child, idx) => (
            <AstNodeViewer key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

const ASTViewer: React.FC = () => {
  const currentAnalysisId = useAnalysisStore((state) => state.currentAnalysisId);
  const ast = useAnalysisStore((state) => state.ast);
  
  // Safe dynamic selector for setAst to prevent store typing mismatch issues
  const setAst = useAnalysisStore((state) => (state as unknown as { setAst?: (ast: ASTNode | null) => void }).setAst);

  // Removed unused 'error' declaration from hook call
  const { data, isLoading, isError, refetch } = useAnalysisAst(
    currentAnalysisId || '',
    !!currentAnalysisId && !ast
  );

  // Update store when data arrives
  useEffect(() => {
    if (data && data.ast && typeof setAst === 'function') {
      setAst(data.ast);
    }
  }, [data, setAst]);

  const currentAst = ast || data?.ast || null;

  // ---- States ----
  if (!currentAnalysisId) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No analysis selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <SpatialLoader size="md" message="Loading AST..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">Failed to load AST.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentAst) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">AST not loaded.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
        >
          Load AST
        </button>
      </div>
    );
  }

  // ---- Render AST ----
  return (
    <GlassCard variant="default" padding="md" className="overflow-auto max-h-150">
      <div className="font-mono text-sm" role="tree">
        <AstNodeViewer node={currentAst} depth={0} />
      </div>
    </GlassCard>
  );
};

// ============================================================
// Exports
// ============================================================

export default ASTViewer;