import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { initDB, dbGet, dbRun } from './database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { seedDefaultTemplates } from './controllers/campaignController';

async function bootstrap(): Promise<void> {
  await initDB(path.resolve(config.db.path));

  // Seed / sync admin from .env — password ALWAYS matches ADMIN_PASSWORD after restart
  {
    const adminEmail = config.admin.email.trim().toLowerCase();
    const hash = await bcrypt.hash(config.admin.password, 12);
    const existing = dbGet<{ id: string }>('SELECT id FROM users WHERE lower(email)=?', [adminEmail]);
    if (!existing) {
      dbRun('INSERT INTO users(id,email,username,password,role,department,is_active)VALUES(?,?,?,?,?,?,1)', [
        uuidv4(), adminEmail, 'admin', hash, 'admin', 'Security Operations',
      ]);
      console.log(`[Bootstrap] Admin CREATED`);
    } else {
      dbRun(`UPDATE users SET email=?, password=?, role='admin', is_active=1, updated_at=datetime('now') WHERE id=?`, [
        adminEmail, hash, existing.id,
      ]);
      console.log(`[Bootstrap] Admin PASSWORD RESET from .env`);
    }
    console.log(`   Login email    : ${adminEmail}`);
    console.log(`   Login password : ${config.admin.password}`);
  }

  seedDefaultTemplates();

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  // Dev: reflect any origin. Production: CORS_ORIGIN can be one URL or comma-separated list.
  const corsOrigin = config.isDev
    ? true
    : (config.cors.origin.includes(',')
        ? config.cors.origin.split(',').map(s => s.trim()).filter(Boolean)
        : config.cors.origin);
  app.use(cors({ origin: corsOrigin, credentials: true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(morgan(config.isDev ? 'dev' : 'combined'));
  app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests.' } }));
  app.use('/api/v1', routes);

  // Production: serve built React app from frontend/dist (single public URL)
  if (!config.isDev) {
    const candidates = [
      path.resolve(__dirname, 'public'),
      path.resolve(__dirname, '../../frontend/dist'),
      path.resolve(process.cwd(), 'frontend/dist'),
      path.resolve(process.cwd(), '../frontend/dist'),
      path.resolve(process.cwd(), 'dist/public'),
    ];
    const staticDir = candidates.find(d => fs.existsSync(d));
    if (staticDir) {
      app.use(express.static(staticDir));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(staticDir, 'index.html'));
      });
      console.log(`[Static] Serving frontend from ${staticDir}`);
    } else {
      console.warn('[Static] frontend/dist not found — API only');
    }
  }

  app.use(notFound);
  app.use(errorHandler);

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🛡  CyberSentinel API`);
    console.log(`   URL    : http://localhost:${config.port}/api/v1`);
    console.log(`   Health : http://localhost:${config.port}/api/v1/health`);
    console.log(`   Admin  : ${config.admin.email}`);
    console.log(`   Coach  : ${config.ai.anthropicApiKey ? 'Live (Anthropic)' : 'Offline (built-in)'}`);
    console.log(`   Phone  : open http://<this-pc-lan-ip>:3000 on the same Wi‑Fi\n`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Fatal] Port ${config.port} is already in use. Stop the other process or set PORT in .env`);
    } else {
      console.error('[Fatal] Server error:', err);
    }
    process.exit(1);
  });
}

bootstrap().catch(err => {
  console.error('[Fatal] Backend failed to start:');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
