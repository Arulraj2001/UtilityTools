-- Seed starter job categories
INSERT INTO job_categories (name, slug, description, color, icon, featured, sort_order)
VALUES
  ('Government Jobs', 'government-jobs', 'Public sector and government opportunities', '#0ea5a4', 'shield-check', true, 0),
  ('Private Jobs', 'private-jobs', 'Opportunities in private companies', '#fb923c', 'briefcase', false, 1),
  ('IT Jobs', 'it-jobs', 'Information Technology and software roles', '#6366f1', 'cpu', true, 2),
  ('Remote Jobs', 'remote-jobs', 'Work-from-home and remote-friendly roles', '#10b981', 'home', false, 3),
  ('Banking Jobs', 'banking-jobs', 'Banking and finance sector jobs', '#f43f5e', 'credit-card', false, 4),
  ('Railway Jobs', 'railway-jobs', 'Indian Railways & related openings', '#06b6d4', 'train', false, 5),
  ('Internship', 'internship', 'Internships and training roles', '#8b5cf6', 'graduation-cap', false, 6),
  ('Freshers Jobs', 'freshers-jobs', 'Entry-level roles for freshers', '#ef4444', 'sparkles', false, 7)
ON CONFLICT (slug) DO NOTHING;
