import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Users,
  Grid,
  List,
  Video,
} from "lucide-react";
import { CreateSessionModal } from "./CreateSessionModal";
import { SessionDetailView } from "./SessionDetailView";
import { CalendarView } from "./CalendarView";
import type { StudySession, StudyGroup } from "../../lib/types";

type SessionWithGroup = Pick<
  StudySession,
  | "id"
  | "title"
  | "description"
  | "scheduled_at"
  | "duration_minutes"
  | "status"
> & {
  location?: string | null;
  meeting_link?: string | null;
  meeting_platform?: string | null;
  study_groups: Pick<StudyGroup, "name">;
};

export function SessionsList() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<"upcoming" | "past">("upcoming");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    const { data: participations } = await supabase
      .from("session_participants")
      .select(
        `
        session_id,
        study_sessions (
          id,
          title,
          description,
          scheduled_at,
          duration_minutes,
          location,
          status,
          meeting_link,
          meeting_platform,
          study_groups (
            name
          )
        )
      `
      )
      .eq("user_id", user.id);

    if (participations) {
      type ParticipationRow = {
        session_id: string;
        study_sessions: SessionWithGroup | null;
      };

      let sessionsData = (participations as ParticipationRow[])
        .map((p) => p.study_sessions)
        .filter((s): s is SessionWithGroup => s !== null);

      if (activeView === "upcoming") {
        sessionsData = sessionsData.filter(
          (s) => new Date(s.scheduled_at) >= new Date(now)
        );
        sessionsData.sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime()
        );
      } else {
        sessionsData = sessionsData.filter(
          (s) => new Date(s.scheduled_at) < new Date(now)
        );
        sessionsData.sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime()
        );
      }

      setSessions(sessionsData);
    }

    setLoading(false);
  }, [user?.id, activeView]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
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
            Study Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Schedule and join study sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded transition-colors ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Schedule Session
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView onSessionClick={(id) => setSelectedSessionId(id)} />
      ) : (
        <>
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveView("upcoming")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeView === "upcoming"
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Upcoming ({sessions.length})
            </button>
            <button
              onClick={() => setActiveView("past")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeView === "past"
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Past
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
              <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {activeView} sessions
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {activeView === "upcoming"
                  ? "Schedule a session to get started"
                  : "Your past sessions will appear here"}
              </p>
              {activeView === "upcoming" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Schedule Your First Session
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex-1">
                      {session.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{session.study_groups.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(session.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{session.duration_minutes} minutes</span>
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{session.location}</span>
                      </div>
                    )}
                    {session.meeting_link && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <Video className="w-4 h-4" />
                        <span className="truncate capitalize">
                          {session.meeting_platform?.replace("_", " ") ||
                            "Online Meeting"}
                        </span>
                      </div>
                    )}
                  </div>

                  {session.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {session.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSessions();
          }}
        />
      )}

      {selectedSessionId && (
        <SessionDetailView
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
          onUpdate={loadSessions}
        />
      )}
    </div>
  );
}
