import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { GroupsList } from '../groups/GroupsList';
import { SessionsList } from '../sessions/SessionsList';
import { MessagesPage } from '../messages/MessagesPage';
import { ResourcesList } from '../resources/ResourcesList';
import { QuizzesList } from '../quizzes/QuizzesList';
import { ProfilePage } from '../profile/ProfilePage';
import { AchievementsPage } from '../achievements/AchievementsPage';
import { PostsPage } from '../posts/PostsPage';
import { ConnectionsPage } from '../connections/ConnectionsPage';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'groups':
        return <GroupsList onNavigate={setActiveTab} />;
      case 'posts':
        return <PostsPage />;
      case 'connections':
        return <ConnectionsPage />;
      case 'sessions':
        return <SessionsList />;
      case 'messages':
        return <MessagesPage />;
      case 'resources':
        return <ResourcesList />;
      case 'quizzes':
        return <QuizzesList />;
      case 'achievements':
        return <AchievementsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
