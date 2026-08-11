import { AuthProvider, useAuth } from './shared/hooks/useAuth';
import AppRouter  from './router';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { ErrorBoundary } from '../src/desktop/components/common/ErrorBoundary';

function WebSocketInit() {
  const { isAuthenticated } = useAuth();
  useWebSocket(isAuthenticated);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebSocketInit />
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
