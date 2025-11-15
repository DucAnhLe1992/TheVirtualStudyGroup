import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Search, BookOpen } from "lucide-react";
import { CreatePostModal } from "./CreatePostModal";
import { PostCard } from "./PostCard";
import { PostDetailView } from "./PostDetailView";
import type { Post, Profile, StudyGroup } from "../../lib/types";

type PostWithDetails = Post & {
  author: Profile;
  group?: StudyGroup;
  comment_count?: number;
};

export function PostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const loadUserGroups = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id, study_groups(*)")
      .eq("user_id", user.id);

    if (memberships) {
      type MembershipWithGroup = { study_groups: StudyGroup | null };
      const groupsData = (memberships as MembershipWithGroup[])
        .map((m) => m.study_groups)
        .filter(Boolean) as StudyGroup[];
      setGroups(groupsData);
    }
  }, [user]);

  const loadPosts = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Get all groups user is a member of
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const groupIds = ((memberships as Array<{ group_id: string }>) || []).map(
      (m) => m.group_id
    );

    // Build query
    let query = supabase
      .from("posts")
      .select("*, author:profiles(*), group:study_groups(*)")
      .in("group_id", groupIds);

    // Filter by selected group
    if (selectedGroupId !== "all") {
      query = query.eq("group_id", selectedGroupId);
    }

    // Filter by post type
    if (filterType !== "all") {
      query = query.eq("post_type", filterType);
    }

    // Search
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`
      );
    }

    // Order by pinned and date
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const { data: postsData } = await query;

    if (postsData) {
      // Get comment counts
      const postsWithCounts = await Promise.all(
        (postsData as PostWithDetails[]).map(async (post) => {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          return { ...post, comment_count: count || 0 };
        })
      );
      setPosts(postsWithCounts as PostWithDetails[]);
    }

    setLoading(false);
  }, [user, selectedGroupId, searchQuery, filterType]);

  useEffect(() => {
    loadUserGroups();
  }, [loadUserGroups]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostCreated = () => {
    setShowCreateModal(false);
    loadPosts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Posts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Share knowledge, ask questions, and discuss with your study groups
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={groups.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No groups yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Join or create a group to start posting
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">All Types</option>
              <option value="question">Questions</option>
              <option value="discussion">Discussions</option>
              <option value="article">Articles</option>
              <option value="solution">Solutions</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No posts found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "Be the first to create a post!"}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id}>
                  {post.group && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <span className="font-medium">{post.group.name}</span>
                      {post.group.subject && (
                        <>
                          <span>•</span>
                          <span>{post.group.subject}</span>
                        </>
                      )}
                    </div>
                  )}
                  <PostCard
                    post={post as PostWithDetails}
                    onClick={() => setSelectedPostId(post.id)}
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showCreateModal && groups.length > 0 && (
        <CreatePostModal
          groupId={groups[0].id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePostCreated}
        />
      )}

      {selectedPostId && (
        <PostDetailView
          postId={selectedPostId}
          groupId={posts.find((p) => p.id === selectedPostId)?.group_id || ""}
          onClose={() => setSelectedPostId(null)}
          onUpdate={loadPosts}
        />
      )}
    </div>
  );
}
