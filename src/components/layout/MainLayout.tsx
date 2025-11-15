import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "../dashboard/Dashboard";
import { GroupsList } from "../groups/GroupsList";
import { SessionsList } from "../sessions/SessionsList";
import { MessagesPage } from "../messages/MessagesPage";
import { ResourcesList } from "../resources/ResourcesList";
import { QuizzesList } from "../quizzes/QuizzesList";
import { ProfilePage } from "../profile/ProfilePage";
import { AchievementsPage } from "../achievements/AchievementsPage";
import { PostsPage } from "../posts/PostsPage";
import { ConnectionsPage } from "../connections/ConnectionsPage";

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/groups')) return 'groups';
    if (path.startsWith('/posts')) return 'posts';
    if (path.startsWith('/sessions')) return 'sessions';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/resources')) return 'resources';
    if (path.startsWith('/quizzes')) return 'quizzes';
    if (path.startsWith('/achievements')) return 'achievements';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/connections')) return 'connections';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "groups":
        return <GroupsList onNavigate={(tab) => navigate(`/${tab}`)} />;
      case "posts":
        return <PostsPage />;
      case "connections":
        return <ConnectionsPage />;
      case "sessions":
        return <SessionsList />;
      case "messages":
        return <MessagesPage />;
      case "resources":
        return <ResourcesList />;
      case "quizzes":
        return <QuizzesList />;
      case "achievements":
        return <AchievementsPage />;
      case "profile":
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
            navigate(`/${tab}`);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
