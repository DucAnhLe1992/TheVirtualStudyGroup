import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Trophy,
  User,
  Award,
  X,
  BookOpen,
  UserCheck,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "groups", label: "My Groups", icon: Users },
    { id: "posts", label: "Posts", icon: BookOpen },
    { id: "sessions", label: "Sessions", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "resources", label: "Resources", icon: FileText },
    { id: "quizzes", label: "Quizzes", icon: Trophy },
    { id: "achievements", label: "Achievements", icon: Award },
    { id: "connections", label: "Connections", icon: UserCheck },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          min-h-[calc(100vh-4rem)] transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between p-4 md:hidden border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Menu
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
