/**
 * src/app/projects/new/page.tsx
 * ════════════════════════════════════════════════════════════
 * New Project — creation form.
 *
 * Route: /projects/new
 *
 * @module NewProjectPage
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus,
  ArrowLeft,
  Loader2,
  Terminal,
  Link as LinkIcon,
} from 'lucide-react';

import MainLayout from '@/components/layout/main-layout';
import { GlassCard } from '@/components/ui/glass-card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useCreateProject } from '@/hooks/use-project';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface FormState {
  name: string;
  description: string;
  repoUrl: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  repoUrl: '',
};

// ════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════

/**
 * Accepts both GitHub URL formats:
 *   • https://github.com/owner/repo
 *   • https://github.com/owner/repo.git
 */
const GITHUB_URL_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+?(?:\.git)?\/?$/i;

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const repo = values.repoUrl.trim();

  if (!name) {
    errors.name = 'Project name is required.';
  } else if (name.length < 2) {
    errors.name = 'Project name must be at least 2 characters.';
  } else if (name.length > 100) {
    errors.name = 'Project name must be at most 100 characters.';
  }

  if (values.description.length > 500) {
    errors.description = 'Description must be at most 500 characters.';
  }

  if (repo && !GITHUB_URL_REGEX.test(repo)) {
    errors.repoUrl =
      'Enter a valid GitHub repository URL (e.g., https://github.com/user/repo or https://github.com/user/repo.git).';
  }

  return errors;
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const createProject = useCreateProject();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    name: false,
    description: false,
    repoUrl: false,
  });

  const setField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]): void => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setTouched({ name: true, description: true, repoUrl: true });
      addToast('Please fix the validation errors.', 'error');
      return;
    }

    try {
      // 🎯 Backend returns { success, message, data: Project }
      const response = await createProject.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        repoUrl: form.repoUrl.trim() || undefined,
      });

      const project = response.data;

      if (!project?.id) {
        throw new Error(
          'Server response did not contain a valid project payload.',
        );
      }

      addToast(`Project "${project.name}" created successfully.`, 'success');
      navigate(APP_ROUTES.projectDetail(project.id), { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create project.';
      addToast(message, 'error');
    }
  };

  const handleCancel = (): void => {
    navigate(APP_ROUTES.projects);
  };

  const isSubmitting = createProject.isPending;
  const showError = (field: keyof FormState): string | undefined =>
    touched[field] ? errors[field] : undefined;

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════

  return (
    <MainLayout pageTitle="New Project">
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Back link */}
        <div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
        </div>

        <ErrorBoundary fallbackMessage="Project creation form encountered an error.">
          <GlassCard variant="default" padding="lg" className="space-y-6">
            {/* Header */}
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Create New Project
                  </h1>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Register a repository to begin analyzing its architecture.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="project-name"
                  className="text-sm font-medium text-gray-300"
                >
                  Project Name <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    id="project-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. enterprise-core-service"
                    autoComplete="off"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(showError('name'))}
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border text-sm text-gray-100 placeholder-gray-500',
                      'focus:outline-none focus:ring-2 transition-all',
                      showError('name')
                        ? 'border-red-500/50 focus:ring-red-500/30'
                        : 'border-white/10 focus:border-primary focus:ring-primary/30',
                    )}
                  />
                </div>
                {showError('name') && (
                  <p className="text-xs text-red-400 mt-1">
                    {showError('name')}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="project-description"
                  className="text-sm font-medium text-gray-300"
                >
                  Description
                </label>
                <textarea
                  id="project-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Briefly describe the system boundaries, database layers, or integration points…"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(showError('description'))}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl bg-black/30 border text-sm text-gray-100 placeholder-gray-500',
                    'focus:outline-none focus:ring-2 transition-all resize-none',
                    showError('description')
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-white/10 focus:border-primary focus:ring-primary/30',
                  )}
                />
                {showError('description') && (
                  <p className="text-xs text-red-400 mt-1">
                    {showError('description')}
                  </p>
                )}
              </div>

              {/* Repository URL */}
              <div className="space-y-1.5">
                <label
                  htmlFor="project-repo"
                  className="text-sm font-medium text-gray-300"
                >
                  Repository URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    id="project-repo"
                    type="text"
                    value={form.repoUrl}
                    onChange={(e) => setField('repoUrl', e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    autoComplete="off"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(showError('repoUrl'))}
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border text-sm text-gray-100 placeholder-gray-500',
                      'focus:outline-none focus:ring-2 transition-all',
                      showError('repoUrl')
                        ? 'border-red-500/50 focus:ring-red-500/30'
                        : 'border-white/10 focus:border-primary focus:ring-primary/30',
                    )}
                  />
                </div>
                {showError('repoUrl') && (
                  <p className="text-xs text-red-400 mt-1">
                    {showError('repoUrl')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/5 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold',
                    'bg-primary text-[#080C14] shadow-lg shadow-primary/20',
                    'hover:bg-primary-hover transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
};

export default React.memo(NewProjectPage);