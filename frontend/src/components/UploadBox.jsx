import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { uploadDocument, pollUntilReady } from '../api';
import clsx from 'clsx';

export default function UploadBox({ onDocumentReady }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | completed | failed
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      setStatus('failed');
      return;
    }

    setFilename(file.name);
    setStatus('uploading');
    setError('');

    try {
      const uploadResult = await uploadDocument(file);
      setStatus('processing');

      pollUntilReady(uploadResult.documentId, (statusData) => {
        if (statusData.status === 'completed') {
          setStatus('completed');
          onDocumentReady(statusData.documentId, statusData.filename);
        } else if (statusData.status === 'failed') {
          setStatus('failed');
          setError(statusData.errorMessage || 'Processing failed');
        }
      });
    } catch (err) {
      setStatus('failed');
      setError(err.message);
    }
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (status === 'uploading' || status === 'processing') return;
    processFile(e.dataTransfer.files[0]);
  };

  const statusConfig = {
    idle: { icon: UploadCloud, color: 'text-textMuted', text: 'Click or drag PDF to upload' },
    uploading: { icon: Loader2, color: 'text-primary animate-spin', text: 'Uploading to server...' },
    processing: { icon: Loader2, color: 'text-primary animate-spin', text: 'Chunking & generating embeddings...' },
    completed: { icon: CheckCircle2, color: 'text-emerald-500', text: 'Ready to chat!' },
    failed: { icon: XCircle, color: 'text-red-500', text: error || 'Failed to process' }
  };

  const CurrentIcon = statusConfig[status].icon;

  return (
    <div className="bg-surface/50 backdrop-blur-xl border border-surfaceBorder rounded-2xl p-6 md:p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
        <h2 className="text-xl font-semibold text-textMain m-0">Upload Document</h2>
      </div>

      <div
        onClick={() => (status === 'idle' || status === 'failed') && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
          (status === 'idle' || status === 'failed') ? "cursor-pointer hover:border-primary/50 hover:bg-surfaceBorder/30" : "cursor-default opacity-80",
          isDragOver ? "border-primary bg-primary/10" : "border-surfaceBorder",
          status === 'completed' && "border-emerald-500/30 bg-emerald-500/5",
          status === 'failed' && "border-red-500/30 bg-red-500/5"
        )}
      >
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={status === 'uploading' || status === 'processing'}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <div className={clsx("p-4 rounded-full bg-surfaceBorder/50", statusConfig[status].color)}>
              <CurrentIcon className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              {filename && (
                <div className="flex items-center justify-center gap-2 text-textMain font-medium">
                  <FileText className="w-4 h-4 text-textMuted" />
                  {filename}
                </div>
              )}
              <p className={clsx("text-sm font-medium", statusConfig[status].color.replace('animate-spin', ''))}>
                {statusConfig[status].text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}