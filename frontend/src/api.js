const API_BASE = 'http://localhost:5001/api';

// Upload a PDF file
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// Check processing status (used for polling)
export async function checkDocumentStatus(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/status`);
  if (!res.ok) throw new Error('Status check failed');
  return res.json();
}

// Poll status every `interval` ms until status is "completed" or "failed"
export function pollUntilReady(documentId, onUpdate, interval = 2000) {
  const poll = setInterval(async () => {
    try {
      const data = await checkDocumentStatus(documentId);
      onUpdate(data);
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(poll);
      }
    } catch (err) {
      console.error('Polling error:', err);
      clearInterval(poll);
    }
  }, interval);

  return () => clearInterval(poll); // returns a cleanup function
}

/**
 * Streams an answer from /ask-stream using fetch + manual SSE parsing
 * (EventSource doesn't support POST, so we read the stream ourselves).
 *
 * @param {string} documentId
 * @param {string} question
 * @param {object} callbacks - { onSources(sources), onToken(text), onDone(), onError(err) }
 */
export async function streamAnswer(documentId, question, { onSources, onToken, onDone, onError }) {
  try {
    const res = await fetch(`${API_BASE}/ask-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, question })
    });

    if (!res.ok || !res.body) {
      throw new Error('Failed to start stream');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by blank lines ("\n\n")
      const messages = buffer.split('\n\n');
      buffer = messages.pop(); // keep incomplete message for next loop

      for (const message of messages) {
        const lines = message.split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.replace('event:', '').trim();
          if (line.startsWith('data:')) data = line.replace('data:', '').trim();
        }

        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (eventType === 'sources') onSources?.(parsed);
          if (eventType === 'token') onToken?.(parsed.token);
          if (eventType === 'done') onDone?.();
          if (eventType === 'error') onError?.(parsed.error);
        } catch {
          // ignore malformed chunks
        }
      }
    }
  } catch (err) {
    onError?.(err.message);
  }
}