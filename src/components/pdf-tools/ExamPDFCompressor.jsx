/**
 * Exam Document PDF Compressor
 * Tailored for Indian government exam portals (SSC, Railway, Banking, UPSC, TNPSC)
 * Uses the same render-and-recompress strategy with exam-specific presets.
 */
import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion } from 'framer-motion';
import { FileCheck, CheckCircle2, AlertTriangle, Settings } from 'lucide-react';
import PDFDropZone from './PDFDropZone';
import { SingleFileCard } from './PDFFileCard';
import { DownloadBtn, formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';

function loadPdfJs() {
  return Promise.resolve(getPdfJsLib());
}

const EXAM_PRESETS = [
  { id: 'certificate', label: 'Certificate', targetKB: 200, desc: 'Degree, Diploma, Birth cert', dpi: 1.5, q: 0.70 },
  { id: 'marksheet', label: 'Mark Sheet', targetKB: 300, desc: 'Class 10, 12, Degree marks', dpi: 1.5, q: 0.72 },
  { id: 'aadhaar', label: 'Aadhaar', targetKB: 100, desc: 'Aadhaar card scan', dpi: 1.2, q: 0.62 },
  { id: 'pan', label: 'PAN Card', targetKB: 80, desc: 'PAN card scan', dpi: 1.2, q: 0.60 },
  { id: 'photo', label: 'Passport Photo', targetKB: 50, desc: 'Passport-size scan', dpi: 1.0, q: 0.60 },
  { id: 'signature', label: 'Signature', targetKB: 30, desc: 'Signature scan', dpi: 1.0, q: 0.55 },
];

const EXAM_PORTALS = [
  { id: 'ssc', label: 'SSC', desc: 'Staff Selection Commission', limits: { photo: 50, signature: 30, docs: 200 } },
  { id: 'railway', label: 'Railway', desc: 'RRB / RRC portals', limits: { photo: 40, signature: 20, docs: 300 } },
  { id: 'banking', label: 'Banking', desc: 'IBPS / SBI / RBI', limits: { photo: 50, signature: 30, docs: 200 } },
  { id: 'upsc', label: 'UPSC', desc: 'Civil services portal', limits: { photo: 80, signature: 40, docs: 500 } },
  { id: 'tnpsc', label: 'TNPSC', desc: 'Tamil Nadu PSC', limits: { photo: 50, signature: 30, docs: 250 } },
];

async function compressToTarget(file, targetKB, scale, onProgress) {
  const pdfjsLib = await loadPdfJs();
  const ab = await file.arrayBuffer();
  onProgress('Parsing document...');
  const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
  const totalPages = pdfJs.numPages;

  let lo = 0.2, hi = 0.88, best = null;
  const target = targetKB * 1024;

  for (let iter = 0; iter < 10; iter++) {
    const mid = (lo + hi) / 2;
    onProgress(`Optimizing quality ${Math.round(mid * 100)}% (pass ${iter + 1}/10)...`);

    const outDoc = await PDFDocument.create();
    for (let pg = 1; pg <= totalPages; pg++) {
      const page = await pdfJs.getPage(pg);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;

      const jpgBytes = await new Promise(resolve => {
        canvas.toBlob(async blob => {
          const ab = await blob.arrayBuffer();
          resolve(new Uint8Array(ab));
        }, 'image/jpeg', mid);
      });
      const img = await outDoc.embedJpg(jpgBytes);
      const pdfPage = outDoc.addPage([canvas.width, canvas.height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    }
    outDoc.setTitle(''); outDoc.setAuthor(''); outDoc.setSubject('');
    outDoc.setKeywords([]); outDoc.setCreator('ExamDocs'); outDoc.setProducer('PDF Tools');
    const saved = await outDoc.save({ useObjectStreams: true });
    const blob = new Blob([saved], { type: 'application/pdf' });

    if (blob.size <= target) {
      best = { blob, quality: mid };
      lo = mid; // try better quality
    } else {
      hi = mid; // need more compression
    }
    if (hi - lo < 0.02) break;
  }

  if (!best) {
    // Last resort at minimum quality
    onProgress('Applying maximum compression...');
    const outDoc = await PDFDocument.create();
    for (let pg = 1; pg <= totalPages; pg++) {
      const page = await pdfJs.getPage(pg);
      const viewport = page.getViewport({ scale: Math.min(scale, 0.8) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpgBytes = await new Promise(r => canvas.toBlob(async b => r(new Uint8Array(await b.arrayBuffer())), 'image/jpeg', 0.2));
      const img = await outDoc.embedJpg(jpgBytes);
      const pdfPage = outDoc.addPage([canvas.width, canvas.height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    }
    const bytes = await outDoc.save({ useObjectStreams: true });
    best = { blob: new Blob([bytes], { type: 'application/pdf' }), quality: 0.2 };
  }
  return best;
}

export default function ExamPDFCompressor() {
  const [file, setFile] = useState(null);
  const [docPreset, setDocPreset] = useState(EXAM_PRESETS[0]);
  const [portal, setPortal] = useState(EXAM_PORTALS[0]);
  const [customTarget, setCustomTarget] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (files) => { setFile(files[0]); setResult(null); setError(null); };

  const effectiveTarget = customTarget ? parseInt(customTarget) : docPreset.targetKB;

  const compress = async () => {
    if (!file || !effectiveTarget) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const { blob, quality } = await compressToTarget(file, effectiveTarget, docPreset.dpi, (msg) => setProgress(msg));
      setResult({ blob, quality });
    } catch (e) { setError(e.message || 'Compression failed'); }
    finally { setProcessing(false); setProgress(''); }
  };

  const withinTarget = result && (result.blob.size / 1024) <= effectiveTarget;
  const savedPct = file && result ? Math.max(0, ((file.size - result.blob.size) / file.size * 100)).toFixed(1) : 0;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center"><FileCheck className="w-4 h-4 text-emerald-600" /></div>
          <div>
            <p className="font-bold text-sm">Exam Document PDF Compressor</p>
            <p className="text-[10px] text-muted-foreground">Government portal optimized — SSC, Railway, Banking, UPSC</p>
          </div>
        </div>
      </div>

      {/* Portal selector */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Exam Portal</label>
        <div className="flex flex-wrap gap-2">
          {EXAM_PORTALS.map(p => (
            <button key={p.id} onClick={() => setPortal(p)}
              className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', portal.id === p.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{portal.desc} — Photo ≤{portal.limits.photo}KB, Signature ≤{portal.limits.signature}KB, Docs ≤{portal.limits.docs}KB</p>
      </div>

      {!file ? (
        <PDFDropZone onFiles={handleFile} label="Drop exam document PDF" sublabel="Certificate, Aadhaar, Marksheet, PAN — up to 50MB" />
      ) : (
        <div className="relative space-y-4">
          {processing && (
            <div className="absolute inset-0 rounded-2xl bg-background/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm font-medium">{progress || 'Optimizing for portal...'}</p>
                <p className="text-xs text-muted-foreground">Finding best quality within {effectiveTarget} KB target</p>
              </div>
            </div>
          )}

          <SingleFileCard file={file} onRemove={() => { setFile(null); setResult(null); }} />

          {/* Document type presets */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Document Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXAM_PRESETS.map(p => (
                <button key={p.id} onClick={() => setDocPreset(p)}
                  className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', docPreset.id === p.id ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-400' : 'bg-muted/20 border-border hover:border-emerald-400/40')}>
                  <div className="font-semibold flex items-center justify-between">
                    {p.label} <span className="text-[10px] font-bold opacity-60">≤{p.targetKB}KB</span>
                  </div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom target */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Target (KB)</label>
              <input type="number" value={customTarget} onChange={e => setCustomTarget(e.target.value)} placeholder={`${docPreset.targetKB} (preset)`}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:ring-2 ring-primary/30 outline-none" />
            </div>
            <div className="text-center mt-5">
              <div className="text-2xl font-bold text-primary">{effectiveTarget}</div>
              <div className="text-[10px] text-muted-foreground">KB target</div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={cn('rounded-2xl border p-4 space-y-3', withinTarget ? 'border-green-500/30 bg-green-500/8' : 'border-orange-400/30 bg-orange-400/8')}>
              <div className="flex items-center gap-2.5">
                {withinTarget ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
                <div>
                  <p className={cn('font-semibold text-sm', withinTarget ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')}>
                    {withinTarget ? `✓ Within ${effectiveTarget} KB target — Portal Ready!` : `Output ${(result.blob.size / 1024).toFixed(0)} KB — Try lower DPI preset`}
                  </p>
                  <p className="text-xs text-muted-foreground">{savedPct}% reduction · Quality: {Math.round(result.quality * 100)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-card rounded-xl p-3 border border-border/50 space-y-0.5">
                  <div className="text-muted-foreground">Original</div>
                  <div className="font-bold">{formatSize(file.size)}</div>
                </div>
                <div className={cn('rounded-xl p-3 space-y-0.5', withinTarget ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20')}>
                  <div className="text-muted-foreground">Output</div>
                  <div className={cn('font-bold', withinTarget ? 'text-green-600' : 'text-orange-500')}>{formatSize(result.blob.size)}</div>
                </div>
                <div className="bg-primary/8 rounded-xl p-3 border border-primary/20 space-y-0.5">
                  <div className="text-muted-foreground">Saved</div>
                  <div className="font-bold text-primary">{savedPct}%</div>
                </div>
              </div>
              <DownloadBtn blob={result.blob} filename={`${portal.id}_${docPreset.id}_${file.name}`} label="Download Compressed PDF" className="w-full" />
            </motion.div>
          )}

          <button onClick={compress} disabled={processing}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <FileCheck className="w-4 h-4" />
            {processing ? (progress || 'Compressing for portal...') : `Compress for ${portal.label} Portal`}
          </button>
        </div>
      )}
    </div>
  );
}