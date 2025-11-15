import { useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { DirectMessagesPage } from "./DirectMessagesPage";
import { GroupChatPage } from "./GroupChatPage";

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Messages
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect with your study partners
        </p>
      </div>

      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 flex w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "direct"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Direct Messages
        </button>
        <button
          onClick={() => setActiveTab("group")}
          className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "group"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Group Chat
        </button>
      </div>

      {activeTab === "direct" ? <DirectMessagesPage /> : <GroupChatPage />}
    </div>
  );
}
