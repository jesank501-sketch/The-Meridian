import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let displayDetail = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string; path?: string };
        if (parsed.error) {
          displayDetail = `${parsed.error}${parsed.path ? ` (${parsed.operationType} on ${parsed.path})` : ''}`;
        }
      } catch {
        // plain text error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-8">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-semibold font-editorial-heading">Something went wrong</h1>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-6 break-words">
              {displayDetail}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Front Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
