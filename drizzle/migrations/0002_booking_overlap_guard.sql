ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.booking_compute_range(_date date, _start time, _hours numeric)
RETURNS tstzrange LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  select tstzrange(s, s + make_interval(secs => (_hours * 3600)::double precision), '[)')
  from (select ((_date + _start + case when _start < time '05:00' then interval '1 day' else interval '0' end)
          AT TIME ZONE 'Asia/Hong_Kong') as s) x
$$;

UPDATE public.booking_requests b SET starts_at = lower(r), ends_at = upper(r)
FROM (select id, public.booking_compute_range(event_date, start_time, duration_hours) r from public.booking_requests) x
WHERE x.id = b.id;

CREATE INDEX IF NOT EXISTS booking_requests_companion_range_idx ON public.booking_requests (companion_id, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.booking_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare r tstzrange;
begin
  r := public.booking_compute_range(NEW.event_date, NEW.start_time, NEW.duration_hours);
  NEW.starts_at := lower(r);
  NEW.ends_at := upper(r);
  if NEW.status in ('accepted','paid') then
    perform pg_advisory_xact_lock(hashtext(NEW.companion_id::text));
    if exists (
      select 1 from public.booking_requests o
      where o.companion_id = NEW.companion_id and o.id <> NEW.id
        and o.status in ('accepted','paid','completed')
        and o.starts_at < NEW.ends_at and o.ends_at > NEW.starts_at
    ) then
      raise exception 'This companion is already booked for part of that time' using errcode = 'P0001';
    end if;
  end if;
  return NEW;
end $$;

DROP TRIGGER IF EXISTS booking_before_write ON public.booking_requests;
CREATE TRIGGER booking_before_write BEFORE INSERT OR UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.booking_before_write();

CREATE OR REPLACE FUNCTION public.booking_after_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    update public.booking_requests o
      set status = 'declined', decline_reason = 'This slot was booked by someone else', updated_at = now()
    where o.companion_id = NEW.companion_id and o.id <> NEW.id and o.status = 'pending'
      and o.starts_at < NEW.ends_at and o.ends_at > NEW.starts_at;
  end if;
  return NEW;
end $$;

DROP TRIGGER IF EXISTS booking_after_accept ON public.booking_requests;
CREATE TRIGGER booking_after_accept AFTER UPDATE OF status ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.booking_after_accept();

CREATE OR REPLACE FUNCTION public.get_booked_slots(_companion_id uuid)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select starts_at, ends_at from public.booking_requests
  where companion_id = _companion_id and status in ('accepted','paid','completed')
    and ends_at > now()
  order by starts_at
$$;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid) TO anon, authenticated;