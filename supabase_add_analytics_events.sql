-- Add analytics events table for lightweight SEO and growth tracking

create extension if not exists "uuid-ossp";

create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  page_url text,
  session_id text,
  user_agent text,
  device_type text,
  browser text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_event_type on analytics_events (event_type);
create index if not exists idx_analytics_events_created_at on analytics_events (created_at desc);
create index if not exists idx_analytics_events_session_id on analytics_events (session_id);
create index if not exists idx_analytics_events_page_url on analytics_events (page_url);
create index if not exists idx_analytics_events_device_type on analytics_events (device_type);

alter table if exists analytics_events enable row level security;

create policy if not exists "Allow public insert analytics_events"
  on analytics_events
  for insert
  using (true)
  with check (true);

create policy if not exists "Allow admin select analytics_events"
  on analytics_events
  for select
  using (
    exists (
      select 1
      from public.admin_users
      where id = auth.uid()
        and is_admin = true
    )
  );

create policy if not exists "Allow admin manage analytics_events"
  on analytics_events
  for update, delete
  using (
    exists (
      select 1
      from public.admin_users
      where id = auth.uid()
        and is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where id = auth.uid()
        and is_admin = true
    )
  );
