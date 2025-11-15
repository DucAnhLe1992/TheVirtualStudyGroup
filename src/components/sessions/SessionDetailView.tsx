import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
  CheckCircle,
  Video,
  Lock,
} from "lucide-react";
import { SessionLobby } from "./SessionLobby";
import type { StudySession, SessionParticipant } from "../../lib/types";

type SessionWithGroup = StudySession & {
  study_groups: {
    name: string;
  };
  location: string | null;
  meeting_link: string | null;
  meeting_platform: string | null;
  meeting_password: string | null;
  max_participants: number | null;
};

interface SessionDetailViewProps {
  sessionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function SessionDetailView({
  sessionId,
  onClose,
  onUpdate,
}: SessionDetailViewProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionWithGroup | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  const loadSessionDetails = useCallback(async () => {
    const [sessionRes, participantsRes] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("*, study_groups(name)")
        .eq("id", sessionId)
        .single(),
      supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sessionId),
    ]);

    const sessionData = (
      sessionRes as unknown as { data: SessionWithGroup | null }
    ).data;
    if (sessionData) setSession(sessionData);

    const participantsData = (
      participantsRes as unknown as { data: SessionParticipant[] | null }
    ).data;
    if (participantsData) {
      setParticipants(participantsData);
      setIsParticipant(participantsData.some((p) => p.user_id === user?.id));
    }

    setLoading(false);
  }, [sessionId, user]);

  useEffect(() => {
    loadSessionDetails();
  }, [loadSessionDetails]);

  const handleJoinSession = async () => {
    if (!user?.id) return;

    // @ts-expect-error - Supabase insert types not properly inferred
    const { error } = await supabase.from("session_participants").insert({
      session_id: sessionId,
      user_id: user.id,
    });

    if (!error) {
      loadSessionDetails();
    }
  };

  const handleLeaveSession = async () => {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to leave this session?")) return;

    const { error } = await supabase
      .from("session_participants")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (!error) {
      onUpdate();
      onClose();
    }
  };

  const handleCancelSession = async () => {
    if (!confirm("Are you sure you want to cancel this session?")) return;

    setLoading(true);
    const { error } = await supabase
      .from("study_sessions")
      // @ts-expect-error - Supabase update types not properly inferred
      .update({ status: "cancelled" })
      .eq("id", sessionId);

    if (!error) {
      loadSessionDetails();
      onUpdate();
    }
  };

  const handleCompleteSession = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("study_sessions")
      // @ts-expect-error - Supabase update types not properly inferred
      .update({ status: "completed" })
      .eq("id", sessionId);

    if (!error) {
      loadSessionDetails();
      onUpdate();
    }
  };

  if (loading || !session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = session.created_by === user?.id;
  const isUpcoming = new Date(session.scheduled_at) > new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 my-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {session.title}
            </h2>
            <span
              className={`inline-block mt-2 px-3 py-1 text-sm rounded ${
                session.status === "scheduled"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : session.status === "completed"
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              }`}
            >
              {session.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Study Group
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {session.study_groups.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Date & Time
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(session.scheduled_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Duration
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {session.duration_minutes} minutes
                </p>
              </div>
            </div>

            {session.location && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Location
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.location}
                  </p>
                </div>
              </div>
            )}
          </div>

          {session.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Description
              </h3>
              <p className="text-gray-900 dark:text-white">
                {session.description}
              </p>
            </div>
          )}

          {session.meeting_link && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Online Meeting
              </h3>
              <div className="space-y-2">
                {session.meeting_platform && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Platform
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {session.meeting_platform.replace("_", " ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Meeting Link
                  </p>
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {session.meeting_link}
                  </a>
                </div>
                {session.meeting_password && (
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Password
                      </p>
                      <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {session.meeting_password}
                      </p>
                    </div>
                  </div>
                )}
                {session.max_participants && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Max Participants
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {session.max_participants}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({participants.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Participant {participant.user_id.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined{" "}
                        {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isParticipant && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Session Lobby
              </h3>
              <SessionLobby sessionId={sessionId} />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {!isParticipant && isUpcoming && session.status === "scheduled" && (
              <button
                onClick={handleJoinSession}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Join Session
              </button>
            )}

            {isParticipant && !isCreator && isUpcoming && (
              <button
                onClick={handleLeaveSession}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Leave Session
              </button>
            )}

            {isCreator && isUpcoming && session.status === "scheduled" && (
              <>
                <button
                  onClick={handleCompleteSession}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
                <button
                  onClick={handleCancelSession}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel Session
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
