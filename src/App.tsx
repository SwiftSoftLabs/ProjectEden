import { Garden } from './components/garden/Garden';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './providers/AuthProvider';
import { useGardenSync } from './hooks/useGardenSync';
import { Loader2 } from 'lucide-react';

function App() {
  const { session, loading } = useAuth();
  useGardenSync(); // Activate sync

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-void text-white">
      {session ? <Garden /> : <LoginPage />}
    </div>
  );
}

export default App;
