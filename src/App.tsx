import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MainLayout } from './components/layout/MainLayout';
import { PostPage } from './pages/PostPage';
import { GroupPage } from './pages/GroupPage';
import { SessionLobbyPage } from './pages/SessionLobbyPage';
import { DiscussionPage } from './pages/DiscussionPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/posts" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/discussions" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/quizzes" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      <Route path="/connections" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      
      {/* Dedicated pages */}
      <Route path="/posts/:postId" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
      <Route path="/discussions/:discussionId" element={<ProtectedRoute><DiscussionPage /></ProtectedRoute>} />
      <Route path="/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
      <Route path="/sessions/:sessionId/lobby" element={<ProtectedRoute><SessionLobbyPage /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
