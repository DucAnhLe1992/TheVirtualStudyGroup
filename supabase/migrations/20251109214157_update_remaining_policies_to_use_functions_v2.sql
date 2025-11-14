/*
  # Update Remaining Policies to Use Security Definer Functions

  1. Problem
    - Several other tables (messages, resources, study_sessions) have policies that query group_memberships
    - These could potentially cause similar recursion issues or performance problems
    
  2. Solution
    - Update all policies that reference group_memberships to use the security definer functions
    - This ensures consistency and prevents any potential recursion issues
    
  3. Changes
    - Update messages policies
    - Update resources policies  
    - Update study_sessions policies
    - Update quizzes policies
    - All will use is_group_member() and is_group_admin() functions
*/

-- Update messages policies
DROP POLICY IF EXISTS "Group members can view messages" ON messages;
DROP POLICY IF EXISTS "Group members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

CREATE POLICY "Group members can view messages"
ON messages
FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can send messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (is_group_member(group_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users and moderators can delete messages"
ON messages
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_group_admin(group_id, auth.uid())
);

CREATE POLICY "Users can update own messages"
ON messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update resources policies
DROP POLICY IF EXISTS "Group members can view resources" ON resources;
DROP POLICY IF EXISTS "Group members can upload resources" ON resources;
DROP POLICY IF EXISTS "Uploaders can delete resources" ON resources;
DROP POLICY IF EXISTS "Uploaders can update resources" ON resources;

CREATE POLICY "Group members can view resources"
ON resources
FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can upload resources"
ON resources
FOR INSERT
TO authenticated
WITH CHECK (is_group_member(group_id, auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Uploaders and admins can delete resources"
ON resources
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid() 
  OR is_group_admin(group_id, auth.uid())
);

CREATE POLICY "Uploaders can update resources"
ON resources
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Update study_sessions policies
DROP POLICY IF EXISTS "Group members can view sessions" ON study_sessions;
DROP POLICY IF EXISTS "Group members can create sessions" ON study_sessions;
DROP POLICY IF EXISTS "Creators and admins can update sessions" ON study_sessions;
DROP POLICY IF EXISTS "Creators and admins can delete sessions" ON study_sessions;

CREATE POLICY "Group members can view sessions"
ON study_sessions
FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can create sessions"
ON study_sessions
FOR INSERT
TO authenticated
WITH CHECK (is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Creators and admins can update sessions"
ON study_sessions
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() 
  OR is_group_admin(group_id, auth.uid())
)
WITH CHECK (
  created_by = auth.uid() 
  OR is_group_admin(group_id, auth.uid())
);

CREATE POLICY "Creators and admins can delete sessions"
ON study_sessions
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() 
  OR is_group_admin(group_id, auth.uid())
);

-- Update quizzes policies
DROP POLICY IF EXISTS "Group members can view quizzes" ON quizzes;
DROP POLICY IF EXISTS "Group members can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Creators can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Creators can delete quizzes" ON quizzes;

CREATE POLICY "Group members can view quizzes"
ON quizzes
FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can create quizzes"
ON quizzes
FOR INSERT
TO authenticated
WITH CHECK (is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Creators can update quizzes"
ON quizzes
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete quizzes"
ON quizzes
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
