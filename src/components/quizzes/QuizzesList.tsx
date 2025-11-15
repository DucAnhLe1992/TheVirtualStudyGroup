import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Trophy, Plus, Play, Edit2, Trash2, BarChart } from "lucide-react";
import { CreateQuizModal } from "./CreateQuizModal";
import { TakeQuizModal } from "./TakeQuizModal";
import { QuizResultsModal } from "./QuizResultsModal";
import type { StudyGroup, Quiz } from "../../lib/types";

type QuizWithDetails = Quiz & {
  study_groups: {
    name: string;
  };
  questions_count?: number;
  attempts_count?: number;
};

export function QuizzesList() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [quizzes, setQuizzes] = useState<QuizWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [showTakeQuiz, setShowTakeQuiz] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeView, setActiveView] = useState<"available" | "my-quizzes">(
    "available"
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const groupsRes = await supabase
      .from("group_memberships")
      .select("study_groups(id, name)")
      .eq("user_id", user.id);

    const groupsData = (
      groupsRes as unknown as {
        data: Array<{
          study_groups: Pick<StudyGroup, "id" | "name"> | null;
        }> | null;
      }
    ).data;

    if (groupsData) {
      const groups = groupsData
        .map((m) => m.study_groups)
        .filter((g): g is Pick<StudyGroup, "id" | "name"> => g !== null);
      setGroups(groups as StudyGroup[]);

      const userGroupIds = groups.map((g) => g.id);

      let query = supabase
        .from("quizzes")
        .select("*, study_groups(name)")
        .in("group_id", userGroupIds)
        .order("created_at", { ascending: false });

      if (activeView === "my-quizzes") {
        query = query.eq("created_by", user.id);
      }

      const quizzesRes = await query;

      const quizzesData = (
        quizzesRes as unknown as { data: QuizWithDetails[] | null }
      ).data;

      if (quizzesData) {
        const quizzesWithCounts = await Promise.all(
          quizzesData.map(async (quiz) => {
            const [questionsCount, attemptsCount] = await Promise.all([
              supabase
                .from("quiz_questions")
                .select("id", { count: "exact", head: true })
                .eq("quiz_id", quiz.id),
              supabase
                .from("quiz_attempts")
                .select("id", { count: "exact", head: true })
                .eq("quiz_id", quiz.id)
                .eq("user_id", user.id),
            ]);

            return {
              ...quiz,
              questions_count: questionsCount.count || 0,
              attempts_count: attemptsCount.count || 0,
            } as QuizWithDetails;
          })
        );

        setQuizzes(quizzesWithCounts);
      }
    }

    setLoading(false);
  }, [user, activeView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteQuiz = async (quizId: string) => {
    if (
      !confirm(
        "Delete this quiz? This will also delete all questions and attempts."
      )
    )
      return;

    await supabase.from("quizzes").delete().eq("id", quizId);
    loadData();
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
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Quizzes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test your knowledge
          </p>
        </div>

        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No groups yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Join a group to access quizzes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Quizzes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test your knowledge
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Quiz
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView("available")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === "available"
              ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Available Quizzes
        </button>
        <button
          onClick={() => setActiveView("my-quizzes")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === "my-quizzes"
              ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          My Quizzes
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No quizzes yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {activeView === "my-quizzes"
              ? "Create a quiz to get started"
              : "No quizzes available in your groups"}
          </p>
          {activeView === "my-quizzes" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const isOwner = quiz.created_by === user?.id;
            const hasAttempted = (quiz.attempts_count || 0) > 0;

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex-1">
                    {quiz.title}
                  </h3>
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>

                {quiz.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {quiz.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Group:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {quiz.study_groups.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Questions:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {quiz.questions_count || 0}
                    </span>
                  </div>
                  {hasAttempted && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Attempts:
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {quiz.attempts_count}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {!isOwner && (quiz.questions_count ?? 0) > 0 && (
                    <button
                      onClick={() => {
                        setSelectedQuizId(quiz.id);
                        setShowTakeQuiz(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Take Quiz
                    </button>
                  )}

                  {hasAttempted && (
                    <button
                      onClick={() => {
                        setSelectedQuizId(quiz.id);
                        setShowResults(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      <BarChart className="w-4 h-4" />
                      Results
                    </button>
                  )}

                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedQuizId(quiz.id);
                          setShowCreateModal(true);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateQuizModal
          groups={groups}
          quizId={selectedQuizId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedQuizId(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedQuizId(null);
            loadData();
          }}
        />
      )}

      {showTakeQuiz && selectedQuizId && (
        <TakeQuizModal
          quizId={selectedQuizId}
          onClose={() => {
            setShowTakeQuiz(false);
            setSelectedQuizId(null);
          }}
          onComplete={() => {
            setShowTakeQuiz(false);
            loadData();
          }}
        />
      )}

      {showResults && selectedQuizId && (
        <QuizResultsModal
          quizId={selectedQuizId}
          onClose={() => {
            setShowResults(false);
            setSelectedQuizId(null);
          }}
        />
      )}
    </div>
  );
}
