/*
  # Add Voting System for Discussions Feature

  1. Changes to Existing Tables
    - Add `vote_count` (integer) to posts - Net upvotes minus downvotes
    - Add `view_count` (integer) to posts - Track post views
    - Add `best_answer_comment_id` (uuid) to posts - Reference to best answer comment
    - Add `vote_count` (integer) to comments - Net upvotes minus downvotes for answers
    - Add `is_best_answer` (boolean) to comments - Mark the accepted answer

  2. New Tables
    - `post_votes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `user_id` (uuid, foreign key to profiles)
      - `vote_type` (text) - 'up' or 'down'
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id) - one vote per user per post
    
    - `comment_votes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, foreign key to comments)
      - `user_id` (uuid, foreign key to profiles)
      - `vote_type` (text) - 'up' or 'down'
      - `created_at` (timestamptz)
      - Unique constraint on (comment_id, user_id) - one vote per user per comment

  3. Security
    - Enable RLS on vote tables
    - Users can view all votes
    - Users can only create/update/delete their own votes
    - Only post authors can mark best answers

  4. Functions
    - Automatic vote count updates via triggers
    - View count increment function
*/

-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new columns to posts table
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS vote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_answer_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL;

-- Add new columns to comments table
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS vote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_best_answer boolean DEFAULT false;

-- Enforce at most one best answer per post
CREATE UNIQUE INDEX IF NOT EXISTS one_best_answer_per_post
ON comments(post_id)
WHERE is_best_answer;

-- Create post_votes table
CREATE TABLE IF NOT EXISTS post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_post_vote_type CHECK (vote_type IN ('up', 'down')),
  UNIQUE(post_id, user_id)
);

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_comment_vote_type CHECK (vote_type IN ('up', 'down')),
  UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_vote_count ON posts(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_vote_count ON comments(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);

-- Enable RLS
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_votes

-- Users can view all post votes
CREATE POLICY "Users can view post votes"
ON post_votes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_votes.post_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Users can create their own votes
CREATE POLICY "Users can create post votes"
ON post_votes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own votes
CREATE POLICY "Users can update own post votes"
ON post_votes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own post votes"
ON post_votes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for comment_votes

-- Users can view all comment votes
CREATE POLICY "Users can view comment votes"
ON comment_votes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comments
    JOIN posts ON posts.id = comments.post_id
    WHERE comments.id = comment_votes.comment_id
    AND is_group_member(posts.group_id, auth.uid())
  )
);

-- Users can create their own comment votes
CREATE POLICY "Users can create comment votes"
ON comment_votes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own comment votes
CREATE POLICY "Users can update own comment votes"
ON comment_votes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comment votes
CREATE POLICY "Users can delete own comment votes"
ON comment_votes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to update post vote count
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE posts
    SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET vote_count = vote_count - (CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment vote count
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments
    SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END)
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE comments
    SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END)
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments
    SET vote_count = vote_count - (CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic vote count updates
DROP TRIGGER IF EXISTS update_post_vote_count_trigger ON post_votes;
CREATE TRIGGER update_post_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON post_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_vote_count();

DROP TRIGGER IF EXISTS update_comment_vote_count_trigger ON comment_votes;
CREATE TRIGGER update_comment_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_vote_count();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce that best_answer_comment_id references a comment on the same post
CREATE OR REPLACE FUNCTION enforce_best_answer_comment_same_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.best_answer_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM comments c
    WHERE c.id = NEW.best_answer_comment_id
      AND c.post_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'best_answer_comment_id must reference a comment on the same post';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_best_answer_comment_same_post ON posts;
CREATE TRIGGER trg_enforce_best_answer_comment_same_post
BEFORE INSERT OR UPDATE OF best_answer_comment_id ON posts
FOR EACH ROW
EXECUTE FUNCTION enforce_best_answer_comment_same_post();

-- Function to mark best answer (only post author can call)
CREATE OR REPLACE FUNCTION mark_best_answer(post_uuid uuid, comment_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Check if caller is the post author
  IF NOT EXISTS (
    SELECT 1 FROM posts
    WHERE id = post_uuid AND author_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only post author can mark best answer';
  END IF;

  -- Update post with best answer
  UPDATE posts
  SET best_answer_comment_id = comment_uuid
  WHERE id = post_uuid;

  -- Mark comment as best answer
  UPDATE comments
  SET is_best_answer = true
  WHERE id = comment_uuid;

  -- Unmark any other best answers for this post
  UPDATE comments
  SET is_best_answer = false
  WHERE post_id = post_uuid AND id != comment_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unmark best answer
CREATE OR REPLACE FUNCTION unmark_best_answer(post_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Check if caller is the post author
  IF NOT EXISTS (
    SELECT 1 FROM posts
    WHERE id = post_uuid AND author_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only post author can unmark best answer';
  END IF;

  -- Clear best answer from post
  UPDATE posts
  SET best_answer_comment_id = NULL
  WHERE id = post_uuid;

  -- Unmark all comments
  UPDATE comments
  SET is_best_answer = false
  WHERE post_id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
