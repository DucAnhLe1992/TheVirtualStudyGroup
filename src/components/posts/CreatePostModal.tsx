import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { X, AlertCircle } from "lucide-react";

interface CreatePostModalProps {
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostModal({
  groupId,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<
    "question" | "discussion" | "article" | "announcement" | "solution"
  >("discussion");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) return;

    if (!title.trim() || !content.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    // @ts-expect-error - Supabase insert types not properly inferred
    const { error: insertError } = await supabase.from("posts").insert({
      group_id: groupId,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      post_type: postType,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Post
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="postType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Post Type
            </label>
            <select
              id="postType"
              value={postType}
              onChange={(e) =>
                setPostType(
                  e.target.value as
                    | "question"
                    | "discussion"
                    | "article"
                    | "announcement"
                    | "solution"
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="discussion">Discussion</option>
              <option value="question">Question</option>
              <option value="article">Article</option>
              <option value="solution">Solution</option>
              <option value="announcement">Announcement</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {postType === "question" &&
                "Ask for help or clarification on a topic"}
              {postType === "discussion" &&
                "Start a conversation or share thoughts"}
              {postType === "article" &&
                "Share detailed knowledge or study notes"}
              {postType === "solution" && "Share a solution to a problem"}
              {postType === "announcement" &&
                "Important information for the group"}
            </p>
          </div>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Give your post a clear, descriptive title..."
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
              placeholder="Write your post content here. You can use plain text or markdown formatting..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tip: Use markdown for formatting (**, *, `, etc.)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
