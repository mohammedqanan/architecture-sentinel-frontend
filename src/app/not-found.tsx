/**
 * src/app/not-found.tsx
 * ════════════════════════════════════════════════════════════
 * Explicit 404 page — replaces the silent redirect-to-home
 * fallback that masked routing errors.
 *
 * @module NotFoundPage
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { APP_ROUTES } from '@/constants';
import { GlassCard } from '@/components/ui/glass-card';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080C14] px-4">
      <GlassCard
        variant="elevated"
        padding="xl"
        className="max-w-lg w-full text-center space-y-6"
      >
        <div className="text-7xl font-bold text-primary tracking-tight">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">
            Page not found
          </h1>
          <p className="text-sm text-gray-400">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <Link
            to={APP_ROUTES.home}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-sm text-primary hover:bg-primary/30 transition"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </GlassCard>
    </div>
  );
};

export default React.memo(NotFoundPage);