'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { getAppwriteAdmin } = require('../config/appwrite');
const { hashPassword } = require('../utils/crypto');

const COLLECTIONS = [
  'users',
  'customers',
  'products',
  'cost_requests',
  'cost_items',
  'approvals',
  'audit_logs',
  'system_settings',
];

let memoryStore = null;

function createInitialStore() {
  const now = new Date().toISOString();

  const users = [
    {
      $id: 'usr-admin-001',
      employeeCode: 'EMP-0001',
      email: 'admin@protex.co.th',
      passwordHash: hashPassword('Protex@Admin2026!'),
      fullName: 'กิตติพงศ์ วัฒนากูล (System Admin)',
      role: 'ADMIN',
      department: 'IT & Information Security',
      position: 'Senior System Administrator',
      status: 'ACTIVE',
      mfaEnabled: true,
      mfaSecret: 'PROTEXADMINSECRET2026',
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: '99999999.00',
      lastLoginAt: null,
      createdBy: 'SYSTEM',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'usr-approver-001',
      employeeCode: 'EMP-0002',
      email: 'approver@protex.co.th',
      passwordHash: hashPassword('Protex@Approver2026!'),
      fullName: 'วิชัย พิทักษ์กิจ (Costing Manager)',
      role: 'APPROVER',
      department: 'Costing & Engineering',
      position: 'Engineering & Costing Manager',
      status: 'ACTIVE',
      mfaEnabled: true,
      mfaSecret: 'PROTEXAPPROVERSECRET2026',
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: '5000000.00',
      lastLoginAt: null,
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'usr-staff-001',
      employeeCode: 'EMP-0003',
      email: 'staff@protex.co.th',
      passwordHash: hashPassword('Protex@Staff2026!'),
      fullName: 'นภัสสร ศรีสุวรรณ (Sales Coordinator)',
      role: 'STAFF',
      department: 'Industrial Sales',
      position: 'Senior Sales Coordinator',
      status: 'ACTIVE',
      mfaEnabled: false,
      mfaSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: '0.00',
      lastLoginAt: null,
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'usr-staff-002',
      employeeCode: 'EMP-0004',
      email: 'staff2@protex.co.th',
      passwordHash: hashPassword('Protex@Staff2026!'),
      fullName: 'ธนากร เจริญผล (Sales Engineer)',
      role: 'STAFF',
      department: 'Industrial Sales',
      position: 'Sales Engineer',
      status: 'ACTIVE',
      mfaEnabled: false,
      mfaSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: '0.00',
      lastLoginAt: null,
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'usr-viewer-001',
      employeeCode: 'EMP-0005',
      email: 'viewer@protex.co.th',
      passwordHash: hashPassword('Protex@Viewer2026!'),
      fullName: 'ศิริพร วงศ์สวัสดิ์ (Internal Auditor)',
      role: 'VIEWER',
      department: 'Industrial Sales',
      position: 'Accounting & Cost Viewer',
      status: 'ACTIVE',
      mfaEnabled: false,
      mfaSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      approvalLimit: '0.00',
      lastLoginAt: null,
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
  ];

  const customers = [
    {
      $id: 'cust-0001',
      customerCode: 'CUST-0001',
      companyName: 'บริษัท สยาม อินดัสเทรียล ฮีตติ้ง จำกัด',
      contactPerson: 'คุณสมชาย รัตนพงศ์',
      phone: '02-384-7100',
      email: 'purchasing@siamheating.co.th',
      taxId: '0105548019231',
      address: '88/12 นิคมอุตสาหกรรมบางปู ต.แพรกษา อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10280',
      paymentTerms: 'Credit 30 Days',
      deliveryTerms: 'จัดส่งภายใน 7-10 วันทำการ',
      assignedSalesId: 'usr-staff-001',
      status: 'ACTIVE',
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'cust-0002',
      customerCode: 'CUST-0002',
      companyName: 'บริษัท อีสเทิร์น โพลีเมอร์ แอนด์ แพ็คเกจจิ้ง จำกัด',
      contactPerson: 'คุณพิมพ์ชนก ทองดี',
      phone: '038-458-920',
      email: 'procurement@easternpolymer.co.th',
      taxId: '0205552008412',
      address: '700/450 นิคมอุตสาหกรรมอมตะซิตี้ ต.คลองตำหรุ อ.เมืองชลบุรี จ.ชลบุรี 20000',
      paymentTerms: 'Credit 60 Days',
      deliveryTerms: 'จัดส่งภายใน 14 วันทำการ ณ โรงงานชลบุรี',
      assignedSalesId: 'usr-staff-002',
      status: 'ACTIVE',
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
  ];

  const products = [
    {
      $id: 'prod-0001',
      productCode: 'HT-SP-1208',
      name: 'ลวดฮีตเตอร์พันสปริง (Coil Spring Heater Wire)',
      category: 'Industrial Heater',
      description: 'ลวดฮีตเตอร์พันสปริงเกรดทนความร้อนสูง Kanthal A-1\nพร้อมขั้วต่อเซรามิกและสายทนความร้อน',
      specification: 'Dia. 1.2 × OD 8.1 × 3180 mm\n220V 2000W',
      unit: 'เส้น',
      standardUnitCost: '1500.00',
      defaultDelivery: '7 วันทำการ',
      defaultWhtApplicable: false,
      status: 'ACTIVE',
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'prod-0002',
      productCode: 'HT-TB-5000',
      name: 'ฮีตเตอร์แท่งสแตนเลส (Tubular Finned Heater SUS316L)',
      category: 'Tubular Heater',
      description: 'ฮีตเตอร์ครีบสแตนเลส SUS316L สำหรับตู้อบอุตสาหกรรม\nเชื่อมหน้าแปลนมาตรฐาน JIS 10K',
      specification: 'Tube Dia. 11 mm × L 1200 mm (U-Shape)\n380V 3-Phase 4500W',
      unit: 'ชุด',
      standardUnitCost: '5000.00',
      defaultDelivery: '10-14 วันทำการ',
      defaultWhtApplicable: true,
      status: 'ACTIVE',
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      $id: 'prod-0003',
      productCode: 'TC-K-0450',
      name: 'เทอร์โมคัปเปิล Type K พร้อมหัวกะโหลก (Thermocouple Sensor)',
      category: 'Temperature Sensor',
      description: 'หัววัดอุณหภูมิ Type K ท่อสแตนเลส SUS316 กันน้ำ IP67',
      specification: 'Probe Dia. 8.0 × L 450 mm\nThread PT 1/2" (0-1100 °C)',
      unit: 'ตัว',
      standardUnitCost: '850.00',
      defaultDelivery: '5 วันทำการ',
      defaultWhtApplicable: false,
      status: 'ACTIVE',
      createdBy: 'usr-admin-001',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
  ];

  const system_settings = [
    {
      $id: 'global',
      companyNameTh: 'บริษัท โปรเท็กซ์ กรุ๊ป จำกัด',
      companyNameEn: 'PROTEX GROUP CO., LTD.',
      companyAddress: 'เลขที่ 199/88 ถนนบางนา-ตราด แขวงบางนาเหนือ เขตบางนา กรุงเทพมหานคร 10260',
      companyTaxId: '0105545099881',
      companyPhone: 'โทร. 02-745-8800 | แฟกซ์ 02-745-8801',
      docNumberPrefix: 'PC',
      docNumberDateFormat: 'YYYYMM',
      docNumberPadding: 4,
      docRunningSequence: 0,
      docCurrentPeriod: '202611',
      defaultVatRate: '7.00',
      defaultWhtRate: '3.00',
      roundingPolicy: 'HALF_UP_2DP',
      sessionTimeoutMinutes: 480,
      requireMfaForPrivileged: true,
      updatedBy: 'SYSTEM',
      updatedAt: now,
    },
  ];

  return {
    users,
    customers,
    products,
    cost_requests: [],
    cost_items: [],
    approvals: [],
    audit_logs: [],
    system_settings,
  };
}

function loadLocalStore() {
  if (memoryStore) return memoryStore;

  const filePath = env.localDbFile;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = parsed;
      for (const col of COLLECTIONS) {
        if (!Array.isArray(memoryStore[col])) {
          memoryStore[col] = [];
        }
      }
      return memoryStore;
    } catch {
      // Fallback to fresh store if corrupted
    }
  }

  memoryStore = createInitialStore();
  persistLocalStore();
  return memoryStore;
}

function persistLocalStore() {
  if (!memoryStore) return;
  const filePath = env.localDbFile;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpFile = `${filePath}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(memoryStore, null, 2), { mode: 0o600 });
  fs.renameSync(tmpFile, filePath);
}

function resetStoreForTesting() {
  memoryStore = createInitialStore();
  persistLocalStore();
  return memoryStore;
}

const dbRepository = {
  async listDocuments(collectionName, { filterFn = null, appwriteQueries = [], sortFn = null } = {}) {
    if (env.dbAdapter === 'appwrite') {
      const { databases, databaseId, collections } = getAppwriteAdmin();
      const colId = collections[collectionName] || collectionName;
      const res = await databases.listDocuments(databaseId, colId, appwriteQueries);
      let docs = res.documents || [];
      if (filterFn) docs = docs.filter(filterFn);
      if (sortFn) docs = docs.slice().sort(sortFn);
      return docs;
    }

    const store = loadLocalStore();
    const list = store[collectionName] || [];
    let docs = filterFn ? list.filter(filterFn) : list.slice();
    if (sortFn) {
      docs.sort(sortFn);
    }
    return docs.map((d) => ({ ...d }));
  },

  async getDocument(collectionName, documentId) {
    if (env.dbAdapter === 'appwrite') {
      const { databases, databaseId, collections } = getAppwriteAdmin();
      const colId = collections[collectionName] || collectionName;
      try {
        return await databases.getDocument(databaseId, colId, documentId);
      } catch (err) {
        if (err.code === 404) return null;
        throw err;
      }
    }

    const store = loadLocalStore();
    const list = store[collectionName] || [];
    const found = list.find((item) => item.$id === documentId);
    return found ? { ...found } : null;
  },

  async createDocument(collectionName, data, documentId = null, permissions = []) {
    const id = documentId || crypto.randomUUID();
    const now = new Date().toISOString();
    const doc = {
      ...data,
      $id: id,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    if (env.dbAdapter === 'appwrite') {
      const { databases, databaseId, collections } = getAppwriteAdmin();
      const colId = collections[collectionName] || collectionName;
      const payload = { ...doc };
      delete payload.$id;
      return await databases.createDocument(databaseId, colId, id, payload, permissions);
    }

    const store = loadLocalStore();
    if (!store[collectionName]) {
      store[collectionName] = [];
    }
    store[collectionName].push(doc);
    persistLocalStore();
    return { ...doc };
  },

  async updateDocument(collectionName, documentId, partialData, permissions = undefined) {
    const now = new Date().toISOString();

    if (env.dbAdapter === 'appwrite') {
      const { databases, databaseId, collections } = getAppwriteAdmin();
      const colId = collections[collectionName] || collectionName;
      const payload = { ...partialData, updatedAt: now };
      delete payload.$id;
      return await databases.updateDocument(databaseId, colId, documentId, payload, permissions);
    }

    const store = loadLocalStore();
    const list = store[collectionName] || [];
    const index = list.findIndex((item) => item.$id === documentId);
    if (index === -1) {
      return null;
    }

    const updated = {
      ...list[index],
      ...partialData,
      $id: documentId,
      updatedAt: now,
    };
    list[index] = updated;
    persistLocalStore();
    return { ...updated };
  },

  async deleteDocument(collectionName, documentId) {
    if (env.dbAdapter === 'appwrite') {
      const { databases, databaseId, collections } = getAppwriteAdmin();
      const colId = collections[collectionName] || collectionName;
      await databases.deleteDocument(databaseId, colId, documentId);
      return true;
    }

    const store = loadLocalStore();
    const list = store[collectionName] || [];
    const initialLen = list.length;
    store[collectionName] = list.filter((item) => item.$id !== documentId);
    if (store[collectionName].length !== initialLen) {
      persistLocalStore();
      return true;
    }
    return false;
  },
};

module.exports = {
  dbRepository,
  resetStoreForTesting,
};
