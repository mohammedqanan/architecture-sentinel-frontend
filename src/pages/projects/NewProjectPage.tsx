/**
 * ============================================================================
 * ARCHSENTINEL — ENTERPRISE PROJECT CREATION PAGE
 * ============================================================================
 * Architecture: React / Vite / TypeScript / Tailwind CSS / Zustand / Zod
 * Description: Production-ready, fully integrated project onboarding view.
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { 
  FolderPlus, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Terminal 
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useUIStore } from '@/stores/ui-store';
import { APP_ROUTES } from '@/constants';

// ============================================================================
// 1. Validation Schema (Zod)
// ============================================================================

const projectCreationSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters.')
    .max(50, 'Project name cannot exceed 50 characters.')
    .regex(/^[a-zA-Z0-9-_ ]+$/, 'Only alphanumeric characters, spaces, hyphens, and underscores are allowed.'),
  description: z
    .string()
    .max(255, 'Description cannot exceed 255 characters.')
    .optional(),
  techStack: z.enum(['NODE_EXPRESS', 'NEXTJS_TS', 'PYTHON_FASTAPI', 'GO_MICROSERVICES'], {
    errorMap: () => ({ message: 'Please select a valid target architecture stack.' }),
  }),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).default('PRIVATE'),
});

type ProjectCreationFormData = z.infer<typeof projectCreationSchema>;

// ============================================================================
// 2. Component Implementation
// ============================================================================

const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProjectCreationFormData>({
    name: '',
    description: '',
    techStack: 'NODE_EXPRESS',
    visibility: 'PRIVATE',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProjectCreationFormData, string>>>({});

  const handleInputChange = useCallback((field: keyof ProjectCreationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (prev[field]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = projectCreationSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof ProjectCreationFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectCreationFormData;
        if (field) errors[field] = err.message;
      });
      setFormErrors(errors);
      addToast('Please correct the validation errors below.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToast('Project initialized successfully with architectural mapping.', 'success');
      navigate(APP_ROUTES.projects);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to provision project architecture.';
      addToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // ملاحظة: تم إزالة MainLayout هنا لأن الهيكل العام (AppShell / Layout) يحيط بالصفحة تلقائياً
    <div className="space-y-6 pb-12 select-none w-full max-w-4xl mx-auto">
      
      {/* Navigation Header / Back Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.projects)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Vector Context Active</span>
        </div>
      </div>

      {/* Main Content Card Container */}
      <ErrorBoundary fallbackMessage="Project onboarding module encountered an unexpected error.">
        <GlassCard variant="default" padding="lg" className="border-border/60 bg-card/40 backdrop-blur-xl shadow-xl">
          <div className="space-y-6">
            
            {/* Header Title Section */}
            <div className="border-b border-border/40 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Create Intelligent Project</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure your backend workspace, select core engine frameworks, and prepare RAG ingestion pipelines.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Project Name Field */}
              <div className="space-y-2">
                <label htmlFor="projectName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Identifier / Name <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <input
                    id="projectName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g. enterprise-core-service"
                    aria-invalid={Boolean(formErrors.name)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/50 border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                      formErrors.name
                        ? 'border-destructive focus:ring-destructive/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-xs text-destructive font-medium mt-1 animate-fadeIn">{formErrors.name}</p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label htmlFor="projectDescription" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Architectural Summary / Description
                </label>
                <textarea
                  id="projectDescription"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Briefly describe system boundaries, database layers, or integration vectors..."
                  className={`w-full p-3.5 rounded-xl bg-background/50 border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all resize-none ${
                    formErrors.description
                      ? 'border-destructive focus:ring-destructive/20'
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                />
                {formErrors.description && (
                  <p className="text-xs text-destructive font-medium mt-1 animate-fadeIn">{formErrors.description}</p>
                )}
              </div>

              {/* Tech Stack Matrix Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Runtime / Framework Stack <span className="text-primary">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'NODE_EXPRESS', label: 'Node.js / Express / TS', icon: Cpu, desc: 'Layered architecture & robust middleware' },
                    { id: 'NEXTJS_TS', label: 'Next.js App Router / React', icon: Database, desc: 'Full-stack modern unified workspace' },
                    { id: 'PYTHON_FASTAPI', label: 'Python / FastAPI / AI', icon: Cpu, desc: 'High-performance vector and async agents' },
                    { id: 'GO_MICROSERVICES', label: 'Go / Microservices', icon: Terminal, desc: 'Ultra-low latency compiled backend' },
                  ].map((stack) => {
                    const Icon = stack.icon;
                    const isSelected = formData.techStack === stack.id;
                    return (
                      <div
                        key={stack.id}
                        onClick={() => handleInputChange('techStack', stack.id as ProjectCreationFormData['techStack'])}
                        className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/30'
                            : 'bg-background/30 border-border/60 hover:border-border hover:bg-background/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mt-0.5 transition-colors ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground group-hover:text-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{stack.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stack.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {formErrors.techStack && (
                  <p className="text-xs text-destructive font-medium mt-1 animate-fadeIn">{formErrors.techStack}</p>
                )}
              </div>

              {/* Submit Actions Footer */}
              <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(APP_ROUTES.projects)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing Workspace...</span>
                    </>
                  ) : (
                    <span>Create Project</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </GlassCard>
      </ErrorBoundary>

    </div>
  );
};

export default React.memo(NewProjectPage);