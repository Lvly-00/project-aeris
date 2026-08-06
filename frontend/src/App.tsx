import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppRouter } from './router';
import { useWebSocket } from './hooks/useWebSocket';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
