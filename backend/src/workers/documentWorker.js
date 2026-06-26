// This file runs as a SEPARATE PROCESS from your main server.
// It listens for jobs on the 'document-processing' queue and handles the
// slow work (chunking + embeddings) without blocking the API.

require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const connection = require('../config/redisConnection');
const Document = require('../models/Document');
const { chunkText } = require('../utils/chunker');
const { generateEmbedding } = require('../utils/embeddings');

// Connect to MongoDB (the worker needs its own DB connection, separate from server.js)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Worker connected to MongoDB'))
  .catch(err => console.error('❌ Worker MongoDB connection error:', err));

const worker = new Worker(
  'document-processing',
  async (job) => {
    const { documentId, extractedText } = job.data;
    console.log(`Processing document ${documentId}...`);

    try {
      // Split text into chunks
      const textChunks = chunkText(extractedText, 1000, 200);
      console.log(`Document ${documentId}: split into ${textChunks.length} chunks`);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = [];
      for (let i = 0; i < textChunks.length; i++) {
        const embedding = await generateEmbedding(textChunks[i]);
        chunksWithEmbeddings.push({
          text: textChunks[i],
          embedding,
          chunkIndex: i
        });

        // Optional: report progress back to BullMQ (useful if you build a progress bar later)
        await job.updateProgress(Math.round(((i + 1) / textChunks.length) * 100));
      }

      // Update the document in MongoDB with the results
      await Document.findByIdAndUpdate(documentId, {
        chunks: chunksWithEmbeddings,
        status: 'completed'
      });

      console.log(`✅ Document ${documentId} processing complete`);
    } catch (err) {
      console.error(`❌ Failed processing document ${documentId}:`, err);
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        errorMessage: err.message
      });
      throw err; // re-throw so BullMQ marks the job as failed too
    }
  },
  { connection, concurrency: 2 } // process up to 2 documents at once
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

console.log('🚀 Document processing worker started, waiting for jobs...');