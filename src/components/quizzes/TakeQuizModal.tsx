import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { X, Check } from "lucide-react";
import type { Quiz, QuizQuestion } from "../../lib/types";

type QuizWithGroup = Quiz & {
  study_groups: { name: string };
};

type QuizQuestionUI = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
};

interface TakeQuizModalProps {
  quizId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function TakeQuizModal({
  quizId,
  onClose,
  onComplete,
}: TakeQuizModalProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<QuizWithGroup | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionUI[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadQuiz = useCallback(async () => {
    const [quizRes, questionsRes] = await Promise.all([
      supabase
        .from("quizzes")
        .select("*, study_groups(name)")
        .eq("id", quizId)
        .single(),
      supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index"),
    ]);

    const quizData = (quizRes as unknown as { data: QuizWithGroup | null })
      .data;
    if (quizData) setQuiz(quizData);

    const questionsData = (
      questionsRes as unknown as { data: QuizQuestion[] | null }
    ).data;
    if (questionsData) {
      const uiQuestions: QuizQuestionUI[] = questionsData.map((q) => {
        const opts = (q.options as unknown as string[]) ?? [];
        const ansRaw = q.correct_answer as unknown;
        const ans =
          typeof ansRaw === "string"
            ? parseInt(ansRaw, 10)
            : (ansRaw as number) ?? 0;
        return {
          id: q.id,
          question_text: q.question_text,
          options: Array.isArray(opts) ? opts.map((o) => String(o ?? "")) : [],
          correct_answer: Number.isFinite(ans) ? ans : 0,
        };
      });
      setQuestions(uiQuestions);
    }
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSubmit = async () => {
    if (!user?.id) return;

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    setScore(scorePercentage);

    // @ts-expect-error - Supabase insert types not properly inferred
    await supabase.from("quiz_attempts").insert({
      quiz_id: quizId,
      user_id: user.id,
      score: scorePercentage,
      total_points: questions.length,
      answers: answers as unknown as never,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    setSubmitted(true);
  };

  if (loading || !quiz) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transition-colors">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Quiz Complete!
            </h2>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
              {score}%
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You got {Math.round((score / 100) * questions.length)} out of{" "}
              {questions.length} questions correct
            </p>
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 my-8 transition-colors max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {quiz.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {quiz.study_groups.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
            >
              <p className="font-medium text-gray-900 dark:text-white mb-4">
                {index + 1}. {question.question_text}
              </p>
              <div className="space-y-2">
                {question.options.map((option, oIndex) => (
                  <label
                    key={oIndex}
                    className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={oIndex}
                      checked={answers[question.id] === oIndex}
                      onChange={() =>
                        setAnswers({ ...answers, [question.id]: oIndex })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-900 dark:text-white">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
