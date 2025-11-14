/*
  # Enhanced Sessions with Meeting Integration

  1. Updates to study_sessions
    - Add `meeting_link` column for external video meeting URL
    - Add `meeting_platform` column (zoom, google_meet, jitsi, other)
    - Add `meeting_password` column (optional)
    - Add `max_participants` column
    - Add `materials_url` column for pre-session materials
    - Add `recording_url` column for post-session recording
    - Add `notes` column for session notes/summary
    
  2. New Tables
    - `session_materials`
      - Uploaded files and links shared during session
    
    - `session_chat`
      - Text chat during live session
    
    - `session_polls`
      - Live polls during session

  3. Security
    - Only session creator and group admins can edit session details
    - All group members can view sessions
    - Only participants can access session materials and chat
*/

-- Add new columns to study_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN meeting_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'meeting_platform'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN meeting_platform text DEFAULT 'other';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'meeting_password'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN meeting_password text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN max_participants integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'materials_url'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN materials_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'recording_url'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN recording_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN notes text;
  END IF;
END $$;

-- Create session_materials table
CREATE TABLE IF NOT EXISTS session_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  material_type text DEFAULT 'document',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_material_type CHECK (material_type IN ('document', 'presentation', 'spreadsheet', 'link', 'video', 'other'))
);

-- Create session_chat table for live session chat
CREATE TABLE IF NOT EXISTS session_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_chat_message_type CHECK (message_type IN ('text', 'system', 'announcement'))
);

-- Create session_polls table
CREATE TABLE IF NOT EXISTS session_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  is_active boolean DEFAULT true,
  allow_multiple boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  ends_at timestamptz
);

-- Create poll_responses table
CREATE TABLE IF NOT EXISTS session_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES session_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_options jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_materials_session ON session_materials(session_id);
CREATE INDEX IF NOT EXISTS idx_session_chat_session ON session_chat(session_id);
CREATE INDEX IF NOT EXISTS idx_session_chat_created_at ON session_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_polls_session ON session_polls(session_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON session_poll_responses(poll_id);

-- Enable RLS
ALTER TABLE session_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_materials

-- Group members can view session materials
CREATE POLICY "Group members can view session materials"
ON session_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_materials.session_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Group members can upload materials
CREATE POLICY "Group members can upload materials"
ON session_materials
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_materials.session_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Uploaders and admins can delete materials
CREATE POLICY "Uploaders and admins can delete materials"
ON session_materials
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_materials.session_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
  )
);

-- RLS Policies for session_chat

-- Participants can view session chat
CREATE POLICY "Participants can view session chat"
ON session_chat
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_chat.session_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Participants can send messages
CREATE POLICY "Participants can send chat messages"
ON session_chat
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_chat.session_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- RLS Policies for session_polls

-- Participants can view polls
CREATE POLICY "Participants can view polls"
ON session_polls
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM study_sessions
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE study_sessions.id = session_polls.session_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Session creator and admins can create polls
CREATE POLICY "Hosts can create polls"
ON session_polls
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM study_sessions
    WHERE study_sessions.id = session_polls.session_id
    AND (
      study_sessions.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_memberships
        WHERE group_memberships.group_id = study_sessions.group_id
        AND group_memberships.user_id = auth.uid()
        AND group_memberships.role = 'admin'
      )
    )
  )
);

-- Creators can update their polls
CREATE POLICY "Creators can update polls"
ON session_polls
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- RLS Policies for session_poll_responses

-- Users can view poll responses for polls they can see
CREATE POLICY "Participants can view poll responses"
ON session_poll_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM session_polls
    JOIN study_sessions ON session_polls.session_id = study_sessions.id
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE session_polls.id = session_poll_responses.poll_id
    AND group_memberships.user_id = auth.uid()
  )
);

-- Participants can submit responses
CREATE POLICY "Participants can submit poll responses"
ON session_poll_responses
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM session_polls
    JOIN study_sessions ON session_polls.session_id = study_sessions.id
    JOIN group_memberships ON study_sessions.group_id = group_memberships.group_id
    WHERE session_polls.id = session_poll_responses.poll_id
    AND group_memberships.user_id = auth.uid()
    AND session_polls.is_active = true
  )
);

-- Users can update their own responses
CREATE POLICY "Users can update own responses"
ON session_poll_responses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
