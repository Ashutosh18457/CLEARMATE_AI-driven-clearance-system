import cors from 'cors';
import env from './env.js';

const corsOptions = {
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default () => cors(corsOptions);
