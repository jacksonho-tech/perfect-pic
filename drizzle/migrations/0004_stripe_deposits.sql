ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_session_uidx ON public.payments(provider_session_id);
GRANT SELECT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
DROP POLICY IF EXISTS "admin update payments" ON public.payments;
CREATE POLICY "admin update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;