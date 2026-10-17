-- Home Key Clean: database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client','pro')),
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.pros (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  biz text not null,
  bio text not null default '',
  services text[] not null default '{}',
  zip_prefixes int[] not null default '{}',
  shown int not null default 0,
  last_shown timestamptz not null default 'epoch',
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  svc text not null,
  details text[] not null default '{}',
  timing text,
  freq text,
  notes text not null default '',
  zip text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  pro_id uuid not null references public.pros(id) on delete cascade,
  status text not null default 'offered' check (status in ('offered','requested','accepted','declined')),
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, pro_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  pro_id uuid not null references public.pros(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  from_role text not null check (from_role in ('client','pro')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_thread on public.messages (request_id, pro_id, created_at);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (request_id, pro_id)
);

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  amount int not null default 20,
  created_at timestamptz not null default now(),
  unique (request_id, pro_id)
);

alter table public.charges add column if not exists payment_intent text;
alter table public.charges add column if not exists status text not null default 'recorded';

-- Stripe customer for each pro. Never readable from the website (service role only).
create table if not exists public.pro_billing (
  pro_id uuid primary key references public.pros(id) on delete cascade,
  stripe_customer_id text not null
);

-- Helper checks (security definer so row-level policies don't call each other in a loop)
create or replace function public.is_client_of(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from requests where id = rid and client_id = auth.uid());
$$;

create or replace function public.is_pro_on(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from offers where request_id = rid and pro_id = auth.uid() and status <> 'offered');
$$;

revoke all on function public.is_client_of(uuid) from public, anon;
revoke all on function public.is_pro_on(uuid) from public, anon;
grant execute on function public.is_client_of(uuid) to authenticated;
grant execute on function public.is_pro_on(uuid) to authenticated;

-- Lock everything down, then grant only what the site needs.
alter table public.profiles enable row level security;
alter table public.pros     enable row level security;
alter table public.requests enable row level security;
alter table public.offers   enable row level security;
alter table public.messages enable row level security;
alter table public.reviews  enable row level security;
alter table public.charges  enable row level security;
alter table public.pro_billing enable row level security;

revoke all on public.profiles, public.pros, public.requests, public.offers, public.messages, public.reviews, public.charges, public.pro_billing from anon, authenticated;

grant select on public.profiles, public.pros, public.requests, public.offers, public.messages, public.reviews, public.charges to authenticated;
grant insert (id, role, name, email, phone) on public.profiles to authenticated;
grant update (name, phone) on public.profiles to authenticated;
grant insert (id, name, biz, bio, services, zip_prefixes) on public.pros to authenticated;
grant update (name, biz, bio, services, zip_prefixes) on public.pros to authenticated;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists pros_select on public.pros;
drop policy if exists pros_insert on public.pros;
drop policy if exists pros_update on public.pros;
create policy pros_select on public.pros for select to authenticated using (true);
create policy pros_insert on public.pros for insert to authenticated
  with check (id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'pro'));
create policy pros_update on public.pros for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select to authenticated
  using (client_id = auth.uid() or public.is_pro_on(id));

drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated
  using (pro_id = auth.uid() or public.is_client_of(request_id));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.is_client_of(request_id)
         or (pro_id = auth.uid() and exists (select 1 from offers o where o.request_id = messages.request_id and o.pro_id = auth.uid() and o.status = 'accepted')));

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to authenticated using (true);

drop policy if exists charges_select on public.charges;
create policy charges_select on public.charges for select to authenticated using (pro_id = auth.uid());

-- Client submits a request: saved, then matched to up to 5 pros on a fair rotation
-- (pros shown least often go first, then the longest-waiting).
create or replace function public.submit_request(
  p_svc text, p_details text[], p_timing text, p_freq text, p_notes text, p_zip text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid; pfx int; pid uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'client') then
    raise exception 'Only client accounts can request services';
  end if;
  if p_zip !~ '^\d{5}$' then raise exception 'Enter a 5-digit ZIP code'; end if;
  pfx := left(p_zip, 3)::int;
  insert into requests (client_id, svc, details, timing, freq, notes, zip)
    values (auth.uid(), p_svc, coalesce(p_details, '{}'), p_timing, p_freq, coalesce(p_notes, ''), p_zip)
    returning id into rid;
  for pid in
    select id from pros
    where p_svc = any (services) and pfx = any (zip_prefixes)
    order by shown, last_shown, random()
    limit 5
    for update
  loop
    update pros set shown = shown + 1, last_shown = now() where id = pid;
    insert into offers (request_id, pro_id) values (rid, pid);
  end loop;
  return rid;
end $$;

-- Client asks one or more pros for a quote. Sends the job details as the first message.
create or replace function public.request_quotes(p_request uuid, p_pros uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_client_of(p_request) then raise exception 'Request not found'; end if;
  -- Asking for a quote only flags the request. No message is sent; messaging opens after the pro accepts and pays.
  update offers set status = 'requested', updated_at = now()
    where request_id = p_request and pro_id = any (p_pros) and status = 'offered';
  get diagnostics n = row_count;
  return n;
end $$;

-- Either side sends a message. Clients can message any matched pro; pros can reply after accepting.
create or replace function public.send_message(p_request uuid, p_pro uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype; body text := btrim(coalesce(p_body, ''));
begin
  if length(body) = 0 then raise exception 'Message is empty'; end if;
  if is_client_of(p_request) then
    select * into o from offers where request_id = p_request and pro_id = p_pro;
    if not found then raise exception 'That pro is not matched to this request'; end if;
    if o.status <> 'accepted' then raise exception 'Messaging opens after the pro accepts your request'; end if;
    insert into messages (request_id, pro_id, sender_id, from_role, body) values (p_request, p_pro, auth.uid(), 'client', body);
  elsif p_pro = auth.uid() then
    select * into o from offers where request_id = p_request and pro_id = auth.uid();
    if not found then raise exception 'Request not found'; end if;
    if o.status <> 'accepted' then raise exception 'Accept this request before replying'; end if;
    insert into messages (request_id, pro_id, sender_id, from_role, body) values (p_request, p_pro, auth.uid(), 'pro', body);
  else
    raise exception 'Not allowed';
  end if;
end $$;

-- Pro declines (free). Accepting costs $20 and is done only by the server-side billing function,
-- which charges the pro's card first and then calls finalize_accept below.
create or replace function public.respond_offer(p_offer uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype;
begin
  if p_accept then raise exception 'Accepting a request requires the $20 card payment. Use the Accept button in the pro portal.'; end if;
  select * into o from offers where id = p_offer and pro_id = auth.uid() for update;
  if not found then raise exception 'Request not found'; end if;
  if o.status <> 'requested' then raise exception 'This request can no longer be changed'; end if;
  update offers set status = 'declined', updated_at = now() where id = o.id;
end $$;

-- Called only by the billing function (service role) after the $20 payment succeeds.
create or replace function public.finalize_accept(p_offer uuid, p_pro uuid, p_pi text) returns void
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype;
begin
  select * into o from offers where id = p_offer and pro_id = p_pro for update;
  if not found then raise exception 'Request not found'; end if;
  if o.status = 'accepted' then return; end if;
  if o.status <> 'requested' then raise exception 'This request can no longer be changed'; end if;
  update offers set status = 'accepted', updated_at = now() where id = o.id;
  insert into charges (pro_id, request_id, amount, payment_intent, status) values (o.pro_id, o.request_id, 20, p_pi, 'paid')
    on conflict (request_id, pro_id) do update set payment_intent = excluded.payment_intent, status = 'paid';
end $$;

-- A pro's requests. Customer contact details are included only after the pro accepts.
create or replace function public.pro_leads() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'offer_id', o.id, 'request_id', r.id, 'status', o.status, 'created_at', o.created_at,
    'svc', r.svc, 'details', r.details, 'timing', r.timing, 'freq', r.freq, 'notes', r.notes, 'zip', r.zip,
    'client_first', split_part(c.name, ' ', 1),
    'client_name', case when o.status = 'accepted' then c.name end,
    'client_email', case when o.status = 'accepted' then c.email end,
    'client_phone', case when o.status = 'accepted' then c.phone end
  ) order by o.updated_at desc), '[]'::jsonb)
  from offers o
  join requests r on r.id = o.request_id
  join profiles c on c.id = r.client_id
  where o.pro_id = auth.uid() and o.status <> 'offered';
$$;

-- Client reviews an accepted pro; updates the pro's average rating.
create or replace function public.post_review(p_request uuid, p_pro uuid, p_rating int, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype; nm text;
begin
  if not is_client_of(p_request) then raise exception 'Not allowed'; end if;
  select * into o from offers where request_id = p_request and pro_id = p_pro for update;
  if not found or o.status <> 'accepted' then raise exception 'You can review a pro after they accept your request'; end if;
  if o.reviewed then raise exception 'You already reviewed this pro'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Choose 1 to 5 stars'; end if;
  select split_part(name, ' ', 1) into nm from profiles where id = auth.uid();
  insert into reviews (pro_id, request_id, client_id, author, rating, body)
    values (p_pro, p_request, auth.uid(), nm, p_rating, left(coalesce(p_body, ''), 1000));
  update offers set reviewed = true where id = o.id;
  update pros set rating = round((rating * review_count + p_rating) / (review_count + 1), 2), review_count = review_count + 1 where id = p_pro;
end $$;

revoke all on function public.submit_request(text, text[], text, text, text, text) from public, anon;
revoke all on function public.request_quotes(uuid, uuid[]) from public, anon;
revoke all on function public.send_message(uuid, uuid, text) from public, anon;
revoke all on function public.respond_offer(uuid, boolean) from public, anon;
revoke all on function public.finalize_accept(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.pro_leads() from public, anon;
revoke all on function public.post_review(uuid, uuid, int, text) from public, anon;
grant execute on function public.submit_request(text, text[], text, text, text, text) to authenticated;
grant execute on function public.request_quotes(uuid, uuid[]) to authenticated;
grant execute on function public.send_message(uuid, uuid, text) to authenticated;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
grant execute on function public.pro_leads() to authenticated;
grant execute on function public.post_review(uuid, uuid, int, text) to authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.finalize_accept(uuid, uuid, text) to service_role;
  end if;
end $$;

-- Live message updates
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.offers;
exception when others then null; end $$;
