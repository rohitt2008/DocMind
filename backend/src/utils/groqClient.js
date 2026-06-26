/**
 * Calls Groq's chat completion API (OpenAI-compatible format) to generate
 * an answer based on retrieved context chunks.
 *
 * @param {string} question - the user's question
 * @param {string[]} contextChunks - relevant text chunks retrieved from the document
 * @returns {Promise<string>} the AI's answer
 */
async function generateAnswer(question, contextChunks) {
  const context = contextChunks
    .map((chunk, i) => `[Source ${i + 1}]\n${chunk}`)
    .join('\n\n');

  const systemPrompt = `You are a helpful assistant that answers questions based ONLY on the provided context from a document.
Rules:
- Only use information from the context below to answer.
- If the answer isn't in the context, say "I couldn't find that information in the document."
- When you use information from a source, mention which source number it came from, like (Source 1).
- Be concise and direct.`;

  const userPrompt = `Context from document:\n\n${context}\n\nQuestion: ${question}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3 // lower = more focused/factual, less creative
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Same as generateAnswer, but streams the response token-by-token.
 * Calls onToken(textChunk) every time a new piece of text arrives.
 *
 * @param {string} question
 * @param {string[]} contextChunks
 * @param {function} onToken - callback invoked with each text chunk as it streams in
 */
async function generateAnswerStream(question, contextChunks, onToken) {
  const context = contextChunks
    .map((chunk, i) => `[Source ${i + 1}]\n${chunk}`)
    .join('\n\n');

  const systemPrompt = `You are a helpful assistant that answers questions based ONLY on the provided context from a document.
Rules:
- Only use information from the context below to answer.
- If the answer isn't in the context, say "I couldn't find that information in the document."
- When you use information from a source, mention which source number it came from, like (Source 1).
- Be concise and direct.`;

  const userPrompt = `Context from document:\n\n${context}\n\nQuestion: ${question}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      stream: true // <-- this is the key difference
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  // The response body is a stream of Server-Sent Events from Groq.
  // We read it chunk by chunk and parse out the actual text tokens.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line for next loop

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const jsonStr = trimmed.replace('data: ', '');
      if (jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          onToken(token);
        }
      } catch (err) {
        // Skip malformed lines (can happen at stream boundaries)
      }
    }
  }
}

module.exports = { generateAnswer, generateAnswerStream };