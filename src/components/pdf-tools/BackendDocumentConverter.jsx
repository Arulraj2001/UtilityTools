import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getDocumentConversionStatus,
  startDocumentConversion,
} from '@/lib/documentConversionApi';

const stageLabels = {
  queued: 'Queued',
  validating: 'Validating file',
  uploading: 'Uploading',
  converting: 'Converting',
  validatingOutput: 'Optimizing output',
  completed: 'Ready to download',
  failed: 'Failed',
};

export default function BackendDocumentConverter({
  title,
  intro,
  endpoint,
  accept,
  allowedExtensions,
  outputLabel,
  primaryCta,
  maxSizeMb = 100,
  trustPoints = [],
  modes = [],
}) {
  const inputRef = useRef(null);
  const pollTimerRef = useRef(null);
  const [file, setFile] = useState(null);
  const [selectedMode, setSelectedMode] = useState(modes[0]?.value || '');
  const [state, setState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const activeMode = useMemo(
    () => modes.find((mode) => mode.value === selectedMode) || modes[0],
    [modes, selectedMode],
  );

  const progress = state === 'uploading'
    ? uploadProgress
    : Math.max(uploadProgress, job?.progress || 0);
  const isBusy = ['uploading', 'queued', 'processing'].includes(state);
  const isReady = job?.status === 'completed';
  const isFailed = state === 'failed' || job?.status === 'failed';
  const currentStage = job?.stage || state;
  const currentStageLabel = stageLabels[currentStage] || 'Preparing conversion';

  useEffect(() => () => stopPolling(pollTimerRef), []);

  const reset = useCallback(() => {
    stopPolling(pollTimerRef);
    setFile(null);
    setState('idle');
    setUploadProgress(0);
    setJob(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFiles = useCallback((fileList) => {
    const nextFile = fileList?.[0];
    if (!nextFile) return;

    const validationError = getClientValidationError(nextFile, allowedExtensions, maxSizeMb);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    stopPolling(pollTimerRef);
    setFile(nextFile);
    setState('idle');
    setUploadProgress(0);
    setJob(null);
    setError('');
  }, [allowedExtensions, maxSizeMb]);

  const startConversion = useCallback(async () => {
    if (!file || isBusy) return;

    stopPolling(pollTimerRef);
    setError('');
    setJob(null);
    setUploadProgress(0);
    setState('uploading');

    try {
      const createdJob = await startDocumentConversion({
        endpoint,
        file,
        mode: selectedMode,
        onUploadProgress: setUploadProgress,
      });

      setJob(createdJob);
      setState(createdJob.status === 'queued' ? 'queued' : 'processing');
      startPolling(createdJob.jobId, setJob, setState, setError, pollTimerRef);
    } catch (conversionError) {
      setState('failed');
      setError(conversionError.message || 'Conversion failed before it could start.');
      toast.error(conversionError.message || 'Conversion failed before it could start.');
    }
  }, [endpoint, file, isBusy, selectedMode]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{intro}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Temporary processing
          </div>
        </div>

        {trustPoints.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!file && (
        <UploadZone
          accept={accept}
          inputRef={inputRef}
          isDragging={isDragging}
          outputLabel={outputLabel}
          allowedExtensions={allowedExtensions}
          maxSizeMb={maxSizeMb}
          onBrowse={() => inputRef.current?.click()}
          onDragState={setIsDragging}
          onFiles={handleFiles}
        />
      )}

      {file && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} selected for {outputLabel} output
              </p>
            </div>
            {!isBusy && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove selected file"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {modes.length > 1 && !isReady && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {modes.map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selectedMode === mode.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 bg-muted/20 hover:border-primary/40'
                  }`}
                  disabled={isBusy}
                  onClick={() => setSelectedMode(mode.value)}
                >
                  <span className="block text-sm font-semibold text-foreground">{mode.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{mode.description}</span>
                </button>
              ))}
            </div>
          )}

          {activeMode?.note && !isReady && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{activeMode.note}</p>
          )}
        </div>
      )}

      {file && !isReady && (
        <div className="space-y-4">
          <Button
            className="h-12 w-full rounded-xl gap-2 text-base"
            disabled={isBusy}
            onClick={startConversion}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {currentStageLabel}
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                {primaryCta}
              </>
            )}
          </Button>

          <AnimatePresence>
            {(isBusy || isFailed) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-2xl border p-4 ${
                  isFailed
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border/60 bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    {isFailed ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-primary" />
                    )}
                    <span>{isFailed ? 'Conversion failed' : currentStageLabel}</span>
                  </div>
                  {!isFailed && <span className="text-xs text-muted-foreground">{progress}%</span>}
                </div>

                {!isFailed && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                )}

                {isFailed && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm leading-6 text-muted-foreground">{error || job?.error?.message}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={startConversion}>
                        <RefreshCw className="h-4 w-4" />
                        Retry conversion
                      </Button>
                      <Button type="button" variant="ghost" className="rounded-xl" onClick={reset}>
                        Choose another file
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-green-600/25 bg-green-600/10 p-5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" />
              <p className="font-semibold text-green-800 dark:text-green-300">Ready to download</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Output" value={outputLabel} />
              <Stat label="Pages" value={job.outputMeta?.pages ?? '-'} />
              <Stat label="Expires" value={formatExpiry(job.expiresAt)} />
            </div>

            <a href={job.downloadUrl} className="mt-4 block">
              <Button className="h-12 w-full rounded-xl gap-2 bg-green-700 text-white hover:bg-green-800">
                <Download className="h-5 w-5" />
                Download {outputLabel}
              </Button>
            </a>

            <Button type="button" variant="outline" className="mt-3 w-full rounded-xl" onClick={reset}>
              Convert another file
            </Button>

            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              Files are stored only as temporary conversion files and are removed automatically after expiry.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadZone({
  accept,
  allowedExtensions,
  inputRef,
  isDragging,
  maxSizeMb,
  onBrowse,
  onDragState,
  onFiles,
  outputLabel,
}) {
  const handleDrop = (event) => {
    event.preventDefault();
    onDragState(false);
    onFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onBrowse}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onBrowse();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Upload className="h-7 w-7 text-primary" />
      </div>
      <p className="font-semibold text-foreground">Drop your file here or click to upload</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Converts to {outputLabel}. Supports {allowedExtensions.join(', ')} up to {maxSizeMb} MB.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value || '-'}</p>
    </div>
  );
}

function startPolling(jobId, setJob, setState, setError, pollTimerRef) {
  stopPolling(pollTimerRef);

  const poll = async () => {
    try {
      const latest = await getDocumentConversionStatus(jobId);
      setJob(latest);

      if (latest.status === 'completed') {
        setState('ready');
        stopPolling(pollTimerRef);
      } else if (latest.status === 'failed') {
        setState('failed');
        setError(latest.error?.message || 'Conversion failed.');
        stopPolling(pollTimerRef);
      } else {
        setState('processing');
      }
    } catch (pollError) {
      setState('failed');
      setError(pollError.message || 'Could not check conversion status.');
      stopPolling(pollTimerRef);
    }
  };

  poll();
  pollTimerRef.current = window.setInterval(poll, 1500);
}

function stopPolling(pollTimerRef) {
  if (!pollTimerRef?.current) return;
  window.clearInterval(pollTimerRef.current);
  pollTimerRef.current = null;
}

function getClientValidationError(file, allowedExtensions, maxSizeMb) {
  const name = file.name || '';
  const lowerName = name.toLowerCase();
  const hasAllowedExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));

  if (!hasAllowedExtension) {
    return `Please upload a supported file: ${allowedExtensions.join(', ')}.`;
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return `File too large. Maximum size is ${maxSizeMb} MB.`;
  }

  return '';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatExpiry(value) {
  if (!value) return 'soon';
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return 'soon';
  return expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
