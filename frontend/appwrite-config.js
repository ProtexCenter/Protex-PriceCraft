(function initAppwriteConfig(global) {
  'use strict';

  const env = global.__ENV__ || {};
  const APPWRITE_CONFIG = {
    endpoint: env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
    projectId: env.VITE_APPWRITE_PROJECT_ID || '6af2e5a000218106d920',
    databaseId: env.VITE_APPWRITE_DATABASE_ID || 'ProtexNewsDB',
    collectionId: env.VITE_APPWRITE_COLLECTION_ID || 'user_drafts',
    employeesCollectionId: env.VITE_APPWRITE_EMPLOYEES_COLLECTION_ID || '6af2e9c6003dafa5b692',
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

  async function saveData(employeeId, data) {
    const empKey = String(employeeId || '').trim();
    if (!empKey) return null;

    try {
      localStorage.setItem(`pc_appwrite_draft_${empKey}`, JSON.stringify(data));
    } catch {
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

  async function verifyEmployee(employeeId) {
    const rawKey = String(employeeId || '').trim();
    if (!rawKey) return null;
    const lowerKey = rawKey.toLowerCase();

    // 1. Check Appwrite Cloud Database (ProtexNewsDB -> Employees 6af2e9c6003dafa5b692)
    if (databases && global.Appwrite && APPWRITE_CONFIG.databaseId && APPWRITE_CONFIG.databaseId !== 'YOUR_DATABASE_ID') {
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
              id: emp.id || emp.emp_id || candidate,
              name: emp.fullname || emp.full_name || emp.name || candidate,
              role: emp.role || emp.category || emp.department || 'พนักงานโพรเทคส์',
            };
          }
        } catch {
          // If 'id' attribute is not indexed, fallback to full list scan below
          break;
        }
      }

      // Fallback: Fetch employee list without filter (works even when 'id' index is not created in Appwrite)
      try {
        const listRes = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.employeesCollectionId,
          Query ? [Query.limit(100)] : []
        );
        if (listRes && Array.isArray(listRes.documents)) {
          const matchedDoc = listRes.documents.find((doc) => {
            const docCode = String(doc.id || doc.emp_id || doc.$id || '').trim().toLowerCase();
            return docCode === lowerKey;
          });
          if (matchedDoc) {
            return {
              id: matchedDoc.id || matchedDoc.emp_id || rawKey.toUpperCase(),
              name: matchedDoc.fullname || matchedDoc.full_name || matchedDoc.name || rawKey.toUpperCase(),
              role: matchedDoc.role || matchedDoc.category || matchedDoc.department || 'พนักงานโพรเทคส์',
            };
          }
        }
      } catch {
        // Fallback to local cache if offline or CORS restricted
      }
    }

    // 2. Check LocalStorage Employee Cache (if synced on same browser)
    try {
      const cachedRaw = localStorage.getItem('protex_appwrite_employees_v2');
      if (cachedRaw) {
        const cachedList = JSON.parse(cachedRaw);
        if (Array.isArray(cachedList)) {
          const foundLocal = cachedList.find(
            (e) => String(e.id || e.emp_id || '').trim().toLowerCase() === lowerKey
          );
          if (foundLocal) {
            return {
              id: foundLocal.id || foundLocal.emp_id || rawKey.toUpperCase(),
              name: foundLocal.fullname || foundLocal.full_name || foundLocal.name || rawKey.toUpperCase(),
              role: foundLocal.role || foundLocal.category || 'พนักงานโพรเทคส์',
            };
          }
        }
      }
    } catch {
      // Ignore storage errors
    }

    return null;
  }

  async function saveContract(contract) {
    if (!contract || !contract.contractNo) return null;
    const key = contract.contractNo.trim();
    const customerName = (contract.buyerName || contract.customerName || '').trim();
    const normalizedContract = {
      ...contract,
      contractNo: key,
      customerName,
      buyerName: customerName,
      items: Array.isArray(contract.items) ? contract.items : [],
      updated_at: new Date().toISOString(),
    };

    let storedList = [];
    try {
      const raw = localStorage.getItem('pc_appwrite_contracts');
      storedList = raw ? JSON.parse(raw) : [];
    } catch {
      storedList = [];
    }

    const existIdx = storedList.findIndex((c) => c.contractNo === key);
    if (existIdx >= 0) {
      storedList[existIdx] = { ...storedList[existIdx], ...normalizedContract };
    } else {
      storedList.unshift(normalizedContract);
    }

    try {
      localStorage.setItem('pc_appwrite_contracts', JSON.stringify(storedList));
    } catch (e) {
      console.warn('LocalStorage quota warning:', e);
    }

    if (databases && global.Appwrite && APPWRITE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      try {
        const { Query, ID } = global.Appwrite;
        const payload = {
          contract_no: key,
          customer_name: customerName,
          contract_json: JSON.stringify(normalizedContract),
          updated_at: normalizedContract.updated_at,
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

    return normalizedContract;
  }

  async function fetchAllContractsMerged() {
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

    if (databases && global.Appwrite && APPWRITE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      try {
        const { Query } = global.Appwrite;
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.contractsCollectionId,
          [Query.limit(100)]
        );
        if (res && res.documents) {
          res.documents.forEach((doc) => {
            try {
              const parsed = typeof doc.contract_json === 'string' ? JSON.parse(doc.contract_json) : doc;
              if (doc.contract_no) {
                combinedMap.set(doc.contract_no, parsed);
              }
            } catch {
              // Ignore parse error
            }
          });
        }
      } catch {
        // Fallback to local
      }
    }

    return Array.from(combinedMap.values());
  }

  async function searchContracts(query) {
    const q = String(query || '').trim().toLowerCase();
    const all = await fetchAllContractsMerged();
    if (!q) return all;

    return all.filter((c) => {
      const cust = (c.buyerName || c.customerName || '').toLowerCase();
      const num = (c.contractNo || '').toLowerCase();
      const itemsMatch = (c.items || []).some(
        (it) => (it.item || '').toLowerCase().includes(q) || (it.hsCode || '').toLowerCase().includes(q)
      );
      return cust.includes(q) || num.includes(q) || itemsMatch;
    });
  }

  async function searchCustomersByProduct(productQuery) {
    const q = String(productQuery || '').trim().toLowerCase();
    const all = await fetchAllContractsMerged();
    const results = [];

    all.forEach((c) => {
      const items = Array.isArray(c.items) ? c.items : [];
      const matchedItems = q
        ? items.filter(
          (it) =>
            (it.item || '').toLowerCase().includes(q) ||
            (it.hsCode || '').toLowerCase().includes(q)
        )
        : items;

      const custName = c.buyerName || c.customerName || 'ไม่ระบุชื่อลูกค้า';
      const custOrNoMatch =
        q &&
        (custName.toLowerCase().includes(q) ||
          (c.contractNo || '').toLowerCase().includes(q));

      if (matchedItems.length > 0 || custOrNoMatch) {
        results.push({
          customerName: custName,
          contractNo: c.contractNo || 'N/A',
          date: c.date || '-',
          totalCny: c.totalCny || '',
          matchedItems: matchedItems.length > 0 ? matchedItems : items,
          isProductMatch: Boolean(q && matchedItems.length > 0),
          contract: c,
        });
      }
    });

    return results;
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
    searchCustomersByProduct,
    DEFAULT_CONTRACTS,
  };
  global.saveData = saveData;
  global.loadData = loadData;
  global.saveContract = saveContract;
  global.searchContracts = searchContracts;
  global.searchCustomersByProduct = searchCustomersByProduct;
})(window);

