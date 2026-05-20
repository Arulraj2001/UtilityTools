-- Safe non-destructive Supabase migration for blog RLS, missing columns, indexes, and seed data

create extension if not exists "uuid-ossp";

-- Ensure admin_users table exists safely
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id),
  is_admin boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists public.admin_users add column if not exists is_admin boolean not null default true;
alter table if exists public.admin_users add column if not exists created_at timestamptz not null default now();

-- Add missing blog_posts columns safely
alter table if exists blog_posts add column if not exists category_id uuid references blog_categories(id) on delete set null;
alter table if exists blog_posts add column if not exists og_image text;
alter table if exists blog_posts add column if not exists canonical_url text;
alter table if exists blog_posts add column if not exists schema_type text default 'BlogPosting';
alter table if exists blog_posts add column if not exists featured boolean default false;
alter table if exists blog_posts add column if not exists views_count int default 0;
alter table if exists blog_posts add column if not exists seo_keywords text;
alter table if exists blog_posts add column if not exists meta_robots text default 'index,follow';

-- Safe indexes
create index if not exists idx_blog_posts_status on blog_posts (status);
create index if not exists idx_blog_posts_created_at on blog_posts (created_at desc);
create index if not exists idx_blog_posts_category_id on blog_posts (category_id);
create index if not exists idx_blog_posts_views_count on blog_posts (views_count desc);
create index if not exists idx_blog_categories_sort_order on blog_categories (sort_order);

create table if not exists workflow_pages (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  category text,
  tags jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text,
  featured_image text,
  canonical_url text,
  faq_items jsonb,
  related_tools jsonb,
  related_blogs jsonb,
  status text default 'draft',
  is_featured boolean default false,
  view_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists workflow_pages add column if not exists excerpt text;
alter table if exists workflow_pages add column if not exists content text;
alter table if exists workflow_pages add column if not exists category text;
alter table if exists workflow_pages add column if not exists tags jsonb;
alter table if exists workflow_pages add column if not exists seo_title text;
alter table if exists workflow_pages add column if not exists seo_description text;
alter table if exists workflow_pages add column if not exists seo_keywords text;
alter table if exists workflow_pages add column if not exists featured_image text;
alter table if exists workflow_pages add column if not exists canonical_url text;
alter table if exists workflow_pages add column if not exists faq_items jsonb;
alter table if exists workflow_pages add column if not exists related_tools jsonb;
alter table if exists workflow_pages add column if not exists related_blogs jsonb;
alter table if exists workflow_pages add column if not exists status text default 'draft';
alter table if exists workflow_pages add column if not exists is_featured boolean default false;
alter table if exists workflow_pages add column if not exists view_count int default 0;
alter table if exists workflow_pages add column if not exists created_at timestamptz not null default now();
alter table if exists workflow_pages add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_workflow_pages_status on workflow_pages (status);
create index if not exists idx_workflow_pages_updated_at on workflow_pages (updated_at desc);
create index if not exists idx_workflow_pages_featured on workflow_pages (is_featured);
create index if not exists idx_workflow_pages_view_count on workflow_pages (view_count desc);

-- Enable RLS safely
alter table if exists blog_posts enable row level security;
alter table if exists workflow_pages enable row level security;
alter table if exists blog_categories enable row level security;
alter table if exists public.admin_users enable row level security;

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

-- Clean up conflicting policies
drop policy if exists "Allow all blog_posts" on blog_posts;
drop policy if exists "Public can read blog_posts" on blog_posts;
drop policy if exists "Admin users can manage blog_posts" on blog_posts;
drop policy if exists "Public can read blog_categories" on blog_categories;
drop policy if exists "Admin users can manage blog_categories" on blog_categories;
drop policy if exists "Allow all admin_users" on public.admin_users;
drop policy if exists "Allow admin select own admin record" on public.admin_users;
drop policy if exists "Allow admin manage admin_users" on public.admin_users;

-- Recreate clean blog category / blog post / admin_user policies
create policy "Allow public select on blog_categories"
  on blog_categories
  for select
  using (true);

create policy "Allow admin manage blog_categories"
  on blog_categories
  for insert, update, delete
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

create policy "Allow public select published blog_posts"
  on blog_posts
  for select
  using (
    status = 'published'
    or exists (
      select 1
      from public.admin_users
      where id = auth.uid()
        and is_admin = true
    )
  );

create policy "Allow admin manage blog_posts"
  on blog_posts
  for insert, update, delete
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

create policy "Allow public select published workflow_pages"
  on workflow_pages
  for select
  using (
    status = 'published'
    or exists (
      select 1
      from public.admin_users
      where id = auth.uid()
        and is_admin = true
    )
  );

create policy "Allow admin manage workflow_pages"
  on workflow_pages
  for insert, update, delete
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

create policy "Allow admin select own admin record"
  on public.admin_users
  for select
  using (id = auth.uid());

create policy "Allow admin manage admin_users"
  on public.admin_users
  for insert, update, delete
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

-- Safe seed default blog categories
insert into blog_categories (
  name,
  slug,
  description,
  seo_title,
  seo_description,
  seo_keywords,
  featured_image,
  icon,
  color,
  featured,
  sort_order,
  updated_at
)
values
  ('Tech', 'tech', 'News, tools, and engineering best practices for modern developers.', 'Tech category - developer tools, trends, and productivity', 'Discover top tech tools, workflows, and trends to build faster and smarter.', 'tech, developer tools, productivity, software, engineering', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', 'cpu', '#0f766e', true, 10, now()),
  ('AI Tools', 'ai-tools', 'AI-powered applications, automation tools, and productivity workflows.', 'AI Tools category - automation, productivity, and machine learning', 'Explore AI tools that accelerate work, learning, and creative projects.', 'ai tools, automation, machine learning, productivity', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', 'cpu', '#7c3aed', true, 9, now()),
  ('SEO', 'seo', 'Search engine optimization strategies, keyword research, and site growth tips.', 'SEO category - optimize your blog, site, and content for search', 'Learn practical SEO techniques for tool websites, blog posts, and organic traffic growth.', 'seo, search engine optimization, keywords, blogging, growth', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', 'search', '#0369a1', true, 8, now()),
  ('Tutorials', 'tutorials', 'Step-by-step guides, how-tos, and walkthroughs for developers and creators.', 'Tutorials category - practical how-to guides for tools and workflows', 'Follow tutorials that teach new skills, improve workflows, and launch useful projects.', 'tutorials, how to, guide, walkthrough, learning', 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&w=1200&q=80', 'book-open', '#15803d', false, 7, now()),
  ('Programming', 'programming', 'Code patterns, language tips, and best practices for modern developers.', 'Programming category - Python, JavaScript, React, and practical coding tips', 'Read programming articles that help you write cleaner code, build faster, and ship with confidence.', 'programming, coding, javascript, python, react', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80', 'code', '#b91c1c', false, 6, now()),
  ('Finance', 'finance', 'Money management, investment basics, and financial tooling for creators.', 'Finance category - budgeting, investing, and smart finance for creators', 'Get finance tips for planning budgets, investing wisely, and using tools to save time.', 'finance, investing, budgeting, money management', 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1200&q=80', 'trending-up', '#b45309', false, 5, now()),
  ('Productivity', 'productivity', 'Workflow hacks, focus strategies, and productivity tools for busy teams.', 'Productivity category - get more done with better habits and tools', 'Discover practical productivity habits and tools that keep work moving forward.', 'productivity, workflow, focus, time management, habits', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80', 'sparkles', '#15803d', false, 4, now()),
  ('Social Media', 'social-media', 'Content strategy, scheduling, and performance for social platforms.', 'Social Media category - audience growth, content planning, and engagement', 'Build a social media plan that supports your brand, content, and tool promotion.', 'social media, content strategy, engagement, branding', 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', 'share-2', '#0ea5e9', false, 3, now()),
  ('Web Development', 'web-development', 'Front-end, back-end, and full-stack content for modern websites.', 'Web Development category - frameworks, performance, and responsive design', 'Explore web development topics that help you build faster and more maintainable experiences.', 'web development, front-end, back-end, responsive design', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', 'layout', '#4f46e5', false, 2, now()),
  ('Creator Economy', 'creator-economy', 'Monetization, audience growth, and creator-first business strategies.', 'Creator Economy category - grow your audience and turn ideas into income', 'Read creator economy insights for building sustainable revenue from content and products.', 'creator economy, monetization, audience, creators', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'users', '#ec4899', false, 1, now())
on conflict (slug) do nothing;

-- IMPORTANT: If admin writes are still blocked, make sure your Supabase auth user is registered as an admin.
-- Replace <YOUR_SUPABASE_USER_ID> with the authenticated user id for your admin account.
-- insert into public.admin_users (id, is_admin) values ('<YOUR_SUPABASE_USER_ID>', true)
--   on conflict (id) do update set is_admin = true, updated_at = now();
