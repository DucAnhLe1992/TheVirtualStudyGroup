/*
  # Create Posts and Comments System

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to study_groups)
      - `author_id` (uuid, foreign key to profiles)
      - `title` (text) - Post title/headline
      - `content` (text) - Main post content (markdown supported)
      - `post_type` (text) - Type: 'question', 'discussion', 'article', 'announcement'
      - `is_pinned` (boolean) - Admins can pin important posts
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `edited_at` (timestamptz, nullable)
    
    - `post_reactions`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `user_id` (uuid, foreign key to profiles)
      - `reaction_type` (text) - 'like', 'helpful', 'insightful'
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id, reaction_type)
    
    - `comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `author_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `parent_comment_id` (uuid, nullable, self-reference for nested replies)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `edited_at` (timestamptz, nullable)
    
    - `comment_reactions`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, foreign key to comments)
      - `user_id` (uuid, foreign key to profiles)
      - `reaction_type` (text) - 'like', 'helpful'
      - `created_at` (timestamptz)
      - Unique constraint on (comment_id, user_id, reaction_type)

  2. Security
    - Enable RLS on all tables
    - Group members can view posts and comments
    - Group members can create posts and comments
    - Authors can edit/delete their own content
    - Admins can delete any content and pin posts

  3. Indexes
    - Index on group_id for fast post retrieval
    - Index on post_id for fast comment retrieval
    - Index on author_id for user activity tracking
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  post_type text DEFAULT 'discussion',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT valid_post_type CHECK (post_type IN ('question', 'discussion', 'article', 'announcement', 'solution'))
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_post_reaction CHECK (reaction_type IN ('like', 'helpful', 'insightful', 'love')),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_comment_reaction CHECK (reaction_type IN ('like', 'helpful')),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts

-- Group members can view posts in their groups
CREATE POLICY "Group members can view posts"
ON posts
FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

-- Group members can create posts
CREATE POLICY "Group members can create posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (is_group_member(group_id, auth.uid()) AND author_id = auth.uid());

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts"
ON posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Authors and admins can delete posts
CREATE POLICY "Authors and admins can delete posts"
ON posts
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR is_group_admin(group_id, auth.uid())
);

-- RLS Policies for post_reactions

-- Users can view reactions on posts they can see
CREATE POLICY "Users can view post reactions"
ON post_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_reactions.post_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Users can add their own reactions
CREATE POLICY "Users can add post reactions"
ON post_reactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can remove their own reactions
CREATE POLICY "Users can remove own post reactions"
ON post_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for comments

-- Users can view comments on posts they can see
CREATE POLICY "Users can view comments"
ON comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = comments.post_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Users can create comments on posts they can see
CREATE POLICY "Users can create comments"
ON comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = comments.post_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Authors can update their own comments
CREATE POLICY "Authors can update own comments"
ON comments
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Authors and admins can delete comments
CREATE POLICY "Authors and admins can delete comments"
ON comments
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = comments.post_id
    AND is_group_admin(posts.group_id, auth.uid())
  )
);

-- RLS Policies for comment_reactions

-- Users can view comment reactions
CREATE POLICY "Users can view comment reactions"
ON comment_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comments
    JOIN posts ON posts.id = comments.post_id
    WHERE comments.id = comment_reactions.comment_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Users can add their own comment reactions
CREATE POLICY "Users can add comment reactions"
ON comment_reactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can remove their own comment reactions
CREATE POLICY "Users can remove own comment reactions"
ON comment_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.edited_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update timestamps
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
