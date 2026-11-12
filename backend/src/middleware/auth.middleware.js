'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const { dbRepository } = require('../repositories/database.repository');
const { AppError } = require('../utils/errors');
const { unsignSessionCookie, signSessionCookie, createCsrfToken } = require('../utils/crypto');
const { logAuditEvent } = require('../services/audit.service');

/**
 * Server-side Session Store (In-memory Map with automatic TTL & idle expiration).
 */
const activeSessions = new Map();

function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const ttlMs = env.sessionTtlMinutes * 60 * 1000;

  const session = {
    id: sessionId,
    userId: user.$id,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + ttlMs,
    csrfToken: createCsrfToken(sessionId),
    signedToken: signSessionCookie(sessionId),
  };

  activeSessions.set(sessionId, session);
  return session;
}

function destroySession(sessionId) {
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
}

function destroyAllUserSessions(userId) {
  for (const [sid, sess] of activeSessions.entries()) {
    if (sess.userId === userId) {
      activeSessions.delete(sid);
    }
  }
}

function sanitizeUserForClient(user) {
  if (!user) return null;
  return {
    id: user.$id,
    employeeCode: user.employeeCode,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    position: user.position || '',
    status: user.status,
    mfaEnabled: Boolean(user.mfaEnabled),
    approvalLimit: user.approvalLimit || '0.00',
    lastLoginAt: user.lastLoginAt || null,
  };
}

/**
 * Authentication Middleware:
 * Validates signed HttpOnly session cookie or Bearer token, checks session expiration,
 * and reloads user record from database to ensure real-time status & role enforcement.
 */
async function authenticate(req, _res, next) {
  try {
    let signedToken = req.cookies?.pc_session;

    if (!signedToken && req.headers.authorization?.startsWith('Bearer ')) {
      signedToken = req.headers.authorization.slice(7).trim();
    }

    if (!signedToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
    }

    const sessionId = unsignSessionCookie(signedToken);
    if (!sessionId) {
      throw new AppError(401, 'INVALID_SESSION_TOKEN', 'เซสชันไม่ถูกต้องหรือถูกดัดแปลง กรุณาเข้าสู่ระบบใหม่');
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new AppError(401, 'SESSION_EXPIRED', 'เซสชันหมดอายุหรือถูกยกเลิกแล้ว กรุณาเข้าสู่ระบบใหม่');
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      activeSessions.delete(sessionId);
      throw new AppError(401, 'SESSION_TIMEOUT', 'เซสชันหมดอายุตามนโยบายความปลอดภัย กรุณาเข้าสู่ระบบใหม่');
    }

    // Fetch authoritative user record from database (Never trust role from frontend!)
    const user = await dbRepository.getDocument('users', session.userId);
    if (!user || user.isDeleted || user.status !== 'ACTIVE') {
      activeSessions.delete(sessionId);
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'บัญชีผู้ใช้งานถูกระงับหรือไม่มีสิทธิ์ใช้งานในระบบ');
    }

    // Update sliding activity timestamp
    session.lastActivityAt = now;
    req.session = session;
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'APPROVER', 'STAFF', 'VIEWER'
 */
function requireRole(...allowedRoles) {
  return async function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบก่อนใช้งาน'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logAuditEvent({
        eventType: 'UNAUTHORIZED_ROLE_ACCESS',
        severity: 'WARNING',
        actor: req.user,
        targetType: 'API_ENDPOINT',
        targetId: `${req.method} ${req.originalUrl}`,
        req,
        summary: `ปฏิเสธสิทธิ์การเข้าถึง: บทบาท ${req.user.role} พยายามเรียกใช้งาน ${req.method} ${req.originalUrl}`,
      });
      return next(
        new AppError(403, 'FORBIDDEN_INSUFFICIENT_ROLE', 'คุณไม่มีสิทธิ์เข้าถึงหรือดำเนินการในส่วนนี้ตามบทบาทที่ได้รับมอบหมาย')
      );
    }

    return next();
  };
}

/**
 * Object/Document-Level Authorization (RLS / BOLA Prevention) for cost_requests.
 */
function canViewCostRequest(user, costRequest) {
  if (!user || !costRequest || costRequest.isDeleted) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'APPROVER') {
    // Approvers can view all submitted/approved/returned/rejected documents, plus their own drafts
    if (costRequest.status !== 'DRAFT') return true;
    return costRequest.createdBy === user.$id;
  }
  if (user.role === 'STAFF') {
    // Staff can only view documents they created or are assigned as salesperson
    return costRequest.createdBy === user.$id || costRequest.salespersonId === user.$id;
  }
  if (user.role === 'VIEWER') {
    // Viewers can only read APPROVED documents within their department
    return costRequest.status === 'APPROVED' && costRequest.department === user.department;
  }
  return false;
}

function canEditCostRequest(user, costRequest) {
  if (!user || !costRequest || costRequest.isDeleted) return false;
  if (!['DRAFT', 'RETURNED'].includes(costRequest.status)) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STAFF' || user.role === 'APPROVER') {
    return costRequest.createdBy === user.$id;
  }
  return false;
}

function canApproveCostRequest(user, costRequest) {
  if (!user || !costRequest || costRequest.isDeleted) return false;
  if (costRequest.status !== 'PENDING_APPROVAL') return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'APPROVER') {
    // Prevent self-approval by the creator
    return costRequest.createdBy !== user.$id;
  }
  return false;
}

module.exports = {
  createSession,
  destroySession,
  destroyAllUserSessions,
  sanitizeUserForClient,
  authenticate,
  requireRole,
  canViewCostRequest,
  canEditCostRequest,
  canApproveCostRequest,
};

