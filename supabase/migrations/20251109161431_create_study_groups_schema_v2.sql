/*
  # Study Group Application Schema

  ## Overview
  Complete database schema for a collaborative study group platform with real-time features.

  ## New Tables

  ### 1. profiles
  Extended user profiles linked to auth.users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - Display name
  - `avatar_url` (text) - Profile picture URL
  - `bio` (text) - User biography
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last profile update

  ### 2. study_groups
  Core groups where students collaborate
  - `id` (uuid, primary key) - Group identifier
  - `name` (text) - Group name
  - `description` (text) - Group description
  - `subject` (text) - Study subject/topic
  - `created_by` (uuid) - Creator user ID
  - `is_public` (boolean) - Public vs private group
  - `max_members` (integer) - Maximum member limit
  - `created_at` (timestamptz) - Creation time
  - `updated_at` (timestamptz) - Last update time

  ### 3. group_memberships
  Links users to groups with roles
  - `id` (uuid, primary key) - Membership identifier
  - `group_id` (uuid) - Reference to study_groups
  - `user_id` (uuid) - Reference to profiles
  - `role` (text) - Member role (admin, moderator, member)
  - `joined_at` (timestamptz) - Join timestamp
  - `last_active` (timestamptz) - Last activity in group

  ### 4. study_sessions
  Scheduled or ongoing study sessions

  ### 5. session_participants
  Tracks who attended which sessions

  ### 6. messages
  Real-time chat messages in groups

  ### 7. resources
  Shared files and learning materials

  ### 8. quizzes
  Quiz definitions for group study

  ### 9. quiz_questions
  Individual questions in quizzes

  ### 10. quiz_attempts
  User quiz attempt records

  ## Security
  All tables have RLS enabled with restrictive policies ensuring data access only for authorized users.
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STUDY GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text DEFAULT '',
  subject text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  max_members integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GROUP MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STUDY SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SESSION PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES study_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  duration_minutes integer DEFAULT 0,
  UNIQUE(session_id, user_id)
);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RESOURCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  file_url text NOT NULL,
  file_type text DEFAULT '',
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QUIZZES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  time_limit_minutes integer,
  passing_score integer DEFAULT 70,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QUIZ QUESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  points integer DEFAULT 1,
  order_index integer DEFAULT 0
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QUIZ ATTEMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score integer DEFAULT 0,
  total_points integer DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - PROFILES
-- =====================================================
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- RLS POLICIES - STUDY GROUPS
-- =====================================================
CREATE POLICY "Anyone can view public groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = study_groups.id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create groups"
  ON study_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON study_groups FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'admin'
    )
  );

CREATE POLICY "Group creators can delete groups"
  ON study_groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - GROUP MEMBERSHIPS
-- =====================================================
CREATE POLICY "Members can view group memberships"
  ON group_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON group_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  ));

CREATE POLICY "Admins can update memberships"
  ON group_memberships FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  ));

-- =====================================================
-- RLS POLICIES - STUDY SESSIONS
-- =====================================================
CREATE POLICY "Group members can view sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = study_sessions.group_id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Group members can create sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_sessions.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Session creators can update sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Session creators can delete sessions"
  ON study_sessions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - SESSION PARTICIPANTS
-- =====================================================
CREATE POLICY "Participants can view session attendance"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN group_memberships gm ON gm.group_id = ss.group_id
      WHERE ss.id = session_participants.session_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES - MESSAGES
-- =====================================================
CREATE POLICY "Group members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = messages.group_id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Group members can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = messages.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = messages.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role IN ('admin', 'moderator')
  ));

-- =====================================================
-- RLS POLICIES - RESOURCES
-- =====================================================
CREATE POLICY "Group members can view resources"
  ON resources FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = resources.group_id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Group members can upload resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = resources.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete resources"
  ON resources FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = resources.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  ));

-- =====================================================
-- RLS POLICIES - QUIZZES
-- =====================================================
CREATE POLICY "Group members can view quizzes"
  ON quizzes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = quizzes.group_id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Group members can create quizzes"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = quizzes.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Quiz creators can update quizzes"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Quiz creators can delete quizzes"
  ON quizzes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - QUIZ QUESTIONS
-- =====================================================
CREATE POLICY "Group members can view quiz questions"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes q
    JOIN group_memberships gm ON gm.group_id = q.group_id
    WHERE q.id = quiz_questions.quiz_id
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Quiz creators can manage questions"
  ON quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = auth.uid()
  ));

CREATE POLICY "Quiz creators can update questions"
  ON quiz_questions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = auth.uid()
  ));

CREATE POLICY "Quiz creators can delete questions"
  ON quiz_questions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = auth.uid()
  ));

-- =====================================================
-- RLS POLICIES - QUIZ ATTEMPTS
-- =====================================================
CREATE POLICY "Users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_attempts.quiz_id
    AND q.created_by = auth.uid()
  ));

CREATE POLICY "Users can create own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON quiz_attempts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_group_id ON study_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_group_id ON resources(group_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_group_id ON quizzes(group_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_groups_updated_at') THEN
    CREATE TRIGGER update_study_groups_updated_at
      BEFORE UPDATE ON study_groups
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;