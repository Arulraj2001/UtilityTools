{
  "name": "AdPlacement",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "slot_id": {
      "type": "string",
      "description": "Ad position identifier"
    },
    "ad_code": {
      "type": "string",
      "description": "HTML/JS ad code"
    },
    "placement": {
      "type": "string",
      "enum": [
        "header",
        "sidebar",
        "in_content",
        "footer",
        "tool_top",
        "tool_bottom",
        "blog_top",
        "blog_bottom",
        "sticky_bottom"
      ]
    },
    "is_active": {
      "type": "boolean",
      "default": true
    },
    "page_type": {
      "type": "string",
      "enum": [
        "all",
        "home",
        "tool",
        "blog",
        "category"
      ],
      "default": "all"
    }
  },
  "required": [
    "name",
    "slot_id"
  ]
}