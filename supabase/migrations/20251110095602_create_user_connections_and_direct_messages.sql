/*
  # User Connections and Direct Messaging System

  1. New Tables
    - `user_connections`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, foreign key to profiles) - User who sent request
      - `recipient_id` (uuid, foreign key to profiles) - User who received request
      - `status` (text) - 'pending', 'accepted', 'rejected', 'blocked'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (requester_id, recipient_id)
    
    - `direct_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to profiles)
      - `recipient_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `read` (boolean) - Whether message has been read
      - `created_at` (timestamptz)
      - `edited_at` (timestamptz, nullable)
    
    - `direct_message_reactions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to direct_messages)
      - `user_id` (uuid, foreign key to profiles)
      - `reaction_type` (text)
      - `created_at` (timestamptz)
      - Unique constraint on (message_id, user_id, reaction_type)

  2. Security
    - Enable RLS on all tables
    - Users can view their own connections
    - Users can send connection requests
    - Users can accept/reject requests
    - Users can send messages to connected users
    - Users can only read their own messages

  3. Indexes
    - Index on requester_id and recipient_id for fast lookups
    - Index on sender_id and recipient_id for message queries
    - Index on created_at for chronological ordering
*/

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_connection_status CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  CONSTRAINT no_self_connection CHECK (requester_id != recipient_id),
  UNIQUE(requester_id, recipient_id)
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Create direct_message_reactions table
CREATE TABLE IF NOT EXISTS direct_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dm_reaction CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry')),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_recipient ON user_connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_reactions_message ON direct_message_reactions(message_id);

-- Enable RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_connections

-- Users can view connections where they are involved
CREATE POLICY "Users can view own connections"
ON user_connections
FOR SELECT
TO authenticated
USING (
  requester_id = auth.uid()
  OR recipient_id = auth.uid()
);

-- Users can create connection requests
CREATE POLICY "Users can create connection requests"
ON user_connections
FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

-- Users can update connections where they are the recipient (accept/reject)
CREATE POLICY "Recipients can update connection status"
ON user_connections
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Users can delete their own connection requests or accepted connections
CREATE POLICY "Users can delete own connections"
ON user_connections
FOR DELETE
TO authenticated
USING (
  requester_id = auth.uid()
  OR recipient_id = auth.uid()
);

-- RLS Policies for direct_messages

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
ON direct_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
);

-- Users can send messages to connected users
CREATE POLICY "Users can send messages to connections"
ON direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND recipient_id = direct_messages.recipient_id)
      OR (recipient_id = auth.uid() AND requester_id = direct_messages.recipient_id)
    )
  )
);

-- Users can update their own sent messages and mark received messages as read
CREATE POLICY "Users can update own messages"
ON direct_messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
)
WITH CHECK (
  sender_id = auth.uid()
  OR (recipient_id = auth.uid() AND read = true)
);

-- Users can delete their own sent messages
CREATE POLICY "Users can delete own sent messages"
ON direct_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- RLS Policies for direct_message_reactions

-- Users can view reactions on messages they're involved in
CREATE POLICY "Users can view message reactions"
ON direct_message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM direct_messages
    WHERE direct_messages.id = direct_message_reactions.message_id
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

-- Users can add reactions to messages they're involved in
CREATE POLICY "Users can add reactions"
ON direct_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM direct_messages
    WHERE direct_messages.id = direct_message_reactions.message_id
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON direct_message_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_connections_timestamp ON user_connections;
CREATE TRIGGER update_user_connections_timestamp
  BEFORE UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_timestamp();
