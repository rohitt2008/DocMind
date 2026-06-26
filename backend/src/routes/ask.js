const express = require('express');
const Document = require('../models/Document');
const { generateEmbedding } = require('../utils/embeddings');
const { hybridSearch } = require('../utils/hybridSearch');
const { generateAnswer, generateAnswerStream } = require('../utils/groqClient');

const router = express.Router();

// POST /api/ask
// Body: { documentId: "...", question: "..." }
router.post('/ask', async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: 'documentId and question are required' });
    }

    // 1. Fetch the document (with its chunks + embeddings) from MongoDB
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 2. Embed the user's question using the same model used for chunks
    const questionEmbedding = await generateEmbedding(question);

    // 3. Find the most relevant chunks using hybrid search (semantic + keyword, merged via RRF)
    const topChunks = hybridSearch(questionEmbedding, question, document.chunks, 3);

    // 4. Send those chunks + the question to the LLM
    const contextTexts = topChunks.map(chunk => chunk.text);
    const answer = await generateAnswer(question, contextTexts);

    // 5. Return the answer along with which sources were used (for citations)
    res.status(200).json({
      answer,
      sources: topChunks.map(chunk => ({
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        rrfScore: chunk.rrfScore.toFixed(4),
        semanticRank: chunk.semanticRank ?? null,
        keywordRank: chunk.keywordRank ?? null
      }))
    });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: 'Something went wrong answering the question' });
  }
});

module.exports = router;

// POST /api/ask-stream
// Same as /ask, but streams the answer back token-by-token using Server-Sent Events (SSE).
router.post('/ask-stream', async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: 'documentId and question are required' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const questionEmbedding = await generateEmbedding(question);
    const topChunks = hybridSearch(questionEmbedding, question, document.chunks, 3);
    const contextTexts = topChunks.map(chunk => chunk.text);

    // --- Set up SSE headers ---
    // These tell the browser "keep this connection open, I'll keep sending small messages"
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // First, send the sources immediately (so the UI can show "searching..." -> sources before the answer)
    res.write(`event: sources\ndata: ${JSON.stringify(
      topChunks.map(chunk => ({
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        rrfScore: chunk.rrfScore.toFixed(4),
        semanticRank: chunk.semanticRank ?? null,
        keywordRank: chunk.keywordRank ?? null
      }))
    )}\n\n`);

    // Stream each token as it arrives from Groq
    await generateAnswerStream(question, contextTexts, (token) => {
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
    });

    // Tell the frontend we're done
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    console.error('Ask-stream error:', err);
    // If headers already sent, we can't send a normal JSON error — send an SSE error event instead
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Something went wrong' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Something went wrong answering the question' });
    }
  }
});