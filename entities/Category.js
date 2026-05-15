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
      "type": "string"
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
    }
  },
  "required": [
    "name",
    "slug"
  ]
}