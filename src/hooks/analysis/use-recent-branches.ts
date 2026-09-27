/**
 * Tracks the last N branches used by the current browser.
 * Backed by localStorage, keyed per-origin (not per-project) so switching
 * between projects quickly still surfaces the branches you use most.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'architecture-sentinel-recent-branches';
const MAX_RECENT = 5;

export function useRecentBranches() {
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setBranches(parsed.filter((x): x is string => typeof x === 'string'));
      }
    } catch {
      // Corrupt entry — ignore and start fresh.
    }
  }, []);

  const addBranch = useCallback((branch: string) => {
    const trimmed = branch.trim();
    if (!trimmed) return;
    setBranches((prev) => {
      const next = [trimmed, ...prev.filter((b) => b !== trimmed)].slice(
        0,
        MAX_RECENT,
      );
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be full or unavailable — the in-memory list is still correct.
      }
      return next;
    });
  }, []);

  return { branches, addBranch };
}