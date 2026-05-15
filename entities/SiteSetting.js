{
  "name": "SiteSetting",
  "type": "object",
  "properties": {
    "key": {
      "type": "string"
    },
    "value": {
      "type": "string"
    },
    "type": {
      "type": "string",
      "enum": [
        "text",
        "html",
        "json",
        "boolean",
        "number"
      ],
      "default": "text"
    },
    "group": {
      "type": "string",
      "enum": [
        "general",
        "seo",
        "analytics",
        "social",
        "monetization"
      ]
    }
  },
  "required": [
    "key",
    "value"
  ]
}