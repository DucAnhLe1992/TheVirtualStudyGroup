import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { X, Trophy, TrendingUp } from "lucide-react";
import type { Quiz, QuizAttempt } from "../../lib/types";

type QuizWithGroup = Quiz & {
  study_groups?: { name: string } | null;
};

interface QuizResultsModalProps {
  quizId: string;
  onClose: () => void;
}

export function QuizResultsModal({ quizId, onClose }: QuizResultsModalProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<QuizWithGroup | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    if (!user?.id) return;

    const [quizRes, attemptsRes] = await Promise.all([
      supabase
        .from("quizzes")
        .select("*, study_groups(name)")
        .eq("id", quizId)
        .single(),
      supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false }),
    ]);

    const quizData = (quizRes as unknown as { data: QuizWithGroup | null })
      .data;
    if (quizData) setQuiz(quizData);

    const attemptsData = (
      attemptsRes as unknown as { data: QuizAttempt[] | null }
    ).data;
    if (attemptsData) setAttempts(attemptsData);

    setLoading(false);
  }, [quizId, user]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  if (loading || !quiz) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const bestScore =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
        )
      : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 my-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {quiz.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quiz Results
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Best Score
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {bestScore}%
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Average Score
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {avgScore}%
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Attempt History ({attempts.length})
          </h3>

          {attempts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No attempts yet
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Attempt {attempts.length - index}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(
                        attempt.completed_at || attempt.started_at
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      attempt.score >= 80
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : attempt.score >= 60
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {attempt.score}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
