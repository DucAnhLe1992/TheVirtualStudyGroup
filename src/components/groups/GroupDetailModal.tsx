import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Users,
  Edit2,
  Trash2,
  LogOut,
  Crown,
  BookOpen,
  MessageSquare,
  FileText,
  Trophy,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { EditGroupModal } from './EditGroupModal';
import type { StudyGroup, GroupMembership, Profile } from '../../lib/types';

interface GroupDetailModalProps {
  groupId: string;
  onClose: () => void;
  onUpdate: () => void;
  onNavigate: (tab: string) => void;
}

export function GroupDetailModal({ groupId, onClose, onUpdate, onNavigate }: GroupDetailModalProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<(GroupMembership & { profile: Profile })[]>([]);
  const [stats, setStats] = useState({
    posts: 0,
    messages: 0,
    resources: 0,
    quizzes: 0,
    sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadGroupDetails();
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

    // Load stats
    const [postsCount, messagesCount, resourcesCount, quizzesCount, sessionsCount] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      supabase.from('resources').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      supabase.from('study_sessions').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
    ]);

    setStats({
      posts: postsCount.count || 0,
      messages: messagesCount.count || 0,
      resources: resourcesCount.count || 0,
      quizzes: quizzesCount.count || 0,
      sessions: sessionsCount.count || 0,
    });

    setLoading(false);
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

  const handleNavigateToFeature = (feature: string) => {
    onNavigate(feature);
    onClose();
  };

  if (loading || !group) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';
  const isCreator = group.created_by === user?.id;

  const features = [
    { id: 'posts', label: 'Posts', icon: BookOpen, count: stats.posts, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: stats.messages, color: 'text-green-600 dark:text-green-400' },
    { id: 'resources', label: 'Resources', icon: FileText, count: stats.resources, color: 'text-purple-600 dark:text-purple-400' },
    { id: 'quizzes', label: 'Quizzes', icon: Trophy, count: stats.quizzes, color: 'text-yellow-600 dark:text-yellow-400' },
    { id: 'sessions', label: 'Sessions', icon: Calendar, count: stats.sessions, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8 transition-colors">
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

        <div className="p-6 space-y-6">
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
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Members</h3>
              <p className="text-gray-900 dark:text-white">{members.length} / {group.max_members}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Group Content</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.id}
                    onClick={() => handleNavigateToFeature(feature.id)}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${feature.color}`} />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">{feature.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {feature.count} {feature.count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members ({members.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
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

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Group
              </button>
              {isCreator && (
                <button
                  onClick={handleDeleteGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
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
              Leave Group
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
    </div>
  );
}
