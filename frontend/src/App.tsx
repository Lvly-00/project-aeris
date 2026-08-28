import { AuthProvider, useAuth } from './shared/hooks/useAuth';
import AppRouter  from './router';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { ErrorBoundary } from '../src/desktop/components/common/ErrorBoundary';
import AgreementModal from './shared/components/AgreementModal';
import { authAPI } from './shared/services/api';

function WebSocketInit() {
  const { isAuthenticated } = useAuth();
  useWebSocket(isAuthenticated);
  return null;
}

function AgreementGate() {
  const { user, setUser, logout } = useAuth();
  const needsAgreement = !!user && !user.agreement_accepted;

  const handleAgree = async () => {
    const res = await authAPI.acceptAgreement();
    setUser(res.data);
  };

  return (
    <AgreementModal
      opened={needsAgreement}
      onAgree={handleAgree}
      onDecline={() => {
        logout();
      }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebSocketInit />
        <AgreementGate />
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
