import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Users,
  MessageSquare,
  FileText,
  Trophy,
  Calendar,
  Edit2,
  Trash2,
  LogOut,
  Crown,
  Send,
  Upload,
  Plus,
  BookOpen,
} from 'lucide-react';
import { EditGroupModal } from './EditGroupModal';
import { CreateSessionModal } from '../sessions/CreateSessionModal';
import { UploadResourceModal } from '../resources/UploadResourceModal';
import { CreateQuizModal } from '../quizzes/CreateQuizModal';
import { CreatePostModal } from '../posts/CreatePostModal';
import { PostCard } from '../posts/PostCard';
import { PostDetailView } from '../posts/PostDetailView';
import type { StudyGroup, GroupMembership, Message, Resource, Quiz, StudySession, Profile, Post } from '../../lib/types';

interface EnhancedGroupDetailViewProps {
  groupId: string;
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'overview' | 'posts' | 'chat' | 'resources' | 'quizzes' | 'sessions';

export function EnhancedGroupDetailView({ groupId, onClose, onUpdate }: EnhancedGroupDetailViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<(GroupMembership & { profile: Profile })[]>([]);
  const [messages, setMessages] = useState<(Message & { profile: Profile })[]>([]);
  const [resources, setResources] = useState<(Resource & { uploader: Profile })[]>([]);
  const [quizzes, setQuizzes] = useState<(Quiz & { creator: Profile })[]>([]);
  const [sessions, setSessions] = useState<(StudySession & { creator: Profile })[]>([]);
  const [posts, setPosts] = useState<(Post & { author: Profile; comment_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadGroupDetails();
    subscribeToMessages();
  }, [groupId]);

  const loadGroupDetails = async () => {
    const [groupRes, membersRes, roleRes] = await Promise.all([
      supabase.from('study_groups').select('*').eq('id', groupId).maybeSingle(),
      supabase
        .from('group_memberships')
        .select('*, profile:profiles(*)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .maybeSingle(),
    ]);

    if (groupRes.data) setGroup(groupRes.data);
    if (membersRes.data) setMembers(membersRes.data as any);
    if (roleRes.data) setUserRole(roleRes.data.role);

    loadMessages();
    loadResources();
    loadQuizzes();
    loadSessions();
    loadPosts();

    setLoading(false);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data as any);
  };

  const loadResources = async () => {
    const { data } = await supabase
      .from('resources')
      .select('*, uploader:profiles(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) setResources(data as any);
  };

  const loadQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*, creator:profiles(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) setQuizzes(data as any);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('study_sessions')
      .select('*, creator:profiles(*)')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: false });

    if (data) setSessions(data as any);
  };

  const loadPosts = async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .eq('group_id', groupId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsData) {
      const postsWithCounts = await Promise.all(
        postsData.map(async (post: any) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          return { ...post, comment_count: count || 0 };
        })
      );
      setPosts(postsWithCounts);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      user_id: user.id,
      content: messageText.trim(),
    });

    if (!error) {
      setMessageText('');
    }
    setSending(false);
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    const { error } = await supabase.from('study_groups').delete().eq('id', groupId);

    if (!error) {
      onUpdate();
      onClose();
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user?.id);

    if (!error) {
      onUpdate();
      onClose();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the group?')) return;

    const { error } = await supabase.from('group_memberships').delete().eq('id', memberId);

    if (!error) {
      loadGroupDetails();
    }
  };

  if (loading || !group) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';
  const isCreator = group.created_by === user?.id;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Users },
    { id: 'posts' as const, label: 'Posts', icon: BookOpen },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'resources' as const, label: 'Resources', icon: FileText },
    { id: 'quizzes' as const, label: 'Quizzes', icon: Trophy },
    { id: 'sessions' as const, label: 'Sessions', icon: Calendar },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h2>
            {group.subject && (
              <span className="inline-block mt-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                {group.subject}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-medium'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <p className="text-gray-900 dark:text-white">{group.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Visibility</h3>
                  <p className="text-gray-900 dark:text-white">{group.is_public ? 'Public' : 'Private'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Max Members</h3>
                  <p className="text-gray-900 dark:text-white">{group.max_members}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5" />
                  Members ({members.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.profile?.full_name || member.profile?.email || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                            {member.role === 'admin' && (
                              <span className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                <Crown className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAdmin && member.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Group Posts</h3>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Post
                </button>
              </div>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post as any}
                    onClick={() => setSelectedPostId(post.id)}
                  />
                ))}
                {posts.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No posts yet. Be the first to share something!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {message.profile?.full_name || message.profile?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">{message.content}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shared Resources</h3>
                <button
                  onClick={() => setShowResourceModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Resource
                </button>
              </div>
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div key={resource.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white">{resource.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{resource.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        By {resource.uploader?.full_name || 'Unknown'} • {new Date(resource.created_at).toLocaleDateString()}
                      </span>
                      <a
                        href={resource.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
                {resources.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No resources shared yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Group Quizzes</h3>
                <button
                  onClick={() => setShowQuizModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Quiz
                </button>
              </div>
              <div className="space-y-2">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white">{quiz.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{quiz.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        By {quiz.creator?.full_name || 'Unknown'} • {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'No time limit'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${quiz.is_active ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
                {quizzes.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No quizzes created yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Study Sessions</h3>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Schedule Session
                </button>
              </div>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white">{session.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{session.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(session.scheduled_at).toLocaleString()} • {session.duration_minutes} min
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        session.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                        session.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                        session.status === 'completed' ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400' :
                        'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No sessions scheduled yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {isCreator && (
                <button
                  onClick={handleDeleteGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </>
          )}
          {!isCreator && (
            <button
              onClick={handleLeaveGroup}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {showEditModal && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadGroupDetails();
            onUpdate();
          }}
        />
      )}

      {showSessionModal && (
        <CreateSessionModal
          groupId={groupId}
          onClose={() => setShowSessionModal(false)}
          onSuccess={() => {
            setShowSessionModal(false);
            loadSessions();
          }}
        />
      )}

      {showResourceModal && (
        <UploadResourceModal
          groupId={groupId}
          onClose={() => setShowResourceModal(false)}
          onSuccess={() => {
            setShowResourceModal(false);
            loadResources();
          }}
        />
      )}

      {showQuizModal && (
        <CreateQuizModal
          groupId={groupId}
          onClose={() => setShowQuizModal(false)}
          onSuccess={() => {
            setShowQuizModal(false);
            loadQuizzes();
          }}
        />
      )}

      {showPostModal && (
        <CreatePostModal
          groupId={groupId}
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false);
            loadPosts();
          }}
        />
      )}

      {selectedPostId && (
        <PostDetailView
          postId={selectedPostId}
          groupId={groupId}
          onClose={() => setSelectedPostId(null)}
          onUpdate={loadPosts}
        />
      )}
    </div>
  );
}
