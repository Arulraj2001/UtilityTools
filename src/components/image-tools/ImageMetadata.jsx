import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, AlertTriangle, MapPin, Camera, Info } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';

const fmt = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/30 last:border-0 gap-3">
      <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="text-xs font-medium text-right break-all">{String(value)}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/50">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function ImageMetadata() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFiles = async ([f]) => {
    setFile(f);
    setMeta(null);
    setPreview(URL.createObjectURL(f));
    setLoading(true);
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise(r => { img.onload = r; });

    let exifData = {};
    try {
      const exifr = (await import('exifr')).default;
      exifData = await exifr.parse(f, { tiff: true, exif: true, gps: true, ifd1: true }) || {};
    } catch (e) {}

    setMeta({
      basic: {
        'File Name': f.name,
        'File Size': fmt(f.size),
        'File Type': f.type || 'Unknown',
        'Dimensions': `${img.width} × ${img.height} px`,
        'Last Modified': new Date(f.lastModified).toLocaleString(),
        'Megapixels': ((img.width * img.height) / 1000000).toFixed(2) + ' MP',
      },
      camera: {
        'Camera Make': exifData.Make,
        'Camera Model': exifData.Model,
        'Lens': exifData.LensModel,
        'Focal Length': exifData.FocalLength ? `${exifData.FocalLength}mm` : null,
        'Aperture': exifData.FNumber ? `f/${exifData.FNumber}` : null,
        'Shutter Speed': exifData.ExposureTime ? `1/${Math.round(1 / exifData.ExposureTime)}s` : null,
        'ISO': exifData.ISO,
        'Flash': exifData.Flash !== undefined ? (exifData.Flash ? 'On' : 'Off') : null,
        'Date Taken': exifData.DateTimeOriginal ? new Date(exifData.DateTimeOriginal).toLocaleString() : null,
        'Software': exifData.Software,
        'Color Space': exifData.ColorSpace === 1 ? 'sRGB' : exifData.ColorSpace,
      },
      gps: exifData.latitude ? {
        'Latitude': exifData.latitude?.toFixed(6),
        'Longitude': exifData.longitude?.toFixed(6),
        'Altitude': exifData.GPSAltitude ? `${exifData.GPSAltitude.toFixed(1)}m` : null,
        'Google Maps': exifData.latitude ? `https://maps.google.com/?q=${exifData.latitude},${exifData.longitude}` : null,
      } : null,
    });
    setLoading(false);
  };

  const removeMetadata = () => {
    if (!file || !preview) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        saveAs(blob, `clean_${file.name.replace(/\.[^.]+$/, '.jpg')}`);
      }, 'image/jpeg', 0.95);
    };
    img.src = preview;
  };

  const reset = () => { setFile(null); setPreview(null); setMeta(null); };

  const hasGps = meta?.gps;
  const hasCameraData = meta?.camera && Object.values(meta.camera).some(Boolean);

  return (
    <div className="space-y-6">
      {!file ? (
        <ImageDropZone onFiles={onFiles} hint="Upload an image to view its EXIF metadata" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
            <img src={preview} alt="preview" className="w-full max-h-48 object-contain" />
          </div>

          {loading && <div className="text-center text-sm text-muted-foreground py-4">Extracting metadata…</div>}

          {meta && (
            <>
              {hasGps && (
                <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">GPS Location Detected!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This image contains GPS coordinates. Remove metadata before sharing publicly.</p>
                  </div>
                </div>
              )}

              <Section title="File Info" icon={Info}>
                {Object.entries(meta.basic).map(([k, v]) => <MetaRow key={k} label={k} value={v} />)}
              </Section>

              {hasCameraData && (
                <Section title="Camera Info" icon={Camera}>
                  {Object.entries(meta.camera).map(([k, v]) => <MetaRow key={k} label={k} value={v} />)}
                </Section>
              )}

              {hasGps && (
                <Section title="GPS Location" icon={MapPin}>
                  {Object.entries(meta.gps).map(([k, v]) => (
                    k === 'Google Maps'
                      ? <div key={k} className="py-2"><a href={v} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Open in Google Maps ↗</a></div>
                      : <MetaRow key={k} label={k} value={v} />
                  ))}
                </Section>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={removeMetadata} variant="outline" className="rounded-xl gap-2">
                  <Download className="w-4 h-4" /> Export Clean (No Metadata)
                </Button>
                <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
                  <RefreshCw className="w-4 h-4" /> Start Over
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}