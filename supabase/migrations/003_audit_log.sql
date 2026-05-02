-- ─────────────────────────────────────────────────────────
-- Migration 003: Audit Log + Deal Value
-- Run in Supabase SQL Editor (Primary Database)
-- ─────────────────────────────────────────────────────────

-- ── 1. Deal value column ──────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deal_value numeric(15,2);

-- ── 2. Audit log table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  summary     text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx      ON public.audit_log (entity_type, entity_id);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can insert audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 4. Trigger: leads ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_leads_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action  text;
  v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'created';
    v_summary := 'Lead created: ' || NEW.company_name;
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, summary, new_data)
    VALUES (auth.uid(), v_action, 'lead', NEW.id, v_summary, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
      v_action  := 'stage_change';
      v_summary := NEW.company_name || ': ' || OLD.stage || ' → ' || NEW.stage;
    ELSE
      v_action  := 'updated';
      v_summary := 'Lead updated: ' || NEW.company_name;
    END IF;
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (auth.uid(), v_action, 'lead', NEW.id, v_summary, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'deleted';
    v_summary := 'Lead deleted: ' || OLD.company_name;
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, summary, old_data)
    VALUES (auth.uid(), v_action, 'lead', OLD.id, v_summary, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_leads ON public.leads;
CREATE TRIGGER audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_leads_changes();

-- ── 5. Trigger: profile changes ─────────────────────────
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_admin IS DISTINCT FROM NEW.is_admin) THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (
      auth.uid(), 'profile_update', 'profile', NEW.id,
      'Profile updated: ' || NEW.full_name
        || CASE WHEN OLD.role IS DISTINCT FROM NEW.role
             THEN ' | role: ' || COALESCE(OLD.role::text,'—') || '→' || COALESCE(NEW.role::text,'—')
             ELSE '' END
        || CASE WHEN OLD.is_admin IS DISTINCT FROM NEW.is_admin
             THEN ' | admin: ' || OLD.is_admin::text || '→' || NEW.is_admin::text
             ELSE '' END,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();