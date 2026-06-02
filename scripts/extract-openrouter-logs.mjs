import fs from 'fs'
import path from 'path'

const filePath = path.resolve(process.cwd(), 'validation-output.txt')
if (!fs.existsSync(filePath)) {
  console.error('validation-output.txt not found at', filePath)
  process.exit(2)
}

let raw = fs.readFileSync(filePath)
// Try utf16le then utf8 fallback
let text
try {
  text = raw.toString('utf16le')
  // quick sanity check
  if (!text.includes('[openrouter]')) throw new Error('utf16le parse yielded no hits')
} catch (err) {
  text = raw.toString('utf8')
}

const lines = text.split(/\r?\n/)
const matches = lines.filter(l => l.includes('[openrouter]'))
if (matches.length === 0) {
  console.error('No [openrouter] lines found')
  process.exit(3)
}

// Print a small context window around each match
const out = []
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('[openrouter]')) {
    const start = Math.max(0, i - 2)
    const end = Math.min(lines.length - 1, i + 6)
    out.push('--- LOG BLOCK ---')
    for (let j = start; j <= end; j++) out.push(lines[j])
  }
}

console.log(out.join('\n'))
process.exit(0)
