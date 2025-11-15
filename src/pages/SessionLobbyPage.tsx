import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { SessionLobby } from '../components/sessions/SessionLobby';
import { ArrowLeft } from 'lucide-react';

export function SessionLobbyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!sessionId) {
    navigate('/sessions');
    return null;
  }

  const handleBackToSessions = () => {
    navigate('/sessions');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        <Sidebar
          activeTab="sessions"
          onTabChange={(tab) => {
            navigate(`/${tab}`);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4">
            <button
              onClick={handleBackToSessions}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Sessions</span>
            </button>
          </div>
          <SessionLobby sessionId={sessionId} />
        </main>
      </div>
    </div>
  );
}
