require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const connectDB = require('./config/db');
const uploadRoutes = require('./routes/upload');
const askRoutes = require('./routes/ask');

const app = express();

// Make sure uploads/ folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', uploadRoutes);
app.use('/api', askRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('DocMind backend is running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});