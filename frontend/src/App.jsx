import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText } from 'lucide-react';
import UploadBox from './components/UploadBox';
import ChatBox from './components/ChatBox';

function App() {
  const [document, setDocument] = useState(null); // { documentId, filename }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-blob"></div>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 relative z-10 flex flex-col gap-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center p-3 bg-surface border border-surfaceBorder rounded-2xl shadow-xl shadow-primary/10 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-textMuted">
            DocMind
          </h1>
          <p className="text-lg text-textMuted font-medium max-w-lg mx-auto">
            Chat with your documents using hybrid RAG search. Upload a PDF to get started.
          </p>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <UploadBox
            onDocumentReady={(documentId, filename) => setDocument({ documentId, filename })}
          />
        </motion.div>

        {document && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ChatBox documentId={document.documentId} filename={document.filename} />
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default App;