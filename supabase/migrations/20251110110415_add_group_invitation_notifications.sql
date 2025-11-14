/*
  # Add Group Invitation Notifications

  1. Triggers
    - Create trigger to send notification when user receives group invitation
    - Create trigger to notify admin when join request is created
    - Create trigger to notify requester when join request is approved/rejected

  2. Functions
    - `notify_user_on_group_invitation()` - Notifies user when they receive an invitation
    - `notify_admin_on_join_request()` - Notifies admins when someone requests to join
    - `notify_user_on_request_response()` - Notifies user when their request is reviewed

  This ensures users are notified about group-related actions through the notifications system.
*/

-- Function to notify user when they receive a group invitation
CREATE OR REPLACE FUNCTION notify_user_on_group_invitation()
RETURNS TRIGGER AS $$
DECLARE
  group_name text;
  inviter_name text;
BEGIN
  -- Get group name
  SELECT name INTO group_name FROM study_groups WHERE id = NEW.group_id;

  -- Get inviter's name
  SELECT COALESCE(full_name, email) INTO inviter_name FROM profiles WHERE id = NEW.invited_by;

  -- Create notification for invited user
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.invited_user_id,
    'group_invitation',
    'Group Invitation',
    inviter_name || ' invited you to join ' || group_name,
    '/groups'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify admins when someone requests to join their group
CREATE OR REPLACE FUNCTION notify_admin_on_join_request()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  group_name text;
  requester_name text;
BEGIN
  -- Get group name
  SELECT name INTO group_name FROM study_groups WHERE id = NEW.group_id;

  -- Get requester's name
  SELECT COALESCE(full_name, email) INTO requester_name FROM profiles WHERE id = NEW.user_id;

  -- Notify all admins of the group
  FOR admin_record IN
    SELECT user_id FROM group_memberships
    WHERE group_id = NEW.group_id AND role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      admin_record.user_id,
      'join_request',
      'New Join Request',
      requester_name || ' wants to join ' || group_name,
      '/groups'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify user when their join request is reviewed
CREATE OR REPLACE FUNCTION notify_user_on_request_response()
RETURNS TRIGGER AS $$
DECLARE
  group_name text;
BEGIN
  -- Only notify if status changed from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    -- Get group name
    SELECT name INTO group_name FROM study_groups WHERE id = NEW.group_id;

    -- Create notification for the requester
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'join_request_response',
      CASE
        WHEN NEW.status = 'approved' THEN 'Request Approved'
        ELSE 'Request Rejected'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Your request to join ' || group_name || ' was approved!'
        ELSE 'Your request to join ' || group_name || ' was rejected.'
      END,
      '/groups'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_group_invitation_notification ON group_invitations;
CREATE TRIGGER trigger_group_invitation_notification
  AFTER INSERT ON group_invitations
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_user_on_group_invitation();

DROP TRIGGER IF EXISTS trigger_join_request_notification ON group_join_requests;
CREATE TRIGGER trigger_join_request_notification
  AFTER INSERT ON group_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admin_on_join_request();

DROP TRIGGER IF EXISTS trigger_request_response_notification ON group_join_requests;
CREATE TRIGGER trigger_request_response_notification
  AFTER UPDATE ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_request_response();
