/*
  # Add Creator as Admin Trigger

  1. Function
    - `add_creator_as_admin()` - Automatically adds group creator as admin member

  2. Trigger
    - Fires after a new study_groups row is inserted
    - Creates a group_memberships entry with role='admin' for the creator

  This ensures the group creator is always counted as a member and has admin privileges.
*/

-- Function to add creator as admin when group is created
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as an admin member
  INSERT INTO group_memberships (group_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_creator_as_admin ON study_groups;
CREATE TRIGGER trigger_add_creator_as_admin
  AFTER INSERT ON study_groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_admin();
