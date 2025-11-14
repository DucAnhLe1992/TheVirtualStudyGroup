/*
  # Group Join Requests and Invitations System

  1. New Tables
    - `group_join_requests`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to study_groups)
      - `user_id` (uuid, foreign key to profiles)
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `message` (text, nullable) - Optional message from requester
      - `reviewed_by` (uuid, nullable, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (group_id, user_id) where status = 'pending'
    
    - `group_invitations`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to study_groups)
      - `invited_by` (uuid, foreign key to profiles) - Admin who sent invitation
      - `invited_user_id` (uuid, foreign key to profiles)
      - `status` (text) - 'pending', 'accepted', 'rejected', 'expired'
      - `expires_at` (timestamptz) - Invitation expiry
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Enhanced Group Memberships
    - Add `invited_by` column to track who invited the member
    - Add `can_invite` permission flag for moderators

  3. Security
    - Enable RLS on all tables
    - Users can create join requests for public/private groups
    - Admins can view and manage join requests
    - Admins can create invitations
    - Invited users can accept/reject invitations

  4. Indexes
    - Index on group_id for fast filtering
    - Index on user_id for user's requests
    - Index on status for pending requests
*/

-- Create group_join_requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create group_invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_invitation_status CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  CONSTRAINT no_self_invitation CHECK (invited_by != invited_user_id)
);

-- Add columns to group_memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_memberships' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE group_memberships ADD COLUMN invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_memberships' AND column_name = 'can_invite'
  ) THEN
    ALTER TABLE group_memberships ADD COLUMN can_invite boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_group ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON group_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON group_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON group_invitations(status);

-- Enable RLS
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_join_requests

-- Users can view their own requests
CREATE POLICY "Users can view own join requests"
ON group_join_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Group admins can view requests for their groups
CREATE POLICY "Admins can view group join requests"
ON group_join_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_join_requests.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
);

-- Users can create join requests if not already a member
CREATE POLICY "Users can create join requests"
ON group_join_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_join_requests.group_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Admins can update join requests (approve/reject)
CREATE POLICY "Admins can update join requests"
ON group_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_join_requests.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_join_requests.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
);

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own join requests"
ON group_join_requests
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

-- RLS Policies for group_invitations

-- Invited users can view their invitations
CREATE POLICY "Users can view own invitations"
ON group_invitations
FOR SELECT
TO authenticated
USING (invited_user_id = auth.uid());

-- Admins can view invitations they sent
CREATE POLICY "Admins can view sent invitations"
ON group_invitations
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON group_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_invitations.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
);

-- Invited users can update invitation status (accept/reject)
CREATE POLICY "Invited users can update invitations"
ON group_invitations
FOR UPDATE
TO authenticated
USING (invited_user_id = auth.uid())
WITH CHECK (invited_user_id = auth.uid());

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON group_invitations
FOR DELETE
TO authenticated
USING (
  invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = group_invitations.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
);

-- Function to auto-approve requests for public groups
CREATE OR REPLACE FUNCTION auto_approve_public_group_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM study_groups
    WHERE id = NEW.group_id
    AND is_public = true
  ) THEN
    NEW.status := 'approved';
    NEW.reviewed_by := NEW.user_id;
    
    -- Automatically add to group
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES (NEW.group_id, NEW.user_id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_approve_public_requests ON group_join_requests;
CREATE TRIGGER auto_approve_public_requests
  BEFORE INSERT ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_public_group_requests();

-- Function to add member when request approved
CREATE OR REPLACE FUNCTION add_member_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES (NEW.group_id, NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS add_member_on_request_approval ON group_join_requests;
CREATE TRIGGER add_member_on_request_approval
  AFTER UPDATE ON group_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION add_member_on_approval();

-- Function to add member when invitation accepted
CREATE OR REPLACE FUNCTION add_member_on_invitation_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO group_memberships (group_id, user_id, role, invited_by)
    VALUES (NEW.group_id, NEW.invited_user_id, 'member', NEW.invited_by)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS add_member_on_invitation_acceptance ON group_invitations;
CREATE TRIGGER add_member_on_invitation_acceptance
  AFTER UPDATE ON group_invitations
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION add_member_on_invitation_accept();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_join_request_timestamp ON group_join_requests;
CREATE TRIGGER update_join_request_timestamp
  BEFORE UPDATE ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_request_timestamp();

DROP TRIGGER IF EXISTS update_invitation_timestamp ON group_invitations;
CREATE TRIGGER update_invitation_timestamp
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_request_timestamp();
