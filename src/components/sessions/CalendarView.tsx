import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StudySession } from "../../lib/types";

type SessionForCalendar = Pick<
  StudySession,
  "id" | "title" | "scheduled_at" | "duration_minutes"
> & {
  study_groups: {
    name: string;
  };
};

interface CalendarViewProps {
  onSessionClick: (sessionId: string) => void;
}

export function CalendarView({ onSessionClick }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<SessionForCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;

    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const participantsRes = await supabase
      .from("session_participants")
      .select(
        `
        study_sessions (
          id,
          title,
          scheduled_at,
          duration_minutes,
          study_groups (name)
        )
      `
      )
      .eq("user_id", user.id)
      .gte("study_sessions.scheduled_at", startOfMonth.toISOString())
      .lte("study_sessions.scheduled_at", endOfMonth.toISOString());

    const participantsData = (
      participantsRes as unknown as {
        data: Array<{ study_sessions: SessionForCalendar | null }> | null;
      }
    ).data;

    if (participantsData) {
      const sessionsData = participantsData
        .map((p) => p.study_sessions)
        .filter((s): s is SessionForCalendar => s !== null);
      setSessions(sessionsData);
    }

    setLoading(false);
  }, [user, currentDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getSessionsForDay = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split("T")[0];
    return sessions.filter((s) => s.scheduled_at.startsWith(dateStr));
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const days = getDaysInMonth();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const daySessions = day ? getSessionsForDay(day) : [];
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`min-h-24 p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                day
                  ? "bg-white dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-900"
              } ${isToday ? "ring-2 ring-blue-500" : ""}`}
            >
              {day && (
                <>
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {daySessions.slice(0, 2).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => onSessionClick(session.id)}
                        className="w-full text-left p-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        <div className="font-medium truncate">
                          {session.title}
                        </div>
                        <div className="text-[10px] opacity-75">
                          {new Date(session.scheduled_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </button>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{daySessions.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
