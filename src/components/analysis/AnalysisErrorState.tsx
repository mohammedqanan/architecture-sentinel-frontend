/**
 * Error fallback for the analysis detail page.
 * Maps HTTP status codes to specific, user-actionable messages.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface AnalysisErrorStateProps {
  statusCode?: number;
  message?: string | null;
  onRetry?: () => void;
  onBack: () => void;
}

function describe(statusCode: number | undefined): string {
  switch (statusCode) {
    case 403:
      return "You don't have access to this analysis.";
    case 404:
      return 'Analysis not found. It may have been deleted.';
    case 500:
    case 502:
    case 503:
      return 'The server is having trouble. Please retry in a moment.';
    default:
      return 'Something went wrong while loading the analysis.';
  }
}

const AnalysisErrorState: React.FC<AnalysisErrorStateProps> = ({
  statusCode,
  message,
  onRetry,
  onBack,
}) => {
  const description = message || describe(statusCode);

  return (
    <GlassCard variant="elevated" padding="lg" className="text-center max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <h1 className="text-xl font-semibold text-white">Unable to load analysis</h1>
        <p className="text-sm text-gray-400" role="alert">
          {description}
        </p>
        <div className="flex gap-3 mt-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary hover:bg-primary/30 transition focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Back
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(AnalysisErrorState);