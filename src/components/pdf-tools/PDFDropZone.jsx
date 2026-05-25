import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PDFDropZone({ onFiles, accept = 'pdf', multiple = false, label, sublabel, className }) {
  const acceptMap = {
    pdf: { 'application/pdf': ['.pdf'] },
    image: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'] },
    'pdf+image': { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
  };

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    onFiles(multiple ? accepted : [accepted[0]]);
  }, [onFiles, multiple]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap[accept] || acceptMap.pdf,
    multiple,
    maxSize: 100 * 1024 * 1024,
  });

  const Icon = accept === 'image' ? Image : FileText;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group',
        isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/20',
        className
      )}
    >
      <input {...getInputProps()} />
      <motion.div animate={isDragActive ? { scale: 1.05 } : { scale: 1 }} className="flex flex-col items-center gap-3">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center transition-all', isDragActive ? 'bg-primary/20' : 'bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/15 group-hover:to-accent/15')}>
          <Icon className={cn('w-7 h-7 transition-colors', isDragActive ? 'text-primary' : 'text-primary/70 group-hover:text-primary')} />
        </div>
        <div>
          <p className="font-semibold text-base mb-1">{isDragActive ? 'Drop your file here' : (label || 'Drop file or click to upload')}</p>
          <p className="text-sm text-muted-foreground">{sublabel || (accept === 'pdf' ? 'PDF files up to 100MB' : 'JPG, PNG, WebP up to 100MB')}</p>
        </div>
        <div className="mt-1 px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-sm hover:bg-primary/90 transition-colors">
          <Upload className="w-4 h-4 inline mr-1.5" />
          {multiple ? 'Choose Files' : 'Choose File'}
        </div>
      </motion.div>
    </div>
  );
}