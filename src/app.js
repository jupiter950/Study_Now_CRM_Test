const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  if (!dbConnected) {
    return res.status(503).json({ status: 'error', message: 'Database not connected' });
  }

  res.json({ status: 'ok' });
});

module.exports = app;
