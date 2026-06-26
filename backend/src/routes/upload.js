const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const Document = require('../models/Document');
const documentQueue = require('../queues/documentQueue');

const router = express.Router();

// Multer config: temporarily store uploaded file in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// POST /api/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text immediately (this part is fast — only chunking/embedding is slow)
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const extractedText = pdfData.text;
    await parser.destroy();

    // Clean up the temp file right away
    fs.unlinkSync(filePath);

    // Save a document record immediately with status "processing" (no chunks yet)
    const newDoc = await Document.create({
      filename: req.file.originalname,
      rawText: extractedText,
      status: 'processing'
    });

    // Hand off the slow work (chunking + embeddings) to the background worker
    await documentQueue.add('process-document', {
      documentId: newDoc._id.toString(),
      extractedText
    });

    // Respond immediately — don't make the user wait for processing to finish
    res.status(202).json({
      message: 'File uploaded. Processing in background.',
      documentId: newDoc._id,
      filename: newDoc.filename,
      status: 'processing'
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Something went wrong processing the file' });
  }
});

// GET /api/documents/:id/status
// Frontend polls this to check when processing is done
router.get('/documents/:id/status', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('status filename errorMessage chunks');
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({
      documentId: doc._id,
      filename: doc.filename,
      status: doc.status,
      totalChunks: doc.chunks.length,
      errorMessage: doc.errorMessage
    });
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Something went wrong checking status' });
  }
});

module.exports = router;