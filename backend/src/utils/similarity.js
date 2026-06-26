/**
 * Calculates cosine similarity between two vectors.
 * Returns a value between -1 and 1 — closer to 1 means more similar in meaning.
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} similarity score
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Given a query embedding and an array of chunks (each with .embedding),
 * returns the top K most similar chunks, sorted best-first.
 *
 * @param {number[]} queryEmbedding
 * @param {Array} chunks - array of { text, embedding, chunkIndex }
 * @param {number} topK - how many results to return
 */
function findTopKChunks(queryEmbedding, chunks, topK = 3) {
  const scored = chunks.map(chunk => ({
    text: chunk.text,
    embedding: chunk.embedding,
    chunkIndex: chunk.chunkIndex,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Same as findTopKChunks but returns ALL chunks ranked (no slicing).
 * Needed for Reciprocal Rank Fusion, which needs full rank positions
 * from both semantic and keyword search to merge properly.
 */
function findTopKChunksFullRanking(queryEmbedding, chunks) {
  return findTopKChunks(queryEmbedding, chunks, chunks.length);
}

module.exports = { cosineSimilarity, findTopKChunks, findTopKChunksFullRanking };