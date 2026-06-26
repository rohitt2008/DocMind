/**
 * Reciprocal Rank Fusion (RRF).
 *
 * Problem: we have two ranked lists of the same chunks — one ranked by semantic
 * similarity, one ranked by BM25 keyword score. These two scores are on
 * completely different scales (cosine similarity ~0-1, BM25 can be any positive
 * number), so we can't just add them together directly.
 *
 * RRF solves this elegantly: ignore the raw scores entirely, just look at each
 * chunk's RANK (position) in each list. A chunk ranked #1 in both lists is
 * almost certainly the best result. The formula 1/(k + rank) gives diminishing
 * weight to lower ranks, with k as a smoothing constant (60 is a common default
 * from information retrieval literature).
 *
 * @param {Array} semanticRanked - chunks sorted by semantic score (best first)
 * @param {Array} keywordRanked - chunks sorted by BM25 score (best first)
 * @param {number} k - smoothing constant
 * @param {number} topK - how many final results to return
 */
function reciprocalRankFusion(semanticRanked, keywordRanked, k = 60, topK = 3) {
  const rrfScores = {}; // chunkIndex -> combined RRF score
  const chunkLookup = {}; // chunkIndex -> chunk data (for returning full info later)

  semanticRanked.forEach((chunk, rank) => {
    const id = chunk.chunkIndex;
    rrfScores[id] = (rrfScores[id] || 0) + 1 / (k + rank + 1);
    chunkLookup[id] = { ...chunk, semanticRank: rank + 1 };
  });

  keywordRanked.forEach((chunk, rank) => {
    const id = chunk.chunkIndex;
    rrfScores[id] = (rrfScores[id] || 0) + 1 / (k + rank + 1);
    if (chunkLookup[id]) {
      chunkLookup[id].keywordRank = rank + 1;
    } else {
      chunkLookup[id] = { ...chunk, keywordRank: rank + 1 };
    }
  });

  const fused = Object.keys(rrfScores).map(id => ({
    ...chunkLookup[id],
    rrfScore: rrfScores[id]
  }));

  fused.sort((a, b) => b.rrfScore - a.rrfScore);

  return fused.slice(0, topK);
}

module.exports = { reciprocalRankFusion };