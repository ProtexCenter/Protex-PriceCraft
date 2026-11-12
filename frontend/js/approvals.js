const {
  calculateDocumentSummary,
  formatCurrency,
} = (typeof window !== 'undefined' && window.PricecraftCalc)
  ? window.PricecraftCalc
  : require('./cost-calculator.js');

let activeStatusFilter = 'PENDING_APPROVAL';
let pendingActionDocId = null;

let approvalDocuments = [
  {
    id: 'req-202611-0001',
    documentNumber: 'PC-202611-0001',
    documentDate: '2026-11-12',
    customerName: 'บริษัท สยาม อินดัสเทรียล ฮีตติ้ง จำกัด',
    customerCode: 'CUST-0001',
    requesterName: 'นภัสสร ศรีสุวรรณ',
    department: 'Industrial Sales',
    deliveryTerms: 'จัดส่งภายใน 7-10 วันทำการ',
    status: 'PENDING_APPROVAL',
    shippingCharge: '500.00',
    discountAmount: '0.00',
    vatRate: '7',
    decisionComment: '',
    decidedBy: '',
    decidedAt: '',
    items: [
      {
        productCode: 'HT-SP-1208',
        productName: 'ลวดฮีตเตอร์พันสปริง (Coil Spring Heater Wire)',
        specification: 'Dia. 1.2 × OD 8.1 × 3180 mm | 220V 2000W',
        quantity: '15',
        unit: 'เส้น',
        unitCost: '1500.00',
        wht3Applicable: false,
      },
      {
        productCode: 'HT-TB-5000',
        productName: 'ฮีตเตอร์แท่งสแตนเลส (Tubular Finned Heater SUS316L)',
        specification: 'Tube Dia. 11 × L 1200 mm (U-Shape) | 380V 4500W',
        quantity: '8',
        unit: 'ชุด',
        unitCost: '5000.00',
        wht3Applicable: false,
      },
    ],
  },
  {
    id: 'req-202611-0002',
    documentNumber: 'PC-202611-0002',
    documentDate: '2026-11-12',
    customerName: 'บริษัท อีสเทิร์น โพลีเมอร์ แอนด์ แพ็คเกจจิ้ง จำกัด',
    customerCode: 'CUST-0002',
    requesterName: 'ธนากร เจริญผล',
    department: 'Industrial Sales',
    deliveryTerms: 'จัดส่งภายใน 14 วันทำการ ณ โรงงานชลบุรี',
    status: 'PENDING_APPROVAL',
    shippingCharge: '800.00',
    discountAmount: '1000.00',
    vatRate: '7',
    decisionComment: '',
    decidedBy: '',
    decidedAt: '',
    items: [
      {
        productCode: 'CP-PID-030',
        productName: 'ตู้คอนโทรลควบคุมอุณหภูมิระบบดิจิทัล PID + SSR',
        specification: '380V 30A Digital PID Controller พร้อม Solid State Relay',
        quantity: '2',
        unit: 'ตู้',
        unitCost: '14800.00',
        wht3Applicable: true,
      },
      {
        productCode: 'TC-K-0450',
        productName: 'เทอร์โมคัปเปิล Type K พร้อมหัวกะโหลก (Thermocouple Sensor)',
        specification: 'Probe Dia. 8.0 × L 450 mm SUS316 | PT 1/2"',
        quantity: '10',
        unit: 'ตัว',
        unitCost: '850.00',
        wht3Applicable: false,
      },
    ],
  },
  {
    id: 'req-202611-0003',
    documentNumber: 'PC-202611-0003',
    documentDate: '2026-11-11',
    customerName: 'บริษัท ไทยออโต้ พาร์ท แมนูแฟคเจอริ่ง จำกัด',
    customerCode: 'CUST-0003',
    requesterName: 'นภัสสร ศรีสุวรรณ',
    department: 'Industrial Sales',
    deliveryTerms: 'จัดส่งภายใน 7 วันทำการ',
    status: 'PENDING_APPROVAL',
    shippingCharge: '0.00',
    discountAmount: '0.00',
    vatRate: '7',
    decisionComment: '',
    decidedBy: '',
    decidedAt: '',
    items: [
      {
        productCode: 'HT-BD-2400',
        productName: 'ฮีตเตอร์รัดท่อไมก้าสแตนเลส (Mica Band Heater)',
        specification: 'ID 180 × H 95 mm | 220V 1800W',
        quantity: '20',
        unit: 'ชิ้น',
        unitCost: '1250.00',
        wht3Applicable: false,
      },
    ],
  },
  {
    id: 'req-202611-0000',
    documentNumber: 'PC-202611-0000',
    documentDate: '2026-11-10',
    customerName: 'บริษัท เอเพ็กซ์ ฟู้ด โปรเซสซิ่ง จำกัด',
    customerCode: 'CUST-0004',
    requesterName: 'ธนากร เจริญผล',
    department: 'Industrial Sales',
    deliveryTerms: 'จัดส่งภายใน 5 วันทำการ',
    status: 'APPROVED',
    shippingCharge: '350.00',
    discountAmount: '0.00',
    vatRate: '7',
    decisionComment: 'อนุมัติราคาต้นทุนตามมาตรฐานวิศวกรรม',
    decidedBy: 'วิชัย พิทักษ์กิจ (Costing Manager)',
    decidedAt: '10 พ.ย. 2026 16:40 น.',
    items: [
      {
        productCode: 'TC-K-0450',
        productName: 'เทอร์โมคัปเปิล Type K พร้อมหัวกะโหลก',
        specification: 'Probe Dia. 8.0 × L 450 mm SUS316',
        quantity: '12',
        unit: 'ตัว',
        unitCost: '850.00',
        wht3Applicable: false,
      },
    ],
  },
];

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
  }, 3500);
}

function getEnrichedDocuments() {
  return approvalDocuments.map((doc) => {
    const calc = calculateDocumentSummary({
      rows: doc.items,
      shippingCharge: doc.shippingCharge,
      discountAmount: doc.discountAmount,
      vatRate: doc.vatRate,
    });
    return {
      ...doc,
      calc,
    };
  });
}

function getStatusBadgeMarkup(status) {
  if (status === 'PENDING_APPROVAL') {
    return '<span class="status-badge pending">รออนุมัติ (Pending)</span>';
  }
  if (status === 'APPROVED') {
    return '<span class="status-badge approved">อนุมัติแล้ว (Approved)</span>';
  }
  return '<span class="status-badge rejected">ปฏิเสธ / ส่งกลับแก้ไข</span>';
}

function updateApprovalKpis(enrichedDocs) {
  const pendingDocs = enrichedDocs.filter((d) => d.status === 'PENDING_APPROVAL');
  const approvedDocs = enrichedDocs.filter((d) => d.status === 'APPROVED');
  const rejectedDocs = enrichedDocs.filter((d) => d.status === 'REJECTED' || d.status === 'RETURNED');

  const pendingValueSum = pendingDocs.reduce(
    (sum, doc) => sum + Number(doc.calc.grandTotal || 0),
    0
  );

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  setText('kpiPendingCount', pendingDocs.length);
  setText('kpiApprovedCount', approvedDocs.length);
  setText('kpiRejectedCount', rejectedDocs.length);
  setText('kpiPendingValue', formatCurrency(pendingValueSum.toFixed(2)));

  setText('sidebarPendingBadge', pendingDocs.length);
  setText('tabCountPending', pendingDocs.length);
  setText('tabCountApproved', approvedDocs.length);
  setText('tabCountRejected', rejectedDocs.length);
  setText('tabCountAll', enrichedDocs.length);
}

function renderApprovalCards() {
  const container = document.getElementById('approvalCardsContainer');
  const searchInput = document.getElementById('approvalSearchInput');
  if (!container) return;

  const enriched = getEnrichedDocuments();
  updateApprovalKpis(enriched);

  const query = (searchInput?.value || '').trim().toLowerCase();

  const filtered = enriched.filter((doc) => {
    const matchesStatus =
      activeStatusFilter === 'ALL' ||
      (activeStatusFilter === 'REJECTED'
        ? doc.status === 'REJECTED' || doc.status === 'RETURNED'
        : doc.status === activeStatusFilter);

    const matchesQuery =
      !query ||
      doc.documentNumber.toLowerCase().includes(query) ||
      doc.customerName.toLowerCase().includes(query) ||
      doc.requesterName.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="master-table-card">
        <div class="empty-state-box">
          <div class="empty-state-title">ไม่มีรายการเอกสารในหมวดหมู่นี้</div>
          <p>เอกสารที่ได้รับการพิจารณาแล้วจะย้ายไปยังแท็บสถานะที่เกี่ยวข้องโดยอัตโนมัติ</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((doc) => {
      const itemsHtml = doc.calc.rows
        .map(
          (row, idx) => `
          <div class="preview-item-row">
            <span>
              <strong class="doc-code text-accent">${idx + 1}. [${escapeHtml(row.productCode)}]</strong>
              <strong class="text-primary">${escapeHtml(row.productName)}</strong>
              <span class="text-muted">(${escapeHtml(row.specification)})</span>
            </span>
            <span class="tabular-nums fw-600 text-primary">
              ${escapeHtml(row.quantity)} ${escapeHtml(row.unit)} × ${formatCurrency(row.unitCost)} = <strong>${row.lineTotalFormatted} ฿</strong>
            </span>
          </div>
        `
        )
        .join('');

      const decisionHistoryHtml = doc.decisionComment
        ? `
          <div style="margin-top: 10px; padding: 10px 14px; border-radius: var(--radius-sm); background: ${doc.status === 'APPROVED' ? '#ECFDF5' : '#FEF2F2'
        }; font-size: var(--text-xs); color: ${doc.status === 'APPROVED' ? '#065F46' : '#991B1B'};">
            <strong>ผลการพิจารณา (${escapeHtml(doc.decidedBy || 'Manager')} • ${escapeHtml(doc.decidedAt)}):</strong>
            ${escapeHtml(doc.decisionComment)}
          </div>
        `
        : '';

      const actionButtonsHtml =
        doc.status === 'PENDING_APPROVAL'
          ? `
            <div class="approval-decision-btns">
              <button
                type="button"
                class="btn btn-danger-outline"
                data-action="reject"
                data-id="${escapeHtml(doc.id)}"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>ปฏิเสธ / ส่งกลับแก้ไข (Reject)</span>
              </button>
              <button
                type="button"
                class="btn btn-emerald"
                data-action="approve"
                data-id="${escapeHtml(doc.id)}"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>อนุมัติเอกสาร (Approve)</span>
              </button>
            </div>
          `
          : `
            <div class="approval-decision-btns">
              <a href="cost-create.html" class="btn btn-secondary btn-sm">เปิดดู / พิมพ์เอกสาร A4</a>
            </div>
          `;

      return `
        <article class="approval-doc-card status-${escapeHtml(doc.status)} animate-row-in" data-doc-id="${escapeHtml(doc.id)}">
          <div class="approval-card-top">
            <div class="approval-doc-meta">
              <div class="approval-doc-number doc-code">
                <span>${escapeHtml(doc.documentNumber)}</span>
                ${getStatusBadgeMarkup(doc.status)}
              </div>
              <div class="approval-customer-title">${escapeHtml(doc.customerName)}</div>
              <div class="approval-requester-line">
                <span>ผู้ขออนุมัติ: <strong class="text-primary">${escapeHtml(doc.requesterName)}</strong> (${escapeHtml(doc.department)})</span>
                <span>•</span>
                <span>วันที่เอกสาร: <strong class="tabular-nums">${escapeHtml(doc.documentDate)}</strong></span>
                <span>•</span>
                <span>การส่งมอบ: ${escapeHtml(doc.deliveryTerms)}</span>
              </div>
            </div>

            <div class="approval-amount-block">
              <div class="approval-amount-label">ยอดรวมสุทธิ (Grand Total)</div>
              <div class="approval-amount-total tabular-nums">${doc.calc.grandTotalFormatted} <span style="font-size: var(--text-xs); color: var(--accent-emerald);">THB</span></div>
            </div>
          </div>

          <div class="approval-items-preview">
            ${itemsHtml}
          </div>

          ${decisionHistoryHtml}

          <div class="approval-card-bottom">
            <div class="approval-breakdown-pills tabular-nums">
              <span>ยอดรวมสินค้า: <strong>${doc.calc.subtotalFormatted} ฿</strong></span>
              <span>•</span>
              <span>ส่วนลด: <strong>${doc.calc.discountFormatted} ฿</strong></span>
              <span>•</span>
              <span>VAT 7%: <strong class="text-accent">${doc.calc.vatFormatted} ฿</strong></span>
              <span>•</span>
              <span>ค่าขนส่ง: <strong>${doc.calc.shippingFormatted} ฿</strong></span>
              <span>•</span>
              <span style="color: #B45309;">หักภาษี 3% (แสดงแยก): <strong>${doc.calc.withholdingTaxFormatted} ฿</strong></span>
            </div>

            ${actionButtonsHtml}
          </div>
        </article>
      `;
    })
    .join('');
}

function openApproveModal(doc) {
  const overlay = document.getElementById('approveModalOverlay');
  const docLabel = document.getElementById('approveModalDocLabel');
  const totalText = document.getElementById('approveModalTotalText');
  const commentInput = document.getElementById('approveCommentInput');
  if (!overlay || !doc) return;

  pendingActionDocId = doc.id;
  if (docLabel) docLabel.textContent = `${doc.documentNumber} • ${doc.customerName}`;
  if (totalText) totalText.textContent = `${doc.calc.grandTotalFormatted} THB`;
  if (commentInput) commentInput.value = '';

  overlay.classList.add('is-open');
  setTimeout(() => document.getElementById('confirmApproveModalBtn')?.focus(), 60);
}

function closeApproveModal() {
  pendingActionDocId = null;
  document.getElementById('approveModalOverlay')?.classList.remove('is-open');
}

function openRejectModal(doc) {
  const overlay = document.getElementById('rejectModalOverlay');
  const docLabel = document.getElementById('rejectModalDocLabel');
  const reasonTextarea = document.getElementById('rejectReasonTextarea');
  if (!overlay || !doc) return;

  pendingActionDocId = doc.id;
  if (docLabel) docLabel.textContent = `${doc.documentNumber} • ${doc.customerName} (ผู้ขอ: ${doc.requesterName})`;
  if (reasonTextarea) {
    reasonTextarea.value = '';
    reasonTextarea.classList.remove('is-invalid');
  }

  overlay.classList.add('is-open');
  setTimeout(() => reasonTextarea?.focus(), 60);
}

function closeRejectModal() {
  pendingActionDocId = null;
  document.getElementById('rejectModalOverlay')?.classList.remove('is-open');
}

function initApprovalsPage() {
  renderApprovalCards();

  // Segmented Status Filter Tabs
  document.getElementById('approvalFilterTabs')?.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('button[data-status]');
    if (!tabBtn) return;

    document.querySelectorAll('#approvalFilterTabs .segmented-tab').forEach((b) => b.classList.remove('active'));
    tabBtn.classList.add('active');
    activeStatusFilter = tabBtn.dataset.status;
    renderApprovalCards();
  });

  // Search Input
  document.getElementById('approvalSearchInput')?.addEventListener('input', renderApprovalCards);

  // Event Delegation on Approval Cards Container
  document.getElementById('approvalCardsContainer')?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const enriched = getEnrichedDocuments();
    const targetDoc = enriched.find((d) => d.id === btn.dataset.id);
    if (!targetDoc) return;

    if (btn.dataset.action === 'approve') {
      openApproveModal(targetDoc);
    } else if (btn.dataset.action === 'reject') {
      openRejectModal(targetDoc);
    }
  });

  // Approve Confirmation Modal Actions
  document.getElementById('cancelApproveModalBtn')?.addEventListener('click', closeApproveModal);
  document.getElementById('confirmApproveModalBtn')?.addEventListener('click', () => {
    if (!pendingActionDocId) return;
    const idx = approvalDocuments.findIndex((d) => d.id === pendingActionDocId);
    if (idx !== -1) {
      const comment = document.getElementById('approveCommentInput')?.value.trim();
      approvalDocuments[idx].status = 'APPROVED';
      approvalDocuments[idx].decisionComment = comment || 'อนุมัติเอกสารและบันทึกเข้าระบบอย่างถาวรเรียบร้อยแล้ว';
      approvalDocuments[idx].decidedBy = 'วิชัย พิทักษ์กิจ (Costing Manager)';
      approvalDocuments[idx].decidedAt = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const docNum = approvalDocuments[idx].documentNumber;
      closeApproveModal();
      renderApprovalCards();
      showToast(`อนุมัติเอกสาร ${docNum} และบันทึกเข้าระบบอย่างถาวรสำเร็จ!`, 'success');
    }
  });

  // Reject / Return Modal Actions (Mandatory Reason)
  document.getElementById('closeRejectModalBtn')?.addEventListener('click', closeRejectModal);
  document.getElementById('cancelRejectModalBtn')?.addEventListener('click', closeRejectModal);
  document.getElementById('rejectReasonForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pendingActionDocId) return;

    const reasonTextarea = document.getElementById('rejectReasonTextarea');
    const reason = reasonTextarea?.value.trim() || '';
    if (!reason) {
      reasonTextarea?.classList.add('is-invalid');
      showToast('กรุณาระบุเหตุผลในการปฏิเสธเพื่อแจ้งให้ผู้จัดทำแก้ไขข้อมูล', 'error');
      return;
    }

    const idx = approvalDocuments.findIndex((d) => d.id === pendingActionDocId);
    if (idx !== -1) {
      approvalDocuments[idx].status = 'REJECTED';
      approvalDocuments[idx].decisionComment = reason;
      approvalDocuments[idx].decidedBy = 'วิชัย พิทักษ์กิจ (Costing Manager)';
      approvalDocuments[idx].decidedAt = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const docNum = approvalDocuments[idx].documentNumber;
      const requester = approvalDocuments[idx].requesterName;
      closeRejectModal();
      renderApprovalCards();
      showToast(`ส่งกลับเอกสาร ${docNum} ให้ ${requester} แก้ไขเรียบร้อยแล้ว`, 'warning');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeApproveModal();
      closeRejectModal();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApprovalsPage);
  } else {
    initApprovalsPage();
  }
}
