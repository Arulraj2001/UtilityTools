import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImageDropZone({ onFiles, multiple = false, accept = 'image/*', hint }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onFiles(multiple ? files : files.slice(0, 1)),
    accept: accept ? { 'image/*': [] } : undefined,
    multiple,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 select-none ${
        isDragActive
          ? 'border-primary bg-primary/8 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
    >
      <input {...getInputProps()} />
      <div className={`w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center transition-all duration-300 ${
        isDragActive ? 'bg-primary/20 scale-110' : 'bg-gradient-to-br from-primary/15 to-accent/10'
      }`}>
        {isDragActive ? (
          <ImageIcon className="w-8 h-8 text-primary" />
        ) : (
          <Upload className="w-8 h-8 text-primary" />
        )}
      </div>
      <p className="font-semibold text-base mb-1">
        {isDragActive ? 'Drop it here!' : 'Drop image here or click to upload'}
      </p>
      <p className="text-sm text-muted-foreground">
        {hint || (multiple ? 'Supports JPG, PNG, WEBP, GIF, HEIC' : 'Supports JPG, PNG, WEBP, GIF, HEIC')}
      </p>
    </motion.div>
  );
}