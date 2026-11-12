'use strict';

const env = require('../config/env');
const { dbRepository } = require('../repositories/database.repository');
const { AppError } = require('../utils/errors');
const { hashPassword, verifyPassword, verifyTotpCode, generateTotpCode } = require('../utils/crypto');
const {
  createSession,
  destroySession,
  destroyAllUserSessions,
  sanitizeUserForClient,
} = require('../middleware/auth.middleware');
const { logAuditEvent } = require('../services/audit.service');

function buildSessionCookieString(signedToken, maxAgeSeconds) {
  const parts = [
    `pc_session=${encodeURIComponent(signedToken)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${env.cookieSameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (env.cookieSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

async function login(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const mfaCode = req.body?.mfaCode ? String(req.body.mfaCode).trim() : '';

    if (!email || !password) {
      throw new AppError(400, 'INVALID_CREDENTIALS_INPUT', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
    }

    const users = await dbRepository.listDocuments('users', {
      filterFn: (u) => !u.isDeleted && String(u.email).toLowerCase() === email,
    });
    const user = users[0] || null;

    if (!user) {
      await logAuditEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        severity: 'WARNING',
        actor: { email },
        targetType: 'SESSION',
        req,
        summary: `เข้าสู่ระบบไม่สำเร็จ: ไม่พบบัญชี ${email}`,
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (user.status === 'DISABLED') {
      await logAuditEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        severity: 'WARNING',
        actor: user,
        targetType: 'SESSION',
        req,
        summary: `บัญชีที่ถูกระงับพยายามเข้าสู่ระบบ: ${user.email}`,
      });
      throw new AppError(403, 'ACCOUNT_DISABLED', 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      await logAuditEvent({
        eventType: 'AUTH_LOGIN_LOCKED',
        severity: 'WARNING',
        actor: user,
        targetType: 'SESSION',
        req,
        summary: `บัญชีที่ถูกล็อกชั่วคราวพยายามเข้าสู่ระบบ: ${user.email}`,
      });
      throw new AppError(
        423,
        'ACCOUNT_LOCKED',
        `บัญชีถูกล็อกชั่วคราวเนื่องจากรหัสผ่านผิดเกินกำหนด กรุณาลองใหม่หลังเวลา ${new Date(user.lockedUntil).toLocaleTimeString('th-TH')}`
      );
    }

    const passwordValid = verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = attempts >= env.authMaxFailedAttempts;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + env.authLockoutMinutes * 60 * 1000).toISOString()
        : null;

      await dbRepository.updateDocument('users', user.$id, {
        failedLoginAttempts: attempts,
        lockedUntil,
        status: shouldLock ? 'LOCKED' : 'ACTIVE',
      });

      await logAuditEvent({
        eventType: shouldLock ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_LOGIN_FAILURE',
        severity: shouldLock ? 'CRITICAL' : 'WARNING',
        actor: user,
        targetType: 'USER',
        targetId: user.$id,
        req,
        summary: shouldLock
          ? `ล็อกบัญชีอัตโนมัติหลังจากกรอกรหัสผ่านผิดครบ ${attempts} ครั้ง: ${user.email}`
          : `รหัสผ่านไม่ถูกต้อง (ครั้งที่ ${attempts}/${env.authMaxFailedAttempts}): ${user.email}`,
      });

      throw new AppError(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Check MFA for privileged roles (ADMIN / APPROVER) when mfaEnabled is true
    const mfaRequired = Boolean(user.mfaEnabled && ['ADMIN', 'APPROVER'].includes(user.role));
    if (mfaRequired) {
      if (!mfaCode) {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          message: 'กรุณากรอกรหัสยืนยันตัวตน 2 ชั้น (MFA 6 หลัก)',
          ...(env.isProd ? {} : { devCurrentMfaCode: generateTotpCode(user.mfaSecret) }),
        });
      }

      const validMfa = verifyTotpCode(mfaCode, user.mfaSecret);
      if (!validMfa) {
        await logAuditEvent({
          eventType: 'AUTH_MFA_FAILURE',
          severity: 'WARNING',
          actor: user,
          targetType: 'SESSION',
          req,
          summary: `รหัส MFA ไม่ถูกต้องสำหรับผู้ใช้ ${user.email}`,
        });
        throw new AppError(401, 'INVALID_MFA_CODE', 'รหัสยืนยันตัวตน 2 ชั้น (MFA) ไม่ถูกต้องหรือหมดอายุ');
      }
    }

    const nowIso = new Date().toISOString();
    const updatedUser = await dbRepository.updateDocument('users', user.$id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: 'ACTIVE',
      lastLoginAt: nowIso,
    });

    const session = createSession(updatedUser);
    const maxAgeSec = env.sessionTtlMinutes * 60;
    res.setHeader('Set-Cookie', buildSessionCookieString(session.signedToken, maxAgeSec));

    await logAuditEvent({
      eventType: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      actor: updatedUser,
      targetType: 'SESSION',
      targetId: session.id,
      req,
      summary: `เข้าสู่ระบบสำเร็จ: ${updatedUser.fullName} (${updatedUser.role})`,
    });

    return res.status(200).json({
      success: true,
      mfaRequired: false,
      data: {
        user: sanitizeUserForClient(updatedUser),
        csrfToken: session.csrfToken,
        expiresAt: new Date(session.expiresAt).toISOString(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.session) {
      destroySession(req.session.id);
      await logAuditEvent({
        eventType: 'AUTH_LOGOUT',
        severity: 'INFO',
        actor: req.user,
        targetType: 'SESSION',
        targetId: req.session.id,
        req,
        summary: `ออกจากระบบ: ${req.user?.fullName || req.user?.email}`,
      });
    }
    res.setHeader('Set-Cookie', buildSessionCookieString('', 0));
    return res.status(200).json({
      success: true,
      message: 'ออกจากระบบเรียบร้อยแล้ว',
    });
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUserForClient(req.user),
        csrfToken: req.session?.csrfToken || null,
        expiresAt: req.session ? new Date(req.session.expiresAt).toISOString() : null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { currentPassword, newPassword, targetUserId } = req.body || {};

    // Admin can reset another user's password; otherwise user resets their own
    const isTargetOther = targetUserId && targetUserId !== req.user.$id;
    if (isTargetOther && req.user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถรีเซ็ตรหัสผ่านของพนักงานอื่นได้');
    }

    if (!newPassword || String(newPassword).length < 10) {
      throw new AppError(400, 'WEAK_PASSWORD', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
    }

    const targetId = isTargetOther ? targetUserId : req.user.$id;
    const targetUser = await dbRepository.getDocument('users', targetId);
    if (!targetUser || targetUser.isDeleted) {
      throw new AppError(404, 'USER_NOT_FOUND', 'ไม่พบบัญชีผู้ใช้งาน');
    }

    if (!isTargetOther) {
      if (!currentPassword || !verifyPassword(currentPassword, targetUser.passwordHash)) {
        throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    }

    await dbRepository.updateDocument('users', targetId, {
      passwordHash: hashPassword(newPassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await logAuditEvent({
      eventType: 'AUTH_PASSWORD_RESET',
      severity: 'INFO',
      actor: req.user,
      targetType: 'USER',
      targetId,
      req,
      summary: `เปลี่ยนรหัสผ่านบัญชี ${targetUser.email}`,
    });

    return res.status(200).json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
    });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const allUsers = await dbRepository.listDocuments('users', {
      filterFn: (u) => !u.isDeleted,
      sortFn: (a, b) => String(a.employeeCode).localeCompare(String(b.employeeCode)),
    });

    // Non-admin users only get basic directory list (id, fullName, department, role) for salesperson selection
    if (req.user.role !== 'ADMIN') {
      return res.status(200).json({
        success: true,
        data: allUsers
          .filter((u) => u.status === 'ACTIVE')
          .map((u) => ({
            id: u.$id,
            employeeCode: u.employeeCode,
            fullName: u.fullName,
            department: u.department,
            role: u.role,
          })),
      });
    }

    return res.status(200).json({
      success: true,
      data: allUsers.map(sanitizeUserForClient),
    });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const {
      employeeCode,
      email,
      password,
      fullName,
      role = 'STAFF',
      department = 'Sales',
      position = '',
      approvalLimit = '0.00',
      mfaEnabled = false,
    } = req.body || {};

    if (!employeeCode || !email || !password || !fullName) {
      throw new AppError(400, 'VALIDATION_ERROR', 'กรุณากรอกรหัสพนักงาน อีเมล ชื่อ-นามสกุล และรหัสผ่านให้ครบถ้วน');
    }

    if (String(password).length < 10) {
      throw new AppError(400, 'WEAK_PASSWORD', 'รหัสผ่านต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
    }

    if (!['ADMIN', 'APPROVER', 'STAFF', 'VIEWER'].includes(role)) {
      throw new AppError(400, 'INVALID_ROLE', 'บทบาทผู้ใช้งานไม่ถูกต้อง');
    }

    const existing = await dbRepository.listDocuments('users', {
      filterFn: (u) =>
        !u.isDeleted &&
        (String(u.email).toLowerCase() === String(email).trim().toLowerCase() ||
          String(u.employeeCode).toUpperCase() === String(employeeCode).trim().toUpperCase()),
    });

    if (existing.length > 0) {
      throw new AppError(409, 'DUPLICATE_USER', 'รหัสพนักงานหรืออีเมลนี้มีอยู่ในระบบแล้ว');
    }

    const forceMfa = ['ADMIN', 'APPROVER'].includes(role) ? Boolean(mfaEnabled) : false;
    const created = await dbRepository.createDocument('users', {
      employeeCode: String(employeeCode).trim().toUpperCase(),
      email: String(email).trim().toLowerCase(),
      passwordHash: hashPassword(password),
      fullName: String(fullName).trim(),
      role,
      department: String(department).trim(),
      position: String(position).trim(),
      status: 'ACTIVE',
      mfaEnabled: forceMfa,
      mfaSecret: forceMfa ? `PROTEXMFA${Date.now()}` : null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: String(approvalLimit || '0.00'),
      lastLoginAt: null,
      createdBy: req.user.$id,
      isDeleted: false,
    });

    await logAuditEvent({
      eventType: 'USER_CREATED',
      severity: 'INFO',
      actor: req.user,
      targetType: 'USER',
      targetId: created.$id,
      req,
      summary: `สร้างบัญชีผู้ใช้งานใหม่: ${created.fullName} (${created.role})`,
    });

    return res.status(201).json({
      success: true,
      data: sanitizeUserForClient(created),
    });
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = req.params.id;
    const existing = await dbRepository.getDocument('users', userId);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, 'USER_NOT_FOUND', 'ไม่พบบัญชีผู้ใช้งาน');
    }

    const updates = {};
    if (req.body.fullName !== undefined) updates.fullName = String(req.body.fullName).trim();
    if (req.body.department !== undefined) updates.department = String(req.body.department).trim();
    if (req.body.position !== undefined) updates.position = String(req.body.position).trim();
    if (req.body.approvalLimit !== undefined) updates.approvalLimit = String(req.body.approvalLimit);
    if (req.body.mfaEnabled !== undefined) {
      updates.mfaEnabled = Boolean(req.body.mfaEnabled);
      if (updates.mfaEnabled && !existing.mfaSecret) {
        updates.mfaSecret = `PROTEXMFA${Date.now()}`;
      }
    }

    if (req.body.role !== undefined) {
      if (!['ADMIN', 'APPROVER', 'STAFF', 'VIEWER'].includes(req.body.role)) {
        throw new AppError(400, 'INVALID_ROLE', 'บทบาทผู้ใช้งานไม่ถูกต้อง');
      }
      updates.role = req.body.role;
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'DISABLED', 'LOCKED'].includes(req.body.status)) {
        throw new AppError(400, 'INVALID_STATUS', 'สถานะบัญชีไม่ถูกต้อง');
      }
      updates.status = req.body.status;
      if (req.body.status === 'ACTIVE') {
        updates.failedLoginAttempts = 0;
        updates.lockedUntil = null;
      } else if (req.body.status === 'DISABLED') {
        destroyAllUserSessions(userId);
      }
    }

    const updated = await dbRepository.updateDocument('users', userId, updates);

    await logAuditEvent({
      eventType: 'PERMISSION_CHANGE',
      severity: 'WARNING',
      actor: req.user,
      targetType: 'USER',
      targetId: userId,
      req,
      summary: `อัปเดตสิทธิ์/สถานะผู้ใช้ ${updated.email}: role=${updated.role}, status=${updated.status}`,
      metadata: updates,
    });

    return res.status(200).json({
      success: true,
      data: sanitizeUserForClient(updated),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  resetPassword,
  listUsers,
  createUser,
  updateUser,
};

