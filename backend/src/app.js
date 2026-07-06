const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const beatsRouter = require('./routes/beats');
const searchRouter = require('./routes/search');
const recommendationsRouter = require('./routes/recommendations');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Beat22 Backend API',
    status: 'ok',
    documentation: 'See README for API usage'
  });
});

app.use('/api/beats', beatsRouter);
app.use('/api/search', searchRouter);
app.use('/api/recommendations', recommendationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
