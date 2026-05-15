{
  "name": "BlogPost",
  "type": "object",
  "properties": {
    "title": {
      "type": "string"
    },
    "slug": {
      "type": "string"
    },
    "excerpt": {
      "type": "string",
      "description": "Short summary"
    },
    "content": {
      "type": "string",
      "description": "Full HTML content"
    },
    "featured_image": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "status": {
      "type": "string",
      "enum": [
        "published",
        "draft",
        "archived"
      ],
      "default": "draft"
    },
    "author_name": {
      "type": "string"
    },
    "author_avatar": {
      "type": "string"
    },
    "reading_time": {
      "type": "number"
    },
    "seo_title": {
      "type": "string"
    },
    "seo_description": {
      "type": "string"
    },
    "seo_keywords": {
      "type": "string"
    },
    "canonical_url": {
      "type": "string"
    },
    "og_image": {
      "type": "string"
    },
    "schema_type": {
      "type": "string",
      "enum": [
        "Article",
        "BlogPosting",
        "NewsArticle"
      ],
      "default": "BlogPosting"
    },
    "featured": {
      "type": "boolean",
      "default": false
    },
    "views_count": {
      "type": "number",
      "default": 0
    },
    "reading_time": {
      "type": "number"
    },
    "meta_robots": {
      "type": "string",
      "default": "index,follow"
    },
    "updated_at": {
      "type": "string"
    },
    "sort_order": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "title",
    "slug"
  ]
}