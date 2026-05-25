{
  "name": "Tool",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Tool display name"
    },
    "slug": {
      "type": "string",
      "description": "URL-friendly slug"
    },
    "description": {
      "type": "string",
      "description": "Short description for cards"
    },
    "long_description": {
      "type": "string",
      "description": "Full HTML description for the tool page"
    },
    "category_id": {
      "type": "string",
      "description": "Category ID this tool belongs to"
    },
    "icon": {
      "type": "string",
      "description": "Lucide icon name"
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
    "is_featured": {
      "type": "boolean",
      "default": false
    },
    "is_trending": {
      "type": "boolean",
      "default": false
    },
    "usage_count": {
      "type": "number",
      "default": 0
    },
    "input_fields": {
      "type": "array",
      "description": "Dynamic input field definitions",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "label": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "text",
              "number",
              "textarea",
              "select",
              "file",
              "color",
              "date"
            ]
          },
          "placeholder": {
            "type": "string"
          },
          "required": {
            "type": "boolean"
          },
          "options": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "default_value": {
            "type": "string"
          },
          "min": {
            "type": "number"
          },
          "max": {
            "type": "number"
          }
        }
      }
    },
    "formula_type": {
      "type": "string",
      "enum": [
        "javascript",
        "text_transform",
        "math",
        "conversion",
        "generator"
      ],
      "description": "Type of computation"
    },
    "formula_config": {
      "type": "string",
      "description": "JSON config for the formula/logic"
    },
    "output_type": {
      "type": "string",
      "enum": [
        "text",
        "number",
        "html",
        "json",
        "file",
        "table"
      ],
      "default": "text"
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
    "faq": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string"
          },
          "answer": {
            "type": "string"
          }
        }
      }
    },
    "related_tool_ids": {
      "type": "array",
      "items": {
        "type": "string"
      }
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