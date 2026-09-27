/**
 * Collapsible advanced options: depth preset, glob patterns, timeout.
 */

import React, { useState } from 'react';
import { ChevronDown, Zap, Gauge, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisDepth } from '@/hooks/analysis/use-new-analysis-form';

const DEPTHS: ReadonlyArray<{
  id: AnalysisDepth;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'quick', label: 'Quick', description: '< 100 files · ~2 min', Icon: Zap },
  { id: 'standard', label: 'Standard', description: '< 1000 files · ~15 min', Icon: Gauge },
  { id: 'deep', label: 'Deep', description: 'Full repo · up to 60 min', Icon: Rocket },
];

interface AdvancedOptionsProps {
  depth: AnalysisDepth;
  includePatterns: string;
  excludePatterns: string;
  timeout: number;
  onDepthChange: (depth: AnalysisDepth) => void;
  onIncludeChange: (value: string) => void;
  onExcludeChange: (value: string) => void;
  onTimeoutChange: (value: number) => void;
  disabled?: boolean;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  depth,
  includePatterns,
  excludePatterns,
  timeout,
  onDepthChange,
  onIncludeChange,
  onExcludeChange,
  onTimeoutChange,
  disabled,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="advanced-options-content"
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="font-medium">Advanced options</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          id="advanced-options-content"
          className="px-4 pb-4 pt-4 space-y-5 border-t border-white/5"
        >
          <div className="space-y-2">
            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
              Analysis depth
            </span>
            <div className="grid grid-cols-3 gap-2">
              {DEPTHS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDepthChange(d.id)}
                  disabled={disabled}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition',
                    depth === d.id
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20',
                  )}
                >
                  <d.Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{d.label}</span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {d.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="include-patterns"
                className="block text-xs font-medium text-gray-400"
              >
                Include patterns
              </label>
              <input
                id="include-patterns"
                type="text"
                value={includePatterns}
                onChange={(e) => onIncludeChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="exclude-patterns"
                className="block text-xs font-medium text-gray-400"
              >
                Exclude patterns
              </label>
              <input
                id="exclude-patterns"
                type="text"
                value={excludePatterns}
                onChange={(e) => onExcludeChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="timeout"
                className="text-xs font-medium text-gray-400"
              >
                Timeout
              </label>
              <span className="text-xs text-gray-500">
                {Math.round(timeout / 60)} min
              </span>
            </div>
            <input
              id="timeout"
              type="range"
              min={60}
              max={3600}
              step={60}
              value={timeout}
              onChange={(e) => onTimeoutChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdvancedOptions);