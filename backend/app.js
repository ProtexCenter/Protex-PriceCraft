'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./src/config/env');
const {
  createRateLimiter,
  cookieParserMiddleware,
  inputSanitizerMiddleware,
  csrfProtectionMiddleware,
  confidentialNoCacheMiddleware,
} = require('./src/middleware/security.middleware');
const { authenticate } = require('./src/middleware/auth.middleware');
const { notFoundMiddleware, errorHandlerMiddleware } = require('./src/middleware/error.middleware');

const authRoutes = require('./src/routes/auth.routes');
const productsRoutes = require('./src/routes/products.routes');
const customersRoutes = require('./src/routes/customers.routes');
const costsRoutes = require('./src/routes/costs.routes');
const approvalsRoutes = require('./src/routes/approvals.routes');
const reportsRoutes = require('./src/routes/reports.routes');

const app = express();

// 1. Strict HTTP Security Headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.sheetjs.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' },
  })
);

// 2. Strict CORS Allowlist for Internal Enterprise Origins
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by PROTEX CORS Security Policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// 3. Global Rate Limiter & Payload Size Limits
app.use('/api', createRateLimiter());
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParserMiddleware);
app.use(inputSanitizerMiddleware);

// 4. Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'protex-pricecraf-backend',
    status: 'OK',
    dbAdapter: env.dbAdapter,
    timestamp: new Date().toISOString(),
  });
});

// 5. Confidential API No-Store Headers & Protected Routes
app.use('/api', confidentialNoCacheMiddleware);
app.use('/api/auth', csrfProtectionMiddleware, authRoutes);
app.use('/api/products', authenticate, csrfProtectionMiddleware, productsRoutes);
app.use('/api/customers', authenticate, csrfProtectionMiddleware, customersRoutes);
app.use('/api/costs', authenticate, csrfProtectionMiddleware, costsRoutes);
app.use('/api/approvals', authenticate, csrfProtectionMiddleware, approvalsRoutes);
app.use('/api/reports', authenticate, csrfProtectionMiddleware, reportsRoutes);

// 6. Serve Static Frontend Assets (Internal Web UI)
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath, { index: 'index.html' }));

// 7. 404 & Centralized Error Handler
app.use('/api', notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;

