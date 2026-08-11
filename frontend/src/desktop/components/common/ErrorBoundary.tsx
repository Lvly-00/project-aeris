import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Title, Text, Button, Code } from '@mantine/core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches unhandled render errors in the component tree.
 * Wrap the router or individual page sections to prevent a single crash
 * from taking down the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <AppRouter />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            gap: 16,
          }}
        >
          <Title order={2} c="red">Something went wrong</Title>
          <Text c="dimmed" ta="center" maw={480}>
            An unexpected error occurred. You can try reloading the page or
            resetting this section.
          </Text>
          {this.state.error && (
            <Code block style={{ maxWidth: 560, fontSize: 12, opacity: 0.8 }}>
              {this.state.error.message}
            </Code>
          )}
          <Button onClick={this.handleReset} variant="light">
            Reset
          </Button>
          <Button variant="subtle" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
