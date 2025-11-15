import { Lock, Globe, Calendar } from "lucide-react";
import type { StudyGroup } from "../../lib/types";

interface GroupCardProps {
  group: StudyGroup;
  onClick?: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
            {group.name}
          </h3>
          {group.subject && (
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded mb-2">
              {group.subject}
            </span>
          )}
        </div>
        {group.is_public ? (
          <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        ) : (
          <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
        {group.description || "No description provided"}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>Created {formatDate(group.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
