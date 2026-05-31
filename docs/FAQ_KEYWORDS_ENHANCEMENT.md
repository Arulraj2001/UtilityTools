# FAQ Keywords Enhancement - Implementation Guide

## Overview
This document explains the new primary/secondary keywords and enhanced FAQ functionality for tools.

## What's New

### 1. Primary & Secondary Keywords
- **Primary Keywords**: Main target keywords for the tool (3-5 keywords) - displayed prominently
- **Secondary Keywords**: Related/supporting keywords (5-10 keywords) - displayed below primary
- **Legacy Keywords**: Old `seo_keywords` field - maintained for backward compatibility

### 2. Enhanced FAQ Management
- Bulk FAQ upload from JSON files
- Multiple supported JSON formats
- Improved FAQ display on tool pages
- FAQ schema generation

### 3. Visual Improvements
- Primary keywords styled with stronger colors (primary color)
- Secondary keywords styled with accent color
- Clear section headers showing keyword type
- Better visual hierarchy on tool pages

---

## Database Changes

### Schema Update
Two new columns added to the `tools` table:
```sql
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS primary_keywords text;
ADD COLUMN IF NOT EXISTS secondary_keywords text;
```

### Run Migration
Execute: `supabase_migration_keywords_faq.sql`

---

## Tool Editor Features

### Primary Keywords Input
- Located in SEO tab
- Comma-separated values
- Help text: "High-priority keywords for the tool (3-5 keywords)"

### Secondary Keywords Input
- Located in SEO tab
- Comma-separated values
- Help text: "Related/supporting keywords (5-10 keywords)"

### Bulk FAQ Upload
1. Click "Upload JSON" button in FAQ tab
2. Select a JSON file with FAQ items
3. Automatically validates and loads FAQ items

### Supported JSON Formats
```json
// Format 1: Direct array
[
  {"question": "What is this?", "answer": "It's a tool..."},
  {"question": "How to use?", "answer": "Follow these steps..."}
]

// Format 2: Object with 'faq' property
{
  "faq": [
    {"question": "What is this?", "answer": "It's a tool..."}
  ]
}

// Format 3: Object with 'faq_items' property
{
  "faq_items": [
    {"question": "What is this?", "answer": "It's a tool..."}
  ]
}

// Format 4: Object with 'faqs' property
{
  "faqs": [
    {"question": "What is this?", "answer": "It's a tool..."}
  ]
}
```

---

## Tool Page Display

### Keywords Section
Shows three separate sections if populated:

1. **Primary Keywords** (Primary Color)
   - Styled with primary brand color
   - Labeled "PRIMARY KEYWORDS"
   - Help text: "Main target keywords for this tool"

2. **Secondary Keywords** (Accent Color)
   - Styled with accent color
   - Labeled "SECONDARY KEYWORDS"
   - Help text: "Related search terms"

3. **Legacy Keywords** (Primary/10 opacity)
   - Only shown if primary/secondary are empty
   - Labeled "RELATED SEARCH TERMS"
   - Backward compatible display

### FAQ Section
- Appears as accordion below SEO content
- Shows all FAQ items with questions and answers
- FAQ schema automatically generated in page head
- Conditional rendering: only shows if tool has FAQ items

---

## SEO & Schema

### Meta Keywords
The page meta keywords tag includes:
1. Primary keywords (highest priority)
2. Secondary keywords (medium priority)
3. Legacy seo_keywords (fallback)
4. All joined with commas

### FAQ Schema (JSON-LD)
Automatically generated when tool has FAQ items:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Answer text"
      }
    }
  ]
}
```

---

## Implementation Files Changed

### 1. `supabase_schema.sql`
- Added `primary_keywords` column to tools table
- Added `secondary_keywords` column to tools table

### 2. `supabase_migration_keywords_faq.sql` (NEW)
- Migration file for existing databases
- Run this to add columns to existing projects

### 3. `src/components/admin/ToolEditor.jsx`
- Added form fields for primary_keywords
- Added form fields for secondary_keywords
- Added bulk FAQ JSON upload functionality
- Added upload format examples
- Added new imports: `Upload` icon from lucide-react

### 4. `src/components/seo/ToolSEO.jsx`
- Updated keywords concatenation logic
- Combines primary + secondary + legacy keywords
- Maintains backward compatibility

### 5. `src/components/seo/ToolContentSections.jsx`
- Completely redesigned keywords section
- Shows primary keywords with primary color
- Shows secondary keywords with accent color
- Shows legacy keywords only if primary/secondary empty
- Improved visual hierarchy and labels

### 6. `src/pages/ToolPage.jsx`
- No changes needed (already displays FAQ correctly)
- FAQ display maintained as-is

---

## Backward Compatibility

✅ **Fully Backward Compatible**
- Existing tools with only `seo_keywords` will continue to work
- If no primary/secondary keywords, displays legacy keywords
- Empty fields don't break the display
- FAQ section displays whether `faq` exists
- All existing tools visible without changes

---

## Best Practices

### Primary Keywords (3-5 Keywords)
- Most specific terms for the tool
- High search volume keywords
- Should appear in tool name or description
- Examples for "PDF Compressor":
  - compress pdf
  - reduce pdf size
  - pdf compressor

### Secondary Keywords (5-10 Keywords)
- Related but less specific terms
- Long-tail keywords
- Supporting search intent
- Examples for "PDF Compressor":
  - online pdf compression
  - free pdf compressor
  - shrink pdf
  - make pdf smaller

### FAQ Structure
- 5-10 questions per tool
- Clear, concise answers
- Address common user questions
- Include how-to and troubleshooting
- Character limit: no limit, but keep answers readable

---

## Usage Example

### Creating a Tool with Keywords & FAQ

1. **In Tool Editor - SEO Tab:**
   - Primary Keywords: `compress pdf, reduce pdf size, pdf compressor`
   - Secondary Keywords: `online pdf compression, free pdf compressor, shrink pdf, make pdf smaller`

2. **In Tool Editor - FAQ Tab:**
   - Click "Upload JSON"
   - Select a JSON file with FAQ items, or add manually:
     - Q: "Is my file safe?"
     - A: "Yes, all processing happens in your browser..."

3. **On Tool Page:**
   - Primary keywords shown prominently in primary color
   - Secondary keywords shown below in accent color
   - FAQ accordion shows all questions/answers
   - FAQ schema automatically added to page head

---

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Tool Editor loads with new fields
- [ ] Can enter primary keywords
- [ ] Can enter secondary keywords
- [ ] Can upload bulk FAQ JSON
- [ ] FAQ items display on tool page
- [ ] Primary keywords styled correctly
- [ ] Secondary keywords styled correctly
- [ ] FAQ schema appears in page source
- [ ] Legacy keywords show if new fields empty
- [ ] Existing tools still work
- [ ] Mobile display looks good

---

## Troubleshooting

### FAQ Upload Not Working
- Ensure JSON is valid (use [jsonlint.com](https://jsonlint.com/))
- Check format: array of {question, answer} objects
- Look for quotes around keys and values
- Verify no trailing commas

### Keywords Not Showing
- Enter keywords separated by commas
- Avoid special characters
- Ensure tool is published (not draft)
- Check that fields are populated (not empty)

### FAQ Schema Not Showing
- Check page source for `<script type="application/ld+json">`
- Verify FAQ items exist
- Inspect with Google's Structured Data Tester

---

## Future Enhancements

- Drag-and-drop FAQ reordering
- FAQ keyword suggestions
- Primary/secondary keyword validation
- Bulk keyword update from CSV
- FAQ performance metrics
- Rich text support for FAQ answers
