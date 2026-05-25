{
  "name": "Category",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "slug": {
      "type": "string"
    },
    "description": {
      "type": "string",
      "description": "Short description for category listings"
    },
    "icon": {
      "type": "string",
      "description": "Lucide icon name"
    },
    "color": {
      "type": "string",
      "description": "Hex color for the category"
    },
    "sort_order": {
      "type": "number",
      "default": 0
    },
    "tool_count": {
      "type": "number",
      "default": 0
    },
    "is_featured": {
      "type": "boolean",
      "default": false
    },
    "seo_title": {
      "type": "string",
      "description": "SEO page title (60 chars)"
    },
    "seo_description": {
      "type": "string",
      "description": "SEO meta description (160 chars)"
    },
    "seo_keywords": {
      "type": "string",
      "description": "Comma-separated SEO keywords"
    },
    "seo_content": {
      "type": "string",
      "description": "Long-form HTML content for category page intro"
    },
    "featured_image": {
      "type": "string",
      "description": "Featured image URL for Open Graph"
    },
    "canonical_url": {
      "type": "string",
      "description": "Custom canonical URL (optional)"
    }
  },
  "required": [
    "name",
    "slug"
  ]
}