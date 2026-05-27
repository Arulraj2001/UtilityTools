import fs from 'fs'
import path from 'path'
import { STATIC_BLOG_POSTS, STATIC_BLOG_CATEGORIES } from '../src/lib/staticBlogPosts.js'

const outFile = process.argv[2] || 'import_static_posts.sql'

const sqlEscape = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return v.toString()
  // For JSON objects/arrays
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb"
  // string
  return "'" + v.replace(/'/g, "''") + "'"
}

const now = () => "now()"

let sql = []

sql.push('-- Generated SQL to upsert static blog categories and posts')
sql.push('-- Run this in Supabase SQL editor or psql. It upserts by slug (safer than forcing id).')
sql.push('\n')

// Categories
if (Array.isArray(STATIC_BLOG_CATEGORIES) && STATIC_BLOG_CATEGORIES.length) {
  sql.push('-- Upsert categories')
  for (const cat of STATIC_BLOG_CATEGORIES) {
    const cols = ['name','slug','description','seo_title','seo_description','seo_keywords','featured_image','icon','color','featured','sort_order','created_at','updated_at']
    const vals = [
      sqlEscape(cat.name),
      sqlEscape(cat.slug),
      sqlEscape(cat.description),
      sqlEscape(cat.seo_title || null),
      sqlEscape(cat.seo_description || null),
      sqlEscape(cat.seo_keywords || null),
      sqlEscape(cat.featured_image || null),
      sqlEscape(cat.icon || null),
      sqlEscape(cat.color || null),
      sqlEscape(!!cat.featured),
      sqlEscape(cat.sort_order || 0),
      now(),
      now(),
    ]

    sql.push(`INSERT INTO blog_categories (${cols.join(',')}) VALUES (${vals.join(',')})` +
      ` ON CONFLICT (slug) DO UPDATE SET ${cols.filter(c => c !== 'updated_at').map(c => `${c}=EXCLUDED.${c}`).join(', ')}, updated_at=now();`
    )
  }
  sql.push('\n')
}

// Posts
if (Array.isArray(STATIC_BLOG_POSTS) && STATIC_BLOG_POSTS.length) {
  sql.push('-- Upsert posts by slug (will INSERT new posts, or UPDATE existing posts)')
  const cols = ['title','slug','excerpt','content','category_id','tags','status','featured_image','og_image','canonical_url','schema_type','featured','views_count','author_name','reading_time','seo_title','seo_description','seo_keywords','meta_robots','created_at','updated_at']

  for (const post of STATIC_BLOG_POSTS) {
    // NOTE: category_id is set to NULL here because static categories use text IDs, 
    // but blog_posts.category_id is a UUID column. You can manually assign categories in the admin UI.
    const tags = post.tags && post.tags.length ? post.tags : null
    const createdAt = post.created_at || 'now()'
    const updatedAt = post.updated_at || createdAt || 'now()'

    const vals = [
      sqlEscape(post.title || null),
      sqlEscape(post.slug || null),
      sqlEscape(post.excerpt || null),
      sqlEscape(post.content || null),
      sqlEscape(null), // category_id set to NULL — assign manually in admin UI
      sqlEscape(tags),
      sqlEscape(post.status || 'published'),
      sqlEscape(post.featured_image || null),
      sqlEscape(post.og_image || null),
      sqlEscape(post.canonical_url || null),
      sqlEscape(post.schema_type || 'BlogPosting'),
      sqlEscape(!!post.is_featured),
      sqlEscape(post.views_count || 0),
      sqlEscape(post.author_name || null),
      sqlEscape(post.reading_time || null),
      sqlEscape(post.seo_title || post.title || null),
      sqlEscape(post.seo_description || post.excerpt || null),
      sqlEscape(post.seo_keywords || null),
      sqlEscape(post.meta_robots || 'index,follow'),
      createdAt === 'now()' ? 'now()' : sqlEscape(createdAt),
      updatedAt === 'now()' ? 'now()' : sqlEscape(updatedAt),
    ]

    const insertSQL = `INSERT INTO blog_posts (${cols.join(',')}) VALUES (${vals.join(',')}) ON CONFLICT (slug) DO UPDATE SET ${cols.filter(c => c !== 'created_at' && c !== 'updated_at').map(c => `${c}=EXCLUDED.${c}`).join(', ')}, updated_at=now();`

    sql.push(insertSQL)
  }
}

// Footer note
sql.push('\n-- End of generated SQL')

fs.writeFileSync(path.resolve(process.cwd(), outFile), sql.join('\n'))
console.log('Wrote', outFile)
console.log('Open the file, review, then run it in Supabase SQL editor or psql.')
console.log('\nIf your blog_posts.id column is a non-text serial/uuid, this script upserts by slug rather than forcing id values.')
