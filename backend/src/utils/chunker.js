/**
 * Splits text into overlapping chunks.
 * Tries to break at sentence boundaries so we don't cut mid-sentence.
 *
 * @param {string} text - The full extracted text
 * @param {number} chunkSize - Target size of each chunk (in characters)
 * @param {number} overlap - How many characters to overlap between chunks
 * @returns {string[]} array of text chunks
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
    // Clean up excessive whitespace/newlines first
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Split into sentences (basic split on '. ', '? ', '! ')
    const sentences = cleanText.split(/(?<=[.?!])\s+/);

    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        // If adding this sentence would exceed chunkSize, save current chunk and start new one
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Start next chunk with overlap from the end of the previous chunk
            const overlapText = currentChunk.slice(-overlap);
            currentChunk = overlapText + ' ' + sentence;
        } else {
            currentChunk += ' ' + sentence;
        }
    }

    // Push the last remaining chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

module.exports = { chunkText };