import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send, Reply, MoreVertical, Trash2 } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Group {
  id: string;
  name: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  reply_to: string | null;
  created_at: string;
  parent_message?: {
    id: string;
    content: string;
    user_id: string;
  };
}

export function MessagesList() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadGroups();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadMessages();
      setupRealtimeSubscription();
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedGroupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroups = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('group_memberships')
      .select('study_groups(id, name)')
      .eq('user_id', user.id);

    if (data) {
      const groupsData = data.map((m: any) => m.study_groups).filter(Boolean);
      setGroups(groupsData);
      if (groupsData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsData[0].id);
      }
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedGroupId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', selectedGroupId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      const messagesWithReplies = await Promise.all(
        data.map(async (msg) => {
          if (msg.reply_to) {
            const { data: parentMsg } = await supabase
              .from('messages')
              .select('id, content, user_id')
              .eq('id', msg.reply_to)
              .single();

            return { ...msg, parent_message: parentMsg };
          }
          return msg;
        })
      );

      setMessages(messagesWithReplies);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedGroupId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          if (newMsg.reply_to) {
            const { data: parentMsg } = await supabase
              .from('messages')
              .select('id, content, user_id')
              .eq('id', newMsg.reply_to)
              .single();

            setMessages((prev) => [...prev, { ...newMsg, parent_message: parentMsg || undefined }]);
          } else {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroupId || !user) return;

    setSending(true);

    const { error } = await supabase.from('messages').insert({
      content: newMessage.trim(),
      group_id: selectedGroupId,
      user_id: user.id,
      reply_to: replyTo?.id || null,
    });

    if (!error) {
      setNewMessage('');
      setReplyTo(null);
    }

    setSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    await supabase.from('messages').delete().eq('id', messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No groups yet</h3>
        <p className="text-gray-600 dark:text-gray-400">Join a group to start chatting</p>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      <div className="w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto transition-colors">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Groups</h3>
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">{group.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{selectedGroup?.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Group Chat</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.user_id === user?.id;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {message.parent_message && (
                    <div className="text-xs p-2 bg-gray-100 dark:bg-gray-700 rounded border-l-2 border-blue-500 dark:border-blue-400">
                      <p className="text-gray-500 dark:text-gray-400">Replying to:</p>
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{message.parent_message.content}</p>
                    </div>
                  )}

                  <div
                    className={`rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                    <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                    <button
                      onClick={() => setReplyTo(message)}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                    {isOwnMessage && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {replyTo && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start justify-between text-sm">
              <div className="flex-1">
                <p className="text-blue-600 dark:text-blue-400 font-medium">Replying to:</p>
                <p className="text-gray-700 dark:text-gray-300 line-clamp-1">{replyTo.content}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
