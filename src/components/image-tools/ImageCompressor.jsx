import React, { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, Settings } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import ImageStatChips from './ImageStatChips';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import { revokeObjectUrl } from '@/lib/fileProcessing';

const fmt = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function ImageCompressor() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(80);
  const [maxDim, setMaxDim] = useState(1920);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPreview, setSelectedPreview] = useState(null);

  useEffect(() => {
    if (files.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= files.length) {
      setSelectedIndex(0);
    }
  }, [files.length, selectedIndex]);

  useEffect(() => {
    if (!files[selectedIndex]) {
      setSelectedPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(files[selectedIndex]);
    setSelectedPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [files, selectedIndex]);

  useEffect(() => {
    return () => {
      results.forEach(r => {
        revokeObjectUrl(r.originalUrl);
        revokeObjectUrl(r.compressedUrl);
      });
    };
  }, [results]);

  const selectedFile = files[selectedIndex];

  const estimatedSize = useMemo(() => {
    if (!selectedFile) return null;
    const ratio = Math.min(0.88, Math.max(0.18, (quality / 100) * 0.72));
    return Math.max(1024, Math.round(selectedFile.size * ratio));
  }, [quality, selectedFile]);

  const qualityLabel = useMemo(() => {
    if (quality >= 85) return 'High quality preserved';
    if (quality >= 65) return 'Balanced quality and size';
    return 'Maximum compression for small files';
  }, [quality]);

  const reset = () => { setFiles([]); setResults([]); setProgress(0); setSelectedIndex(0); };

  const compress = async () => {
    setLoading(true);
    setProgress(0);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const opts = {
        maxSizeMB: 10,
        maxWidthOrHeight: maxDim,
        useWebWorker: true,
        initialQuality: quality / 100,
        onProgress: (p) => setProgress(Math.round(((i / files.length) + p / 100 / files.length) * 100)),
      };
      const compressed = await imageCompression(f, opts);
      out.push({
        original: f,
        originalUrl: URL.createObjectURL(f),
        compressed,
        compressedUrl: URL.createObjectURL(compressed),
        savings: (((f.size - compressed.size) / f.size) * 100).toFixed(1),
      });
    }
    setResults(out);
    setProgress(100);
    setLoading(false);
  };

  const downloadAll = () => {
    results.forEach(r => saveAs(r.compressedUrl, `compressed_${r.original.name}`));
  };

  return (
    <div className="space-y-6">
      {!files.length ? (
        <ImageDropZone onFiles={setFiles} multiple hint="Batch compress multiple images — JPG, PNG, WEBP" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Settings */}
            {!results.length && (
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <Settings className="w-4 h-4 text-primary" /> Compression Settings
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quality</span>
                    <span className="font-bold text-primary">{quality}%</span>
                  </div>
                  <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-full cursor-pointer" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span><span>Higher quality</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Max Dimension</span>
                    <span className="font-bold text-primary">{maxDim}px</span>
                  </div>
                  <input type="range" min={400} max={4000} step={100} value={maxDim} onChange={e => setMaxDim(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-full cursor-pointer" />
                </div>
              </div>
            )}

            {/* Progress */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Compressing…</span><span className="font-bold">{progress}%</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-5">
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="space-y-3">
                    <BeforeAfter before={r.originalUrl} after={r.compressedUrl} beforeLabel={`Original · ${fmt(r.original.size)}`} afterLabel={`Compressed · ${fmt(r.compressed.size)}`} />
                    <ImageStatChips stats={[
                      { label: 'Original', value: fmt(r.original.size) },
                      { label: 'Compressed', value: fmt(r.compressed.size) },
                      { label: 'Saved', value: `${r.savings}%`, highlight: true },
                    ]} />
                    <Button onClick={() => saveAs(r.compressedUrl, `compressed_${r.original.name}`)} className="w-full rounded-xl gap-2 bg-green-600 hover:bg-green-700">
                      <Download className="w-4 h-4" /> Download {r.original.name}
                    </Button>
                  </motion.div>
                ))}
                {results.length > 1 && (
                  <Button onClick={downloadAll} variant="outline" className="w-full rounded-xl gap-2">
                    <Download className="w-4 h-4" /> Download All ({results.length} files)
                  </Button>
                )}
              </div>
            )}

            {/* Files list preview (pre-compress) */}
            {!results.length && !loading && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{files.length} file(s) selected</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`w-full text-left flex items-center justify-between text-sm bg-card rounded-xl px-3 py-2 border transition-colors ${selectedIndex === i ? 'border-primary/70 bg-primary/5' : 'border-border/40 hover:border-primary/60'}`}>
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{fmt(f.size)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFile && selectedPreview && (
                  <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <div className="flex-1 rounded-2xl overflow-hidden bg-card border border-border/50">
                        <img src={selectedPreview} alt={selectedFile.name} className="w-full h-72 object-contain" />
                      </div>
                      <div className="grid gap-3 w-full lg:w-72">
                        <div className="rounded-2xl border border-border/50 bg-card p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Estimated output</p>
                          <p className="text-xl font-semibold text-foreground">{fmt(estimatedSize)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{qualityLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-border/50 bg-card p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Current settings</p>
                          <p className="text-sm text-foreground">Quality: {quality}%</p>
                          <p className="text-sm text-foreground">Max dimension: {maxDim}px</p>
                          <p className="text-sm text-muted-foreground mt-2">Tap each file to preview before compression.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!results.length ? (
                <Button onClick={compress} disabled={loading} className="rounded-xl gap-2 px-6">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Compressing…' : `Compress ${files.length > 1 ? `${files.length} Images` : 'Image'}`}
                </Button>
              ) : null}
              <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Start Over
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
