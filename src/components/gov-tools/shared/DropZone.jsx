import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, Image, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DropZone({ onFile, accept = 'image', label, sublabel, className }) {
  const acceptMap = {
    image: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic'] },
    pdf: { 'application/pdf': ['.pdf'] },
    'image+pdf': { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'application/pdf': ['.pdf'] },
  };

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap[accept] || acceptMap.image,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
  });

  const Icon = accept === 'pdf' ? FileText : Image;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-muted/30',
        className
      )}
    >
      <input {...getInputProps()} />
      <motion.div
        animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="flex flex-col items-center gap-3"
      >
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
          isDragActive ? 'bg-primary/20' : 'bg-muted'
        )}>
          <Icon className={cn('w-6 h-6', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1">
            {isDragActive ? 'Drop your file here' : (label || 'Drop file or click to upload')}
          </p>
          <p className="text-xs text-muted-foreground">
            {sublabel || (accept === 'pdf' ? 'PDF files up to 50MB' : 'JPG, PNG, WebP, HEIC up to 50MB')}
          </p>
        </div>
        <div className="mt-1 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg">
          <Upload className="w-3 h-3 inline mr-1" />
          Choose File
        </div>
      </motion.div>
    </div>
  );
}