import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import configureCors from './config/cors.js';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// ─── Security ───
app.use(helmet());
app.use(configureCors());

// ─── Rate Limiting ───
if (env.NODE_ENV === 'production') {
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: { success: false, message: 'Too many requests, please try again later', error: { code: 'RATE_LIMITED' } },
  }));
}

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ───
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Routes ───
app.use('/api', routes);

// ─── Error Handler ───
app.use(errorHandler);

export default app;
