import React from 'react';
import BackendDocumentConverter from './BackendDocumentConverter';

export default function WordToPDF() {
  return (
    <BackendDocumentConverter
      title="Word to PDF Converter"
      intro="Turn Word documents into professional PDF files that are easy to share, print and submit. QuickUtils uses the backend conversion service with LibreOffice headless so document structure, images, tables and page layout are preserved as closely as possible."
      endpoint="/api/convert/word-to-pdf"
      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      allowedExtensions={['.doc', '.docx']}
      outputLabel="PDF"
      primaryCta="Convert Word to PDF"
      trustPoints={[
        'High-fidelity PDF output',
        'Preserves formatting and images where possible',
        'DOC and DOCX file validation',
        'Files are processed temporarily and auto deleted',
      ]}
    />
  );
}
