import { useState } from 'react';
import UploadBox from './components/UploadBox';
import ChatBox from './components/ChatBox';
import './App.css';

function App() {
  const [document, setDocument] = useState(null); // { documentId, filename }

  return (
    <div className="app">
      <header>
        <h1>📄 DocMind</h1>
        <p className="subtitle">Chat with your documents using hybrid RAG search</p>
      </header>

      <UploadBox
        onDocumentReady={(documentId, filename) => setDocument({ documentId, filename })}
      />

      {document && (
        <ChatBox documentId={document.documentId} filename={document.filename} />
      )}
    </div>
  );
}

export default App;