import { Database } from "./database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type StudyGroup = Tables<"study_groups">;
export type GroupMembership = Tables<"group_memberships">;
export type StudySession = Tables<"study_sessions">;
export type SessionParticipant = Tables<"session_participants">;
export type Message = Tables<"messages">;
export type Resource = Tables<"resources">;
export type Quiz = Tables<"quizzes">;
export type QuizQuestion = Tables<"quiz_questions">;
export type QuizAttempt = Tables<"quiz_attempts">;

// Session chat and poll types (not in generated schema)
export type SessionChat = {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
};

export type SessionPoll = {
  id: string;
  session_id: string;
  created_by: string;
  question: string;
  options: unknown; // JSON field
  is_active: boolean;
  allow_multiple: boolean;
  created_at: string;
};

export type SessionPollResponse = {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: unknown; // JSON field
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

export type UserStreak = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  updated_at: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
};

export type StudyGroupWithDetails = StudyGroup & {
  creator?: Profile;
  member_count?: number;
  membership?: GroupMembership;
};

export type MessageWithProfile = Message & {
  profile: Profile;
  reply_message?: Message;
};

export type ResourceWithProfile = Resource & {
  uploader: Profile;
};

export type QuizWithDetails = Quiz & {
  creator: Profile;
  questions?: QuizQuestion[];
};

export type SessionWithDetails = StudySession & {
  creator?: Profile;
  participant_count?: number;
};

export type QuizAttemptWithDetails = QuizAttempt & {
  quiz: Quiz;
  user: Profile;
};

export type AchievementWithUnlocked = Achievement & {
  unlocked_at?: string | null;
};

export type Post = {
  id: string;
  group_id: string;
  author_id: string;
  title: string;
  content: string;
  post_type:
    | "question"
    | "discussion"
    | "article"
    | "announcement"
    | "solution";
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: "like" | "helpful" | "insightful" | "love";
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type CommentReaction = {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: "like" | "helpful";
  created_at: string;
};

export type PostWithDetails = Post & {
  author: Profile;
  reaction_counts?: {
    like: number;
    helpful: number;
    insightful: number;
    love: number;
  };
  comment_count?: number;
  user_reaction?: PostReaction | null;
};

export type CommentWithDetails = Comment & {
  author: Profile;
  replies?: CommentWithDetails[];
  reaction_counts?: {
    like: number;
    helpful: number;
  };
  user_reaction?: CommentReaction | null;
};

export type Connection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
};

export type ConnectionStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";
