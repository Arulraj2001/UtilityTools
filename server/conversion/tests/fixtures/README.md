# Conversion Test Fixtures

Automated unit tests generate tiny synthetic DOCX/PDF files in the OS temp directory so the repository does not store large binary documents.

For full production QA, keep these real fixture files outside git or in a private QA storage bucket:

PDF to Word:

- `text-only.pdf`
- `with-images.pdf`
- `with-tables.pdf`
- `multi-page.pdf`
- `hindi-unicode.pdf`
- `scanned.pdf`
- `with-hyperlinks.pdf`
- `mixed-portrait-landscape.pdf`

Word to PDF:

- `docx-with-images.docx`
- `docx-with-tables.docx`
- `docx-with-headers-footers.docx`
- `docx-with-page-breaks.docx`
- `docx-with-custom-fonts.docx`
- `docx-hindi-unicode.docx`
- `docx-bullets-numbering.docx`
- `docx-with-hyperlinks.docx`

Run real fixture conversion against the Docker service before public launch and manually open outputs in Microsoft Word, Google Docs, LibreOffice, WPS Office, Chrome PDF viewer, Adobe Acrobat, macOS Preview and mobile PDF viewers.
