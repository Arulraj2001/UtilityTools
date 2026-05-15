# Utility Tools

This repository is a React + Vite utility tools platform backed by Supabase.

## Local development

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies: `npm install`
4. Create an `.env.local` file and configure Supabase environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Start the development server: `npm run dev`

## Admin access

The admin area uses Supabase magic link authentication.
Go to `/login` and enter your email to receive a login link.

## Notes

- The app was migrated from Base44 to Supabase.
- Data access now relies on Supabase tables such as `tools`, `categories`, `blog_posts`, `redirects`, `ad_placements`, and `site_settings`.
- Run `npm install` again after updating dependencies.
