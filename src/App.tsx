import { Garden } from './components/garden/Garden';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth, AuthProvider } from './providers/AuthProvider';
import { useGardenSync } from '@/hooks/useGardenSync';
import { useGardenLogic } from '@/hooks/useGardenLogic';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function AppContent() {
  const { session, loading } = useAuth();
  
  // Activate sync and logic
  useGardenSync();
  useGardenLogic();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="relative">
          <div className="w-16 h-16 border-t-2 border-gold rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={session ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route 
        path="/" 
        element={session ? <Garden /> : <Navigate to="/login" replace />} 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
