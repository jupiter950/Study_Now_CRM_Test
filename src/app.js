const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const applicationsRouter = require('./routes/applications.routes');
const { errorHandler } = require('./middleware/error-handler');

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

app.use('/applications', applicationsRouter);

app.use((req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code = 'ROUTE_NOT_FOUND';
  next(err);
});

app.use(errorHandler);

module.exports = app;
