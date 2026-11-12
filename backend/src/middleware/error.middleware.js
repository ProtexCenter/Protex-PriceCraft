'use strict';

const env = require('../config/env');
const { AppError } = require('../utils/errors');

function notFoundMiddleware(req, _res, next) {
  next(new AppError(404, 'RESOURCE_NOT_FOUND', `ไม่พบเส้นทาง API ที่ร้องขอ: ${req.method} ${req.originalUrl}`));
}

function errorHandlerMiddleware(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'รูปแบบข้อมูล JSON ในคำขอไม่ถูกต้อง',
      },
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'ขนาดข้อมูลที่ส่งมามีขนาดใหญ่เกินกว่าที่ระบบกำหนด',
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.isProd
        ? 'เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแลระบบ'
        : err.message || 'เกิดข้อผิดพลาดภายในระบบ',
    },
  });
}

module.exports = {
  notFoundMiddleware,
  errorHandlerMiddleware,
};
