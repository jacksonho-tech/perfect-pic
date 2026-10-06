-- lovable-cron-fallback-reviewed: user explicitly requested a persisted 15-minute expiry job
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'expire-pending-booking-requests',
  '*/15 * * * *',
  $$
  UPDATE public.booking_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '24 hours';
  $$
);