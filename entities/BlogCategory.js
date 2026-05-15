{
  "name": "BlogCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "slug": {
      "type": "string"
    },
    "description": {
      "type": "string"
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
    "featured_image": {
      "type": "string"
    },
    "icon": {
      "type": "string"
    },
    "color": {
      "type": "string"
    },
    "featured": {
      "type": "boolean",
      "default": false
    },
    "sort_order": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "name",
    "slug"
  ]
}
