import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Search, MessageSquare, TrendingUp, Clock } from "lucide-react";
import { CreateDiscussionModal } from "./CreateDiscussionModal";
import { DiscussionCard } from "./DiscussionCard";
import type { Post, Profile, StudyGroup } from "../../lib/types";

type PostWithDetails = Post & {
  author: Profile;
  group?: StudyGroup;
  comment_count?: number;
};

export function DiscussionsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<PostWithDetails[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "hot" | "votes">("recent");
  const [answeredFilter, setAnsweredFilter] = useState<"all" | "answered" | "unanswered">("all");

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

  const loadDiscussions = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Get all groups user is a member of
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setDiscussions([]);
      setLoading(false);
      return;
    }

    const groupIds = ((memberships as Array<{ group_id: string }>) || []).map(
      (m) => m.group_id
    );

    // Build query - only discussion types (question, discussion, solution)
    let query = supabase
      .from("posts")
      .select("*, author:profiles(*), group:study_groups(*)")
      .in("group_id", groupIds)
      .in("post_type", ["question", "discussion", "solution"]);

    // Filter by selected group
    if (selectedGroupId !== "all") {
      query = query.eq("group_id", selectedGroupId);
    }

    // Filter by specific discussion type
    if (filterType !== "all") {
      query = query.eq("post_type", filterType);
    }

    // Filter by answered state
    if (answeredFilter === "answered") {
      // best_answer_comment_id IS NOT NULL
      query = query.not("best_answer_comment_id", "is", null);
    } else if (answeredFilter === "unanswered") {
      // best_answer_comment_id IS NULL
      query = query.is("best_answer_comment_id", null);
    }

    // Search
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`
      );
    }

    // Sort
    query = query.order("is_pinned", { ascending: false });
    if (sortBy === "recent") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "votes") {
      query = query.order("vote_count", { ascending: false });
    } else if (sortBy === "hot") {
      // Hot = combination of votes and recency (simplified: order by updated_at)
      query = query.order("updated_at", { ascending: false });
    }

    const { data: discussionsData } = await query;

    if (discussionsData) {
      // Get comment counts
      const discussionsWithCounts = await Promise.all(
        (discussionsData as PostWithDetails[]).map(async (post) => {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          return { ...post, comment_count: count || 0 };
        })
      );
      setDiscussions(discussionsWithCounts as PostWithDetails[]);
    }

    setLoading(false);
  }, [user, selectedGroupId, searchQuery, filterType, sortBy, answeredFilter]);

  useEffect(() => {
    loadUserGroups();
  }, [loadUserGroups]);

  const skipFirstLoadRef = useRef(false);

  useEffect(() => {
    const noRefresh = (location.state as { noRefresh?: boolean } | null)?.noRefresh;
    if (noRefresh && !skipFirstLoadRef.current) {
      skipFirstLoadRef.current = true;
      navigate(location.pathname, { replace: true });
      return;
    }
    loadDiscussions();
  }, [loadDiscussions, location.pathname, location.state, navigate]);

  const handleDiscussionCreated = () => {
    setShowCreateModal(false);
    loadDiscussions();
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
            Discussions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ask questions, share ideas, and get help from the community
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={groups.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Discussion
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No groups yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Join or create a group to start discussions
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 mb-6">
            {/* Search and filters row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search discussions..."
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
                <option value="solution">Solutions</option>
              </select>

              <select
                value={answeredFilter}
                onChange={(e) => setAnsweredFilter(e.target.value as "all" | "answered" | "unanswered")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All States</option>
                <option value="answered">Answered</option>
                <option value="unanswered">Unanswered</option>
              </select>
            </div>

            {/* Sort tabs */}
            <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setSortBy("recent")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  sortBy === "recent"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4" />
                Recent
              </button>
              <button
                onClick={() => setSortBy("hot")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  sortBy === "hot"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Hot
              </button>
              <button
                onClick={() => setSortBy("votes")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  sortBy === "votes"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Top Voted
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {discussions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No discussions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "Be the first to start a discussion!"}
                </p>
              </div>
            ) : (
              discussions.map((discussion) => (
                <div key={discussion.id}>
                  {discussion.group && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2 ml-20">
                      <span className="font-medium">{discussion.group.name}</span>
                      {discussion.group.subject && (
                        <>
                          <span>•</span>
                          <span>{discussion.group.subject}</span>
                        </>
                      )}
                    </div>
                  )}
                  <DiscussionCard discussion={discussion as PostWithDetails} />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showCreateModal && groups.length > 0 && (
        <CreateDiscussionModal
          groupId={groups[0].id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleDiscussionCreated}
        />
      )}
    </div>
  );
}
