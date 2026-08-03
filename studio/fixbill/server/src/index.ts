import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import os from 'node:os';
import { onRequest } from 'firebase-functions/v2/https';
import { getServerEnv } from './config/env.js';
import { processReceiptRouter } from './routes/processReceipt.js';

export const createApp = () => {
  const serverEnv = getServerEnv();
  const app = express();
  
  // Parse allowed origins from env strings (handle comma-separated lists)
  const envOrigins = [
    ...(serverEnv.FRONTEND_URL?.split(',') || []),
    ...(serverEnv.CLIENT_ORIGIN?.split(',') || []),
  ].map(o => o.trim()).filter(Boolean);

  const allowedOrigins = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /\.vercel\.app$/, // Allow ALL vercel.app domains
    /\.web\.app$/,    // Allow ALL firebase web.app domains
    /\.firebaseapp\.com$/, // Allow ALL firebaseapp.com domains
    ...envOrigins
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some((pattern) => {
          if (pattern instanceof RegExp) return pattern.test(origin);
          return pattern === origin;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`CORS BLOCKED for origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  
  app.get('/api/health', (_request: Request, response: Response) => {
    response.json({ ok: true, service: 'fixbill-server', runtime: 'firebase-functions' });
  });

  app.use('/api', processReceiptRouter);

  app.use('/output', express.static(os.tmpdir()));

  app.use((error: any, _request: Request, response: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('SERVER ERROR:', error);
    
    if (error.response?.data) {
      console.error('Detailed Error Context:', JSON.stringify(error.response.data, null, 2));
    }

    response.status(error.status || 500).json({ message });
  });

  return app;
};

// Export the Express app as a Firebase Cloud Function
export const api = onRequest({
  secrets: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN'
  ],
  memory: '1GiB', // Increased memory for PDF processing
  timeoutSeconds: 120, // Increased timeout for Google Drive uploads
  cors: true,
  maxInstances: 10
}, createApp());
