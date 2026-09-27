/**
 * Searchable project combobox.
 *
 * Replaces the native <select> which is unusable past a few dozen projects.
 * Implements the ARIA combobox pattern with active-descendant keyboard nav.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface ProjectSelectorProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  value,
  onChange,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => projects.find((p) => p.id === value) ?? null,
    [projects, value],
  );

  const filtered = useMemo(() => {
    if (!query) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.repoUrl?.toLowerCase().includes(q) ?? false),
    );
  }, [projects, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Dismiss on outside click / Escape is handled per-element.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          const item = filtered[activeIndex];
          if (item) handleSelect(item.id);
          break;
        }
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, filtered, activeIndex, handleSelect],
  );

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label
        htmlFor="project-selector"
        className="block text-sm font-medium text-gray-300"
      >
        Project <span className="text-red-400">*</span>
      </label>

      {selected && !open ? (
        <div
          onClick={() => !disabled && setOpen(true)}
          className={cn(
            'w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg cursor-pointer',
            'hover:border-white/20 transition',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-white truncate">{selected.name}</div>
              {selected.repoUrl && (
                <div className="text-xs text-gray-500 truncate">
                  {selected.repoUrl}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(true);
              }}
              className="p-1 rounded hover:bg-white/10 shrink-0"
              aria-label="Clear project selection"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            id="project-selector"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="project-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              open ? `project-option-${activeIndex}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Search projects…"
            className="w-full pl-9 pr-9 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
            aria-label={open ? 'Close project list' : 'Open project list'}
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </div>
      )}

      {open && (
        <ul
          id="project-listbox"
          role="listbox"
          className="max-h-72 overflow-auto bg-[#0b0f19] border border-white/10 rounded-lg shadow-lg z-20"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-gray-500 text-center">
              No projects match “{query}”.
            </li>
          ) : (
            filtered.map((p, i) => (
              <li
                key={p.id}
                id={`project-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(p.id)}
                className={cn(
                  'px-3 py-2.5 cursor-pointer border-b border-white/5 last:border-b-0',
                  i === activeIndex ? 'bg-primary/10' : 'hover:bg-white/5',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {p.description}
                      </div>
                    )}
                  </div>
                  {p.analysesCount !== undefined && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {p.analysesCount} runs
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default React.memo(ProjectSelector);