import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Send, Users, MessageCircle } from "lucide-react";
import type { Connection, Profile } from "../../lib/types";

type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type Conversation = {
  user: Profile;
  last_message?: DirectMessage;
  unread_count: number;
};

type ConnectionWithProfiles = Connection & {
  requester: Profile;
  recipient: Profile;
};

export function DirectMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<
    (DirectMessage & { sender: Profile })[]
  >([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    // Get all accepted connections
    const { data: connections } = await supabase
      .from("user_connections")
      .select(
        "*, requester:profiles!requester_id(*), recipient:profiles!recipient_id(*)"
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (connections) {
      const conversationsData: Conversation[] = await Promise.all(
        (connections as ConnectionWithProfiles[]).map(async (conn) => {
          const otherUser =
            conn.requester_id === user.id ? conn.recipient : conn.requester;

          // Get last message
          const { data: lastMsg } = await supabase
            .from("direct_messages")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},recipient_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},recipient_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages
          const { count } = await supabase
            .from("direct_messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", otherUser.id)
            .eq("recipient_id", user.id)
            .eq("read", false);

          return {
            user: otherUser,
            last_message: (lastMsg as DirectMessage | null) || undefined,
            unread_count: count || 0,
          };
        })
      );

      // Sort by last message time
      conversationsData.sort((a, b) => {
        const aTime = a.last_message?.created_at || "0";
        const bTime = b.last_message?.created_at || "0";
        return bTime.localeCompare(aTime);
      });

      setConversations(conversationsData);
    }

    setLoading(false);
  }, [user]);

  const loadMessages = useCallback(
    async (otherUserId: string) => {
      if (!user) return;

      const { data } = await supabase
        .from("direct_messages")
        .select("*, sender:profiles!sender_id(*)")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (data) {
        setMessages((data as (DirectMessage & { sender: Profile })[]) || []);

        // Mark messages as read
        await supabase
          .from("direct_messages")
          // @ts-expect-error - Supabase update types not properly inferred
          .update({ read: true })
          .eq("sender_id", otherUserId)
          .eq("recipient_id", user.id)
          .eq("read", false);

        loadConversations();
      }
    },
    [user, loadConversations]
  );

  const subscribeToMessages = useCallback(
    (otherUserId: string) => {
      const channel = supabase
        .channel(`dm-${user?.id}-${otherUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
          },
          (payload) => {
            const newMsg = payload.new as DirectMessage;
            if (
              (newMsg.sender_id === user?.id &&
                newMsg.recipient_id === otherUserId) ||
              (newMsg.sender_id === otherUserId &&
                newMsg.recipient_id === user?.id)
            ) {
              loadMessages(otherUserId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [user?.id, loadMessages]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedUser) return;
    const cleanup = subscribeToMessages(selectedUser.id);
    loadMessages(selectedUser.id);
    return cleanup;
  }, [selectedUser, subscribeToMessages, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !selectedUser) return;

    setSending(true);

    // @ts-expect-error - Supabase insert types not properly inferred
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      recipient_id: selectedUser.id,
      content: messageText.trim(),
    });

    if (!error) {
      setMessageText("");
      loadMessages(selectedUser.id);
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)]">
      <div className="flex gap-4 h-full">
        {/* Conversations List */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Conversations
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No conversations yet. Connect with someone to start messaging!
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.user.id}
                  onClick={() => setSelectedUser(conv.user)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedUser?.id === conv.user.id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {conv.user.full_name || conv.user.email}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {selectedUser.full_name || selectedUser.email}
                    </h2>
                    {selectedUser.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUser.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn
                              ? "text-blue-100"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex gap-2">
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
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
