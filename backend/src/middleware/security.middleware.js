'use strict';

const env = require('../config/env');
const { AppError } = require('../utils/errors');
const { verifyCsrfToken } = require('../utils/crypto');

const rateBuckets = new Map();

function createRateLimiter({ windowMs = env.rateLimitWindowMs, max = env.rateLimitMaxRequests, keyPrefix = 'global' } = {}) {
  return function rateLimiterMiddleware(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      return next(
        new AppError(429, 'RATE_LIMIT_EXCEEDED', 'ตรวจพบการเรียกใช้งานถี่เกินกำหนด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง')
      );
    }
    return next();
  };
}

function cookieParserMiddleware(req, _res, next) {
  req.cookies = Object.create(null);
  const rawHeader = req.headers.cookie;
  if (!rawHeader || typeof rawHeader !== 'string') {
    return next();
  }

  const pairs = rawHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    try {
      req.cookies[key] = decodeURIComponent(val);
    } catch {
      req.cookies[key] = val;
    }
  }
  return next();
}

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype' || k.startsWith('$')) {
        throw new AppError(400, 'INJECTION_DETECTED', `ไม่อนุญาตให้ใช้คีย์พิเศษ "${k}" ในคำขอ`);
      }
      cleaned[k] = sanitizeValue(v);
    }
    return cleaned;
  }
  return value;
}

function inputSanitizerMiddleware(req, _res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeValue(req.query);
      for (const key of Object.keys(req.query)) {
        req.query[key] = sanitizedQuery[key];
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

function csrfProtectionMiddleware(req, _res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  if (req.path === '/api/auth/login') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && !req.cookies?.pc_session) {
    return next();
  }

  const sessionId = req.session?.id;
  if (!sessionId) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  if (!verifyCsrfToken(sessionId, csrfToken)) {
    return next(
      new AppError(403, 'CSRF_VALIDATION_FAILED', 'เซสชันความปลอดภัย (CSRF Token) ไม่ถูกต้องหรือหมดอายุ กรุณารีเฟรชหน้าเว็บ')
    );
  }

  return next();
}

function confidentialNoCacheMiddleware(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

module.exports = {
  createRateLimiter,
  cookieParserMiddleware,
  inputSanitizerMiddleware,
  csrfProtectionMiddleware,
  confidentialNoCacheMiddleware,
};
