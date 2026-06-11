const fs = require('fs');
const path = 'src/lib/jobWritingFramework.js';
let content = fs.readFileSync(path, 'utf8');

// The file uses CRLF. The ANTI_SPAM_RULES template literal starts with ` followed by \r\n
// and ends with \r\n` (backtick on its own line preceded by CRLF)
const CONST_DECL = 'export const ANTI_SPAM_RULES = `';
const startIdx = content.indexOf(CONST_DECL);
if (startIdx === -1) { console.error('ANTI_SPAM_RULES not found'); process.exit(1); }

// Find the closing backtick: it appears as \r\n`\r\n (alone on a line)
const bodyStart = startIdx + CONST_DECL.length;
// Search for the closing backtick pattern
const closingPattern = '\r\n`\r\n';
const closingIdx = content.indexOf(closingPattern, bodyStart);
if (closingIdx === -1) { console.error('Closing backtick not found'); process.exit(1); }

console.log('Found ANTI_SPAM_RULES from', startIdx, 'body from', bodyStart, 'closing at', closingIdx);

const newBody = `
=== CONTENT RULES — MANDATORY — VIOLATION = REGENERATE ===

-- PROHIBITED PHRASES (never use any of these) --
- "Apply now before it's too late" or any urgency variant
- "Golden opportunity" / "Dream job" / "Once-in-a-lifetime chance"
- "Limited seats" (say "limited vacancies" only if factually stated in notification)
- "Hurry", "Rush", "Don't miss", "Last chance", "Grab this", "Act now"
- "Guaranteed selection" or similar false promises
- "High salary" without citing exact figure from notification
- "Amazing", "Incredible", "Wonderful", "Fantastic" — no hype adjectives
- "It's important to note", "Delve into", "It is worth mentioning", "In conclusion"
- "In today's competitive landscape", "In today's fast-paced world"
- "In this article we will explore", "This article aims to"
- "Furthermore", "Moreover", "Additionally" as paragraph starters — banned
- "It goes without saying", "Needless to say", "As we all know"
- Any rhetorical question used as a section opener

-- PROHIBITED PRACTICES --
- Keyword stuffing: same keyword more than 2 times in any 300-word block
- Repeating the same information across multiple sections in different words
- Two consecutive sentences that make the same point
- Unverifiable claims about salaries, promotions, or benefits
- Misleading information about selection or eligibility

-- REQUIRED WRITING STYLE: HUMAN, EDITORIAL QUALITY --
Voice and Tone:
  - Write like a senior recruitment journalist: knowledgeable, factual, helpful
  - Predominantly active voice — not "Candidates are selected by..." but "The commission selects candidates through..."
  - Conversational but precise — write for a first-time applicant who needs to understand everything
  - Vary sentence length deliberately: short punchy sentences (8-12 words) followed by detailed explanatory ones (20-30 words)

Paragraph rules:
  - Maximum 3 sentences per paragraph — break longer content into sub-points
  - No walls of text — use bullet points, tables, and numbered lists generously
  - Each paragraph must contain one clear idea only
  - Never start two consecutive paragraphs with the same word or phrase

Transitions and flow:
  - Connect sections naturally using context, not hollow connectors
  - Good: "The selection has three stages." followed by "Stage one, the written exam..."
  - Bad: "Furthermore, regarding the selection process, it is important to note..."

Anti-repetition:
  - Each section must introduce NEW information not covered in any previous section
  - If a fact appears in Section 2, do not restate it in Section 6 — reference it briefly instead
  - Vary vocabulary: if you used "candidates" in a sentence, use "applicants" or "aspirants" next time
  - Never use the same noun more than once in the same paragraph

HTML output structure (full_description field):
  - Use h2 for all 17 section titles — exactly one h2 per section
  - Use h3 for sub-sections within a section
  - Use p for paragraphs (max 3 sentences each)
  - Use ul/li for unordered lists; ol/li for numbered processes
  - Use table/thead/tbody/tr/th/td for all tabular data — no plain-text tables
  - NO inline styles, NO div wrappers, NO br tags for spacing
  - Use strong only for actual key terms, dates, or numbers — not decoration

-- SECTION-SPECIFIC WRITING RULES --
Section 1 (Quick Summary):
  - Must read like a news lead: answer Who, What, How Many, and When in 2 sentences max
  - Good: "The Staff Selection Commission has released 17,727 vacancies for CGL 2024. Applications open July 24 and close August 14."
  - Bad: "This article covers the SSC CGL 2024 recruitment. Read on to find out more."

Section 3 (Why This Recruitment Matters):
  - Must be factual — cite sector size, historical significance, or career path data
  - Never write "This is an excellent opportunity" or any promotional variant
  - Good: "SSC CGL is India's largest annual graduate-level recruitment, filling posts across 23 central ministries."

Section 14 (Common Mistakes):
  - Each mistake must be specific and actionable, not generic
  - Bad: "Make sure to check your documents carefully"
  - Good: "Uploading a photo larger than 50KB will auto-reject the form — resize to exactly 200x230 pixels before uploading"
  - Include at least 2 mistakes unique to this specific recruitment type

-- FACTUAL ACCURACY RULES --
- Every salary figure must be cited verbatim from the official notification
- Every date must be confirmed accurate against the source data provided
- Official website and apply link must appear in Section 16
- If a field is missing from the notification, write "Not mentioned in official notification" — do not invent data
`;

// Rebuild the content: everything before the body start + new body + closing backtick onwards
const newContent = content.slice(0, bodyStart) + newBody + content.slice(closingIdx);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done. File written. New size:', newContent.length);
