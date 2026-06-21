'use client';
import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import {
  FileUp, Search, Copy, Trash2, Check,
  FileText, Video, Archive, File, Image as ImageIcon,
  ExternalLink, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Helper to format bytes to human-readable size
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to determine file category icon
const getFileIcon = (metadata) => {
  const mime = metadata?.mimetype || '';
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.includes('pdf')) return FileText;
  if (mime.startsWith('video/')) return Video;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return Archive;
  return File;
};

export default function AdminMedia() {
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch file list directly from Supabase Storage
  const { data: files = [], isLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('media')
        .list('', {
          limit: 150,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        // If bucket doesn't exist, we return empty list
        if (error.message?.includes('does not exist')) return [];
        throw error;
      }
      return data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName) => {
      const { data, error } = await supabase.storage
        .from('media')
        .remove([fileName]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchFiles();
      setSelectedFile(null);
      toast.success('File deleted successfully');
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });

  // Get public URL
  const getPublicUrl = (fileName) => {
    const { data } = supabase.storage.from('media').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Clipboard copy helper
  const handleCopyUrl = (fileName, id) => {
    const url = getPublicUrl(fileName);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        toast.success('Public URL copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => {
        fallbackCopy(url, id);
      });
    } else {
      fallbackCopy(url, id);
    }
  };

  // Fallback copy using a temporary textarea element
  const fallbackCopy = (text, id) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopiedId(id);
      toast.success('Public URL copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy URL. Please copy it manually.');
    }
    document.body.removeChild(textarea);
  };

  // Upload handler
  const uploadFile = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(5);

      // Sanitize and prefix filename to prevent overwrites
      const cleanName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(cleanName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progressEvent) => {
            const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(percentage);
          },
        });

      if (error) throw error;

      toast.success(`${file.name} uploaded successfully!`);
      refetchFiles();
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Filter files by search term
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage your images and assets. Total files: {files.length}
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl shrink-0"
        >
          <FileUp className="w-4 h-4 mr-2" /> Upload File
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative p-8 mb-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
          dragActive
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border bg-card hover:bg-muted/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <FileUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Supports images, PDFs, zip, and documents</p>

        {uploading && (
          <div className="absolute inset-0 bg-background/80 rounded-2xl flex flex-col items-center justify-center p-6 z-10">
            <p className="text-sm font-semibold mb-2">Uploading file...</p>
            <Progress value={progress} className="w-60 h-2" />
            <p className="text-xs text-muted-foreground mt-2">{progress}% completed</p>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files by name..."
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading media assets...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center p-16 rounded-2xl border border-border bg-card">
          <p className="text-muted-foreground text-sm">
            {search ? 'No files match your search criteria.' : 'Your Media Library is empty. Upload your first asset above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.metadata);
            const isImage = file.metadata?.mimetype?.startsWith('image/');
            const publicUrl = getPublicUrl(file.name);

            return (
              <div
                key={file.id}
                className="group relative rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-all flex flex-col"
              >
                {/* Preview Container */}
                <div className="relative aspect-square w-full bg-muted flex items-center justify-center border-b border-border/50 overflow-hidden">
                  {isImage ? (
                    <img
                      src={publicUrl}
                      alt={file.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Icon className="w-10 h-10 text-muted-foreground" />
                  )}

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8.5 w-8.5 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(file.name, file.id);
                      }}
                      title="Copy URL"
                    >
                      {copiedId === file.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8.5 w-8.5 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata Summary */}
                <div className="p-3 flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-semibold truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatBytes(file.metadata?.size)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        {selectedFile && (
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="truncate pr-6">{selectedFile.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* Preview */}
              <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border">
                {selectedFile.metadata?.mimetype?.startsWith('image/') ? (
                  <img
                    src={getPublicUrl(selectedFile.name)}
                    alt={selectedFile.name}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  React.createElement(getFileIcon(selectedFile.metadata), {
                    className: 'w-16 h-16 text-muted-foreground'
                  })
                )}
              </div>

              {/* Attributes Details */}
              <div className="grid grid-cols-3 gap-2 text-xs border border-border rounded-xl p-3 bg-muted/30">
                <div>
                  <span className="text-muted-foreground block">Size</span>
                  <span className="font-semibold">{formatBytes(selectedFile.metadata?.size)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">MIME Type</span>
                  <span className="font-semibold truncate block" title={selectedFile.metadata?.mimetype}>
                    {selectedFile.metadata?.mimetype || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Uploaded</span>
                  <span className="font-semibold">
                    {new Date(selectedFile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Public URL Input */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-gray-700">Public URL</span>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getPublicUrl(selectedFile.name)}
                    className="text-xs bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleCopyUrl(selectedFile.name, 'dialog')}
                  >
                    {copiedId === 'dialog' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(getPublicUrl(selectedFile.name), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="destructive"
                className="sm:mr-auto rounded-xl"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm('Are you sure you want to permanently delete this file? This action cannot be undone.')) {
                    deleteMutation.mutate(selectedFile.name);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFile(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
