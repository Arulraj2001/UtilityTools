-- Supabase PostgreSQL schema for utility tools platform

create extension if not exists "uuid-ossp";

-- =========================
-- CATEGORIES
-- =========================

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  color text,
  status text default 'active',
  is_featured boolean default false,
  tool_count int default 0,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- BLOG CATEGORIES
-- =========================

create table if not exists blog_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  featured_image text,
  icon text,
  color text,
  featured boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- ADMIN USERS
-- =========================

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id),
  is_admin boolean not null default true,
  created_at timestamptz not null default now()
);

-- Register every authenticated admin user here so RLS policies can grant admin access.
-- Example: insert into public.admin_users (id, is_admin) values ('<YOUR_SUPABASE_USER_ID>', true)
--   on conflict (id) do update set is_admin = true, updated_at = now();

-- =========================
-- TOOLS
-- =========================

create table if not exists tools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  long_description text,
  category_id uuid references categories(id) on delete set null,
  icon text,
  status text default 'draft',
  is_featured boolean default false,
  is_trending boolean default false,
  usage_count int default 0,
  input_fields jsonb,
  formula_type text,
  formula_config jsonb,
  output_type text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  featured_image text,
  faq jsonb,
  seo_content text,
  related_tool_ids jsonb,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- BLOG POSTS
-- =========================

create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  category text,
  category_id uuid references blog_categories(id) on delete set null,
  tags jsonb,
  status text default 'draft',
  featured_image text,
  og_image text,
  canonical_url text,
  faq_items jsonb,
  schema_type text default 'BlogPosting',
  featured boolean default false,
  views_count int default 0,
  author_name text,
  author_title text,
  author_image text,
  author_bio text,
  reading_time int default 0,
  seo_title text,
  seo_description text,
  seo_keywords text,
  meta_robots text default 'index,follow',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table if exists blog_posts add column if not exists category_id uuid references blog_categories(id) on delete set null;
alter table if exists blog_posts add column if not exists og_image text;
alter table if exists blog_posts add column if not exists canonical_url text;
alter table if exists blog_posts add column if not exists faq_items jsonb;
alter table if exists blog_posts add column if not exists schema_type text default 'BlogPosting';
alter table if exists blog_posts add column if not exists featured boolean default false;
alter table if exists blog_posts add column if not exists views_count int default 0;
alter table if exists blog_posts add column if not exists seo_keywords text;
alter table if exists blog_posts add column if not exists meta_robots text default 'index,follow';

-- =========================
-- WORKFLOW PAGES
-- =========================

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

-- =========================
-- JOBS
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_status on jobs (status);
create index if not exists idx_jobs_last_date on jobs (last_date desc);
create index if not exists idx_jobs_featured on jobs (featured);
alter table if exists jobs add column if not exists seo_keywords text;

-- =========================
-- REDIRECTS
-- =========================

create table if not exists redirects (
  id uuid primary key default uuid_generate_v4(),
  from_path text not null,
  to_path text not null,
  status_code int not null default 301,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- AD PLACEMENTS
-- =========================

create table if not exists ad_placements (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slot_id text not null,
  ad_code text,
  placement text,
  page_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- SITE SETTINGS
-- =========================

create table if not exists site_settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value text,
  type text default 'text',
  group text default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- ANALYTICS EVENTS
-- =========================

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

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_tools_status on tools (status);
create index if not exists idx_tools_category_id on tools (category_id);
create index if not exists idx_tools_sort_order on tools (sort_order);
create index if not exists idx_tools_related_tool_ids on tools using gin (related_tool_ids);
create index if not exists idx_tools_input_fields on tools using gin (input_fields);
create index if not exists idx_tools_faq on tools using gin (faq);
create index if not exists idx_blog_posts_status on blog_posts (status);
create index if not exists idx_blog_posts_created_at on blog_posts (created_at desc);
create index if not exists idx_blog_posts_category_id on blog_posts (category_id);
create index if not exists idx_blog_posts_views_count on blog_posts (views_count desc);
create index if not exists idx_blog_categories_sort_order on blog_categories (sort_order);
create index if not exists idx_categories_sort_order on categories (sort_order);
create index if not exists idx_redirects_created_at on redirects (created_at desc);
create index if not exists idx_ad_placements_created_at on ad_placements (created_at desc);
create index if not exists idx_site_settings_key on site_settings (key);

-- =========================
-- RPC: grouped counts for published tools
-- Returns rows of (category_id, published_tool_count)
-- Use: select * from get_published_tool_counts(NULL) OR rpc via Supabase client
-- =========================
create or replace function public.get_published_tool_counts(ids uuid[] DEFAULT NULL)
  returns table(category_id uuid, published_tool_count bigint)
as $$
  select category_id, count(*) as published_tool_count
  from tools
  where status = 'published'
    and (ids is null or category_id = any(ids))
  group by category_id;
$$ language sql stable security definer;

grant execute on function public.get_published_tool_counts(uuid[]) to public;

-- =========================
-- ENABLE RLS
-- =========================

alter table if exists tools enable row level security;
alter table if exists categories enable row level security;
alter table if exists blog_posts enable row level security;
alter table if exists workflow_pages enable row level security;
alter table if exists blog_categories enable row level security;
alter table if exists public.admin_users enable row level security;
alter table if exists redirects enable row level security;
alter table if exists ad_placements enable row level security;
alter table if exists site_settings enable row level security;
alter table if exists jobs enable row level security;

-- =========================
-- CLEANUP & ROLE-BASED POLICIES
-- =========================

drop policy if exists "Allow all blog_posts" on blog_posts;
drop policy if exists "Public can read blog_posts" on blog_posts;
drop policy if exists "Admin users can manage blog_posts" on blog_posts;
drop policy if exists "Public can read blog_categories" on blog_categories;
drop policy if exists "Admin users can manage blog_categories" on blog_categories;
drop policy if exists "Allow all categories" on categories;
drop policy if exists "Allow all admin_users" on public.admin_users;
drop policy if exists "Allow admin select own admin record" on public.admin_users;
drop policy if exists "Allow admin manage admin_users" on public.admin_users;
drop policy if exists "Allow public select published workflow_pages" on workflow_pages;
drop policy if exists "Allow admin manage workflow_pages" on workflow_pages;

-- Jobs policies (cleanup)
drop policy if exists "Allow public select published jobs" on jobs;
drop policy if exists "Allow admin manage jobs" on jobs;

drop policy if exists "Allow all redirects" on redirects;
drop policy if exists "Allow all ad_placements" on ad_placements;
drop policy if exists "Allow all site_settings" on site_settings;

create policy "Allow all categories"
  on categories
  for all
  using (true)
  with check (true);

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

create policy "Allow public select published jobs"
  on jobs
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

create policy "Allow admin manage jobs"
  on jobs
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

create policy "Allow all redirects"
  on redirects
  for all
  using (true)
  with check (true);

create policy "Allow all ad_placements"
  on ad_placements
  for all
  using (true)
  with check (true);

create policy "Allow all site_settings"
  on site_settings
  for all
  using (true)
  with check (true);

-- =========================
-- SEED DEFAULT BLOG CATEGORIES
-- =========================

insert into blog_categories (name, slug, description, seo_title, seo_description, seo_keywords, featured_image, icon, color, featured, sort_order, updated_at)
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
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  seo_keywords = excluded.seo_keywords,
  featured_image = excluded.featured_image,
  icon = excluded.icon,
  color = excluded.color,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  updated_at = now();

-- =========================
-- SEED STARTER BLOG POSTS
-- =========================

insert into blog_posts (
  title,
  slug,
  excerpt,
  content,
  category,
  category_id,
  tags,
  status,
  featured_image,
  og_image,
  canonical_url,
  schema_type,
  featured,
  views_count,
  author_name,
  reading_time,
  seo_title,
  seo_description,
  seo_keywords,
  meta_robots,
  created_at,
  updated_at
)
values
  (
    'Best Free Developer Tools for 2026',
    'best-free-developer-tools',
    $$Discover the top free developer tools that help teams ship faster, reduce friction, and stay aligned on modern workflows.$$,
    $$<h1>Best Free Developer Tools for 2026</h1>
    <p>Building software is easier when your toolchain is fast, affordable, and reliable. This article covers the essential free developer tools that every modern engineering team should know.</p>
    <h2>Why free developer tools still matter</h2>
    <p>Free tools lower the barrier to entry, help early-stage teams move quicker, and keep costs manageable while you test ideas.</p>
    <h3>Top categories to explore</h3>
    <ul>
      <li>Code editors and extensions</li>
      <li>Version control and collaboration</li>
      <li>Debugging and API testing</li>
    </ul>
    <p>Start with a strong editor, pair it with fast source control, and add automation for testing.</p>
    <h2>Recommended free tools</h2>
    <ul>
      <li><strong>VS Code</strong> with smart extensions</li>
      <li><strong>GitHub</strong> for repo management</li>
      <li><strong>Postman</strong> for API testing</li>
    </ul>
    <h3>How to choose the right combination</h3>
    <p>Match each tool to your workflow and avoid tool overlap. For example, use GitHub for code, VS Code for editing, and a separate terminal tool for shell automation.</p>
    <h2>Internal links</h2>
    <p>Read our <a href="/blog/vscode-productivity-tips">VS Code Productivity Tips</a> post to optimize your setup further.</p>
    <h2>FAQ</h2>
    <h3>Are free tools suitable for production?</h3>
    <p>Yes — many free tools are widely adopted in production when paired with the right workflow and secure conventions.</p>
    <h3>What should I avoid?</h3>
    <p>Avoid using too many overlapping tools. Choose one editor, one source control provider, and one main automation framework.</p>
    $$,
    'Tech',
    (select id from blog_categories where slug = 'tech'),
    '["developer tools","productivity","engineering"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/best-free-developer-tools',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    8,
    'Best Free Developer Tools for 2026',
    'Discover free tools that help developer teams ship faster with less friction.',
    'free developer tools, best developer tools, productivity',
    'index,follow',
    now(),
    now()
  ),
  (
    'VS Code Productivity Tips',
    'vscode-productivity-tips',
    $$Boost your VS Code workflow with settings, extensions, and shortcuts that save time and reduce context switching.$$,
    $$<h1>VS Code Productivity Tips</h1>
    <p>VS Code is the center of many developer workflows. This guide shows how to set it up for fast navigation, low friction, and better focus.</p>
    <h2>Key VS Code optimizations</h2>
    <ul>
      <li>Use workspaces and trusted folders</li>
      <li>Enable context-aware code completion</li>
      <li>Install extensions for linting and formatting</li>
    </ul>
    <h3>Essential extensions</h3>
    <ul>
      <li>Prettier</li>
      <li>ESLint</li>
      <li>GitLens</li>
    </ul>
    <p>Pair your editor with terminal workflows and source control to avoid switching windows.</p>
    <h2>FAQ</h2>
    <h3>How do I keep VS Code fast?</h3>
    <p>Disable unused extensions, limit workspace indexing, and tune file exclusions.</p>
    <h3>Can I share settings across machines?</h3>
    <p>Yes. Use Settings Sync or export a shared config file.</p>
    $$,
    'Tech',
    (select id from blog_categories where slug = 'tech'),
    '["vscode","productivity","developer tools"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1517430816045-df4b7de1f42b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517430816045-df4b7de1f42b?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/vscode-productivity-tips',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    6,
    'VS Code Productivity Tips to Save Time',
    'Improve your VS Code workflow with proven settings, shortcuts, and extension strategies.',
    'vscode productivity, developer workflow, code editor tips',
    'index,follow',
    now(),
    now()
  ),
  (
    'Best AI Tools for Students',
    'best-ai-tools-for-students',
    $$Discover affordable AI tools for students that boost research, writing, and project productivity.$$,
    $$<h1>Best AI Tools for Students</h1>
    <p>Students can use AI tools to manage study time, create research drafts, and improve learning outcomes. This guide lists practical apps for the classroom and beyond.</p>
    <h2>AI tools for study and writing</h2>
    <ul>
      <li>Research assistants for topic exploration</li>
      <li>Note-taking and summarization tools</li>
      <li>Presentation support and outline creation</li>
    </ul>
    <h2>How to use AI responsibly</h2>
    <p>Always verify facts, cite sources, and use AI as a learning companion rather than a shortcut.</p>
    <h2>FAQ</h2>
    <h3>Are AI tools allowed in school?</h3>
    <p>Check your institution policy, then use AI for brainstorming, revisions, and study support.</p>
    <h3>What should students avoid?</h3>
    <p>Avoid submitting AI-generated content without editing and personal understanding.</p>
    $$,
    'AI Tools',
    (select id from blog_categories where slug = 'ai-tools'),
    '["ai tools","students","study productivity"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1555949963-aa79dcee981d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555949963-aa79dcee981d?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/best-ai-tools-for-students',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    7,
    'Best AI Tools for Students to Improve Study Productivity',
    'Explore AI tools that help students research faster, write smarter, and stay organized.',
    'ai tools for students, study tools, education technology',
    'index,follow',
    now(),
    now()
  ),
  (
    'AI Productivity Guide for Busy Creators',
    'ai-productivity-guide',
    $$Use AI tools to automate content planning, research, and workflow tasks that free up creative time.$$,
    $$<h1>AI Productivity Guide for Busy Creators</h1>
    <p>Creators can use AI to speed up content research, automate repetitive tasks, and improve quality without adding overhead.</p>
    <h2>Where AI helps the most</h2>
    <ul>
      <li>Content ideation and topic research</li>
      <li>Draft generation and editing</li>
      <li>Scheduling and post optimization</li>
    </ul>
    <h2>Practical steps</h2>
    <p>Start with one workflow, such as creating captions or blog outlines, then expand the automation gradually.</p>
    <h2>FAQ</h2>
    <h3>How do I keep AI output authentic?</h3>
    <p>Review every result, add your own voice, and use AI output as a starting point.</p>
    <h3>Which AI tools are best for content creators?</h3>
    <p>Choose tools that integrate with your existing publishing workflow and support collaboration.</p>
    $$,
    'AI Tools',
    (select id from blog_categories where slug = 'ai-tools'),
    '["ai productivity","content automation","creator tools"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/ai-productivity-guide',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    7,
    'AI Productivity Guide for Busy Creators',
    'Learn how AI tools streamline content workflows and support creative work without adding complexity.',
    'ai productivity, creator tools, content automation',
    'index,follow',
    now(),
    now()
  ),
  (
    'Beginner SEO Checklist for Tool Websites',
    'beginner-seo-checklist',
    $$Apply this beginner SEO checklist to improve visibility for your tool website and blog content quickly.$$,
    $$<h1>Beginner SEO Checklist for Tool Websites</h1>
    <p>SEO is a long-term growth channel. Use this checklist to make sure your product pages and blog posts are easy to discover.</p>
    <h2>Checklist items</h2>
    <ul>
      <li>Optimize page titles and meta descriptions</li>
      <li>Use clear and descriptive slugs</li>
      <li>Add internal links to related content</li>
    </ul>
    <h2>Page structure best practices</h2>
    <p>Use H1 for the main headline, H2 for sections, and H3 for supporting subtopics.</p>
    <h2>FAQ</h2>
    <h3>How much time does SEO take?</h3>
    <p>SEO improvements can show value in weeks, but consistent effort is often required for months.</p>
    <h3>Does content length matter?</h3>
    <p>Quality matters more than length, but posts should be long enough to answer queries comprehensively.</p>
    $$,
    'SEO',
    (select id from blog_categories where slug = 'seo'),
    '["seo checklist","tool website seo","content optimization"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/beginner-seo-checklist',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    8,
    'Beginner SEO Checklist for Tool Websites',
    'Use this complete SEO checklist to optimize your tool website, blog posts, and landing pages.',
    'beginner seo checklist, seo for tool sites, seo best practices',
    'index,follow',
    now(),
    now()
  ),
  (
    'Technical SEO Guide for Web Tools',
    'technical-seo-guide',
    $$Improve search performance with technical SEO fundamentals tailored for web tools and apps.$$,
    $$<h1>Technical SEO Guide for Web Tools</h1>
    <p>Technical SEO helps search engines understand your site. This guide covers schema, site speed, and crawlability for tool websites.</p>
    <h2>Technical fundamentals</h2>
    <ul>
      <li>Use structured data for blog posts and products</li>
      <li>Ensure fast page load times</li>
      <li>Create clean URL structures</li>
    </ul>
    <h2>Schema and metadata</h2>
    <p>Add structured schema for content, blog posts, and product pages to improve search visibility.</p>
    <h2>FAQ</h2>
    <h3>What is schema markup?</h3>
    <p>Schema markup is structured data that helps search engines understand your content type.</p>
    <h3>Should I use canonical URLs?</h3>
    <p>Yes. Use canonical URLs to prevent duplicate content issues across similar pages.</p>
    $$,
    'SEO',
    (select id from blog_categories where slug = 'seo'),
    '["technical seo","schema markup","site speed"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/technical-seo-guide',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    9,
    'Technical SEO Guide for Web Tools',
    'Optimize your tool website with technical SEO best practices for speed, schema, and indexability.',
    'technical seo guide, seo for web tools, schema markup',
    'index,follow',
    now(),
    now()
  ),
  (
    'How to Launch a Tool Website with Tutorials',
    'how-to-launch-a-tool-website',
    $$Launch your first tool website with a tutorial-driven content strategy that attracts visits and users.$$,
    $$<h1>How to Launch a Tool Website with Tutorials</h1>
    <p>Tutorial content attracts organic traffic and builds trust. This post shows how to plan tutorial pages for a tool website.</p>
    <h2>Step-by-step tutorial planning</h2>
    <ul>
      <li>Identify common user goals</li>
      <li>Create canonical tutorials for each workflow</li>
      <li>Link to related resources from each guide</li>
    </ul>
    <h3>Example tutorial topics</h3>
    <ul>
      <li>How to set up your account</li>
      <li>How to connect a data source</li>
      <li>How to automate daily tasks</li>
    </ul>
    <h2>FAQ</h2>
    <h3>Should tutorials be video or written?</h3>
    <p>Use both whenever possible, then prioritize written content for search and accessibility.</p>
    <h3>How often should I update tutorials?</h3>
    <p>Review tutorial accuracy quarterly and update workflows when the tool changes.</p>
    $$,
    'Tutorials',
    (select id from blog_categories where slug = 'tutorials'),
    '["tutorials","tutorial strategy","content planning"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1517430816045-df4b7de1f42b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517430816045-df4b7de1f42b?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/how-to-launch-a-tool-website',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    8,
    'How to Launch a Tool Website with Tutorials',
    'Build a tutorial-first site launch plan that grows search traffic and user success.',
    'tutorial website, tool tutorials, content launch strategy',
    'index,follow',
    now(),
    now()
  ),
  (
    'Python Basics for Beginners',
    'python-basics-for-beginners',
    $$Learn the essential Python concepts every beginner should master before building real projects.$$,
    $$<h1>Python Basics for Beginners</h1>
    <p>This guide covers Python fundamentals including variables, functions, and control flow for new programmers.</p>
    <h2>Core topics</h2>
    <ul>
      <li>Variables and data types</li>
      <li>Functions and modules</li>
      <li>Conditionals and loops</li>
    </ul>
    <h2>Practical example</h2>
    <p>Build a small script that reads input, processes text, and prints output.</p>
    <h2>FAQ</h2>
    <h3>Do I need prior coding experience?</h3>
    <p>No. This guide is designed for beginners and uses simple examples.</p>
    <h3>What should I practice next?</h3>
    <p>After basics, try building a small command-line tool or data parser.</p>
    $$,
    'Programming',
    (select id from blog_categories where slug = 'programming'),
    '["python basics","beginner python","programming tutorial"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/python-basics-for-beginners',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    7,
    'Python Basics for Beginners',
    'Master Python basics with clear examples that prepare you for real coding projects.',
    'python basics, beginner programming, learn python',
    'index,follow',
    now(),
    now()
  ),
  (
    'JavaScript Array Methods You Should Know',
    'javascript-array-methods',
    $$Use these JavaScript array methods to write cleaner, more powerful data transformations in your apps.$$,
    $$<h1>JavaScript Array Methods You Should Know</h1>
    <p>Arrays are one of JavaScript's most important data structures. Learn methods that simplify loops, filtering, and mapping.</p>
    <h2>Common array methods</h2>
    <ul>
      <li><strong>map()</strong> for transformation</li>
      <li><strong>filter()</strong> for selection</li>
      <li><strong>reduce()</strong> for aggregation</li>
    </ul>
    <h2>When to use each method</h2>
    <p>Use <code>map</code> when transforming values, <code>filter</code> when selecting items, and <code>reduce</code> when computing a single result.</p>
    <h2>FAQ</h2>
    <h3>Which method is faster?</h3>
    <p>Performance depends on the operation. In general, use the method that expresses intent clearly and keep each callback simple.</p>
    <h3>Should I use loops instead?</h3>
    <p>Array methods are typically easier to read, but loops may be preferred for highly optimized or imperative code.</p>
    $$,
    'Programming',
    (select id from blog_categories where slug = 'programming'),
    '["javascript","arrays","coding tips"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1537432376769-00a64b6c7973?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1537432376769-00a64b6c7973?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/javascript-array-methods',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    6,
    'JavaScript Array Methods You Should Know',
    'Learn practical JavaScript array methods that make data work easier and code more readable.',
    'javascript array methods, programming tips, js arrays',
    'index,follow',
    now(),
    now()
  ),
  (
    'SIP Investment Basics Explained',
    'sip-investment-basics',
    $$Understand systematic investment plans, how they work, and the key factors to compare before investing.$$,
    $$<h1>SIP Investment Basics Explained</h1>
    <p>Systematic investment plans are a simple way to build wealth over time. This article explains how they work and why they are popular with first-time investors.</p>
    <h2>Core concepts</h2>
    <ul>
      <li>Regular monthly contributions</li>
      <li>Compounding returns</li>
      <li>Risk and time horizon</li>
    </ul>
    <h2>Planning your SIP</h2>
    <p>Choose a SIP amount that fits your budget and stay invested consistently to benefit from rupee cost averaging.</p>
    <h2>FAQ</h2>
    <h3>Is SIP safer than lump-sum investing?</h3>
    <p>SIP reduces timing risk by spreading investments across time, but both approaches depend on market conditions.</p>
    <h3>How long should I keep a SIP?</h3>
    <p>Long-term SIPs of 5+ years typically have a better chance of smoothing out market cycles.</p>
    $$,
    'Finance',
    (select id from blog_categories where slug = 'finance'),
    '["sip investment","personal finance","mutual funds"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/sip-investment-basics',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    7,
    'SIP Investment Basics Explained',
    'Learn how SIPs work, why they are useful, and how to plan them for long-term financial goals.',
    'sip basics, investment planning, finance tips',
    'index,follow',
    now(),
    now()
  ),
  (
    'Productivity Routines That Work',
    'productivity-routines-that-work',
    $$Discover simple routines that keep your workday focused, reduce distraction, and improve output quality.$$,
    $$<h1>Productivity Routines That Work</h1>
    <p>Productivity is less about doing more and more about doing the right work with energy and focus. These routines are designed for busy creators and teams.</p>
    <h2>Daily habits</h2>
    <ul>
      <li>Start with a prioritized task list</li>
      <li>Block focused work time</li>
      <li>Review progress at the end of the day</li>
    </ul>
    <h2>Tool support</h2>
    <p>Use calendars, task managers, and simple automation tools to keep your routine consistent.</p>
    <h2>FAQ</h2>
    <h3>How do I avoid burnout?</h3>
    <p>Balance focused work sessions with short breaks and set clear stop times for the day.</p>
    <h3>Should I use a digital or analog planner?</h3>
    <p>Choose the format that you can maintain consistently. The best tool is the one you use every day.</p>
    $$,
    'Productivity',
    (select id from blog_categories where slug = 'productivity'),
    '["productivity routines","work habits","focus"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/productivity-routines-that-work',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    6,
    'Productivity Routines That Work',
    'Build daily routines that improve focus, reduce distractions, and help you finish the most important work.',
    'productivity routines, work habits, focus tips',
    'index,follow',
    now(),
    now()
  ),
  (
    'Social Media Content Planning for Creators',
    'social-media-content-planning',
    $$Plan social content that supports your brand, builds trust, and drives audience growth without overwhelm.$$,
    $$<h1>Social Media Content Planning for Creators</h1>
    <p>Great social media starts with repeatable planning. This article helps creators plan consistent, engaging content across channels.</p>
    <h2>Planning framework</h2>
    <ul>
      <li>Define your audience goal</li>
      <li>Create a content calendar</li>
      <li>Measure performance and iterate</li>
    </ul>
    <h2>Content themes</h2>
    <p>Use a mix of tutorials, insights, and behind-the-scenes updates to keep your feed interesting.</p>
    <h2>FAQ</h2>
    <h3>How often should I post?</h3>
    <p>Choose a frequency you can sustain consistently, then adjust based on engagement and capacity.</p>
    <h3>Should I repurpose blog content?</h3>
    <p>Yes. Turn blog sections into social captions, graphics, and short videos for better reach.</p>
    $$,
    'Social Media',
    (select id from blog_categories where slug = 'social-media'),
    '["social media planning","content calendar","creator strategy"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/social-media-content-planning',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    6,
    'Social Media Content Planning for Creators',
    'Create a social media plan that supports your content strategy and keeps your audience engaged.',
    'social media planning, creator content, social strategy',
    'index,follow',
    now(),
    now()
  ),
  (
    'Web Development Trends to Watch in 2026',
    'web-development-trends-2026',
    $$Stay ahead with the web development trends that will shape modern applications and user experiences in 2026.$$,
    $$<h1>Web Development Trends to Watch in 2026</h1>
    <p>The web keeps evolving. This guide highlights trends from performance-first design to AI-assisted front-end workflows.</p>
    <h2>Top trends</h2>
    <ul>
      <li>Component-based frameworks</li>
      <li>Edge deployment and serverless functions</li>
      <li>Performance-first frontend architecture</li>
    </ul>
    <h2>How to prepare</h2>
    <p>Test new frameworks, improve caching strategies, and prioritize accessibility from the start.</p>
    <h2>FAQ</h2>
    <h3>Is serverless still relevant?</h3>
    <p>Yes. Serverless can reduce ops overhead for API and backend needs, especially for content-driven apps.</p>
    <h3>Should I learn Web3?</h3>
    <p>Focus first on solid web fundamentals, then explore Web3 if your project needs decentralization or blockchain features.</p>
    $$,
    'Web Development',
    (select id from blog_categories where slug = 'web-development'),
    '["web development trends","frontend trends","serverless"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/web-development-trends-2026',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    8,
    'Web Development Trends to Watch in 2026',
    'Discover the web development trends shaping modern apps, tools, and deployment strategies for 2026.',
    'web development trends, frontend, serverless',
    'index,follow',
    now(),
    now()
  ),
  (
    'Creator Economy Growth Hacks',
    'creator-economy-growth-hacks',
    $$Learn creator economy growth strategies that help independent makers build audiences, products, and recurring revenue.$$,
    $$<h1>Creator Economy Growth Hacks</h1>
    <p>The creator economy is built on audience value and sustainable monetization. These growth hacks help creators scale without losing authenticity.</p>
    <h2>Growth tactics</h2>
    <ul>
      <li>Create recurring content formats</li>
      <li>Use email to nurture your audience</li>
      <li>Offer premium resources that solve real problems</li>
    </ul>
    <h2>Monetization ideas</h2>
    <p>Combine memberships, digital products, and consultancy to diversify revenue and reduce risk.</p>
    <h2>FAQ</h2>
    <h3>How fast can creators grow?</h3>
    <p>Growth varies, but consistent publishing and clear audience targeting are the fastest paths forward.</p>
    <h3>Should I launch a product first or audience first?</h3>
    <p>Build an audience first, then validate product ideas with real interest.</p>
    $$,
    'Creator Economy',
    (select id from blog_categories where slug = 'creator-economy'),
    '["creator economy","creator growth","audience building"]'::jsonb,
    'published',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://yourdomain.com/blog/creator-economy-growth-hacks',
    'BlogPosting',
    true,
    0,
    'Utility Hub',
    8,
    'Creator Economy Growth Hacks',
    'Use creator economy strategies to grow your audience and monetize your work more sustainably.',
    'creator economy, creator growth, audience building',
    'index,follow',
    now(),
    now()
  )
on conflict (slug) do update set
  excerpt = excluded.excerpt,
  content = excluded.content,
  category = excluded.category,
  category_id = excluded.category_id,
  tags = excluded.tags,
  status = excluded.status,
  featured_image = excluded.featured_image,
  og_image = excluded.og_image,
  canonical_url = excluded.canonical_url,
  schema_type = excluded.schema_type,
  featured = excluded.featured,
  author_name = excluded.author_name,
  reading_time = excluded.reading_time,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  seo_keywords = excluded.seo_keywords,
  meta_robots = excluded.meta_robots,
  updated_at = now();

-- IMPORTANT: If admin writes are still blocked, make sure your Supabase auth user is registered as an admin.
-- Replace <YOUR_SUPABASE_USER_ID> with the authenticated user id for your admin account.
-- insert into public.admin_users (id, is_admin) values ('<4fb672ad-9a20-45fd-93f4-434784bc24d7', true)
--   on conflict (id) do update set is_admin = true, updated_at = now();
