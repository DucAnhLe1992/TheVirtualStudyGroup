import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  Trash2,
  Search,
  UserPlus,
} from "lucide-react";
import type { Profile, Connection, ConnectionStatus } from "../../lib/types";

type ConnectionWithProfiles = Connection & {
  requester?: Profile;
  recipient?: Profile;
};

type UserWithConnectionStatus = Profile & {
  connection_status: ConnectionStatus;
  connection_id?: string;
};

export function ConnectionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "connections" | "pending" | "find"
  >("connections");
  const [connections, setConnections] = useState<ConnectionWithProfiles[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    ConnectionWithProfiles[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    UserWithConnectionStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Load accepted connections
    const { data: acceptedConnections } = await supabase
      .from("user_connections")
      .select(
        "*, requester:profiles!requester_id(*), recipient:profiles!recipient_id(*)"
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (acceptedConnections) {
      setConnections(acceptedConnections as ConnectionWithProfiles[]);
    }

    // Load pending requests (received only)
    const { data: pending } = await supabase
      .from("user_connections")
      .select("*, requester:profiles!requester_id(*)")
      .eq("status", "pending")
      .eq("recipient_id", user.id);

    if (pending) {
      setPendingRequests(pending as ConnectionWithProfiles[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleAcceptRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("user_connections")
      // @ts-expect-error - Supabase update types not properly inferred
      .update({ status: "accepted" })
      .eq("id", connectionId);

    if (!error) {
      loadConnections();
    }
    setActionLoading(null);
  };

  const handleRejectRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("user_connections")
      .delete()
      .eq("id", connectionId);

    if (!error) {
      loadConnections();
    }
    setActionLoading(null);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm("Remove this connection?")) return;

    setActionLoading(connectionId);
    const { error } = await supabase
      .from("user_connections")
      .delete()
      .eq("id", connectionId);

    if (!error) {
      loadConnections();
    }
    setActionLoading(null);
  };

  const getOtherUser = (connection: ConnectionWithProfiles): Profile => {
    return connection.requester_id === user?.id
      ? connection.recipient!
      : connection.requester!;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setSearchLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq("id", user.id)
      .limit(20);
    const profilesList = profiles as Profile[] | null;

    if (profilesList) {
      const userIds = profilesList.map((p) => p.id);

      const { data: existingConnections } = await supabase
        .from("user_connections")
        .select("*")
        .or(
          `requester_id.in.(${userIds.join(
            ","
          )}),recipient_id.in.(${userIds.join(",")})`
        );
      const connectionsList = existingConnections as Connection[] | null;

      const resultsWithStatus: UserWithConnectionStatus[] = profilesList.map(
        (profile) => {
          const connection = connectionsList?.find(
            (c) =>
              (c.requester_id === user.id && c.recipient_id === profile.id) ||
              (c.recipient_id === user.id && c.requester_id === profile.id)
          );

          let status: ConnectionStatus = "none";
          if (connection) {
            if (connection.status === "accepted") {
              status = "connected";
            } else if (connection.status === "pending") {
              status =
                connection.requester_id === user.id
                  ? "pending_sent"
                  : "pending_received";
            }
          }

          return {
            ...profile,
            connection_status: status,
            connection_id: connection?.id,
          };
        }
      );

      setSearchResults(resultsWithStatus);
    }

    setSearchLoading(false);
  };

  const handleSendRequest = async (userId: string) => {
    if (!user) return;

    setActionLoading(userId);
    const { error } = await supabase
      .from("user_connections")
      // @ts-expect-error - Supabase insert types not properly inferred
      .insert({
        requester_id: user.id,
        recipient_id: userId,
        status: "pending",
      });

    if (!error) {
      handleSearch();
      loadConnections();
    }
    setActionLoading(null);
  };

  const handleAcceptFromSearch = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("user_connections")
      // @ts-expect-error - Supabase update types not properly inferred
      .update({ status: "accepted" })
      .eq("id", connectionId);

    if (!error) {
      handleSearch();
      loadConnections();
    }
    setActionLoading(null);
  };

  const handleRejectFromSearch = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("user_connections")
      .delete()
      .eq("id", connectionId);

    if (!error) {
      handleSearch();
      loadConnections();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Connections
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your friend connections and requests
        </p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("connections")}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === "connections"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Connections ({connections.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === "pending"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Requests ({pendingRequests.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("find")}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === "find"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Friends
          </div>
        </button>
      </div>

      {activeTab === "connections" && (
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No connections yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Search for users to connect with
              </p>
            </div>
          ) : (
            connections.map((connection) => {
              const otherUser = getOtherUser(connection);
              return (
                <div
                  key={connection.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {otherUser.full_name || otherUser.email}
                      </h3>
                      {otherUser.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {otherUser.bio}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Connected{" "}
                        {new Date(connection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        /* Navigate to DM */
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={() => handleRemoveConnection(connection.id)}
                      disabled={actionLoading === connection.id}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "find" && (
        <div>
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="space-y-4">
            {searchResults.length === 0 && !searchLoading && searchQuery && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No users found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try a different search term
                </p>
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {profile.bio}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div>
                  {profile.connection_status === "none" && (
                    <button
                      onClick={() => handleSendRequest(profile.id)}
                      disabled={actionLoading === profile.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Connect
                    </button>
                  )}

                  {profile.connection_status === "pending_sent" && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                      <Clock className="w-4 h-4" />
                      Request Sent
                    </div>
                  )}

                  {profile.connection_status === "pending_received" &&
                    profile.connection_id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleAcceptFromSearch(profile.connection_id!)
                          }
                          disabled={actionLoading === profile.connection_id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            handleRejectFromSearch(profile.connection_id!)
                          }
                          disabled={actionLoading === profile.connection_id}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                  {profile.connection_status === "connected" && (
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
      )}

      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No pending requests
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You're all caught up!
              </p>
            </div>
          ) : (
            pendingRequests.map((request) => {
              const requester = request.requester!;
              return (
                <div
                  key={request.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {requester.full_name || requester.email}
                      </h3>
                      {requester.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {requester.bio}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Requested{" "}
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
