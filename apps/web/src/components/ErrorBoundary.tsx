import { Component, ErrorInfo, ReactNode } from 'react';
import { trackEvent } from '../utils/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    trackEvent('error:boundary', {
      error_message: error.message,
      error_name: error.name,
      component_stack: errorInfo.componentStack?.substring(0, 500),
    });

    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
