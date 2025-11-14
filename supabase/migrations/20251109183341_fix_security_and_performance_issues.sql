/*
  # Fix Security and Performance Issues

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Add indexes for all foreign key columns that were missing covering indexes:
  - messages.reply_to
  - messages.user_id  
  - quizzes.created_by
  - resources.uploaded_by
  - session_participants.user_id
  - study_groups.created_by
  - study_sessions.created_by

  ### 2. Optimize RLS Policies
  Wrap all auth.uid() calls with (SELECT auth.uid()) to prevent re-evaluation for each row.
  This significantly improves query performance at scale by caching the auth result.

  ### 3. Fix Function Search Path
  Update the update_updated_at_column function with a stable search_path to prevent security issues.

  ## Performance Impact
  - Foreign key indexes: Dramatically improve join performance and foreign key constraint checks
  - RLS optimization: Reduce CPU usage and query time for all authenticated queries
  - Function security: Prevent potential SQL injection through search_path manipulation
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_by ON study_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_by ON study_sessions(created_by);

-- =====================================================
-- FIX FUNCTION SEARCH PATH
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- OPTIMIZE RLS POLICIES - PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- =====================================================
-- OPTIMIZE RLS POLICIES - STUDY GROUPS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view public groups" ON study_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON study_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON study_groups;
DROP POLICY IF EXISTS "Group creators can delete groups" ON study_groups;

CREATE POLICY "Anyone can view public groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = study_groups.id
    AND group_memberships.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Authenticated users can create groups"
  ON study_groups FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Group admins can update groups"
  ON study_groups FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_groups.id
      AND group_memberships.user_id = (SELECT auth.uid())
      AND group_memberships.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_groups.id
      AND group_memberships.user_id = (SELECT auth.uid())
      AND group_memberships.role = 'admin'
    )
  );

CREATE POLICY "Group creators can delete groups"
  ON study_groups FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- OPTIMIZE RLS POLICIES - GROUP MEMBERSHIPS
-- =====================================================

DROP POLICY IF EXISTS "Members can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON group_memberships;

CREATE POLICY "Members can view group memberships"
  ON group_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can join groups"
  ON group_memberships FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can leave groups"
  ON group_memberships FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = (SELECT auth.uid())
    AND gm.role = 'admin'
  ));

CREATE POLICY "Admins can update memberships"
  ON group_memberships FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = (SELECT auth.uid())
    AND gm.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = group_memberships.group_id
    AND gm.user_id = (SELECT auth.uid())
    AND gm.role = 'admin'
  ));

-- =====================================================
-- OPTIMIZE RLS POLICIES - STUDY SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Group members can view sessions" ON study_sessions;
DROP POLICY IF EXISTS "Group members can create sessions" ON study_sessions;
DROP POLICY IF EXISTS "Session creators can update sessions" ON study_sessions;
DROP POLICY IF EXISTS "Session creators can delete sessions" ON study_sessions;

CREATE POLICY "Group members can view sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = study_sessions.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Group members can create sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = created_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = study_sessions.group_id
      AND group_memberships.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Session creators can update sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Session creators can delete sessions"
  ON study_sessions FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- OPTIMIZE RLS POLICIES - SESSION PARTICIPANTS
-- =====================================================

DROP POLICY IF EXISTS "Participants can view session attendance" ON session_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON session_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON session_participants;

CREATE POLICY "Participants can view session attendance"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN group_memberships gm ON gm.group_id = ss.group_id
      WHERE ss.id = session_participants.session_id
      AND gm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own participation"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- OPTIMIZE RLS POLICIES - MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Group members can view messages" ON messages;
DROP POLICY IF EXISTS "Group members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

CREATE POLICY "Group members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = messages.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Group members can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = messages.group_id
      AND group_memberships.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = messages.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
    AND group_memberships.role IN ('admin', 'moderator')
  ));

-- =====================================================
-- OPTIMIZE RLS POLICIES - RESOURCES
-- =====================================================

DROP POLICY IF EXISTS "Group members can view resources" ON resources;
DROP POLICY IF EXISTS "Group members can upload resources" ON resources;
DROP POLICY IF EXISTS "Uploaders can delete resources" ON resources;

CREATE POLICY "Group members can view resources"
  ON resources FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = resources.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Group members can upload resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = uploaded_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = resources.group_id
      AND group_memberships.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Uploaders can delete resources"
  ON resources FOR DELETE
  TO authenticated
  USING (uploaded_by = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = resources.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
    AND group_memberships.role = 'admin'
  ));

-- =====================================================
-- OPTIMIZE RLS POLICIES - QUIZZES
-- =====================================================

DROP POLICY IF EXISTS "Group members can view quizzes" ON quizzes;
DROP POLICY IF EXISTS "Group members can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can delete quizzes" ON quizzes;

CREATE POLICY "Group members can view quizzes"
  ON quizzes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = quizzes.group_id
    AND group_memberships.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Group members can create quizzes"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = created_by AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = quizzes.group_id
      AND group_memberships.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Quiz creators can update quizzes"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Quiz creators can delete quizzes"
  ON quizzes FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- OPTIMIZE RLS POLICIES - QUIZ QUESTIONS
-- =====================================================

DROP POLICY IF EXISTS "Group members can view quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Quiz creators can manage questions" ON quiz_questions;
DROP POLICY IF EXISTS "Quiz creators can update questions" ON quiz_questions;
DROP POLICY IF EXISTS "Quiz creators can delete questions" ON quiz_questions;

CREATE POLICY "Group members can view quiz questions"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes q
    JOIN group_memberships gm ON gm.group_id = q.group_id
    WHERE q.id = quiz_questions.quiz_id
    AND gm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Quiz creators can manage questions"
  ON quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = (SELECT auth.uid())
  ));

CREATE POLICY "Quiz creators can update questions"
  ON quiz_questions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = (SELECT auth.uid())
  ));

CREATE POLICY "Quiz creators can delete questions"
  ON quiz_questions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = (SELECT auth.uid())
  ));

-- =====================================================
-- OPTIMIZE RLS POLICIES - QUIZ ATTEMPTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can create own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON quiz_attempts;

CREATE POLICY "Users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_attempts.quiz_id
    AND q.created_by = (SELECT auth.uid())
  ));

CREATE POLICY "Users can create own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own attempts"
  ON quiz_attempts FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));