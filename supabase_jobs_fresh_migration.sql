-- ===================================================================
-- FRESH JOBS SYSTEM MIGRATION
-- Drops everything and recreates from scratch
-- Run this ONLY after backing up any production data
-- ===================================================================

-- =========================
-- DROP EXISTING (CLEAN SLATE)
-- =========================

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'job_analytics_events') then
    drop trigger if exists trg_update_job_last_viewed on job_analytics_events;
  end if;
end $$;
drop function if exists update_job_last_viewed();
drop table if exists job_analytics_events CASCADE;
drop table if exists job_categories CASCADE;
drop table if exists jobs CASCADE;

-- =========================
-- JOB CATEGORIES
-- =========================

create table if not exists job_categories (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  description text,
  color text default '#6366f1',
  icon text default 'briefcase',
  featured boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create index if not exists idx_job_categories_slug on job_categories (slug);

-- =========================
-- JOBS (core table)
-- =========================

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  organization text,
  category text,
  job_type text,
  location text,
  qualification text,
  experience text,
  salary text,
  application_start_date date,
  last_date date,
  official_website text,
  apply_link text,
  notification_pdf text,
  short_description text,
  full_description text,
  eligibility jsonb,
  selection_process jsonb,
  important_dates jsonb,
  application_fee text,
  tags jsonb,
  featured boolean default false,
  status text default 'draft',
  seo_title text,
  seo_description text,
  seo_keywords text,
  canonical_url text,
  og_image text,
  views_count integer default 0,
  apply_clicks integer default 0,
  last_viewed_at timestamp with time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_status on jobs (status);
create index if not exists idx_jobs_last_date on jobs (last_date desc);
create index if not exists idx_jobs_featured on jobs (featured);

-- =========================
-- JOB ANALYTICS EVENTS
-- =========================

create table if not exists job_analytics_events (
  id uuid default gen_random_uuid() primary key,
  job_id uuid not null references jobs(id) on delete cascade,
  event_type text not null,
  user_agent text,
  ip_address text,
  referrer text,
  session_id text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_job_analytics_events_job_id on job_analytics_events(job_id);
create index if not exists idx_job_analytics_events_event_type on job_analytics_events(event_type);
create index if not exists idx_job_analytics_events_created_at on job_analytics_events(created_at);

-- Trigger: update jobs.last_viewed_at when a view event is logged
create or replace function update_job_last_viewed()
returns trigger as $$
begin
  update jobs set last_viewed_at = now() where id = new.job_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_job_last_viewed
after insert on job_analytics_events
for each row
when (new.event_type = 'view')
execute function update_job_last_viewed();

-- =========================
-- RLS POLICIES
-- =========================

alter table if exists jobs enable row level security;
alter table if exists job_categories enable row level security;
alter table if exists job_analytics_events enable row level security;

-- Jobs policies
drop policy if exists "Allow public select published jobs" on jobs;
create policy "Allow public select published jobs"
  on jobs
  for select
  using (
    status = 'published'
    or exists (
      select 1 from public.admin_users where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Allow admin insert jobs" on jobs;
create policy "Allow admin insert jobs"
  on jobs
  for insert
  with check (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Allow admin update jobs" on jobs;
create policy "Allow admin update jobs"
  on jobs
  for update
  using (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Allow admin delete jobs" on jobs;
create policy "Allow admin delete jobs"
  on jobs
  for delete
  using (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

-- Job categories policies (public read, admin manage)
drop policy if exists "Allow public select job_categories" on job_categories;
create policy "Allow public select job_categories"
  on job_categories
  for select
  using (true);

drop policy if exists "Allow admin insert job_categories" on job_categories;
create policy "Allow admin insert job_categories"
  on job_categories
  for insert
  with check (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Allow admin update job_categories" on job_categories;
create policy "Allow admin update job_categories"
  on job_categories
  for update
  using (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Allow admin delete job_categories" on job_categories;
create policy "Allow admin delete job_categories"
  on job_categories
  for delete
  using (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

-- Job analytics events policies (public insert, admin select)
drop policy if exists "Allow public insert job_analytics_events" on job_analytics_events;
create policy "Allow public insert job_analytics_events"
  on job_analytics_events
  for insert
  with check (true);

drop policy if exists "Allow admin select job_analytics_events" on job_analytics_events;
create policy "Allow admin select job_analytics_events"
  on job_analytics_events
  for select
  using (
    exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)
  );

-- =========================
-- SEED JOB CATEGORIES
-- =========================

insert into job_categories (name, slug, description, color, icon, featured, sort_order)
values
  ('Government Jobs', 'government-jobs', 'Public sector and government opportunities', '#0ea5a4', 'shield-check', true, 0),
  ('Private Jobs', 'private-jobs', 'Opportunities in private companies', '#fb923c', 'briefcase', false, 1),
  ('IT Jobs', 'it-jobs', 'Information Technology and software roles', '#6366f1', 'cpu', true, 2),
  ('Remote Jobs', 'remote-jobs', 'Work-from-home and remote-friendly roles', '#10b981', 'home', false, 3),
  ('Banking Jobs', 'banking-jobs', 'Banking and finance sector jobs', '#f43f5e', 'credit-card', false, 4),
  ('Railway Jobs', 'railway-jobs', 'Indian Railways & related openings', '#06b6d4', 'train', false, 5),
  ('Internship', 'internship', 'Internships and training roles', '#8b5cf6', 'graduation-cap', false, 6),
  ('Freshers Jobs', 'freshers-jobs', 'Entry-level roles for freshers', '#ef4444', 'sparkles', false, 7)
on conflict (slug) do nothing;

-- =========================
-- SEED SAMPLE JOB
-- =========================

insert into jobs (
  id,
  title,
  slug,
  organization,
  category,
  job_type,
  location,
  qualification,
  experience,
  salary,
  application_start_date,
  last_date,
  official_website,
  apply_link,
  short_description,
  full_description,
  application_fee,
  tags,
  featured,
  status,
  seo_title,
  seo_description,
  canonical_url,
  created_at,
  updated_at
) values (
  '99999999-9999-4999-9999-999999999999',
  'SSC CGL Recruitment 2026',
  'ssc-cgl-recruitment-2026',
  'Staff Selection Commission (SSC)',
  'government-jobs',
  'Full Time',
  'India',
  'Bachelor Degree',
  'Freshers Eligible',
  '₹35,000 – ₹65,000',
  '2026-06-01',
  '2026-07-15',
  'https://ssc.gov.in',
  'https://ssc.gov.in',
  'Apply online for SSC CGL Recruitment 2026 for multiple central government posts across India.',
  'The Staff Selection Commission has released the SSC CGL Recruitment 2026 notification for various Group B and Group C posts. Eligible candidates can apply online before the last date.',
  '₹100',
  '["ssc","cgl","government-jobs","central-government","freshers"]',
  true,
  'published',
  'SSC CGL Recruitment 2026 Apply Online',
  'Apply online for SSC CGL Recruitment 2026. Check eligibility, salary, important dates, and application details.',
  null,
  now(),
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  organization = excluded.organization,
  category = excluded.category,
  job_type = excluded.job_type,
  location = excluded.location,
  qualification = excluded.qualification,
  experience = excluded.experience,
  salary = excluded.salary,
  application_start_date = excluded.application_start_date,
  last_date = excluded.last_date,
  official_website = excluded.official_website,
  apply_link = excluded.apply_link,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  application_fee = excluded.application_fee,
  tags = excluded.tags,
  featured = excluded.featured,
  status = excluded.status,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url,
  updated_at = now();