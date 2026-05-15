{
  "name": "Redirect",
  "type": "object",
  "properties": {
    "from_path": {
      "type": "string"
    },
    "to_path": {
      "type": "string"
    },
    "status_code": {
      "type": "number",
      "enum": [
        301,
        302
      ],
      "default": 301
    },
    "is_active": {
      "type": "boolean",
      "default": true
    }
  },
  "required": [
    "from_path",
    "to_path"
  ]
}