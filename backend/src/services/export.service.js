'use strict';

function buildExportMetadata(documentNumber) {
  return {
    documentNumber: documentNumber || 'PC-202611-0001',
    companyName: 'หจก.โพรเทคส์ แอคเซสโซรี อินดัสเตรียล',
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildExportMetadata,
};

