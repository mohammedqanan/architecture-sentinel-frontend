'use client';

import React, { Component, ErrorInfo } from 'react';
import { GlassCard } from './glass-card';
import { IS_DEV } from '@/constants';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, componentStack: string) => void;
  resetKeys?: Array<unknown>;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const defaultFallbackMessage = 'Something went wrong. Please try again.';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack ?? '');
    } else {
      if (IS_DEV) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.props.resetKeys && this.state.hasError) {
      const prevKeys = prevProps.resetKeys ?? [];
      const currentKeys = this.props.resetKeys ?? [];
      if (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some((key, i) => key !== currentKeys[i])
      ) {
        this.resetError();
      }
    }
  }

  resetError(): void {
    this.setState({ hasError: false, error: null });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { fallback, fallbackMessage = defaultFallbackMessage } = this.props;
      const error = this.state.error;

      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error as Error, this.resetError);
        }
        return fallback;
      }

      return (
        <GlassCard
          variant="glow"
          padding="lg"
          className="max-w-md mx-auto my-8 text-center"
          role="alert"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl text-primary">⚠️</div>
            <h2 className="text-xl font-bold text-white">Oops! Something went wrong</h2>
            <p className="text-gray-400">{fallbackMessage}</p>

            {IS_DEV && error && (
              <details className="w-full mt-2 text-left text-sm text-gray-500">
                <summary>Error details</summary>
                <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto max-h-40">
                  {error.stack || error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.resetError}
              className="mt-4 px-6 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Try Again
            </button>
          </div>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;