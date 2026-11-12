let customersStore = [
  {
    id: 'cust-0001',
    customerCode: 'CUST-0001',
    companyName: 'บริษัท สยาม อินดัสเทรียล ฮีตติ้ง จำกัด',
    contactPerson: 'คุณสมชาย รัตนพงศ์ (ผจก.จัดซื้อ)',
    phone: '02-384-7100',
    paymentTerms: 'Credit 30 Days',
    deliveryTerms: 'จัดส่งภายใน 7-10 วันทำการ',
    address: '88/12 นิคมอุตสาหกรรมบางปู ต.แพรกษา อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10280',
    status: 'ACTIVE',
  },
  {
    id: 'cust-0002',
    customerCode: 'CUST-0002',
    companyName: 'บริษัท อีสเทิร์น โพลีเมอร์ แอนด์ แพ็คเกจจิ้ง จำกัด',
    contactPerson: 'คุณพิมพ์ชนก ทองดี (ฝ่ายวิศวกรรม)',
    phone: '038-458-920',
    paymentTerms: 'Credit 60 Days',
    deliveryTerms: 'จัดส่งภายใน 14 วันทำการ ณ โรงงานชลบุรี',
    address: '700/450 นิคมอุตสาหกรรมอมตะซิตี้ ต.คลองตำหรุ อ.เมืองชลบุรี จ.ชลบุรี 20000',
    status: 'ACTIVE',
  },
  {
    id: 'cust-0003',
    customerCode: 'CUST-0003',
    companyName: 'บริษัท ไทยออโต้ พาร์ท แมนูแฟคเจอริ่ง จำกัด',
    contactPerson: 'คุณอนุชา เกียรติศักดิ์ (Senior Buyer)',
    phone: '033-012-450',
    paymentTerms: 'Credit 30 Days',
    deliveryTerms: 'จัดส่งภายใน 7 วันทำการ ณ นิคมฯ อีสเทิร์นซีบอร์ด',
    address: '109/5 นิคมอุตสาหกรรมอีสเทิร์นซีบอร์ด ต.ปลวกแดง อ.ปลวกแดง จ.ระยอง 21140',
    status: 'ACTIVE',
  },
  {
    id: 'cust-0004',
    customerCode: 'CUST-0004',
    companyName: 'บริษัท เอเพ็กซ์ ฟู้ด โปรเซสซิ่ง จำกัด',
    contactPerson: 'คุณกัลยาณี วงศ์สวัสดิ์',
    phone: '034-821-600',
    paymentTerms: 'Cash / โอนก่อนส่ง',
    deliveryTerms: 'จัดส่งภายใน 5 วันทำการหลังรับชำระ',
    address: '55/9 ถ.พระราม 2 ต.ท่าทราย อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000',
    status: 'ACTIVE',
  },
];

let pendingDeleteCustomerId = null;

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

function updateCustomerKpis() {
  const totalEl = document.getElementById('kpiTotalCustomers');
  const activeEl = document.getElementById('kpiActiveCustomers');
  const creditEl = document.getElementById('kpiCreditCustomers');

  const activeCount = customersStore.filter((c) => c.status === 'ACTIVE').length;
  const creditCount = customersStore.filter((c) => c.paymentTerms.includes('Credit')).length;

  if (totalEl) totalEl.textContent = String(customersStore.length);
  if (activeEl) activeEl.textContent = String(activeCount);
  if (creditEl) creditEl.textContent = String(creditCount);
}

function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  const searchInput = document.getElementById('customerSearchInput');
  const paymentFilter = document.getElementById('customerPaymentFilter');
  const showingLabel = document.getElementById('customersShowingLabel');
  if (!tbody) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const paymentVal = paymentFilter?.value || 'ALL';

  const filtered = customersStore.filter((cust) => {
    const matchesPayment = paymentVal === 'ALL' || cust.paymentTerms === paymentVal;
    const matchesSearch =
      !query ||
      cust.customerCode.toLowerCase().includes(query) ||
      cust.companyName.toLowerCase().includes(query) ||
      (cust.contactPerson || '').toLowerCase().includes(query) ||
      (cust.phone || '').toLowerCase().includes(query);
    return matchesPayment && matchesSearch;
  });

  if (showingLabel) {
    showingLabel.textContent = `กำลังแสดง ${filtered.length} จากทั้งหมด ${customersStore.length} บริษัท`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state-box">
            <div class="empty-state-title">ไม่พบข้อมูลลูกค้าที่ค้นหา</div>
            <p>ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "+ เพิ่มลูกค้าใหม่" ด้านบน</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (cust) => `
      <tr data-customer-id="${escapeHtml(cust.id)}">
        <td class="doc-code fw-700 text-accent">${escapeHtml(cust.customerCode)}</td>
        <td>
          <div class="fw-600 text-primary">${escapeHtml(cust.companyName)}</div>
          <div class="text-secondary" style="font-size: var(--text-xs); margin-top: 2px;">
            ${escapeHtml(cust.address || '—')}
          </div>
        </td>
        <td class="fw-500">${escapeHtml(cust.contactPerson)}</td>
        <td class="tabular-nums fw-600">${escapeHtml(cust.phone)}</td>
        <td>
          <div class="fw-600" style="font-size: var(--text-xs); color: var(--text-primary);">
            ${escapeHtml(cust.deliveryTerms)}
          </div>
          <span class="category-chip" style="margin-top: 4px;">${escapeHtml(cust.paymentTerms)}</span>
        </td>
        <td>
          <span class="status-badge active">Active</span>
        </td>
        <td class="text-right">
          <div class="table-row-actions">
            <button
              type="button"
              class="action-icon-btn edit"
              data-action="edit"
              data-id="${escapeHtml(cust.id)}"
              title="แก้ไขข้อมูลลูกค้า"
              aria-label="แก้ไข ${escapeHtml(cust.companyName)}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button
              type="button"
              class="action-icon-btn delete"
              data-action="delete"
              data-id="${escapeHtml(cust.id)}"
              title="ลบข้อมูลลูกค้า"
              aria-label="ลบ ${escapeHtml(cust.companyName)}"
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

function generateNextCustomerCode() {
  const nextNum = customersStore.length + 1;
  return `CUST-${String(nextNum).padStart(4, '0')}`;
}

function openCustomerModal(customer = null) {
  const overlay = document.getElementById('customerModalOverlay');
  const titleEl = document.getElementById('customerModalTitle');
  const idField = document.getElementById('customerIdField');
  const codeField = document.getElementById('customerCodeField');
  const companyField = document.getElementById('customerCompanyField');
  const contactField = document.getElementById('customerContactField');
  const phoneField = document.getElementById('customerPhoneField');
  const paymentField = document.getElementById('customerPaymentField');
  const deliveryField = document.getElementById('customerDeliveryField');
  const addressField = document.getElementById('customerAddressField');

  if (!overlay) return;
  overlay.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

  if (customer) {
    titleEl.textContent = `แก้ไขข้อมูลลูกค้า (${customer.customerCode})`;
    idField.value = customer.id;
    codeField.value = customer.customerCode;
    companyField.value = customer.companyName;
    contactField.value = customer.contactPerson;
    phoneField.value = customer.phone;
    paymentField.value = customer.paymentTerms;
    deliveryField.value = customer.deliveryTerms;
    addressField.value = customer.address || '';
  } else {
    titleEl.textContent = 'เพิ่มข้อมูลลูกค้าใหม่';
    idField.value = '';
    codeField.value = generateNextCustomerCode();
    companyField.value = '';
    contactField.value = '';
    phoneField.value = '';
    paymentField.value = 'Credit 30 Days';
    deliveryField.value = 'จัดส่งภายใน 7-10 วันทำการ';
    addressField.value = '';
  }

  overlay.classList.add('is-open');
  setTimeout(() => companyField?.focus(), 60);
}

function closeCustomerModal() {
  document.getElementById('customerModalOverlay')?.classList.remove('is-open');
}

function openDeleteModal(customer) {
  const overlay = document.getElementById('deleteCustomerModalOverlay');
  const nameEl = document.getElementById('deleteCustomerTargetName');
  if (!overlay || !customer) return;

  pendingDeleteCustomerId = customer.id;
  if (nameEl) nameEl.textContent = `${customer.customerCode} — ${customer.companyName}`;
  overlay.classList.add('is-open');
}

function closeDeleteModal() {
  pendingDeleteCustomerId = null;
  document.getElementById('deleteCustomerModalOverlay')?.classList.remove('is-open');
}

function handleCustomerFormSubmit(event) {
  event.preventDefault();

  const idField = document.getElementById('customerIdField');
  const codeField = document.getElementById('customerCodeField');
  const companyField = document.getElementById('customerCompanyField');
  const contactField = document.getElementById('customerContactField');
  const phoneField = document.getElementById('customerPhoneField');
  const paymentField = document.getElementById('customerPaymentField');
  const deliveryField = document.getElementById('customerDeliveryField');
  const addressField = document.getElementById('customerAddressField');

  const code = codeField.value.trim().toUpperCase();
  const companyName = companyField.value.trim();
  const contactPerson = contactField.value.trim();
  const phone = phoneField.value.trim();
  const deliveryTerms = deliveryField.value.trim();

  let valid = true;
  [
    [codeField, code],
    [companyField, companyName],
    [contactField, contactPerson],
    [phoneField, phone],
    [deliveryField, deliveryTerms],
  ].forEach(([el, val]) => {
    if (!val) {
      el.classList.add('is-invalid');
      valid = false;
    } else {
      el.classList.remove('is-invalid');
    }
  });

  if (!valid) {
    showToast('กรุณากรอกข้อมูลลูกค้าที่มีเครื่องหมาย * ให้ครบถ้วน', 'error');
    return;
  }

  const editingId = idField.value;
  if (editingId) {
    const idx = customersStore.findIndex((c) => c.id === editingId);
    if (idx !== -1) {
      customersStore[idx] = {
        ...customersStore[idx],
        customerCode: code,
        companyName,
        contactPerson,
        phone,
        paymentTerms: paymentField.value,
        deliveryTerms,
        address: addressField.value.trim(),
      };
      showToast(`อัปเดตข้อมูลลูกค้า ${companyName} เรียบร้อยแล้ว`, 'success');
    }
  } else {
    customersStore.unshift({
      id: `cust-${Date.now()}`,
      customerCode: code,
      companyName,
      contactPerson,
      phone,
      paymentTerms: paymentField.value,
      deliveryTerms,
      address: addressField.value.trim(),
      status: 'ACTIVE',
    });
    showToast(`เพิ่มลูกค้าใหม่ ${companyName} สำเร็จ`, 'success');
  }

  closeCustomerModal();
  updateCustomerKpis();
  renderCustomersTable();
}

function initCustomersPage() {
  updateCustomerKpis();
  renderCustomersTable();

  document.getElementById('openAddCustomerModalBtn')?.addEventListener('click', () => openCustomerModal(null));
  document.getElementById('closeCustomerModalBtn')?.addEventListener('click', closeCustomerModal);
  document.getElementById('cancelCustomerModalBtn')?.addEventListener('click', closeCustomerModal);
  document.getElementById('customerForm')?.addEventListener('submit', handleCustomerFormSubmit);

  document.getElementById('customerSearchInput')?.addEventListener('input', renderCustomersTable);
  document.getElementById('customerPaymentFilter')?.addEventListener('change', renderCustomersTable);

  document.getElementById('customersTableBody')?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const customer = customersStore.find((c) => c.id === btn.dataset.id);
    if (!customer) return;

    if (btn.dataset.action === 'edit') {
      openCustomerModal(customer);
    } else if (btn.dataset.action === 'delete') {
      openDeleteModal(customer);
    }
  });

  document.getElementById('cancelDeleteCustomerBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteCustomerBtn')?.addEventListener('click', () => {
    if (!pendingDeleteCustomerId) return;
    const target = customersStore.find((c) => c.id === pendingDeleteCustomerId);
    customersStore = customersStore.filter((c) => c.id !== pendingDeleteCustomerId);
    closeDeleteModal();
    updateCustomerKpis();
    renderCustomersTable();
    showToast(`ลบข้อมูลลูกค้า ${target?.companyName || ''} เรียบร้อยแล้ว`, 'warning');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomerModal();
      closeDeleteModal();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomersPage);
  } else {
    initCustomersPage();
  }
}
