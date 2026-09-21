-- ENUMS
create type public.app_role as enum ('customer','companion','admin');
create type public.service_type as enum ('drinking','party','dj');
create type public.billing_type as enum ('package','hourly');
create type public.id_status as enum ('none','pending','approved','rejected');
create type public.profile_status as enum ('pending','approved','rejected');
create type public.booking_status as enum ('pending','accepted','declined','paid','completed','cancelled','expired');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  id_verification_status public.id_status not null default 'none',
  id_document_path text,
  id_reviewed_by uuid,
  id_reviewed_at timestamptz,
  id_reject_reason text,
  is_suspended boolean not null default false,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_suspended(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_suspended from public.profiles where id = _user_id), false)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- signup trigger: role assigned server-side, never admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested text;
begin
  insert into public.profiles (id, display_name, terms_accepted_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), now())
  on conflict (id) do nothing;
  requested := coalesce(new.raw_user_meta_data->>'role','customer');
  if requested not in ('customer','companion') then requested := 'customer'; end if;
  insert into public.user_roles (user_id, role) values (new.id, requested::public.app_role)
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- COMPANIONS
create table public.companions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  tagline text,
  bio text,
  age_range text,
  languages text[] not null default '{}',
  tags text[] not null default '{}',
  genres text[] not null default '{}',
  mix_links text[] not null default '{}',
  equipment_provides text,
  equipment_needs text,
  travel_fee numeric(10,2) not null default 0,
  areas text,
  is_active boolean not null default false,
  is_verified boolean not null default false,
  status public.profile_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.companions to anon;
grant select, insert, update, delete on public.companions to authenticated;
grant all on public.companions to service_role;
alter table public.companions enable row level security;
create policy "public read active companions" on public.companions for select to anon, authenticated using (is_active = true and status = 'approved');
create policy "owner read companion" on public.companions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "owner update companion" on public.companions for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin insert companion" on public.companions for insert to authenticated with check (public.has_role(auth.uid(),'admin') or user_id = auth.uid());
create policy "admin delete companion" on public.companions for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- COMPANION SERVICES (pricing)
create table public.companion_services (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions(id) on delete cascade,
  service_type public.service_type not null,
  billing_type public.billing_type not null default 'package',
  base_price numeric(10,2) not null default 0,
  base_hours integer not null default 4,
  min_hours integer not null default 4,
  extra_hour_price numeric(10,2) not null default 500,
  price_per_hour numeric(10,2) not null default 0,
  is_active boolean not null default true,
  unique (companion_id, service_type)
);
grant select on public.companion_services to anon;
grant select, insert, update, delete on public.companion_services to authenticated;
grant all on public.companion_services to service_role;
alter table public.companion_services enable row level security;
create policy "public read services" on public.companion_services for select to anon, authenticated using (
  exists (select 1 from public.companions c where c.id = companion_id and c.is_active and c.status = 'approved')
);
create policy "owner manage services" on public.companion_services for all to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
) with check (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
);

-- PHOTOS
create table public.companion_photos (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.companion_photos to anon;
grant select, insert, update, delete on public.companion_photos to authenticated;
grant all on public.companion_photos to service_role;
alter table public.companion_photos enable row level security;
create policy "public read approved photos" on public.companion_photos for select to anon, authenticated using (is_approved = true);
create policy "owner manage photos" on public.companion_photos for all to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
) with check (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
);

-- AVAILABILITY
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions(id) on delete cascade,
  date date not null,
  start_time time not null default '22:00',
  end_time time not null default '02:00',
  is_available boolean not null default true,
  unique (companion_id, date)
);
grant select on public.availability to anon;
grant select, insert, update, delete on public.availability to authenticated;
grant all on public.availability to service_role;
alter table public.availability enable row level security;
create policy "public read availability" on public.availability for select to anon, authenticated using (true);
create policy "owner manage availability" on public.availability for all to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
) with check (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
);

-- PRICING ADDONS
create table public.pricing_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  extra_hours integer not null,
  price_per_hour numeric(10,2) not null default 500,
  is_active boolean not null default true
);
grant select on public.pricing_addons to anon;
grant select, insert, update, delete on public.pricing_addons to authenticated;
grant all on public.pricing_addons to service_role;
alter table public.pricing_addons enable row level security;
create policy "public read addons" on public.pricing_addons for select to anon, authenticated using (is_active = true);
create policy "admin manage addons" on public.pricing_addons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- BOOKING REQUESTS
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  companion_id uuid not null references public.companions(id) on delete cascade,
  service_type public.service_type not null,
  event_date date not null,
  start_time time not null default '22:00',
  duration_hours numeric(4,1) not null default 4,
  extra_hours integer not null default 0,
  venue_name text not null,
  venue_address text not null,
  group_size integer not null default 2,
  event_type text,
  music_requests text,
  venue_equipment text[] not null default '{}',
  party_mode text,
  notes text,
  status public.booking_status not null default 'pending',
  decline_reason text,
  total_amount numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.booking_requests to authenticated;
grant all on public.booking_requests to service_role;
alter table public.booking_requests enable row level security;
create policy "customer read own bookings" on public.booking_requests for select to authenticated using (
  customer_id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
);
create policy "customer create booking" on public.booking_requests for insert to authenticated with check (
  customer_id = auth.uid()
  and not public.is_suspended(auth.uid())
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.id_verification_status = 'approved')
);
create policy "update own or assigned booking" on public.booking_requests for update to authenticated using (
  customer_id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.companions c where c.id = companion_id and c.user_id = auth.uid())
);

-- CART
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  companion_id uuid not null references public.companions(id) on delete cascade,
  service_type public.service_type not null,
  event_date date not null,
  start_time time not null default '22:00',
  hours numeric(4,1) not null default 4,
  extra_hours integer not null default 0,
  party_mode text,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests(id) on delete cascade,
  provider_session_id text unique,
  amount numeric(10,2) not null,
  currency text not null default 'HKD',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "read own payments" on public.payments for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.booking_requests b where b.id = booking_id and b.customer_id = auth.uid())
);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.booking_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  companion_id uuid not null references public.companions(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon;
grant select, insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "public read approved reviews" on public.reviews for select to anon, authenticated using (is_approved = true);
create policy "own reviews read" on public.reviews for select to authenticated using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "create review for completed booking" on public.reviews for insert to authenticated with check (
  customer_id = auth.uid() and exists (
    select 1 from public.booking_requests b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed'
  )
);
create policy "admin update reviews" on public.reviews for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- REPORTS
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid,
  companion_id uuid references public.companions(id) on delete set null,
  booking_id uuid references public.booking_requests(id) on delete set null,
  reason text not null,
  is_urgent boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "read own reports" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "create report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admin update reports" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- BLOCKS
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_user_id)
);
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.blocks enable row level security;
create policy "own blocks" on public.blocks for all to authenticated using (blocker_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (blocker_id = auth.uid());

-- SITE SETTINGS (CMS)
create table public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin write settings" on public.site_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.site_settings (key, value) values
 ('deposit_percent','30'),
 ('cancellation_hours','48'),
 ('contact_email','hello@hype.example'),
 ('home_headline','Great company for a great night out.'),
 ('home_subline','Hype connects you with a small, curated circle of social companions and DJs in Hong Kong. Platonic company, public venues, always classy.'),
 ('terms_text','Placeholder terms - edit in the admin area.'),
 ('privacy_text','Placeholder privacy policy - edit in the admin area.'),
 ('safety_text','Placeholder safety information - edit in the admin area.'),
 ('faq_text','Placeholder FAQ - edit in the admin area.');

insert into public.pricing_addons (name, extra_hours, price_per_hour) values
 ('+1 hour',1,500),('+2 hours',2,500),('+3 hours',3,500);

-- SEED COMPANIONS
insert into public.companions (id, display_name, tagline, bio, age_range, languages, tags, areas, is_active, is_verified, status) values
 ('11111111-1111-1111-1111-111111111111','Lexie','Outdoorsy, upbeat and always up for a good night out.','Sunshine energy, all night long. Lexie is an outgoing, easy-to-talk-to companion who''s happiest outdoors and never runs out of things to say. When she isn''t soaking up the sun, you''ll find her on the yoga mat or on a dance floor with a techno set playing. Whether you want a relaxed drink with good conversation or someone to bring the energy to a party, she''ll make the night feel effortless and make sure everyone at the table feels included.','25-29','{English,Cantonese}','{"Outdoor lover","Extrovert","Yoga","Techno"}','Central, Wan Chai',true,true,'approved'),
 ('22222222-2222-2222-2222-222222222222','Mia','Calm, curious and a very good listener.','Mia is the friend who makes a long dinner feel short. She loves wine bars, film talk and slow conversations, and she is equally happy keeping the energy up at a bigger table.','27-31','{English,Mandarin}','{"Wine","Film","Chill"}','Central, Sheung Wan',true,true,'approved'),
 ('33333333-3333-3333-3333-333333333333','Jas','Party starter with a playlist for everything.','Jas brings the energy. Birthdays, club nights, karaoke rooms - she keeps the group together and the night moving, and she always makes sure everyone feels included.','24-28','{English,Cantonese}','{"Party","Karaoke","Dancing"}','Tsim Sha Tsui, Lan Kwai Fong',true,true,'approved'),
 ('44444444-4444-4444-4444-444444444444','DJ Koa','Open format sets built for the room.','Koa reads a room fast and plays for it - house, techno and open format, mixed clean and loud enough to move a floor without drowning the conversation.','28-34','{English}','{"House","Techno","Open format"}','Hong Kong Island',true,true,'approved');

update public.companions set genres = '{House,Techno,"Open format"}', equipment_provides = 'Controller + speakers', equipment_needs = 'Power, table, monitors (optional)', travel_fee = 500, mix_links = '{https://soundcloud.com/discover}' where id = '44444444-4444-4444-4444-444444444444';

insert into public.companion_services (companion_id, service_type, billing_type, base_price, base_hours, min_hours, extra_hour_price, price_per_hour) values
 ('11111111-1111-1111-1111-111111111111','drinking','package',2800,4,4,500,0),
 ('11111111-1111-1111-1111-111111111111','party','package',3200,4,4,500,0),
 ('22222222-2222-2222-2222-222222222222','drinking','package',2600,4,4,500,0),
 ('33333333-3333-3333-3333-333333333333','party','package',3400,4,4,600,0),
 ('44444444-4444-4444-4444-444444444444','dj','hourly',0,3,3,0,1500);

insert into public.reviews (booking_id, customer_id, companion_id, rating, comment, is_approved)
select null, null, null, 5, null, true where false;
