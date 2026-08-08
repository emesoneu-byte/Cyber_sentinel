import dotenv from 'dotenv';
dotenv.config();

function opt(k: string, fb: string): string {
  return process.env[k] ?? fb;
}

/** Dev-safe defaults so the API starts even without a .env file. Override in production. */
const DEV_JWT = 'cybersentinel-dev-jwt-secret-change-me-in-production-32chars';
const DEV_JWT_REFRESH = 'cybersentinel-dev-refresh-secret-change-me-in-production';

export const config = {
  port: parseInt(opt('PORT', '5000'), 10),
  nodeEnv: opt('NODE_ENV', 'development'),
  isDev: opt('NODE_ENV', 'development') === 'development',
  jwt: {
    secret: opt('JWT_SECRET', DEV_JWT),
    refreshSecret: opt('JWT_REFRESH_SECRET', DEV_JWT_REFRESH),
    expiresIn: opt('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: opt('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  db: { path: opt('DB_PATH', './data/cybersentinel.db') },
  rateLimit: {
    windowMs: parseInt(opt('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(opt('RATE_LIMIT_MAX', '100'), 10),
    authMax: parseInt(opt('AUTH_RATE_LIMIT_MAX', '200'), 10),
  },
  cors: { origin: opt('CORS_ORIGIN', 'http://localhost:3000') },
  admin: {
    email: opt('ADMIN_EMAIL', 'admin@example.com'),
    password: opt('ADMIN_PASSWORD', 'Admin123!'),
  },
  email: {
    smtpHost: opt('SMTP_HOST', 'localhost'),
    smtpPort: parseInt(opt('SMTP_PORT', '1025'), 10),
    smtpUser: opt('SMTP_USER', ''),
    smtpPass: opt('SMTP_PASS', ''),
    smtpSecure: opt('SMTP_SECURE', 'false') === 'true',
    fromAddress: opt('EMAIL_FROM', 'cybersentinel-sim@company.local'),
    trackingBaseUrl: opt('TRACKING_BASE_URL', 'http://localhost:5000/api/v1/track'),
  },
  ai: {
    anthropicApiKey: opt('ANTHROPIC_API_KEY', ''),
    model: opt('AI_COACH_MODEL', 'claude-sonnet-4-6'),
    maxTokens: parseInt(opt('AI_COACH_MAX_TOKENS', '1024'), 10),
    rateLimitPerHour: parseInt(opt('AI_COACH_RATE_LIMIT_PER_HOUR', '100'), 10),
  },
} as const;
