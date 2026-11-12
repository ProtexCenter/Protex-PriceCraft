'use strict';

const crypto = require('crypto');
const env = require('../config/env');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt$')) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, originalHex] = parts;
  const derivedBuffer = crypto.scryptSync(String(password), salt, 64);
  const originalBuffer = Buffer.from(originalHex, 'hex');
  if (derivedBuffer.length !== originalBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

function generateTotpCode(secret, timeStep = Math.floor(Date.now() / 30000)) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep), 0);
  const hmac = crypto.createHmac('sha1', Buffer.from(String(secret), 'utf8')).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

function verifyTotpCode(code, secret) {
  if (!code || !secret) return false;
  const normalizedCode = String(code).trim();
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const currentStep = Math.floor(Date.now() / 30000);
  for (let delta = -1; delta <= 1; delta += 1) {
    const candidate = generateTotpCode(secret, currentStep + delta);
    if (
      crypto.timingSafeEqual(
        Buffer.from(normalizedCode, 'utf8'),
        Buffer.from(candidate, 'utf8')
      )
    ) {
      return true;
    }
  }
  return false;
}

function createCsrfToken(sessionId) {
  return crypto
    .createHmac('sha256', env.csrfSecret)
    .update(String(sessionId))
    .digest('hex');
}

function verifyCsrfToken(sessionId, providedToken) {
  if (!sessionId || !providedToken || typeof providedToken !== 'string') {
    return false;
  }
  const expected = createCsrfToken(sessionId);
  if (expected.length !== providedToken.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(providedToken, 'utf8')
  );
}

function signSessionCookie(sessionId) {
  const sig = crypto
    .createHmac('sha256', env.sessionSecret)
    .update(String(sessionId))
    .digest('base64url');
  return `${sessionId}.${sig}`;
}

function unsignSessionCookie(signedValue) {
  if (!signedValue || typeof signedValue !== 'string' || !signedValue.includes('.')) {
    return null;
  }
  const [sessionId, sig] = signedValue.split('.');
  const expectedSig = crypto
    .createHmac('sha256', env.sessionSecret)
    .update(sessionId)
    .digest('base64url');
  if (sig.length !== expectedSig.length) {
    return null;
  }
  const valid = crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'));
  return valid ? sessionId : null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateTotpCode,
  verifyTotpCode,
  createCsrfToken,
  verifyCsrfToken,
  signSessionCookie,
  unsignSessionCookie,
};

