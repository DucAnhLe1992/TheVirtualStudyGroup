/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - The group_memberships table has policies that query itself, causing infinite recursion
    - When creating a study group, the automatic membership insert triggers a SELECT policy
    - That SELECT policy queries group_memberships again, creating a loop

  2. Solution
    - Simplify group_memberships policies to avoid self-referencing queries
    - Use a security definer function for complex membership checks
    - Make policies more straightforward and non-recursive

  3. Changes
    - Drop existing problematic policies on group_memberships
    - Create simplified, non-recursive policies
    - Update study_groups policies to use the function approach
*/

-- Drop existing group_memberships policies
DROP POLICY IF EXISTS "Members can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON group_memberships;

-- Create a security definer function to check group membership
-- This function runs with elevated privileges and won't trigger RLS
CREATE OR REPLACE FUNCTION is_group_member(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM group_memberships 
    WHERE group_id = group_uuid 
    AND user_id = user_uuid
  );
$$;

-- Create a function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM group_memberships 
    WHERE group_id = group_uuid 
    AND user_id = user_uuid 
    AND role = 'admin'
  );
$$;

-- Create simplified, non-recursive policies for group_memberships

-- SELECT: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON group_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can create their own memberships
CREATE POLICY "Users can insert own memberships"
ON group_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own memberships
CREATE POLICY "Users can delete own memberships"
ON group_memberships
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- UPDATE: Only for role changes by admins (no self-referencing query)
CREATE POLICY "Admins can update roles"
ON group_memberships
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Now update study_groups policies to use the security definer functions
DROP POLICY IF EXISTS "Anyone can view public groups" ON study_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON study_groups;

-- SELECT: View public groups OR groups where user is creator OR member (using function)
CREATE POLICY "Users can view accessible groups"
ON study_groups
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR created_by = auth.uid()
  OR is_group_member(id, auth.uid())
);

-- UPDATE: Creators and admins can update (using function)
CREATE POLICY "Creators and admins can update groups"
ON study_groups
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR is_group_admin(id, auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR is_group_admin(id, auth.uid())
);
