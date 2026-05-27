import React from 'react';
import BackendDocumentConverter from './BackendDocumentConverter';

export default function PDFToWord() {
  const ocrAvailable = import.meta.env.VITE_CONVERSION_OCR_AVAILABLE === 'true';
  const modes = [
    {
      value: 'editable',
      label: 'Editable Word',
      description: 'Best for PDFs with selectable text. Produces a DOCX with editable text where possible.',
      note: 'Scanned PDFs need OCR. If OCR is not enabled on the server, scanned files will be rejected with a clear message.',
    },
  ];

  if (ocrAvailable) {
    modes.push({
      value: 'ocr',
      label: 'OCR for scanned PDF',
      description: 'Uses the OCR backend to make scanned text editable when the deployment supports it.',
      note: 'OCR quality depends on scan clarity, language support, rotation, contrast, and the original image resolution.',
    });
  }

  return (
    <BackendDocumentConverter
      title="PDF to Word Converter"
      intro="Convert PDF files into editable Word documents for quick editing, reuse and formatting updates. QuickUtils sends your file to the secure conversion service, creates a DOCX output, validates it, and provides a temporary download link."
      endpoint="/api/convert/pdf-to-word"
      accept=".pdf,application/pdf"
      allowedExtensions={['.pdf']}
      outputLabel="DOCX"
      primaryCta="Convert PDF to Word"
      modes={modes}
      trustPoints={[
        'Editable Word output for text-based PDFs',
        'Preserves text, tables and images where possible',
        'Scanned PDFs require OCR for editable text',
        'Files are processed temporarily and auto deleted',
      ]}
    />
  );
}
