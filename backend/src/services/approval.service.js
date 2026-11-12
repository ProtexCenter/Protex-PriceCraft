'use strict';

const auditService = require('./audit.service');

async function decideCostRequest({ documentId, status, comment, actor }) {
  const decidedAt = new Date().toISOString();
  await auditService.recordAuditEvent({
    action: status === 'APPROVED' ? 'COST_REQUEST_APPROVED' : 'COST_REQUEST_REJECTED',
    actorId: actor?.id || 'system',
    targetId: documentId,
    metadata: { status, comment, decidedAt },
  });

  return {
    documentId,
    status,
    comment: comment || '',
    decidedBy: actor?.fullName || 'Protex Approver',
    decidedAt,
  };
}

module.exports = {
  decideCostRequest,
};

