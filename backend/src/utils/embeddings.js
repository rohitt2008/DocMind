const { pipeline } = require('@xenova/transformers');

// Cache the pipeline so we don't reload the model on every call (it's ~25MB, slow to reload)
let embedderInstance = null;

async function getEmbedder() {
  if (!embedderInstance) {
    console.log('Loading embedding model (first time only, may take a moment)...');
    // all-MiniLM-L6-v2: small, fast, good quality. Produces 384-dimensional vectors.
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded.');
  }
  return embedderInstance;
}

/**
 * Generates an embedding (array of numbers) for a given piece of text.
 * @param {string} text
 * @returns {Promise<number[]>} 384-dimensional embedding vector
 */
async function generateEmbedding(text) {
  const embedder = await getEmbedder();

  // pooling: 'mean' averages token embeddings into one vector per input
  // normalize: true makes vectors unit length, which makes cosine similarity comparisons cleaner
  const output = await embedder(text, { pooling: 'mean', normalize: true });

  // output.data is a Float32Array — convert to a regular array for MongoDB storage
  return Array.from(output.data);
}

module.exports = { generateEmbedding };