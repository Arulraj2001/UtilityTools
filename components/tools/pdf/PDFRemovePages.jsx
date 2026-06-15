import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import { loadPdfLib, DropZone, FileCard, DownloadResult, parsePageRanges } from './PDFHelpers';

export default function PDFRemovePages() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResultUrl(null);
    }
  };

  const removePages = async () => {
    if (!file || !pages) return;
    setLoading(true);
    const { PDFDocument } = await loadPdfLib();
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const totalPages = doc.getPageCount();
    const indices = parsePageRanges(pages, totalPages);
    const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => !indices.includes(i));
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(doc, keepIndices);
    copied.forEach(p => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setResultUrl(URL.createObjectURL(blob));
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF to edit" />
      ) : (
        <FileCard file={file} onRemove={() => { setFile(null); setResultUrl(null); }} />
      )}

      {file && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Pages to Remove</Label>
          <input value={pages} onChange={e => setPages(e.target.value)} placeholder="e.g., 1,3-5,8" className="w-full p-3 rounded-xl border border-border bg-card" />
          <Button onClick={removePages} disabled={loading || !pages} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Removing…' : 'Remove Pages'}
          </Button>
        </div>
      )}

      <DownloadResult url={resultUrl} filename="edited.pdf" label="edited.pdf" />
    </div>
  );
}
