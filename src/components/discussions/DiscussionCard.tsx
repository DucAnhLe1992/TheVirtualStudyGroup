import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  ArrowUp,
  CheckCircle,
  Eye,
  Pin,
} from "lucide-react";
import type { PostWithDetails } from "../../lib/types";

interface DiscussionCardProps {
  discussion: PostWithDetails;
  onClick?: () => void;
}

const discussionTypeConfig = {
  question: {
    color:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
    label: "Question",
  },
  discussion: {
    color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    label: "Discussion",
  },
  solution: {
    color:
      "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    label: "Solution",
  },
};

export function DiscussionCard({ discussion, onClick }: DiscussionCardProps) {
  const navigate = useNavigate();
  const typeConfig =
    discussionTypeConfig[
      discussion.post_type as keyof typeof discussionTypeConfig
    ];
  const hasAnswer = discussion.best_answer_comment_id !== null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/discussions/${discussion.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Vote count */}
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <ArrowUp className="w-4 h-4" />
            <span className="font-semibold">{discussion.vote_count || 0}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-500">votes</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {discussion.is_pinned && (
              <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
              {hasAnswer && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Answered</span>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
            {discussion.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {discussion.content}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {discussion.author.full_name || discussion.author.email}
            </span>
            <span>•</span>
            <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{discussion.comment_count || 0}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{discussion.view_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
