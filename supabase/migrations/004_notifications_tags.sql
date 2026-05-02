-- ─────────────────────────────────────────────────────────
-- Migration 004: Notifications table + Lead Tags
-- Run in Supabase SQL Editor (Primary Database)
-- ─────────────────────────────────────────────────────────

-- ── 1. Notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'info',
  title      text        NOT NULL,
  body       text,
  lead_id    uuid        REFERENCES public.leads(id) ON DELETE SET NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 2. Overdue action notification function ───────────────────
CREATE OR REPLACE FUNCTION public.create_overdue_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, lead_id)
  SELECT DISTINCT
    l.assigned_to,
    'overdue_action',
    'Overdue action: ' || l.company_name,
    'Next action was due ' || to_char(l.next_action_date, 'Mon DD') ||
      COALESCE(' — ' || l.next_action, ''),
    l.id
  FROM public.leads l
  WHERE l.next_action_date < CURRENT_DATE
    AND l.assigned_to IS NOT NULL
    AND l.stage NOT IN ('lost', 'unqualified', 'client_inactive')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.lead_id = l.id
        AND n.user_id = l.assigned_to
        AND n.type = 'overdue_action'
        AND n.created_at > now() - interval '24 hours'
    );
END;
$$;

-- ── 3. Schedule daily overdue check (08:00 UTC) ─────────────────
SELECT cron.schedule(
  'daily-overdue-notifications',
  '0 8 * * *',
  'SELECT public.create_overdue_notifications()'
);

-- ── 4. Lead tags ────────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS leads_tags_idx ON public.leads USING GIN(tags);