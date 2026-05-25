import React from 'react';
import AdvancedPDFCompressor from './AdvancedPDFCompressor';
import AdvancedPDFToImage from './AdvancedPDFToImage';
import AdvancedJPGtoPDF from './AdvancedJPGtoPDF';
import AdvancedDocumentScanner from './AdvancedDocumentScanner';
import ExamPDFCompressor from './ExamPDFCompressor';
import PDFPageExtractor from './PDFPageExtractor';

const PDF_TOOL_MAP = {
  'pdf-size-reducer':    AdvancedPDFCompressor,
  'pdf-to-image':        AdvancedPDFToImage,
  'image-to-pdf':        AdvancedJPGtoPDF,
  'document-scanner':    AdvancedDocumentScanner,
  'exam-pdf-compressor': ExamPDFCompressor,
  'pdf-page-extractor':  PDFPageExtractor,
};

export const PDF_TOOL_SLUGS = Object.keys(PDF_TOOL_MAP);

export default function PDFToolRouter({ tool }) {
  const Component = PDF_TOOL_MAP[tool?.slug];
  if (!Component) return <div className="text-muted-foreground text-sm p-4">PDF tool not configured.</div>;
  return <Component tool={tool} />;
}