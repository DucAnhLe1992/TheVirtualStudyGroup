import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, MessageSquare, Trophy, Flame, TrendingUp, Award } from 'lucide-react';

interface Stats {
  groups: number;
  sessions: number;
  messages: number;
  quizzes: number;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at: string;
}

interface QuizScore {
  score: number;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ groups: 0, sessions: 0, messages: 0, quizzes: 0 });
  const [streak, setStreak] = useState<Streak>({ current_streak: 0, longest_streak: 0, last_activity_date: null });
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    const [groupsRes, sessionsRes, messagesRes, quizzesRes, streakRes, achievementsRes, scoresRes] = await Promise.all([
      supabase.from('group_memberships').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(3),
      supabase.from('quiz_attempts').select('score').eq('user_id', user.id),
    ]);

    setStats({
      groups: groupsRes.count ?? 0,
      sessions: sessionsRes.count ?? 0,
      messages: messagesRes.count ?? 0,
      quizzes: quizzesRes.count ?? 0,
    });

    if (streakRes.data) {
      setStreak(streakRes.data);
    } else {
      await supabase.from('user_streaks').insert({ user_id: user.id });
    }

    if (achievementsRes.data) {
      setRecentAchievements(
        achievementsRes.data.map((ua: any) => ({
          id: ua.achievement_id,
          name: ua.achievements.name,
          description: ua.achievements.description,
          badge_icon: ua.achievements.badge_icon,
          earned_at: ua.earned_at,
        }))
      );
    }

    if (scoresRes.data && scoresRes.data.length > 0) {
      const avg = scoresRes.data.reduce((sum, s) => sum + s.score, 0) / scoresRes.data.length;
      setAverageScore(Math.round(avg));
    }

    await updateStreak();

    setLoading(false);
  };

  const updateStreak = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: streakData } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle();

    if (!streakData) return;

    const lastDate = streakData.last_activity_date;

    if (lastDate === today) {
      return;
    }

    let newStreak = streakData.current_streak;

    if (!lastDate) {
      newStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(newStreak, streakData.longest_streak);

    await supabase
      .from('user_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setStreak({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
    });
  };

  const statCards = [
    { label: 'My Groups', value: stats.groups, icon: Users, color: 'blue' },
    { label: 'Study Sessions', value: stats.sessions, icon: Calendar, color: 'green' },
    { label: 'Messages Sent', value: stats.messages, icon: MessageSquare, color: 'orange' },
    { label: 'Quizzes Taken', value: stats.quizzes, icon: Trophy, color: 'red' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your study overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
            green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
            orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
            red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',
          };

          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    colorClasses[stat.color as keyof typeof colorClasses]
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Study Streak</h3>
            <Flame className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm opacity-90">Current Streak</p>
              <p className="text-4xl font-bold">{streak.current_streak} days</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Longest Streak</p>
              <p className="text-2xl font-semibold">{streak.longest_streak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quiz Performance</h3>
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm opacity-90">Average Score</p>
              <p className="text-4xl font-bold">{averageScore}%</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Total Attempts</p>
              <p className="text-2xl font-semibold">{stats.quizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <Award className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">Recent Unlocks</p>
            {recentAchievements.length === 0 ? (
              <p className="text-sm opacity-75">No achievements yet</p>
            ) : (
              <div className="space-y-1">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="text-sm font-medium">
                    {achievement.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Keep up the great work! Check your groups and sessions for updates.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Groups Joined</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.groups}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sessions Attended</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.sessions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Messages Sent</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.messages}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
