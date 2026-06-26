import { useState, useRef } from 'react';
import { uploadDocument, pollUntilReady } from '../api';

export default function UploadBox({ onDocumentReady }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | completed | failed
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

  return (
    <div className="upload-box">
      <h2>1. Upload a document</h2>

      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={status === 'uploading' || status === 'processing'}
      />

      {filename && (
        <div className="upload-status">
          <p><strong>{filename}</strong></p>

          {status === 'uploading' && <p className="status-pill uploading">Uploading...</p>}
          {status === 'processing' && <p className="status-pill processing">Processing (chunking + embedding)...</p>}
          {status === 'completed' && <p className="status-pill completed">✅ Ready to chat!</p>}
          {status === 'failed' && <p className="status-pill failed">❌ Failed: {error}</p>}
        </div>
      )}
    </div>
  );
}