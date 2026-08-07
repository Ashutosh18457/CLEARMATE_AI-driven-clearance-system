const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('./middleware/mongoSanitize');
const xssClean = require('./middleware/xss');

const corsOptions = require('./config/cors');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// ──────────────────────────────────────────────
// SECURITY
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  frameguard: { action: 'deny' },
}));
app.use(cors(corsOptions));

// ──────────────────────────────────────────────
// REQUEST PARSING
// ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean);

// ──────────────────────────────────────────────
// HTTP REQUEST LOGGING
// ──────────────────────────────────────────────
app.use(morgan(env.isDev ? 'dev' : 'combined', { stream: logger.stream }));

// ──────────────────────────────────────────────
// RATE LIMITING
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: { code: 'RATE_LIMIT' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    error: { code: 'RATE_LIMIT' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ──────────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────────
app.use('/api', routes);

// ──────────────────────────────────────────────
// 404 HANDLER
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl}`));
});

// ──────────────────────────────────────────────
// CENTRALIZED ERROR HANDLER
// ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
