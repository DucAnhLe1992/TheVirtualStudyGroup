import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { EnhancedGroupDetailView } from '../components/groups/EnhancedGroupDetailView';

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!groupId) {
    navigate('/groups');
    return null;
  }

  const handleClose = () => {
    navigate('/groups', { state: { noRefresh: true } });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        <Sidebar
          activeTab="groups"
          onTabChange={(tab) => {
            navigate(`/${tab}`);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6">
          <EnhancedGroupDetailView
            groupId={groupId}
            onClose={handleClose}
            onUpdate={() => {}}
          />
        </main>
      </div>
    </div>
  );
}
