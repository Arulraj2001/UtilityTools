import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw, Loader2, GripVertical, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

const PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  A3: [841.89, 1190.55],
  Square: [595.28, 595.28],
};

const fmt = (b) => `${(b / 1024).toFixed(1)} KB`;

function imgToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

export default function ImageToPdf() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(20);
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: (files) => {
      const newImgs = files.map(f => ({ file: f, url: URL.createObjectURL(f), id: Math.random().toString(36) }));
      setImages(prev => [...prev, ...newImgs]);
    },
  });

  const remove = (id) => setImages(prev => prev.filter(i => i.id !== id));

  const generate = async () => {
    if (!images.length) return;
    setLoading(true);
    const [pw, ph] = orientation === 'landscape'
      ? [PAGE_SIZES[pageSize][1], PAGE_SIZES[pageSize][0]]
      : PAGE_SIZES[pageSize];
    const pdf = new jsPDF({ orientation, unit: 'pt', format: [pw, ph] });

    for (let i = 0; i < images.length; i++) {
      if (i > 0) pdf.addPage([pw, ph], orientation);
      const dataUrl = await imgToDataUrl(images[i].file);
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; });

      const availW = pw - margin * 2;
      const availH = ph - margin * 2;
      const scale = Math.min(availW / img.width, availH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = margin + (availW - w) / 2;
      const y = margin + (availH - h) / 2;
      const ext = images[i].file.name.split('.').pop().toUpperCase().replace('JPG', 'JPEG');
      const format = ['JPEG', 'PNG', 'WEBP'].includes(ext) ? ext : 'JPEG';
      pdf.addImage(dataUrl, format, x, y, w, h);
    }
    pdf.save('images.pdf');
    setLoading(false);
  };

  const reset = () => setImages([]);

  return (
    <div className="space-y-6">
      {/* Drop zone for adding more */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all premium-card panel-highlight ${isDragActive ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/50'}`}>
        <input {...getInputProps()} />
        <p className="text-sm font-medium">{isDragActive ? 'Drop images here!' : '+ Add Images (drag & drop or click)'}</p>
        <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP — multiple supported</p>
      </div>

      {images.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Page settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Page Size</Label>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(PAGE_SIZES).map(s => (
                  <button key={s} onClick={() => setPageSize(s)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${pageSize === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Orientation</Label>
              <div className="flex gap-1.5">
                {['portrait', 'landscape'].map(o => (
                  <button key={o} onClick={() => setOrientation(o)}
                    className={`flex-1 text-xs py-1.5 rounded-xl border capitalize transition-all ${orientation === o ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border/50'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span>Margin</span><span className="font-bold text-primary">{margin}pt</span></div>
            <input type="range" min={0} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full cursor-pointer" />
          </div>

          {/* Image list with reorder */}
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
              {images.length} image(s) — drag to reorder
            </Label>
            <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
              <AnimatePresence>
                {images.map((img) => (
                  <Reorder.Item key={img.id} value={img}>
                    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-3 py-2 premium-card panel-highlight glow-border">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                      <img src={img.url} alt="" className="w-12 h-10 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{img.file.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(img.file.size)}</p>
                      </div>
                      <button onClick={() => remove(img.id)} className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={generate} disabled={loading} className="rounded-xl gap-2 px-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? 'Generating PDF…' : `Generate PDF (${images.length} pages)`}
            </Button>
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Clear All
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}