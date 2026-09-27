/**
 * Branch / commit input with validation and recent suggestions.
 *
 * Enter with Ctrl/Cmd submits the form (see `onCommit`).
 */

import React, { useCallback } from 'react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidBranch } from '@/hooks/analysis/use-new-analysis-form';

interface BranchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  disabled?: boolean;
  onCommit: () => void;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  value,
  onChange,
  suggestions,
  disabled,
  onCommit,
}) => {
  const valid = isValidBranch(value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onCommit();
      }
    },
    [onCommit],
  );

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="branch-input"
        className="block text-sm font-medium text-gray-300"
      >
        Branch or commit <span className="text-gray-500">(optional)</span>
      </label>

      <div className="relative">
        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          id="branch-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="main, develop, or a commit SHA — empty uses the default"
          aria-invalid={!valid ? true : undefined}
          aria-describedby={!valid ? 'branch-error' : undefined}
          className={cn(
            'w-full pl-9 pr-3 py-2.5 bg-black/40 border rounded-lg text-sm text-gray-100 placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            !valid
              ? 'border-red-500/50'
              : 'border-white/10 hover:border-white/20',
          )}
        />
      </div>

      {!valid && (
        <p id="branch-error" role="alert" className="text-xs text-red-400">
          Branch names may only contain letters, digits, and `._-/`
        </p>
      )}

      {suggestions.length > 0 && !value && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-gray-500">Recent:</span>
          {suggestions.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onChange(b)}
              disabled={disabled}
              className="px-2 py-0.5 text-xs rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition"
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(BranchSelector);