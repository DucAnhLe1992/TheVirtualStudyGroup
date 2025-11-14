import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, UserPlus, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Profile } from '../../lib/types';

type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

type UserWithConnectionStatus = Profile & {
  connection_status: ConnectionStatus;
  connection_id?: string;
};

export function UserSearchPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithConnectionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);

    // Search for users by name or email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .limit(20);

    if (profiles) {
      // Get connection statuses
      const userIds = profiles.map(p => p.id);

      const { data: connections } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.in.(${userIds.join(',')}),recipient_id.in.(${userIds.join(',')})`);

      const resultsWithStatus: UserWithConnectionStatus[] = profiles.map(profile => {
        const connection = connections?.find(
          c => (c.requester_id === user.id && c.recipient_id === profile.id) ||
               (c.recipient_id === user.id && c.requester_id === profile.id)
        );

        let status: ConnectionStatus = 'none';
        if (connection) {
          if (connection.status === 'accepted') {
            status = 'connected';
          } else if (connection.status === 'pending') {
            status = connection.requester_id === user.id ? 'pending_sent' : 'pending_received';
          }
        }

        return {
          ...profile,
          connection_status: status,
          connection_id: connection?.id,
        };
      });

      setSearchResults(resultsWithStatus);
    }

    setLoading(false);
  };

  const handleSendRequest = async (userId: string) => {
    if (!user) return;

    setActionLoading(userId);
    const { error } = await supabase.from('user_connections').insert({
      requester_id: user.id,
      recipient_id: userId,
      status: 'pending',
    });

    if (!error) {
      handleSearch();
    }
    setActionLoading(null);
  };

  const handleAcceptRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from('user_connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId);

    if (!error) {
      handleSearch();
    }
    setActionLoading(null);
  };

  const handleRejectRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from('user_connections')
      .delete()
      .eq('id', connectionId);

    if (!error) {
      handleSearch();
    }
    setActionLoading(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Find Students</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search for other students to connect with
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="space-y-4">
        {searchResults.length === 0 && !loading && searchQuery && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try a different search term</p>
          </div>
        )}

        {searchResults.map((profile) => (
          <div
            key={profile.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {profile.full_name || profile.email}
                </h3>
                {profile.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{profile.bio}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{profile.email}</p>
              </div>
            </div>

            <div>
              {profile.connection_status === 'none' && (
                <button
                  onClick={() => handleSendRequest(profile.id)}
                  disabled={actionLoading === profile.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              )}

              {profile.connection_status === 'pending_sent' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                  Request Sent
                </div>
              )}

              {profile.connection_status === 'pending_received' && profile.connection_id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(profile.connection_id!)}
                    disabled={actionLoading === profile.connection_id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(profile.connection_id!)}
                    disabled={actionLoading === profile.connection_id}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {profile.connection_status === 'connected' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
