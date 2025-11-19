/*
  # Fix Notifications System

  1. Add Missing Policies
    - Add INSERT policy for notifications (required for triggers to work)
    - Add DELETE policy for users to delete their own notifications

  2. Add Notification Triggers for Messages
    - Notify users when they receive new direct messages
    - Notify users when they receive new group messages (optional)

  3. Add Notification Triggers for Friend Requests
    - Notify users when they receive friend requests
    - Notify users when their friend request is accepted
    - Notify users when their friend request is rejected

  This fixes the notification system so users are properly notified about:
  - Incoming messages
  - Friend requests
  - Friend request responses
*/

-- Add INSERT policy for notifications (needed for triggers)
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add DELETE policy so users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to notify user when they receive a direct message
CREATE OR REPLACE FUNCTION notify_user_on_direct_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
BEGIN
  -- Don't notify if user is sending message to themselves
  IF NEW.sender_id = NEW.recipient_id THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT COALESCE(full_name, email) INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;

  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.recipient_id,
    'direct_message',
    'New Message',
    sender_name || ' sent you a message',
    '/messages'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify user when they receive a friend request
CREATE OR REPLACE FUNCTION notify_user_on_connection_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name text;
BEGIN
  -- Only notify for pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester's name
  SELECT COALESCE(full_name, email) INTO requester_name 
  FROM profiles 
  WHERE id = NEW.requester_id;

  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.recipient_id,
    'friend_request',
    'New Friend Request',
    requester_name || ' sent you a friend request',
    '/connections'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify user when their friend request is accepted/rejected
CREATE OR REPLACE FUNCTION notify_user_on_connection_response()
RETURNS TRIGGER AS $$
DECLARE
  recipient_name text;
BEGIN
  -- Only notify if status changed from pending to accepted or rejected
  IF OLD.status = 'pending' AND (NEW.status = 'accepted' OR NEW.status = 'rejected') THEN
    -- Get recipient's name
    SELECT COALESCE(full_name, email) INTO recipient_name 
    FROM profiles 
    WHERE id = NEW.recipient_id;

    -- Create notification for requester
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.requester_id,
      'friend_request_response',
      CASE
        WHEN NEW.status = 'accepted' THEN 'Friend Request Accepted'
        ELSE 'Friend Request Rejected'
      END,
      CASE
        WHEN NEW.status = 'accepted' THEN recipient_name || ' accepted your friend request'
        ELSE recipient_name || ' rejected your friend request'
      END,
      '/connections'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for direct messages
DROP TRIGGER IF EXISTS trigger_direct_message_notification ON direct_messages;
CREATE TRIGGER trigger_direct_message_notification
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_direct_message();

-- Create triggers for friend requests
DROP TRIGGER IF EXISTS trigger_connection_request_notification ON user_connections;
CREATE TRIGGER trigger_connection_request_notification
  AFTER INSERT ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_connection_request();

DROP TRIGGER IF EXISTS trigger_connection_response_notification ON user_connections;
CREATE TRIGGER trigger_connection_response_notification
  AFTER UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_connection_response();
