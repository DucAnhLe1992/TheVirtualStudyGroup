/*
  # Create Analytics and Achievements System

  1. New Tables
    - `user_streaks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `current_streak` (integer, default 0)
      - `longest_streak` (integer, default 0)
      - `last_activity_date` (date)
      - `updated_at` (timestamptz)
    
    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `badge_icon` (text)
      - `requirement_type` (text)
      - `requirement_value` (integer)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `achievement_id` (uuid, foreign key to achievements)
      - `earned_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can view their own streaks and achievements
    - Users can update their own streaks (via app logic)
*/

CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON user_streaks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON user_streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON user_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  badge_icon text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

INSERT INTO achievements (name, description, badge_icon, requirement_type, requirement_value)
VALUES
  ('First Steps', 'Join your first study group', 'users', 'groups_joined', 1),
  ('Social Butterfly', 'Join 5 study groups', 'users', 'groups_joined', 5),
  ('Session Starter', 'Attend your first study session', 'calendar', 'sessions_attended', 1),
  ('Dedicated Learner', 'Attend 10 study sessions', 'calendar', 'sessions_attended', 10),
  ('Quiz Master', 'Take your first quiz', 'trophy', 'quizzes_taken', 1),
  ('Perfect Score', 'Score 100% on a quiz', 'trophy', 'quiz_perfect_score', 1),
  ('Communicator', 'Send 50 messages', 'message-square', 'messages_sent', 50),
  ('Resource Hero', 'Upload 5 resources', 'file-text', 'resources_uploaded', 5),
  ('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak_days', 7),
  ('Consistency King', 'Maintain a 30-day streak', 'flame', 'streak_days', 30)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
