import {
  Heart,
  MessageCircle,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  Pin,
} from "lucide-react";
import type { PostWithDetails } from "../../lib/types";

interface PostCardProps {
  post: PostWithDetails;
  onClick: () => void;
}

const postTypeConfig = {
  question: {
    color:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
    label: "Question",
  },
  discussion: {
    color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    label: "Discussion",
  },
  article: {
    color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    label: "Article",
  },
  solution: {
    color:
      "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    label: "Solution",
  },
  announcement: {
    color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    label: "Announcement",
  },
};

// Reaction icons are rendered conditionally below; no mapping needed here.

export function PostCard({ post, onClick }: PostCardProps) {
  const typeConfig = postTypeConfig[post.post_type];
  const totalReactions = post.reaction_counts
    ? Object.values(post.reaction_counts).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.is_pinned && (
                  <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                <span
                  className={`inline-block px-2 py-1 text-xs rounded ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {post.title}
              </h3>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {post.content}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {post.author.full_name || post.author.email}
              </span>
            </div>
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            {post.edited_at && (
              <>
                <span>•</span>
                <span className="text-xs">edited</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {totalReactions > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center -space-x-1">
                  {(post.reaction_counts?.like ?? 0) > 0 && (
                    <Heart className="w-4 h-4 text-red-500" />
                  )}
                  {(post.reaction_counts?.helpful ?? 0) > 0 && (
                    <ThumbsUp className="w-4 h-4 text-blue-500" />
                  )}
                  {(post.reaction_counts?.insightful ?? 0) > 0 && (
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                  )}
                  {(post.reaction_counts?.love ?? 0) > 0 && (
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <span className="ml-1">{totalReactions}</span>
              </div>
            )}

            {post.comment_count !== undefined && post.comment_count > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <MessageCircle className="w-4 h-4" />
                <span>
                  {post.comment_count}{" "}
                  {post.comment_count === 1 ? "comment" : "comments"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
