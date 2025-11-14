import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Award, Lock, Trophy, Users, Calendar, MessageSquare, FileText, Flame } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  requirement_type: string;
  requirement_value: number;
  earned: boolean;
  earned_at?: string;
}

export function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    const [allAchievementsRes, earnedAchievementsRes] = await Promise.all([
      supabase.from('achievements').select('*').order('requirement_value', { ascending: true }),
      supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user.id),
    ]);

    if (allAchievementsRes.data) {
      const earnedIds = new Set(earnedAchievementsRes.data?.map((ea) => ea.achievement_id) || []);
      const earnedMap = new Map(earnedAchievementsRes.data?.map((ea) => [ea.achievement_id, ea.earned_at]));

      const achievementsWithStatus = allAchievementsRes.data.map((ach) => ({
        ...ach,
        earned: earnedIds.has(ach.id),
        earned_at: earnedMap.get(ach.id),
      }));

      setAchievements(achievementsWithStatus);
    }

    setLoading(false);
  };

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      users: Users,
      calendar: Calendar,
      trophy: Trophy,
      'message-square': MessageSquare,
      'file-text': FileText,
      flame: Flame,
    };
    const IconComponent = iconMap[iconName] || Award;
    return <IconComponent className="w-8 h-8" />;
  };

  const earnedCount = achievements.filter((a) => a.earned).length;

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
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Achievements</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Unlock badges by completing milestones
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Your Progress</h3>
            <p className="text-blue-100">
              {earnedCount} of {achievements.length} achievements unlocked
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{earnedCount}</div>
            <div className="text-sm text-blue-100">Badges Earned</div>
          </div>
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-lg p-6 border-2 transition-all ${
              achievement.earned
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                  achievement.earned
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {achievement.earned ? getIcon(achievement.badge_icon) : <Lock className="w-8 h-8" />}
              </div>
              {achievement.earned && (
                <div className="text-xs font-semibold px-2 py-1 bg-yellow-400 text-yellow-900 rounded">
                  UNLOCKED
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{achievement.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{achievement.description}</p>

            {achievement.earned && achievement.earned_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Unlocked {new Date(achievement.earned_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
