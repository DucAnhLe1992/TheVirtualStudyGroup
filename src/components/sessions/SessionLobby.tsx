import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, BarChart3, Plus, X, Users } from 'lucide-react';

interface SessionLobbyProps {
  sessionId: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  is_active: boolean;
  allow_multiple: boolean;
  created_by: string;
  created_at: string;
}

interface PollResponse {
  poll_id: string;
  user_id: string;
  selected_options: string[];
}

export function SessionLobby({ sessionId }: SessionLobbyProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'polls'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollResponses, setPollResponses] = useState<Map<string, PollResponse>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChatMessages();
    loadPolls();
    loadMyPollResponses();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_chat',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadChatMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_polls',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadPolls();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_poll_responses',
        },
        () => {
          loadMyPollResponses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadChatMessages = async () => {
    const { data } = await supabase
      .from('session_chat')
      .select('*, profiles(full_name, email)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const loadPolls = async () => {
    const { data } = await supabase
      .from('session_polls')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (data) {
      setPolls(data);
    }
  };

  const loadMyPollResponses = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('session_poll_responses')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      const responsesMap = new Map(data.map(r => [r.poll_id, r]));
      setPollResponses(responsesMap);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('session_chat').insert({
      session_id: sessionId,
      user_id: user.id,
      message: newMessage.trim(),
      message_type: 'text',
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !user) return;

    const validOptions = pollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    const optionsArray = validOptions.map((text, index) => ({
      id: `opt-${index}`,
      text,
    }));

    setLoading(true);
    const { error } = await supabase.from('session_polls').insert({
      session_id: sessionId,
      created_by: user.id,
      question: pollQuestion.trim(),
      options: optionsArray,
      is_active: true,
      allow_multiple: allowMultiple,
    });

    if (!error) {
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowMultiple(false);
      setShowCreatePoll(false);
    }
    setLoading(false);
  };

  const handleVote = async (pollId: string, optionId: string, allowMultiple: boolean) => {
    if (!user) return;

    const existingResponse = pollResponses.get(pollId);
    let selectedOptions: string[];

    if (allowMultiple) {
      if (existingResponse) {
        const currentSelections = existingResponse.selected_options;
        if (currentSelections.includes(optionId)) {
          selectedOptions = currentSelections.filter(id => id !== optionId);
        } else {
          selectedOptions = [...currentSelections, optionId];
        }
      } else {
        selectedOptions = [optionId];
      }
    } else {
      selectedOptions = [optionId];
    }

    if (selectedOptions.length === 0) {
      await supabase
        .from('session_poll_responses')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('session_poll_responses')
        .upsert({
          poll_id: pollId,
          user_id: user.id,
          selected_options: selectedOptions,
        });
    }

    loadMyPollResponses();
  };

  const getPollResults = (poll: Poll) => {
    const responses = Array.from(pollResponses.values()).filter(r => r.poll_id === poll.id);
    const totalVotes = responses.reduce((sum, r) => sum + r.selected_options.length, 0);

    return poll.options.map(option => {
      const votes = responses.filter(r => r.selected_options.includes(option.id)).length;
      const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
      return { ...option, votes, percentage };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Live Chat
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'polls'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Polls
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {msg.profiles?.full_name || msg.profiles?.email || 'User'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white text-sm mt-1">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Polls</h3>
            <button
              onClick={() => setShowCreatePoll(!showCreatePoll)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Poll
            </button>
          </div>

          {showCreatePoll && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Create New Poll</h4>
                <button
                  onClick={() => setShowCreatePoll(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Poll question..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />

                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    {index >= 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add option
                </button>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow multiple selections</span>
                </label>

                <button
                  onClick={handleCreatePoll}
                  disabled={loading || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                  className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Poll'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {polls.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No polls yet. Create one to get started!
              </div>
            ) : (
              polls.map((poll) => {
                const results = getPollResults(poll);
                const myResponse = pollResponses.get(poll.id);
                const hasVoted = myResponse && myResponse.selected_options.length > 0;

                return (
                  <div key={poll.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{poll.question}</h4>
                      {poll.is_active && (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {results.map((option) => {
                        const isSelected = myResponse?.selected_options.includes(option.id) || false;

                        return (
                          <div key={option.id} className="space-y-1">
                            <button
                              onClick={() => handleVote(poll.id, option.id, poll.allow_multiple)}
                              disabled={!poll.is_active}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-2 border-blue-500'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                              } ${!poll.is_active ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option.text}</span>
                                {hasVoted && (
                                  <span className="text-sm font-medium">
                                    {option.votes} ({Math.round(option.percentage)}%)
                                  </span>
                                )}
                              </div>
                            </button>
                            {hasVoted && (
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                                  style={{ width: `${option.percentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {poll.allow_multiple && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Multiple selections allowed
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
