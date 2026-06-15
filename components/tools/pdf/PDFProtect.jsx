import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadPdfLib, DropZone, FileCard, StatChip } from './PDFHelpers';

export default function PDFProtect() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResult(null);
      setErrors({});
    }
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const protect = async () => {
    if (!validatePassword()) return;
    if (!file) return;

    setLoading(true);
    const startTime = Date.now();
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pdfBytes = await doc.save({ userPassword: password });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const processingTime = Date.now() - startTime;

      setResult({
        url: URL.createObjectURL(blob),
        filename: 'protected.pdf',
        label: 'protected.pdf',
        stats: {
          originalSize: file.size,
          newSize: blob.size,
          pages: doc.getPageCount(),
          passwordLength: password.length,
          format: 'PDF',
          processingTime
        }
      });
    } catch (e) {
      alert(`Protection failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF to protect with password" />
      ) : (
        <FileCard file={file} onRemove={() => { setFile(null); setResult(null); setPassword(''); setConfirmPassword(''); setErrors({}); }} />
      )}

      {file && !result && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-semibold mb-2 block">Password</Label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
              placeholder="Enter a strong password"
              className={`w-full px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.password ? 'border-destructive/50 focus:ring-destructive' : 'border-input focus:ring-ring'
              }`}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            <p className="text-xs text-muted-foreground mt-1">Minimum 4 characters</p>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-semibold mb-2 block">Confirm Password</Label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
              placeholder="Confirm your password"
              className={`w-full px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.confirmPassword ? 'border-destructive/50 focus:ring-destructive' : 'border-input focus:ring-ring'
              }`}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>

          {password && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Security:</strong> Password will encrypt the PDF file.
                <br />
                <strong>Note:</strong> Save your password in a safe place. You cannot recover it.
              </p>
            </div>
          )}

          <Button onClick={protect} disabled={loading || !password || !confirmPassword} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Protecting…' : 'Protect PDF'}
          </Button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">PDF Protected!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Password Length" value={`${result.stats.passwordLength} chars`} />
              <StatChip label="Pages" value={result.stats.pages} />
              <StatChip label="File Size" value={`${(result.stats.newSize / 1024).toFixed(1)} KB`} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700 dark:text-yellow-400">
              <strong>⚠ Important:</strong> Save your password. PDF cannot be opened without it.
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download Protected PDF
              </Button>
            </a>
            <Button onClick={() => { setFile(null); setResult(null); setPassword(''); setConfirmPassword(''); }} variant="outline" className="rounded-xl w-full">
              Protect Another PDF
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
