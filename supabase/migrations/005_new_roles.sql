-- Migration 005: Add ceo, coo, ksa_clevel, moderator roles
-- Run in Supabase SQL Editor

-- 1. Extend user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ksa_clevel';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2. Update is_manager() to include all executive roles
--    (used by leads_read_own and leads_update_own_or_manager policies)
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('cco','bd_tl','ceo','coo','ksa_clevel') FROM profiles WHERE id = auth.uid()
$$;

-- 3. DROP and recreate leads_insert policy to include new roles
DROP POLICY IF EXISTS "leads_insert_rep_or_import" ON leads;
CREATE POLICY "leads_insert_rep_or_import" ON leads
  FOR INSERT WITH CHECK (
    auth_role() IN ('cco','bd_tl','bd_rep','ceo','coo')
    OR (auth_role() = 'ksa_clevel' AND entity = 'KSA')
    OR (auth_role() = 'moderator')
    OR (SELECT can_import FROM profiles WHERE id = auth.uid())
  );

-- 4. Moderator-specific: can read all leads (is_manager covers UPDATE/SELECT via existing policy)
--    Moderator is not a manager so add explicit SELECT
CREATE POLICY "moderator_leads_select" ON leads
  FOR SELECT USING (auth_role() = 'moderator');

CREATE POLICY "moderator_leads_update" ON leads
  FOR UPDATE USING (auth_role() = 'moderator');

-- 5. CEO/COO full profiles access (for exec dashboard team view)
DROP POLICY IF EXISTS "profiles_all_cco" ON profiles;
CREATE POLICY "profiles_all_exec" ON profiles
  FOR ALL USING (auth_role() IN ('cco','ceo','coo','ksa_clevel'));

-- 6. Moderator profiles read (to look up reps)
CREATE POLICY "moderator_profiles_read" ON profiles
  FOR SELECT USING (auth_role() = 'moderator');

