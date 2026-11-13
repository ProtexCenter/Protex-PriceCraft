/**
 * ============================================================================
 * PRICECRAFT — APPWRITE WEB SDK CONFIGURATION & REAL-TIME CRUD ENGINE
 * ============================================================================
 */
(function initAppwriteConfig(global) {
  'use strict';

  // 1. ตั้งค่า Environment / Project Config (รองรับ window.__ENV__ บน Production หรือใส่ค่าตรงนี้)
  const env = global.__ENV__ || {};
  const APPWRITE_CONFIG = {
    endpoint: env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
    projectId: env.VITE_APPWRITE_PROJECT_ID || '6af2e5a000218106d920',
    databaseId: env.VITE_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID',    // <-- ใส่ Database ID ของ ProtexNewsDB
    collectionId: env.VITE_APPWRITE_COLLECTION_ID || 'user_drafts',     // <-- ชื่อ Collection สำหรับเก็บ Draft
    employeesCollectionId: env.VITE_APPWRITE_EMPLOYEES_COLLECTION_ID || '6af2e9c6003dafa5b692', // <-- ตาราง Employees
    contractsCollectionId: env.VITE_APPWRITE_CONTRACTS_COLLECTION_ID || 'contracts',
  };

  const DEFAULT_CONTRACTS = [
    {
      id: 'AM251202',
      contractNo: 'AM251202',
      customerName: 'AMMA CONSTRUCTION MACHINERY CO., LTD.',
      buyerName: 'PROTEX ACCESSORY INDUSTRIAL LTD.,PART.',
      date: '(China)May 14th, 2026',
      totalPrice: 'CNY5,433,000',
      items: [
        { hsCode: '8474320000', item: 'PT2010RAP Asphalt Mixing Plant', qty: '1 SET', price: 'CNY4,523,000' },
        { hsCode: '8474201000', item: 'RC80 RAP Crusher', qty: '1 SET', price: 'CNY680,000' },
        { hsCode: '8417809090', item: 'Asphalt smoke treatment system', qty: '1 SET', price: 'CNY230,000' },
      ],
      note: '1. Excluding the filler elevator, but including the filler weighing and filler control system.\n2. Excluding automatic lubrication pump for mixer and dryer and elevator.\n3. Adopt China brand inverter for fan of bag filter.\n4. Add additional control panel with manual control, Including Cold RAP system\n5. Excluding 2 units hot RAP hopper and 1 unit cold RAP hopper',
    },
    {
      id: 'PC202605-01',
      contractNo: 'PC202605-01',
      customerName: 'บริษัท ยูโรเปียน แอสฟัลต์ คอนสตรัคชั่น จำกัด',
      buyerName: 'PROTEX ACCESSORY INDUSTRIAL LTD.,PART.',
      date: '12 พฤษภาคม 2569',
      totalPrice: 'THB68,418.84',
      items: [
        { hsCode: '841989', item: 'ถังพรีฮีต 300 ลิตร (Preheat Tank 300L)', qty: '1 ชุด', price: '51,568.84' },
        { hsCode: '853710', item: 'ตู้คอนโทรลไฟฟ้า ถังพรีฮีต (Control Box)', qty: '1 ตู้', price: '16,850.00' },
      ],
      note: '1. รับประกันอุปกรณ์ไฟฟ้าและมอเตอร์ 1 ปี\n2. ส่งมอบพร้อมทีมงานติดตั้งและทดสอบระบบหน้างาน',
    },
    {
      id: 'PC202604-09',
      contractNo: 'PC202604-09',
      customerName: 'บริษัท เอสพีที โพรเทคส์ อินดัสตรี จำกัด',
      buyerName: 'PROTEX ACCESSORY INDUSTRIAL LTD.,PART.',
      date: '28 เมษายน 2569',
      totalPrice: 'THB8,809.34',
      items: [
        { hsCode: '730890', item: "เหล็กแผ่น 4'x8' หนา 3มม.", qty: '2 แผ่น', price: '5,383.18' },
        { hsCode: '721621', item: 'เหล็กฉาก 50x50x4mm (2")', qty: '4 เส้น', price: '1,626.16' },
        { hsCode: '848180', item: 'บอลวาล์วทองเหลือง 1 นิ้ว', qty: '6 ตัว', price: '1,800.00' },
      ],
      note: '1. จัดส่งภายใน 3 วันทำการหลังยืนยันคำสั่งซื้อ\n2. ชำระเงินเมื่อส่งมอบสินค้าครบถ้วน',
    },
  ];

  let client = null;
  let databases = null;
  const docIdCache = {};

  if (global.Appwrite) {
    client = new global.Appwrite.Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);

    databases = new global.Appwrite.Databases(client);
  }

  /**
   * บันทึกข้อมูลตารางและฟอร์มของพนักงานลง Appwrite Collection (Upsert: มีแล้วอัปเดต / ยังไม่มีสร้างใหม่)
   * @param {string} employeeId รหัสพนักงาน (เช่น "1234")
   * @param {Object} data ข้อมูลตารางและฟอร์มทั้งหมด
   */
  async function saveData(employeeId, data) {
    const empKey = String(employeeId || '').trim();
    if (!empKey) return null;

    // สำรองข้อมูลลง LocalStorage ทันที (Offline-first resilience)
    try {
      localStorage.setItem(`pc_appwrite_draft_${empKey}`, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }

    if (!databases || !global.Appwrite || APPWRITE_CONFIG.projectId === 'YOUR_PROJECT_ID') {
      return null;
    }

    const { Query, ID } = global.Appwrite;
    const payload = {
      employee_id: empKey,
      draft_json: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    };

    try {
      let targetDocId = docIdCache[empKey];

      if (!targetDocId) {
        const existing = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          [Query.equal('employee_id', empKey), Query.limit(1)]
        );
        if (existing.documents && existing.documents.length > 0) {
          targetDocId = existing.documents[0].$id;
          docIdCache[empKey] = targetDocId;
        }
      }

      if (targetDocId) {
        return await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          targetDocId,
          payload
        );
      }

      const created = await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collectionId,
        ID.unique(),
        payload
      );
      docIdCache[empKey] = created.$id;
      return created;
    } catch (err) {
      console.warn('[Appwrite saveData fallback]:', err.message);
      return null;
    }
  }

  /**
   * ดึงข้อมูล Draft เดิมของพนักงานจาก Appwrite Collection ตาม employee_id
   * @param {string} employeeId รหัสพนักงาน
   * @returns {Promise<Object|null>} ข้อมูล Draft หรือ null หากเป็นพนักงานใหม่
   */
  async function loadData(employeeId) {
    const empKey = String(employeeId || '').trim();
    if (!empKey) return null;

    if (databases && global.Appwrite && APPWRITE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      const { Query } = global.Appwrite;
      try {
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          [Query.equal('employee_id', empKey), Query.limit(1)]
        );

        if (response.documents && response.documents.length > 0) {
          const doc = response.documents[0];
          docIdCache[empKey] = doc.$id;
          return typeof doc.draft_json === 'string'
            ? JSON.parse(doc.draft_json)
            : doc.draft_json || doc;
        }
        return null;
      } catch (err) {
        console.warn('[Appwrite loadData fallback]:', err.message);
      }
    }

    try {
      const localRaw = localStorage.getItem(`pc_appwrite_draft_${empKey}`);
      return localRaw ? JSON.parse(localRaw) : null;
    } catch {
      return null;
    }
  }

  /**
   * ตรวจสอบรหัสพนักงานจากตาราง Employees บน Appwrite (Table ID: 6af2e9c6003dafa5b692)
   * @param {string} employeeId รหัสพนักงาน เช่น HR0000000
   * @returns {Promise<{id: string, name: string, role: string}|null>}
   */
  async function verifyEmployee(employeeId) {
    const rawKey = String(employeeId || '').trim();
    if (!rawKey || !databases || !global.Appwrite || APPWRITE_CONFIG.databaseId === 'YOUR_DATABASE_ID') {
      return null;
    }

    const { Query } = global.Appwrite;
    const candidates = Array.from(new Set([rawKey, rawKey.toUpperCase(), rawKey.toLowerCase()]));

    for (const candidate of candidates) {
      try {
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.employeesCollectionId,
          [Query.equal('id', candidate), Query.limit(1)]
        );
        if (res && res.documents && res.documents.length > 0) {
          const emp = res.documents[0];
          return {
            id: emp.id || candidate,
            name: emp.fullname || emp.name || candidate,
            role: emp.role || emp.department || 'พนักงานโพรเทคส์',
          };
        }
      } catch {
        // Fallback to local registered map if databaseId/permissions are not yet configured
      }
    }
    return null;
  }

  /**
   * บันทึกข้อมูลสัญญาซื้อขาย (Sales Contract) ลง Appwrite + LocalStorage
   * @param {Object} contract ข้อมูลสัญญา
   */
  async function saveContract(contract) {
    if (!contract || !contract.contractNo) return null;
    const key = contract.contractNo.trim();

    // 1. LocalStorage Offline-first
    let storedList = [];
    try {
      const raw = localStorage.getItem('pc_appwrite_contracts');
      storedList = raw ? JSON.parse(raw) : [];
    } catch {
      storedList = [];
    }

    const existIdx = storedList.findIndex((c) => c.contractNo === key);
    if (existIdx >= 0) {
      storedList[existIdx] = { ...storedList[existIdx], ...contract, updated_at: new Date().toISOString() };
    } else {
      storedList.unshift({ ...contract, updated_at: new Date().toISOString() });
    }

    try {
      localStorage.setItem('pc_appwrite_contracts', JSON.stringify(storedList));
    } catch (e) {
      console.warn('LocalStorage quota warning:', e);
    }

    // 2. Appwrite Cloud
    if (databases && global.Appwrite && APPWRITE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      try {
        const { Query, ID } = global.Appwrite;
        const payload = {
          contract_no: key,
          customer_name: contract.customerName || '',
          contract_json: JSON.stringify(contract),
          updated_at: new Date().toISOString(),
        };

        const existing = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.contractsCollectionId,
          [Query.equal('contract_no', key), Query.limit(1)]
        );

        if (existing.documents && existing.documents.length > 0) {
          return await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.contractsCollectionId,
            existing.documents[0].$id,
            payload
          );
        }

        return await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.contractsCollectionId,
          ID.unique(),
          payload
        );
      } catch (err) {
        console.warn('[Appwrite saveContract fallback to local]:', err.message);
      }
    }

    return contract;
  }

  /**
   * ค้นหาสัญญาซื้อขายและประวัติลูกค้าจาก Appwrite หรือ Local Database
   * @param {string} query คำค้นหา (ชื่อลูกค้า หรือ ชื่อสินค้า/อุปกรณ์)
   * @returns {Promise<Array>} รายการสัญญาที่ตรงกับคำค้นหา
   */
  async function searchContracts(query) {
    const q = String(query || '').trim().toLowerCase();

    // รวมข้อมูล LocalStorage + Default Demo Contracts
    let localContracts = [];
    try {
      const raw = localStorage.getItem('pc_appwrite_contracts');
      localContracts = raw ? JSON.parse(raw) : [];
    } catch {
      localContracts = [];
    }

    const combinedMap = new Map();
    DEFAULT_CONTRACTS.forEach((c) => combinedMap.set(c.contractNo, c));
    localContracts.forEach((c) => combinedMap.set(c.contractNo, c));

    // ค้นหาใน Appwrite หากเชื่อมต่อแล้ว
    if (q && databases && global.Appwrite && APPWRITE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      try {
        const { Query } = global.Appwrite;
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.contractsCollectionId,
          [Query.search('customer_name', q), Query.limit(20)]
        );
        if (res && res.documents) {
          res.documents.forEach((doc) => {
            try {
              const parsed = typeof doc.contract_json === 'string' ? JSON.parse(doc.contract_json) : doc;
              combinedMap.set(doc.contract_no, parsed);
            } catch {
              // Ignore parse error
            }
          });
        }
      } catch {
        // Fallback to local filtering
      }
    }

    const all = Array.from(combinedMap.values());
    if (!q) return all;

    return all.filter((c) => {
      const cust = (c.customerName || '').toLowerCase();
      const num = (c.contractNo || '').toLowerCase();
      const itemsMatch = (c.items || []).some(
        (it) => (it.item || '').toLowerCase().includes(q) || (it.hsCode || '').toLowerCase().includes(q)
      );
      return cust.includes(q) || num.includes(q) || itemsMatch;
    });
  }

  global.PricecraftAppwrite = {
    config: APPWRITE_CONFIG,
    client,
    databases,
    saveData,
    loadData,
    verifyEmployee,
    saveContract,
    searchContracts,
    DEFAULT_CONTRACTS,
  };
  global.saveData = saveData;
  global.loadData = loadData;
  global.saveContract = saveContract;
  global.searchContracts = searchContracts;
})(window);

