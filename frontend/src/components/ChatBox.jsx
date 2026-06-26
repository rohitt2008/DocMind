import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { streamAnswer } from '../api';
import clsx from 'clsx';

export default function ChatBox({ documentId, filename }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]); // { question, answer, sources, isStreaming }
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    const currentQuestion = question;
    setQuestion('');
    setIsAsking(true);

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
    <div className="bg-surface/50 backdrop-blur-xl border border-surfaceBorder rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
      <div className="p-4 md:p-6 border-b border-surfaceBorder flex items-center justify-between bg-surface/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
          <div>
            <h2 className="text-lg font-semibold text-textMain m-0">Ask Questions</h2>
            <p className="text-xs text-textMuted flex items-center gap-1 mt-0.5">
              <FileText className="w-3 h-3" /> {filename}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-textMuted opacity-60">
            <Bot className="w-12 h-12 mb-3" />
            <p>Ask anything about the document...</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
                    <p className="m-0 leading-relaxed">{msg.question}</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex gap-4 max-w-[90%]">
                  <div className="w-8 h-8 rounded-full bg-surfaceBorder flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-textMain leading-relaxed whitespace-pre-wrap">
                      {msg.answer.length === 0 && msg.isStreaming ? (
                        <span className="text-textMuted italic flex items-center gap-2">
                          <motion.span 
                            animate={{ opacity: [0.3, 1, 0.3] }} 
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2 h-2 bg-primary rounded-full"
                          />
                          Searching document...
                        </span>
                      ) : (
                        msg.answer
                      )}
                      {msg.isStreaming && msg.answer.length > 0 && (
                        <span className="inline-block w-2 h-4 ml-1 bg-primary align-middle animate-pulse" />
                      )}
                    </div>

                    {/* Sources Accordion */}
                    {msg.sources?.length > 0 && (
                      <SourcesAccordion sources={msg.sources} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface/80 border-t border-surfaceBorder">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask something..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            className="w-full bg-[#0f1117] border border-surfaceBorder rounded-full pl-5 pr-12 py-3.5 text-sm text-textMain focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleAsk} 
            disabled={isAsking || !question.trim()}
            className="absolute right-1.5 p-2 bg-primary hover:bg-primaryHover disabled:bg-surfaceBorder text-white rounded-full transition-colors disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SourcesAccordion({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 border border-surfaceBorder rounded-lg overflow-hidden bg-[#0f1117]/50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-xs font-medium text-textMuted hover:text-textMain hover:bg-surface/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Sources used ({sources.length})
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-surfaceBorder space-y-3">
              {sources.map((src, j) => (
                <div key={j} className="bg-surface p-3 rounded-md border border-surfaceBorder/50 text-xs">
                  <div className="flex flex-wrap gap-2 mb-2 text-[#7a9cff] font-medium">
                    <span>Chunk #{src.chunkIndex}</span>
                    <span className="opacity-50">•</span>
                    <span>RRF: {src.rrfScore}</span>
                    {src.semanticRank && (
                      <>
                        <span className="opacity-50">•</span>
                        <span>Semantic Rank: {src.semanticRank}</span>
                      </>
                    )}
                  </div>
                  <p className="text-textMuted leading-relaxed m-0 italic">
                    "{src.text.slice(0, 250)}..."
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}