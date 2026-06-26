const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number], // array of floats, 384 numbers for all-MiniLM-L6-v2
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  }
});

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  rawText: {
    type: String,
    required: true
  },
  chunks: [chunkSchema],
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', documentSchema);