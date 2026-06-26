import { useState } from 'react';
import { streamAnswer } from '../api';

export default function ChatBox({ documentId, filename }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]); // { question, answer, sources, isStreaming }
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    const currentQuestion = question;
    setQuestion('');
    setIsAsking(true);

    // Add a placeholder message that we'll fill in as tokens stream
    const messageIndex = messages.length;
    setMessages(prev => [...prev, {
      question: currentQuestion,
      answer: '',
      sources: [],
      isStreaming: true
    }]);

    await streamAnswer(documentId, currentQuestion, {
      onSources: (sources) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = { ...updated[messageIndex], sources };
          return updated;
        });
      },
      onToken: (token) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            answer: updated[messageIndex].answer + token
          };
          return updated;
        });
      },
      onDone: () => {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = { ...updated[messageIndex], isStreaming: false };
          return updated;
        });
        setIsAsking(false);
      },
      onError: (err) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            answer: `Error: ${err}`,
            isStreaming: false
          };
          return updated;
        });
        setIsAsking(false);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="chat-box">
      <h2>2. Ask questions about "{filename}"</h2>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message-pair">
            <div className="user-question">🧑 {msg.question}</div>
            <div className="ai-answer">
              🤖 {msg.answer}
              {msg.isStreaming && <span className="cursor-blink">▋</span>}
            </div>

            {msg.sources?.length > 0 && (
              <details className="sources">
                <summary>📄 Sources ({msg.sources.length})</summary>
                {msg.sources.map((src, j) => (
                  <div key={j} className="source-item">
                    <div className="source-meta">
                      Chunk #{src.chunkIndex} — RRF score: {src.rrfScore}
                      {src.semanticRank && ` | semantic rank: ${src.semanticRank}`}
                      {src.keywordRank && ` | keyword rank: ${src.keywordRank}`}
                    </div>
                    <div className="source-text">{src.text.slice(0, 200)}...</div>
                  </div>
                ))}
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="input-row">
        <input
          type="text"
          placeholder="Ask something about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAsking}
        />
        <button onClick={handleAsk} disabled={isAsking || !question.trim()}>
          {isAsking ? 'Thinking...' : 'Ask'}
        </button>
      </div>
    </div>
  );
}