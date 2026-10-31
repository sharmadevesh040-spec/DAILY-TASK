import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import categoryRoutes from './routes/category.routes';
import reminderRoutes from './routes/reminder.routes';
import dashboardRoutes from './routes/dashboard.routes';
import plannerRoutes from './routes/planner.routes';
import notificationRoutes from './routes/notification.routes';
import { errorHandler } from './middleware/errorHandler';
import { startReminderCron } from './services/reminderCron';
import { validateSmtpConfig } from './services/emailService';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Vercel, Render, Nginx) so client IP and rate-limiting work properly
app.set('trust proxy', 1);

// Security middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://daily-task-client-pi.vercel.app',
  'https://localhost', // Capacitor Android WebView
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl / Postman (no Origin header)
      if (!origin) return callback(null, true);
      // Allow any localhost / 127.0.0.1
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow local network IPs (e.g. phone browsing dev server on 192.168.x.x, 10.x.x.x)
      if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow all Vercel deployments (*.vercel.app)
      if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(origin)) return callback(null, true);
      // Allow mobile webview / Capacitor schemes
      if (/^(capacitor|ionic|file|app|vscode-webview):\/\//.test(origin) || origin === 'null') return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Fallback: reflect requesting origin cleanly without throwing CORS 500 error
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Preflight OPTIONS handler
app.options('*', cors());

// Serve local upload fallbacks statically (if folder exists)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', (req, res, next) => {
  if (fs.existsSync(uploadsDir)) {
    return express.static(uploadsDir)(req, res, next);
  }
  next();
});

// Rate limiting (general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Auth rate limit (accommodates normal auth/OTP usage & testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please wait a few minutes before trying again.' },
});
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Start cron jobs (in standalone server mode)
if (process.env.NODE_ENV !== 'test') {
  startReminderCron();
}

// Validate SMTP configuration on startup
validateSmtpConfig();

let runningServer: any = null;
if (process.env.NODE_ENV !== 'test') {
  runningServer = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
  });
}

export default app;
// Export for CommonJS compatibility in serverless runtimes
// @ts-ignore
module.exports = app;
// @ts-ignore
module.exports.default = app;
