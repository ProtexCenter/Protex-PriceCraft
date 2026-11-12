'use strict';

const { dbRepository } = require('../repositories/database.repository');

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'token',
  'csrfToken',
  'sessionSecret',
  'apiKey',
  'mfaSecret',
  'mfaCode',
  'cookie',
  'authorization',
]);

function redactSecrets(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || /secret|password|token|key/i.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      clean[key] = redactSecrets(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

async function logAuditEvent({
  eventType,
  severity = 'INFO',
  actor = null,
  targetType = 'SYSTEM',
  targetId = null,
  req = null,
  summary = '',
  metadata = {},
}) {
  const sanitizedMeta = redactSecrets(metadata);
  const ipAddress = req
    ? String(req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').slice(0, 64)
    : '';
  const userAgent = req ? String(req.headers?.['user-agent'] || '').slice(0, 250) : '';

  const entry = {
    eventType: String(eventType || 'UNKNOWN_EVENT'),
    severity,
    actorId: actor?.$id || actor?.id || null,
    actorEmail: actor?.email || '',
    actorRole: actor?.role || '',
    targetType,
    targetId: targetId ? String(targetId) : null,
    ipAddress,
    userAgent,
    summary: String(summary).slice(0, 500),
    metadataJson: JSON.stringify(sanitizedMeta).slice(0, 4000),
    createdAt: new Date().toISOString(),
  };

  return dbRepository.createDocument('audit_logs', entry);
}

module.exports = {
  logAuditEvent,
  redactSecrets,
};
