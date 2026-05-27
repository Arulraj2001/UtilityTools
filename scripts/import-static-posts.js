import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { STATIC_BLOG_POSTS } from '../src/lib/staticBlogPosts.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY in your environment or .env file.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function upsertStaticPosts() {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] }

  for (const post of STATIC_BLOG_POSTS) {
    const slug = post.slug
    try {
      const existingRes = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle()
      if (existingRes.error) throw existingRes.error

      // Build canonical payload from static post
      const payload = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        content: post.content || null,
        status: post.status || 'published',
        author_name: post.author_name || null,
        reading_time: post.reading_time || null,
        seo_title: post.seo_title || post.title || null,
        seo_description: post.seo_description || post.excerpt || null,
        seo_keywords: post.seo_keywords || null,
        tags: post.tags && post.tags.length ? post.tags : null,
        faq_items: post.faq_items && post.faq_items.length ? post.faq_items : null,
        is_featured: !!post.is_featured,
        featured_image: post.featured_image || post.og_image || null,
        og_image: post.og_image || null,
        canonical_url: post.canonical_url || null,
        category: post.category || null,
        category_id: post.category_id || null,
        blog_categories: post.blog_categories || null,
        og_title: post.og_title || null,
        og_description: post.og_description || null,
        twitter_title: post.twitter_title || null,
        twitter_description: post.twitter_description || null,
        updated_at: post.updated_at || post.created_at || new Date().toISOString(),
        created_at: post.created_at || new Date().toISOString(),
      }

      if (existingRes.data) {
        const existing = existingRes.data

        // Compare shallow fields to decide whether to update
        const keysToCompare = [
          'title','excerpt','content','status','author_name','reading_time','seo_title','seo_description',
          'seo_keywords','tags','faq_items','is_featured','featured_image','og_image','canonical_url','category','category_id'
        ]

        let needsUpdate = false
        for (const key of keysToCompare) {
          const a = existing[key]
          const b = payload[key]
          const aJson = (a === null || a === undefined) ? null : JSON.stringify(a)
          const bJson = (b === null || b === undefined) ? null : JSON.stringify(b)
          if (aJson !== bJson) { needsUpdate = true; break }
        }

        if (needsUpdate) {
          const upd = await supabase.from('blog_posts').update({ ...payload, updated_at: payload.updated_at }).eq('id', existing.id)
          if (upd.error) throw upd.error
          console.log(`Updated post: ${slug} (id=${existing.id})`)
          results.updated += 1
        } else {
          console.log(`Unchanged post: ${slug} (id=${existing.id})`)
          results.skipped += 1
        }
        continue
      }

      // Insert new record. Try with string id (static-<slug>) first; if DB rejects, retry without id.
      const tryPayloadWithId = { id: post.id, ...payload }
      let insertRes = await supabase.from('blog_posts').insert([tryPayloadWithId])
      if (insertRes.error) {
        // If the error looks like PK/column type issue, retry without id
        console.warn(`Insert with id failed for ${slug}, retrying without id:`, insertRes.error.message || insertRes.error)
        insertRes = await supabase.from('blog_posts').insert([payload])
      }

      if (insertRes.error) throw insertRes.error
      console.log(`Inserted post: ${slug} (inserted id=${insertRes.data?.[0]?.id || 'unknown'})`)
      results.inserted += 1
    } catch (err) {
      console.error(`Error importing ${slug}:`, err.message || err)
      results.errors.push({ slug, error: err.message || err })
    }
  }

  return results
}

(async () => {
  console.log(`Importing ${STATIC_BLOG_POSTS.length} static posts...`)
  const res = await upsertStaticPosts()
  console.log('Import complete:', res)
  process.exit(0)
})().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
