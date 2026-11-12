'use strict';

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const SESSION_SECRET = process.env.SESSION_SECRET || (
  IS_PROD ? '' : crypto.createHash('sha256').update('pricecraf-dev-session-secret-key').digest('hex')
);
const CSRF_SECRET = process.env.CSRF_SECRET || (
  IS_PROD ? '' : crypto.createHash('sha256').update('pricecraf-dev-csrf-secret-key').digest('hex')
);

if (IS_PROD && (!SESSION_SECRET || !CSRF_SECRET)) {
  throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET and CSRF_SECRET must be set in production environment.');
}

const env = {
  nodeEnv: NODE_ENV,
  isProd: IS_PROD,
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '127.0.0.1',
  sessionSecret: SESSION_SECRET,
  csrfSecret: CSRF_SECRET,
  mfaIssuer: process.env.MFA_ISSUER || 'PROTEX-PriceCraf',
  sessionTtlMinutes: parseInt(process.env.SESSION_TTL_MINUTES || '480', 10),
  cookieSecure: process.env.COOKIE_SECURE === 'true' || IS_PROD,
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'Strict',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:4000,http://127.0.0.1:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10),
  authMaxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS || '5', 10),
  authLockoutMinutes: parseInt(process.env.AUTH_LOCKOUT_MINUTES || '15', 10),
  dbAdapter: process.env.DB_ADAPTER || 'local',
  localDbFile: process.env.LOCAL_DB_FILE
    ? path.resolve(__dirname, '../..', process.env.LOCAL_DB_FILE)
    : path.resolve(__dirname, '../../data/pricecraf-store.json'),
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || 'protex_pricecraf_prod',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'pricecraf_db',
    collections: {
      users: process.env.APPWRITE_COLLECTION_USERS || 'users',
      customers: process.env.APPWRITE_COLLECTION_CUSTOMERS || 'customers',
      products: process.env.APPWRITE_COLLECTION_PRODUCTS || 'products',
      cost_requests: process.env.APPWRITE_COLLECTION_COST_REQUESTS || 'cost_requests',
      cost_items: process.env.APPWRITE_COLLECTION_COST_ITEMS || 'cost_items',
      approvals: process.env.APPWRITE_COLLECTION_APPROVALS || 'approvals',
      audit_logs: process.env.APPWRITE_COLLECTION_AUDIT_LOGS || 'audit_logs',
      system_settings: process.env.APPWRITE_COLLECTION_SYSTEM_SETTINGS || 'system_settings',
    },
  },
};

module.exports = env;

