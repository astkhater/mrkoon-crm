-- Migration 006: merge_leads() RPC
-- Atomically merges two lead records: updates the kept lead with chosen field values,
-- reassigns all audit_log + notification history, then deletes the duplicate.

CREATE OR REPLACE FUNCTION public.merge_leads(
  keep_id     uuid,
  drop_id     uuid,
  merged_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permission check: managers, admins, and moderators can merge
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_admin = true OR role IN ('cco','ceo','coo','ksa_clevel','bd_tl','moderator'))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to merge leads';
  END IF;

  -- Update kept lead with merged field values
  UPDATE leads SET
    company_name        = COALESCE(merged_data->>'company_name',        company_name),
    stage               = COALESCE(merged_data->>'stage',               stage),
    lead_source         = merged_data->>'lead_source',
    contact_name        = merged_data->>'contact_name',
    contact_title       = merged_data->>'contact_title',
    phone               = merged_data->>'phone',
    estimated_gmv_month = NULLIF(merged_data->>'estimated_gmv_month','')::numeric,
    deal_success_rate   = NULLIF(merged_data->>'deal_success_rate','')::numeric,
    deal_value          = NULLIF(merged_data->>'deal_value','')::numeric,
    next_action         = merged_data->>'next_action',
    next_action_date    = NULLIF(merged_data->>'next_action_date','')::date
  WHERE id = keep_id;

  -- Reassign audit log history from dropped lead to kept lead
  UPDATE audit_log
  SET entity_id = keep_id
  WHERE entity_id = drop_id AND entity_type = 'lead';

  -- Reassign notifications
  UPDATE notifications
  SET lead_id = keep_id
  WHERE lead_id = drop_id;

  -- Delete the duplicate
  DELETE FROM leads WHERE id = drop_id;

  -- Log the merge itself
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, summary)
  VALUES (
    auth.uid(), 'merged', 'lead', keep_id,
    'Lead merged: absorbed record ' || drop_id::text
  );
END;
$$;

-- Grant execute to authenticated users (RLS enforced inside function)
GRANT EXECUTE ON FUNCTION public.merge_leads(uuid, uuid, jsonb) TO authenticated;
