-- Add analytics columns to jobs table
alter table if exists jobs add column if not exists views_count integer default 0;
alter table if exists jobs add column if not exists apply_clicks integer default 0;
alter table if exists jobs add column if not exists last_viewed_at timestamp with time zone;
alter table if exists jobs add column if not exists created_at timestamp with time zone default now();
alter table if exists jobs add column if not exists updated_at timestamp with time zone default now();

-- Create job analytics events table for detailed tracking
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

-- Index for efficient queries
create index if not exists idx_job_analytics_events_job_id on job_analytics_events(job_id);
create index if not exists idx_job_analytics_events_event_type on job_analytics_events(event_type);
create index if not exists idx_job_analytics_events_created_at on job_analytics_events(created_at);

-- Function to update last_viewed_at
create or replace function update_job_last_viewed()
returns trigger as $$
begin
  update jobs set last_viewed_at = now() where id = new.job_id;
  return new;
end;
$$ language plpgsql;

-- Trigger to update last_viewed_at when view event is logged
drop trigger if exists trg_update_job_last_viewed on job_analytics_events;
create trigger trg_update_job_last_viewed
after insert on job_analytics_events
for each row
when (new.event_type = 'view')
execute function update_job_last_viewed();
