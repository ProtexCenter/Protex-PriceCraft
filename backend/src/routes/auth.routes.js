'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/security.middleware');

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth_login',
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/password-reset', authenticate, authController.resetPassword);

router.get('/users', authenticate, authController.listUsers);
router.post('/users', authenticate, requireRole('ADMIN'), authController.createUser);
router.patch('/users/:id', authenticate, requireRole('ADMIN'), authController.updateUser);

module.exports = router;

