/**
 * BM25 keyword search.
 * Ranks text chunks by keyword relevance to a query, accounting for:
 * - term frequency (how often a word appears in a chunk)
 * - inverse document frequency (rare words across all chunks matter more)
 * - document length normalization (so long chunks don't win just by being long)
 *
 * This runs entirely in-memory over a single document's chunks — no external
 * search engine needed, which keeps the project dependency-free.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or', 'but',
  'this', 'that', 'these', 'those', 'it', 'as', 'do', 'does', 'did',
  'what', 'which', 'who', 'whom', 'have', 'has', 'had', 'i', 'you', 'he',
  'she', 'they', 'we', 'their', 'his', 'her', 'its'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, ' ') // keep alphanumerics and a few useful symbols (C++, C#, etc.)
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Computes BM25 scores for every chunk against a query.
 *
 * @param {string} query
 * @param {Array} chunks - array of { text, chunkIndex, ... }
 * @param {number} k1 - controls term frequency saturation (standard default: 1.5)
 * @param {number} b - controls document length normalization (standard default: 0.75)
 * @returns {Array} chunks with an added `bm25Score`, sorted best-first
 */
function bm25Search(query, chunks, k1 = 1.5, b = 0.75) {
  const queryTerms = tokenize(query);
  const tokenizedChunks = chunks.map(chunk => tokenize(chunk.text));

  const docCount = chunks.length;
  const avgDocLength =
    tokenizedChunks.reduce((sum, tokens) => sum + tokens.length, 0) / docCount;

  // Precompute document frequency for each query term (how many chunks contain it)
  const docFreq = {};
  for (const term of queryTerms) {
    docFreq[term] = tokenizedChunks.filter(tokens => tokens.includes(term)).length;
  }

  const scored = chunks.map((chunk, idx) => {
    const tokens = tokenizedChunks[idx];
    const docLength = tokens.length;

    let score = 0;
    for (const term of queryTerms) {
      const termFreqInDoc = tokens.filter(t => t === term).length;
      if (termFreqInDoc === 0) continue;

      const df = docFreq[term] || 0;
      // IDF: rarer terms across the document's chunks score higher
      const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));

      // BM25 term score with length normalization
      const numerator = termFreqInDoc * (k1 + 1);
      const denominator = termFreqInDoc + k1 * (1 - b + b * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    }

    return { ...chunkToPlainObject(chunk), bm25Score: score };
  });

  scored.sort((a, b) => b.bm25Score - a.bm25Score);
  return scored;
}

// Helper to safely pull plain fields off a Mongoose subdocument (same fix as similarity.js)
function chunkToPlainObject(chunk) {
  return {
    text: chunk.text,
    embedding: chunk.embedding,
    chunkIndex: chunk.chunkIndex
  };
}

module.exports = { bm25Search, tokenize };