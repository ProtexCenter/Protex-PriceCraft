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
    databaseId: env.VITE_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID',    // <-- ใส่ Database ID ของคุณ
    collectionId: env.VITE_APPWRITE_COLLECTION_ID || 'user_drafts',     // <-- ชื่อ Collection
  };

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

  global.PricecraftAppwrite = {
    config: APPWRITE_CONFIG,
    client,
    databases,
    saveData,
    loadData,
  };
  global.saveData = saveData;
  global.loadData = loadData;
})(window);

