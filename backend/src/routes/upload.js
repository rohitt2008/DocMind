const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const Document = require('../models/Document');

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

        // Read the uploaded PDF file from disk
        const filePath = req.file.path;
        const dataBuffer = fs.readFileSync(filePath);

        // Extract text from PDF (pdf-parse v2 uses a class-based API)
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        const extractedText = pdfData.text;
        await parser.destroy(); // free up resources

        // Save to MongoDB
        const newDoc = await Document.create({
            filename: req.file.originalname,
            rawText: extractedText
        });

        // Clean up: delete the temp file from disk (we already saved text in DB)
        fs.unlinkSync(filePath);

        res.status(201).json({
            message: 'File uploaded and processed successfully',
            documentId: newDoc._id,
            filename: newDoc.filename,
            textPreview: extractedText.substring(0, 300) + '...', // just first 300 chars to confirm it worked
            textLength: extractedText.length
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Something went wrong processing the file' });
    }
});

module.exports = router;