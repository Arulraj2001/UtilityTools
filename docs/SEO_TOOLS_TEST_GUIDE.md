# SEO Tools Quick Test Guide

## Pre-Test Requirements
- ✅ Dev server running (`npm run dev`)
- ✅ Project accessible at `http://localhost:5173`
- ✅ Supabase connection active

## Test Sequence

### Phase 1: Database Seeding (5 minutes)
1. Navigate to: `http://localhost:5173/admin/seeder`
2. Click "Seed All Tools" button
3. **Expected Result**: Message saying "N tools created successfully"
4. Check console for any errors
5. **Status**: ✅ Pass / ❌ Fail

### Phase 2: Tool Discovery (2 minutes)
1. Navigate to: `http://localhost:5173/tools`
2. Filter or search for "SEO Tools" category
3. **Expected Result**: All 11 SEO tools visible in list
4. **Status**: ✅ Pass / ❌ Fail

---

## Individual Tool Tests

### Test 1: Meta Tag Generator
- **URL**: `http://localhost:5173/tool/meta-tag-generator`
- **Test Input**:
  - Title: "My Awesome Website"
  - Description: "This is a great website"
  - Keywords: "web, development, tools"
  - Author: "Your Name"
  - Canonical URL: "https://example.com"
  - Robots: "index,follow"
- **Expected Output**: HTML meta tags with proper escaping
- **Pass Criteria**:
  - ✅ No "No builtin for" error
  - ✅ Input form renders correctly
  - ✅ Submit button triggers execution
  - ✅ Output shows meta tags in `<meta>` format
  - ✅ Can copy result to clipboard
- **Status**: ✅ Pass / ❌ Fail

### Test 2: Open Graph Generator
- **URL**: `http://localhost:5173/tool/open-graph-generator`
- **Test Input**:
  - Title: "Amazing Article"
  - Description: "Check out this amazing content"
  - URL: "https://example.com/article"
  - Image: "https://example.com/image.jpg"
  - Site Name: "My Website"
  - Type: "article"
- **Expected Output**: OG meta tags for social sharing
- **Pass Criteria**:
  - ✅ Tool executes without error
  - ✅ Returns proper OG tags
  - ✅ Includes `og:title`, `og:description`, `og:image`, `og:url`
- **Status**: ✅ Pass / ❌ Fail

### Test 3: Robots.txt Generator
- **URL**: `http://localhost:5173/tool/robots-txt-generator`
- **Test Input**:
  - User Agent: "*"
  - Allow: "/" (or "/public/")
  - Disallow: "/admin/" (or "/private/")
  - Sitemap: "https://example.com/sitemap.xml"
- **Expected Output**: Valid robots.txt format
- **Pass Criteria**:
  - ✅ Renders proper robots.txt format
  - ✅ Includes User-agent, Allow, Disallow, Sitemap lines
  - ✅ Can copy to clipboard
- **Status**: ✅ Pass / ❌ Fail

### Test 4: Sitemap Generator
- **URL**: `http://localhost:5173/tool/sitemap-generator`
- **Test Input**:
  - URLs: (paste these on separate lines)
    ```
    https://example.com/
    https://example.com/about
    https://example.com/contact
    ```
  - Base URL: "https://example.com"
  - Change Frequency: "weekly"
  - Priority: "0.5"
- **Expected Output**: Valid XML sitemap
- **Pass Criteria**:
  - ✅ Outputs XML with `<?xml>` declaration
  - ✅ Contains `<urlset>` root element
  - ✅ Each URL has `<url>`, `<loc>`, `<changefreq>`, `<priority>`
  - ✅ Valid XML format
- **Status**: ✅ Pass / ❌ Fail

### Test 5: Schema Generator
- **URL**: `http://localhost:5173/tool/schema-generator`
- **Test Input**:
  - Schema Type: "Article"
  - Name: "My Article Title"
  - URL: "https://example.com/article"
  - Description: "Article description"
  - Image: "https://example.com/image.jpg"
  - Author: "John Doe"
  - Date Published: "2024-01-15"
  - Date Modified: "2024-01-20"
- **Expected Output**: JSON-LD Schema
- **Pass Criteria**:
  - ✅ Returns valid JSON
  - ✅ Contains `@context`, `@type`, `name`, `url`, etc.
  - ✅ Properly formatted with indentation
  - ✅ Can copy JSON
- **Status**: ✅ Pass / ❌ Fail

### Test 6: UTM Builder
- **URL**: `http://localhost:5173/tool/utm-builder`
- **Test Input**:
  - URL: "https://example.com/page"
  - Source: "google"
  - Medium: "cpc"
  - Campaign: "spring-sale"
  - Term: "marketing"
  - Content: "ad-1"
- **Expected Output**: Full tracking URL
- **Pass Criteria**:
  - ✅ Returns complete URL with query parameters
  - ✅ Includes all UTM parameters: utm_source, utm_medium, utm_campaign, utm_term, utm_content
  - ✅ Parameters properly URL-encoded
  - ✅ Can copy URL
- **Status**: ✅ Pass / ❌ Fail

### Test 7: Keyword Density Checker
- **URL**: `http://localhost:5173/tool/keyword-density-checker`
- **Test Input**:
  - Text: "React is a JavaScript library. React makes building UIs easier. Use React for better performance."
  - Keyword: "React"
- **Expected Output**: Cards with metrics
- **Pass Criteria**:
  - ✅ Shows keyword count
  - ✅ Shows total words
  - ✅ Calculates percentage density
  - ✅ Outputs in card format (not JSON)
  - ✅ Shows recommendation (1-3% is optimal)
- **Status**: ✅ Pass / ❌ Fail

### Test 8: Word Density Checker
- **URL**: `http://localhost:5173/tool/word-density-checker`
- **Test Input**:
  - Text: "The quick brown fox jumps over the lazy dog. The fox is clever and the dog is lazy."
  - Min Occurrences: "2"
- **Expected Output**: Top 20 most frequent words
- **Pass Criteria**:
  - ✅ Shows word frequency list
  - ✅ Only includes words with ≥2 occurrences
  - ✅ Outputs in card format
  - ✅ Limited to top 20 words
  - ✅ Shows word and count for each
- **Status**: ✅ Pass / ❌ Fail

### Test 9: HTML Minifier
- **URL**: `http://localhost:5173/tool/html-minifier`
- **Test Input**:
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>Test Page</title>
      <!-- This is a comment -->
    </head>
    <body>
      <h1>Hello World</h1>
      <p>This is a test paragraph.</p>
    </body>
  </html>
  ```
- **Expected Output**: Minified HTML with stats
- **Pass Criteria**:
  - ✅ Removes extra whitespace
  - ✅ Removes comments
  - ✅ Shows original size in bytes
  - ✅ Shows minified size in bytes
  - ✅ Shows savings percentage
  - ✅ Output is valid HTML
- **Status**: ✅ Pass / ❌ Fail

### Test 10: CSS Minifier
- **URL**: `http://localhost:5173/tool/css-minifier`
- **Test Input**:
  ```css
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
  }

  /* This is a comment */
  h1 {
    color: #333;
    font-size: 24px;
    font-weight: bold;
  }
  ```
- **Expected Output**: Minified CSS with stats
- **Pass Criteria**:
  - ✅ Removes whitespace
  - ✅ Removes comments
  - ✅ Shows byte reduction metrics
  - ✅ Output is valid CSS
  - ✅ Preserves functionality
- **Status**: ✅ Pass / ❌ Fail

### Test 11: JavaScript Minifier
- **URL**: `http://localhost:5173/tool/javascript-minifier`
- **Test Input**:
  ```javascript
  function greet(name) {
    // This function greets someone
    console.log("Hello, " + name + "!");
    return true;
  }

  // Call the function
  greet("World");
  ```
- **Expected Output**: Minified JavaScript with stats
- **Pass Criteria**:
  - ✅ Removes comments
  - ✅ Removes extra whitespace
  - ✅ Shows byte reduction
  - ✅ Output is valid JavaScript
  - ✅ Functionality preserved
- **Status**: ✅ Pass / ❌ Fail

---

## Summary Checklist

- [ ] Phase 1: Database Seeding - PASS
- [ ] Phase 2: Tool Discovery - PASS
- [ ] Test 1: Meta Tag Generator - PASS
- [ ] Test 2: Open Graph Generator - PASS
- [ ] Test 3: Robots.txt Generator - PASS
- [ ] Test 4: Sitemap Generator - PASS
- [ ] Test 5: Schema Generator - PASS
- [ ] Test 6: UTM Builder - PASS
- [ ] Test 7: Keyword Density Checker - PASS
- [ ] Test 8: Word Density Checker - PASS
- [ ] Test 9: HTML Minifier - PASS
- [ ] Test 10: CSS Minifier - PASS
- [ ] Test 11: JavaScript Minifier - PASS

**Overall Status**: ✅ All Tests Passed / ❌ Some Tests Failed

### Failed Tests (if any):
- [ ] Test Name: _________________ (Error: _________________)

---

## Troubleshooting

**Problem**: Tool page shows "No builtin for: [slug]" error
- Verify seeder ran successfully
- Check browser console for errors
- Verify tool slug matches case in switch statement

**Problem**: Input form missing fields
- Refresh page
- Check browser console
- Verify toolsData.js input_fields are correct

**Problem**: Output not displaying
- Check ToolResult component in browser console
- Verify output_type matches function return
- Reload page

**Problem**: Copy button not working
- Check browser console for errors
- Verify result value is being returned
- Try refreshing page

---

**Test Date**: ________________  
**Tester Name**: ________________  
**Status**: ✅ PASS / ❌ NEEDS FIXES
