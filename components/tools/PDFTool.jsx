import React from 'react';
import PDFMerge from './pdf/PDFMerge';
import PDFSplit from './pdf/PDFSplit';
import PDFCompressor from './pdf/PDFCompressor';
import PDFtoJPG from './pdf/PDFtoJPG';
import JPGtoPDF from './pdf/JPGtoPDF';
import PDFProtect from './pdf/PDFProtect';
import PDFRemovePages from './pdf/PDFRemovePages';
import WordToPDFComponent from './pdf/WordToPDF';

export default function PDFTool({ tool }) {
  const slug = tool?.slug;

  if (slug === 'merge-pdf') return <PDFMerge />;
  if (slug === 'split-pdf') return <PDFSplit />;
  if (slug === 'compress-pdf') return <PDFCompressor />;
  if (slug === 'pdf-to-jpg') return <PDFtoJPG />;
  if (slug === 'jpg-to-pdf') return <JPGtoPDF />;
  if (slug === 'protect-pdf') return <PDFProtect />;
  if (slug === 'remove-pages-pdf') return <PDFRemovePages />;
  if (slug === 'word-to-pdf') return <WordToPDFComponent />;
  return <div className="text-muted-foreground text-sm">PDF tool not configured.</div>;
}
