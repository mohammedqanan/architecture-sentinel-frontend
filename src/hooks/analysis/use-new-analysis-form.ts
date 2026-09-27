/**
 * Form state for the analysis launcher.
 *
 * Responsibilities:
 *   - Resolve the initial project from URL param → localStorage → first project
 *   - Keep the URL param in sync so reloads/back-forward preserve selection
 *   - Expose a narrowly-typed patch function
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STORAGE_KEYS } from '@/constants';

export type AnalysisDepth = 'quick' | 'standard' | 'deep';

export interface NewAnalysisFormValues {
  projectId: string;
  branch: string;
  depth: AnalysisDepth;
  includePatterns: string;
  excludePatterns: string;
  timeout: number;
}

const BRANCH_REGEX = /^[a-zA-Z0-9._\-\/]+$/;

/** Empty string is valid (means "use the project's default branch"). */
export function isValidBranch(branch: string): boolean {
  return branch === '' || BRANCH_REGEX.test(branch);
}

const INITIAL_VALUES: Omit<NewAnalysisFormValues, 'projectId'> = {
  branch: '',
  depth: 'standard',
  includePatterns: '**/*.ts,**/*.tsx',
  excludePatterns: 'node_modules/**,dist/**,build/**',
  timeout: 900,
};

export function useNewAnalysisForm(availableProjectIds: string[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [values, setValues] = useState<NewAnalysisFormValues>(() => ({
    ...INITIAL_VALUES,
    projectId: searchParams.get('projectId') ?? '',
  }));

  // Resolve a project once projects are available: URL param > last used > first.
  useEffect(() => {
    if (values.projectId || availableProjectIds.length === 0) return;

    let resolved = '';
    try {
      const last = window.localStorage.getItem(STORAGE_KEYS.lastProjectId);
      if (last && availableProjectIds.includes(last)) resolved = last;
    } catch {
      // Storage unavailable — fall through to first project.
    }
    if (!resolved) resolved = availableProjectIds[0];

    setValues((prev) => ({ ...prev, projectId: resolved }));
  }, [availableProjectIds, values.projectId]);

  // Persist selection.
  useEffect(() => {
    if (!values.projectId) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.lastProjectId, values.projectId);
    } catch {
      // Non-fatal.
    }
  }, [values.projectId]);

  // Mirror selection into the URL so refresh/back-forward preserves state.
  useEffect(() => {
    if (!values.projectId) return;
    if (searchParams.get('projectId') === values.projectId) return;
    const next = new URLSearchParams(searchParams);
    next.set('projectId', values.projectId);
    setSearchParams(next, { replace: true });
  }, [values.projectId, searchParams, setSearchParams]);

  const setField = useCallback(
    <K extends keyof NewAnalysisFormValues>(
      field: K,
      value: NewAnalysisFormValues[K],
    ) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return { values, setField };
}