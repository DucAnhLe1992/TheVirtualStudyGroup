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
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Mail,
} from 'lucide-react';
import { EditGroupModal } from './EditGroupModal';
import type { StudyGroup, GroupMembership, Profile } from '../../lib/types';

interface EnhancedGroupDetailModalProps {
  groupId: string;
  onClose: () => void;
  onUpdate: () => void;
  onNavigate: (tab: string) => void;
}

type JoinRequest = {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  user: Profile;
};

type TabType = 'overview' | 'members' | 'requests' | 'invitations';

export function EnhancedGroupDetailModal({ groupId, onClose, onUpdate, onNavigate }: EnhancedGroupDetailModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<(GroupMembership & { profile: Profile })[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [stats, setStats] = useState({
    posts: 0,
    messages: 0,
    resources: 0,
    quizzes: 0,
    sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [searchEmail, setSearchEmail] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  const loadGroupDetails = async () => {
    const [groupRes, membersRes, roleRes, requestsRes] = await Promise.all([
      supabase.from('study_groups').select('*').eq('id', groupId).maybeSingle(),
      supabase
        .from('group_memberships')
        .select('*, profile:profiles(*)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true}),
      supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .maybeSingle(),
      supabase
        .from('group_join_requests')
        .select('*, user:profiles!user_id(*)')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (groupRes.data) setGroup(groupRes.data);
    if (membersRes.data) setMembers(membersRes.data as any);
    if (roleRes.data) setUserRole(roleRes.data.role);
    if (requestsRes.data) setJoinRequests(requestsRes.data as any);

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

  const handleApproveRequest = async (requestId: string) => {
    setActionLoading(requestId);
    const { error } = await supabase
      .from('group_join_requests')
      .update({ status: 'approved', reviewed_by: user?.id })
      .eq('id', requestId);

    if (!error) {
      loadGroupDetails();
    }
    setActionLoading(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionLoading(requestId);
    const { error } = await supabase
      .from('group_join_requests')
      .update({ status: 'rejected', reviewed_by: user?.id })
      .eq('id', requestId);

    if (!error) {
      loadGroupDetails();
    }
    setActionLoading(null);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim() || !user) return;

    setActionLoading('invite');

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', searchEmail.trim())
      .maybeSingle();

    if (!profile) {
      alert('User not found');
      setActionLoading(null);
      return;
    }

    // Check if already member
    const { data: existing } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      alert('User is already a member');
      setActionLoading(null);
      return;
    }

    // Create invitation
    const { error } = await supabase.from('group_invitations').insert({
      group_id: groupId,
      invited_by: user.id,
      invited_user_id: profile.id,
    });

    if (!error) {
      setSearchEmail('');
      alert('Invitation sent!');
    }
    setActionLoading(null);
  };

  const handlePromoteMember = async (membershipId: string) => {
    setActionLoading(membershipId);
    const { error } = await supabase
      .from('group_memberships')
      .update({ role: 'admin' })
      .eq('id', membershipId);

    if (!error) {
      loadGroupDetails();
    }
    setActionLoading(null);
  };

  const handleDemoteMember = async (membershipId: string) => {
    setActionLoading(membershipId);
    const { error } = await supabase
      .from('group_memberships')
      .update({ role: 'member' })
      .eq('id', membershipId);

    if (!error) {
      loadGroupDetails();
    }
    setActionLoading(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the group?')) return;

    setActionLoading(memberId);
    const { error } = await supabase.from('group_memberships').delete().eq('id', memberId);

    if (!error) {
      loadGroupDetails();
    }
    setActionLoading(null);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full my-8 transition-colors">
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

        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Members ({members.length})
          </button>
          {isAdmin && !group.is_public && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Join Requests
              {joinRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-full">
                  {joinRequests.length}
                </span>
              )}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Invite Members
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <>
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
            </>
          )}

          {activeTab === 'members' && (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
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
                    <div className="flex gap-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handlePromoteMember(member.id)}
                          disabled={actionLoading === member.id}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                          title="Promote to Admin"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDemoteMember(member.id)}
                          disabled={actionLoading === member.id}
                          className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded disabled:opacity-50"
                          title="Demote to Member"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={actionLoading === member.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {joinRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p>No pending join requests</p>
                </div>
              ) : (
                joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.user.full_name || request.user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.message && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-600 rounded">
                            "{request.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="p-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div>
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invite by Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="Enter user's email..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading === 'invite' || !searchEmail.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail className="w-5 h-5" />
                      Send Invite
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Invitations are valid for 7 days
                  </p>
                </div>
              </form>
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
