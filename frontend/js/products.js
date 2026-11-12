const { formatCurrency } = (typeof window !== 'undefined' && window.PricecraftCalc)
  ? window.PricecraftCalc
  : require('./cost-calculator.js');

let productsStore = [
  {
    id: 'prod-0001',
    productCode: 'HT-SP-1208',
    name: 'ลวดฮีตเตอร์พันสปริง (Coil Spring Heater Wire)',
    category: 'Industrial Heater',
    specification: 'Dia. 1.2 × OD 8.1 × 3180 mm | 220V 2000W พร้อมขั้วเซรามิก',
    unit: 'เส้น',
    standardUnitCost: '1500.00',
    defaultWhtApplicable: false,
    status: 'ACTIVE',
  },
  {
    id: 'prod-0002',
    productCode: 'HT-TB-5000',
    name: 'ฮีตเตอร์แท่งสแตนเลส (Tubular Finned Heater SUS316L)',
    category: 'Tubular Heater',
    specification: 'Tube Dia. 11 × L 1200 mm (U-Shape) | 380V 3-Phase 4500W หน้าแปลน JIS 10K',
    unit: 'ชุด',
    standardUnitCost: '5000.00',
    defaultWhtApplicable: true,
    status: 'ACTIVE',
  },
  {
    id: 'prod-0003',
    productCode: 'TC-K-0450',
    name: 'เทอร์โมคัปเปิล Type K พร้อมหัวกะโหลก (Thermocouple Sensor)',
    category: 'Temperature Sensor',
    specification: 'Probe Dia. 8.0 × L 450 mm SUS316 | เกลียว PT 1/2" (0-1100 °C)',
    unit: 'ตัว',
    standardUnitCost: '850.00',
    defaultWhtApplicable: false,
    status: 'ACTIVE',
  },
  {
    id: 'prod-0004',
    productCode: 'HT-BD-2400',
    name: 'ฮีตเตอร์รัดท่อไมก้าสแตนเลส (Mica Band Heater)',
    category: 'Industrial Heater',
    specification: 'ID 180 × H 95 mm | 220V 1800W ออกสายปลั๊กเซรามิก',
    unit: 'ชิ้น',
    standardUnitCost: '1250.00',
    defaultWhtApplicable: false,
    status: 'ACTIVE',
  },
  {
    id: 'prod-0005',
    productCode: 'CP-PID-030',
    name: 'ตู้คอนโทรลควบคุมอุณหภูมิระบบดิจิทัล PID + SSR',
    category: 'Control Panel',
    specification: '380V 30A Digital PID Controller พร้อม Solid State Relay & Alarm',
    unit: 'ตู้',
    standardUnitCost: '14800.00',
    defaultWhtApplicable: true,
    status: 'ACTIVE',
  },
];

let pendingDeleteProductId = null;
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast-card ${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function updateProductKpis() {
  const totalEl = document.getElementById('kpiTotalProducts');
  const activeEl = document.getElementById('kpiActiveProducts');
  const catEl = document.getElementById('kpiCategoryCount');
  const whtEl = document.getElementById('kpiWhtProducts');

  const activeCount = productsStore.filter((p) => p.status === 'ACTIVE').length;
  const uniqueCategories = new Set(productsStore.map((p) => p.category)).size;
  const whtCount = productsStore.filter((p) => p.defaultWhtApplicable).length;

  if (totalEl) totalEl.textContent = String(productsStore.length);
  if (activeEl) activeEl.textContent = String(activeCount);
  if (catEl) catEl.textContent = String(uniqueCategories);
  if (whtEl) whtEl.textContent = String(whtCount);
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const searchInput = document.getElementById('productSearchInput');
  const categoryFilter = document.getElementById('productCategoryFilter');
  const showingLabel = document.getElementById('productsShowingLabel');
  if (!tbody) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCat = categoryFilter?.value || 'ALL';

  const filtered = productsStore.filter((item) => {
    const matchesCategory = selectedCat === 'ALL' || item.category === selectedCat;
    const matchesSearch =
      !query ||
      item.productCode.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.specification || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (showingLabel) {
    showingLabel.textContent = `กำลังแสดง ${filtered.length} จากทั้งหมด ${productsStore.length} รายการ`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state-box">
            <div class="empty-state-title">ไม่พบรายการสินค้าที่ค้นหา</div>
            <p>ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "+ เพิ่มสินค้าใหม่" ด้านบน</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (item) => `
      <tr data-product-id="${escapeHtml(item.id)}">
        <td class="doc-code fw-700 text-accent">${escapeHtml(item.productCode)}</td>
        <td>
          <div class="fw-600 text-primary">${escapeHtml(item.name)}</div>
          <div class="text-secondary" style="font-size: var(--text-xs); margin-top: 2px;">
            ${escapeHtml(item.specification || '—')}
          </div>
        </td>
        <td>
          <span class="category-chip">${escapeHtml(item.category)}</span>
        </td>
        <td class="text-center fw-500">${escapeHtml(item.unit)}</td>
        <td class="text-right tabular-nums fw-700" style="font-size: var(--text-base);">
          ${formatCurrency(item.standardUnitCost)}
        </td>
        <td>
          <span class="status-badge active">พร้อมใช้งาน</span>
        </td>
        <td class="text-right">
          <div class="table-row-actions">
            <button
              type="button"
              class="action-icon-btn edit"
              data-action="edit"
              data-id="${escapeHtml(item.id)}"
              title="แก้ไขสินค้า"
              aria-label="แก้ไข ${escapeHtml(item.name)}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button
              type="button"
              class="action-icon-btn delete"
              data-action="delete"
              data-id="${escapeHtml(item.id)}"
              title="ลบสินค้า"
              aria-label="ลบ ${escapeHtml(item.name)}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');
}

function openProductModal(product = null) {
  const overlay = document.getElementById('productModalOverlay');
  const titleEl = document.getElementById('productModalTitle');
  const idField = document.getElementById('productIdField');
  const codeField = document.getElementById('productCodeField');
  const catField = document.getElementById('productCategoryField');
  const nameField = document.getElementById('productNameField');
  const unitField = document.getElementById('productUnitField');
  const costField = document.getElementById('productUnitCostField');
  const specField = document.getElementById('productSpecField');

  if (!overlay) return;

  overlay.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

  if (product) {
    titleEl.textContent = `แก้ไขข้อมูลสินค้า (${product.productCode})`;
    idField.value = product.id;
    codeField.value = product.productCode;
    catField.value = product.category;
    nameField.value = product.name;
    unitField.value = product.unit;
    costField.value = product.standardUnitCost;
    specField.value = product.specification || '';
  } else {
    titleEl.textContent = 'เพิ่มสินค้าใหม่เข้าฐานข้อมูล';
    idField.value = '';
    codeField.value = '';
    catField.value = 'Industrial Heater';
    nameField.value = '';
    unitField.value = 'ชิ้น';
    costField.value = '';
    specField.value = '';
  }

  overlay.classList.add('is-open');
  setTimeout(() => codeField?.focus(), 60);
}

function closeProductModal() {
  document.getElementById('productModalOverlay')?.classList.remove('is-open');
}

function openDeleteModal(product) {
  const overlay = document.getElementById('deleteProductModalOverlay');
  const nameEl = document.getElementById('deleteProductTargetName');
  if (!overlay || !product) return;

  pendingDeleteProductId = product.id;
  if (nameEl) nameEl.textContent = `${product.productCode} — ${product.name}`;
  overlay.classList.add('is-open');
}

function closeDeleteModal() {
  pendingDeleteProductId = null;
  document.getElementById('deleteProductModalOverlay')?.classList.remove('is-open');
}

function handleProductFormSubmit(event) {
  event.preventDefault();

  const idField = document.getElementById('productIdField');
  const codeField = document.getElementById('productCodeField');
  const catField = document.getElementById('productCategoryField');
  const nameField = document.getElementById('productNameField');
  const unitField = document.getElementById('productUnitField');
  const costField = document.getElementById('productUnitCostField');
  const specField = document.getElementById('productSpecField');

  const code = codeField.value.trim().toUpperCase();
  const name = nameField.value.trim();
  const unit = unitField.value.trim();
  const costRaw = costField.value.trim();
  const costNum = Number(costRaw);

  let valid = true;
  if (!code) {
    codeField.classList.add('is-invalid');
    valid = false;
  } else {
    codeField.classList.remove('is-invalid');
  }

  if (!name) {
    nameField.classList.add('is-invalid');
    valid = false;
  } else {
    nameField.classList.remove('is-invalid');
  }

  if (!unit) {
    unitField.classList.add('is-invalid');
    valid = false;
  } else {
    unitField.classList.remove('is-invalid');
  }

  if (costRaw === '' || isNaN(costNum) || costNum < 0) {
    costField.classList.add('is-invalid');
    valid = false;
  } else {
    costField.classList.remove('is-invalid');
  }

  if (!valid) {
    showToast('กรุณากรอกข้อมูลที่จำเป็นและตรวจสอบราคาต้นทุนให้ถูกต้อง', 'error');
    return;
  }

  const editingId = idField.value;
  if (editingId) {
    const idx = productsStore.findIndex((p) => p.id === editingId);
    if (idx !== -1) {
      productsStore[idx] = {
        ...productsStore[idx],
        productCode: code,
        name,
        category: catField.value,
        unit,
        standardUnitCost: costNum.toFixed(2),
        specification: specField.value.trim(),
      };
      showToast(`อัปเดตข้อมูลสินค้า ${code} เรียบร้อยแล้ว`, 'success');
    }
  } else {
    // Check duplicate productCode
    if (productsStore.some((p) => p.productCode.toUpperCase() === code)) {
      codeField.classList.add('is-invalid');
      showToast(`รหัสสินค้า ${code} มีอยู่ในระบบแล้ว`, 'error');
      return;
    }

    productsStore.unshift({
      id: `prod-${Date.now()}`,
      productCode: code,
      name,
      category: catField.value,
      unit,
      standardUnitCost: costNum.toFixed(2),
      specification: specField.value.trim(),
      defaultWhtApplicable: false,
      status: 'ACTIVE',
    });
    showToast(`เพิ่มสินค้าใหม่ ${code} เข้าสู่ระบบสำเร็จ`, 'success');
  }

  closeProductModal();
  updateProductKpis();
  renderProductsTable();
}

function initProductsPage() {
  updateProductKpis();
  renderProductsTable();

  document.getElementById('openAddProductModalBtn')?.addEventListener('click', () => openProductModal(null));
  document.getElementById('closeProductModalBtn')?.addEventListener('click', closeProductModal);
  document.getElementById('cancelProductModalBtn')?.addEventListener('click', closeProductModal);
  document.getElementById('productForm')?.addEventListener('submit', handleProductFormSubmit);

  document.getElementById('productSearchInput')?.addEventListener('input', renderProductsTable);
  document.getElementById('productCategoryFilter')?.addEventListener('change', renderProductsTable);

  document.getElementById('productsTableBody')?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const product = productsStore.find((p) => p.id === btn.dataset.id);
    if (!product) return;

    if (btn.dataset.action === 'edit') {
      openProductModal(product);
    } else if (btn.dataset.action === 'delete') {
      openDeleteModal(product);
    }
  });

  document.getElementById('cancelDeleteProductBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteProductBtn')?.addEventListener('click', () => {
    if (!pendingDeleteProductId) return;
    const target = productsStore.find((p) => p.id === pendingDeleteProductId);
    productsStore = productsStore.filter((p) => p.id !== pendingDeleteProductId);
    closeDeleteModal();
    updateProductKpis();
    renderProductsTable();
    showToast(`ลบรายการสินค้า ${target?.productCode || ''} เรียบร้อยแล้ว`, 'warning');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeDeleteModal();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductsPage);
  } else {
    initProductsPage();
  }
}
