const { findTopKChunksFullRanking } = require('./similarity');
const { bm25Search } = require('./keywordSearch');
const { reciprocalRankFusion } = require('./rrf');

/**
 * Hybrid search: combines semantic similarity ranking and BM25 keyword ranking
 * using Reciprocal Rank Fusion, returning the best overall matches.
 *
 * @param {number[]} queryEmbedding
 * @param {string} queryText
 * @param {Array} chunks
 * @param {number} topK
 */
function hybridSearch(queryEmbedding, queryText, chunks, topK = 3) {
  // Get FULL ranked lists from both methods (not just top-K) so RRF has enough
  // overlap information to work with
  const semanticRanked = findTopKChunksFullRanking(queryEmbedding, chunks);
  const keywordRanked = bm25Search(queryText, chunks);

  return reciprocalRankFusion(semanticRanked, keywordRanked, 60, topK);
}

module.exports = { hybridSearch };