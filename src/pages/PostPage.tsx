import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { PostDetailView } from '../components/posts/PostDetailView';

export function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!postId) {
    navigate('/posts');
    return null;
  }

  const handleClose = () => {
    navigate('/posts');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        <Sidebar
          activeTab="posts"
          onTabChange={(tab) => {
            navigate(`/${tab}`);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6">
          <PostDetailView
            postId={postId}
            groupId=""
            onClose={handleClose}
            onUpdate={() => {}}
          />
        </main>
      </div>
    </div>
  );
}
