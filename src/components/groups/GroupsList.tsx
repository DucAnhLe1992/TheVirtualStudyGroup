import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Search, Globe } from "lucide-react";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupCard } from "./GroupCard";
import { EnhancedGroupDetailModal } from "./EnhancedGroupDetailModal";
import type { StudyGroup } from "../../lib/types";

interface GroupsListProps {
  onNavigate: (tab: string) => void;
}

export function GroupsList({ onNavigate }: GroupsListProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"my-groups" | "discover">(
    "my-groups"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const loadGroups = useCallback(async () => {
    if (!user) return;

    if (activeView === "my-groups") {
      const { data: memberships } = await supabase
        .from("group_memberships")
        .select(
          `
          group_id,
          study_groups (
            id,
            name,
            description,
            subject,
            is_public,
            max_members,
            created_at,
            created_by,
            updated_at
          )
        `
        )
        .eq("user_id", user.id);

      if (memberships) {
        type MembershipWithGroup = {
          group_id: string;
          study_groups: StudyGroup | null;
        };
        const groupsData = (memberships as MembershipWithGroup[])
          .map((m) => m.study_groups)
          .filter(Boolean) as StudyGroup[];
        setGroups(groupsData);
      }
    } else {
      let query = supabase
        .from("study_groups")
        .select("*")
        .eq("is_public", true);

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setPublicGroups((data as StudyGroup[]) || []);
      }
    }

    setLoading(false);
  }, [user, activeView, searchQuery]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    loadGroups();
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("group_memberships")
      // @ts-expect-error - Supabase insert types not properly inferred
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      });

    if (!error) {
      loadGroups();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Study Groups
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Join or create groups to study together
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView("my-groups")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === "my-groups"
              ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          My Groups ({groups.length})
        </button>
        <button
          onClick={() => setActiveView("discover")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === "discover"
              ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Discover
        </button>
      </div>

      {activeView === "my-groups" ? (
        groups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create or join a group to start studying together
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => setSelectedGroupId(group.id)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search groups by name, subject, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>
          {publicGroups.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No groups found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or create a new group
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        {group.name}
                      </h3>
                      {group.subject && (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {group.subject}
                        </span>
                      )}
                    </div>
                    <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {group.description}
                  </p>
                  <button
                    onClick={() => handleJoinGroup(group.id)}
                    className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    Join Group
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGroupCreated}
        />
      )}

      {selectedGroupId && (
        <EnhancedGroupDetailModal
          groupId={selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
          onUpdate={loadGroups}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
