const {
  calculateRowMetrics,
  calculateDocumentSummary,
} = (typeof window !== 'undefined' && window.PricecraftCalc)
  ? window.PricecraftCalc
  : require('./cost-calculator.js');

const EDITABLE_FIELD_ORDER = [
  'productCode',
  'productName',
  'specification',
  'quantity',
  'unit',
  'unitCost',
  'wht3Applicable',
  'deliverySchedule',
  'remark',
];

const PRODUCT_CATALOG_PRESETS = {
  'HT-SP-1208': {
    productCode: 'HT-SP-1208',
    productName: 'ลวดฮีตเตอร์พันสปริง (Coil Spring Heater Wire)',
    specification: 'Dia. 1.2 × OD 8.1 × 3180 mm | 220V 2000W',
    unit: 'เส้น',
    unitCost: '1500.00',
    wht3Applicable: false,
    deliverySchedule: '7 วันทำการ',
  },
  'HT-TB-5000': {
    productCode: 'HT-TB-5000',
    productName: 'ฮีตเตอร์แท่งสแตนเลส (Tubular Finned Heater SUS316L)',
    specification: 'Tube Dia. 11 × L 1200 mm (U-Shape) | 380V 4500W',
    unit: 'ชุด',
    unitCost: '5000.00',
    wht3Applicable: true,
    deliverySchedule: '10-14 วันทำการ',
  },
  'TC-K-0450': {
    productCode: 'TC-K-0450',
    productName: 'เทอร์โมคัปเปิล Type K พร้อมหัวกะโหลก (Thermocouple)',
    specification: 'Probe Dia. 8.0 × L 450 mm | PT 1/2" (0-1100 °C)',
    unit: 'ตัว',
    unitCost: '850.00',
    wht3Applicable: false,
    deliverySchedule: '5 วันทำการ',
  },
};

let isFormDirty = false;
let rowUidCounter = 0;

function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(message, type = 'info') {
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
  }, 3400);
}

function createRowMarkup(rowIndex, data = {}) {
  rowUidCounter += 1;
  const uid = `row-${rowUidCounter}`;
  const productCode = escapeAttr(data.productCode || '');
  const productName = escapeAttr(data.productName || '');
  const specification = escapeAttr(data.specification || '');
  const quantity = escapeAttr(data.quantity ?? '1');
  const unit = escapeAttr(data.unit || 'ชิ้น');
  const unitCost = escapeAttr(data.unitCost ?? '');
  const whtChecked = data.wht3Applicable ? 'checked' : '';
  const deliverySchedule = escapeAttr(data.deliverySchedule || '7-10 วันทำการ');
  const remark = escapeAttr(data.remark || '');

  const initialMetrics = calculateRowMetrics({
    quantity: data.quantity || 0,
    unitCost: data.unitCost || 0,
    wht3Applicable: Boolean(data.wht3Applicable),
  });

  return `
    <tr class="spreadsheet-row animate-row-in" data-row-uid="${uid}">
      <td class="cell-index tabular-nums" data-role="row-index">${rowIndex}</td>
      <td style="width: 125px;">
        <input
          type="text"
          class="grid-input doc-code"
          data-field="productCode"
          list="productCodePresetList"
          placeholder="HT-SP-..."
          value="${productCode}"
          autocomplete="off"
          aria-label="รหัสสินค้า แถวที่ ${rowIndex}"
        />
      </td>
      <td style="min-width: 250px;">
        <div class="product-cell-stack">
          <input
            type="text"
            class="grid-input fw-600"
            data-field="productName"
            placeholder="ชื่อรายการสินค้า (กด Tab เพื่อไปช่องถัดไป)"
            value="${productName}"
            autocomplete="off"
            aria-label="ชื่อรายการสินค้า แถวที่ ${rowIndex}"
          />
          <input
            type="text"
            class="grid-spec-input"
            data-field="specification"
            placeholder="ขนาด / Specification เช่น Dia. 1.2 × OD 8.1 × 3180 mm 220V 2000W"
            value="${specification}"
            autocomplete="off"
            aria-label="ขนาดและรายละเอียดสินค้า แถวที่ ${rowIndex}"
          />
        </div>
      </td>
      <td style="width: 96px;">
        <input
          type="number"
          step="any"
          min="0"
          class="grid-input num-col tabular-nums"
          data-field="quantity"
          placeholder="1"
          value="${quantity}"
          aria-label="จำนวนสินค้า แถวที่ ${rowIndex}"
        />
      </td>
      <td style="width: 88px;">
        <input
          type="text"
          class="grid-input text-center"
          data-field="unit"
          list="unitPresetList"
          placeholder="ชิ้น"
          value="${unit}"
          aria-label="หน่วยนับ แถวที่ ${rowIndex}"
        />
      </td>
      <td style="width: 138px;">
        <input
          type="number"
          step="0.01"
          min="0"
          class="grid-input num-col tabular-nums"
          data-field="unitCost"
          placeholder="0.00"
          value="${unitCost}"
          aria-label="ราคาต้นทุนต่อหน่วย แถวที่ ${rowIndex}"
        />
      </td>
      <td style="width: 142px;">
        <span class="line-total-display tabular-nums" data-role="line-total">${initialMetrics.lineTotalFormatted}</span>
      </td>
      <td style="width: 112px;" class="text-center">
        <label class="wht-toggle-label" title="แสดงยอดหักภาษี ณ ที่จ่าย 3% แยกต่างหาก">
          <input
            type="checkbox"
            data-field="wht3Applicable"
            ${whtChecked}
            aria-label="หักภาษี ณ ที่จ่าย 3% แถวที่ ${rowIndex}"
          />
          <span data-role="wht-badge">${data.wht3Applicable ? initialMetrics.wht3Formatted : '3%'}</span>
        </label>
      </td>
      <td style="width: 135px;">
        <input
          type="text"
          class="grid-input"
          data-field="deliverySchedule"
          placeholder="7-10 วันทำการ"
          value="${deliverySchedule}"
          aria-label="กำหนดการส่งมอบ แถวที่ ${rowIndex}"
        />
      </td>
      <td style="min-width: 150px;">
        <input
          type="text"
          class="grid-input"
          data-field="remark"
          data-last-cell="true"
          placeholder="หมายเหตุ (Enter = เพิ่มแถว)"
          value="${remark}"
          aria-label="หมายเหตุ แถวที่ ${rowIndex}"
        />
      </td>
      <td class="cell-actions">
        <div class="row-action-group">
          <button
            type="button"
            class="row-icon-btn duplicate-btn"
            data-action="duplicate-row"
            title="คัดลอกแถวนี้ (Duplicate)"
            aria-label="คัดลอกแถวที่ ${rowIndex}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button
            type="button"
            class="row-icon-btn delete-btn"
            data-action="delete-row"
            title="ลบแถวนี้ (Delete)"
            aria-label="ลบแถวที่ ${rowIndex}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function extractRowData(tr) {
  const getVal = (field) => tr.querySelector(`[data-field="${field}"]`)?.value ?? '';
  const whtEl = tr.querySelector('[data-field="wht3Applicable"]');
  return {
    productCode: getVal('productCode').trim(),
    productName: getVal('productName').trim(),
    specification: getVal('specification').trim(),
    quantity: getVal('quantity'),
    unit: getVal('unit').trim() || 'ชิ้น',
    unitCost: getVal('unitCost'),
    wht3Applicable: Boolean(whtEl?.checked),
    deliverySchedule: getVal('deliverySchedule').trim(),
    remark: getVal('remark').trim(),
  };
}

function getAllRowsData(tbody) {
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr.spreadsheet-row')).map(extractRowData);
}

function reindexRows(tbody) {
  const rows = Array.from(tbody.querySelectorAll('tr.spreadsheet-row'));
  rows.forEach((tr, idx) => {
    const numCell = tr.querySelector('[data-role="row-index"]');
    if (numCell) numCell.textContent = String(idx + 1);
  });

  const counterBadge = document.getElementById('rowCountBadge');
  if (counterBadge) {
    counterBadge.textContent = `${rows.length} รายการ`;
  }
}

function addRow(tbody, initialData = {}, { focusField = null, insertAfterRow = null } = {}) {
  if (!tbody) return null;
  const currentCount = tbody.querySelectorAll('tr.spreadsheet-row').length;
  const html = createRowMarkup(currentCount + 1, initialData);

  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const newRow = template.content.firstElementChild;

  if (insertAfterRow && insertAfterRow.parentNode === tbody) {
    insertAfterRow.after(newRow);
  } else {
    tbody.appendChild(newRow);
  }

  reindexRows(tbody);
  recalculateSpreadsheet(tbody);

  if (focusField) {
    const targetInput = newRow.querySelector(`[data-field="${focusField}"]`);
    if (targetInput) {
      targetInput.focus();
      if (typeof targetInput.select === 'function' && targetInput.type !== 'checkbox') {
        targetInput.select();
      }
    }
  }

  return newRow;
}

function recalculateSpreadsheet(tbody) {
  if (!tbody) return null;
  const trList = Array.from(tbody.querySelectorAll('tr.spreadsheet-row'));
  const rawRows = trList.map(extractRowData);

  const shippingInput = document.getElementById('shippingChargeInput');
  const discountInput = document.getElementById('discountAmountInput');
  const vatRateSelect = document.getElementById('vatRateSelect');
  const shippingVatModeSelect = document.getElementById('shippingVatModeSelect');

  const summary = calculateDocumentSummary({
    rows: rawRows,
    shippingCharge: shippingInput?.value || '0',
    discountAmount: discountInput?.value || '0',
    vatRate: vatRateSelect?.value || '7',
    shippingVatMode: shippingVatModeSelect?.value || 'NON_TAXABLE',
  });

  summary.rows.forEach((rowCalc, idx) => {
    const tr = trList[idx];
    if (!tr) return;

    const lineTotalEl = tr.querySelector('[data-role="line-total"]');
    if (lineTotalEl && lineTotalEl.textContent !== rowCalc.lineTotalFormatted) {
      lineTotalEl.textContent = rowCalc.lineTotalFormatted;
    }

    const whtBadgeEl = tr.querySelector('[data-role="wht-badge"]');
    if (whtBadgeEl) {
      whtBadgeEl.textContent = rowCalc.wht3Applicable ? rowCalc.wht3Formatted : '3%';
    }
  });

  const setSummaryText = (id, text) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) {
      el.textContent = text;
      el.classList.remove('animate-pulse-num');
      void el.offsetWidth;
      el.classList.add('animate-pulse-num');
    }
  };

  setSummaryText('summarySubtotal', summary.subtotalFormatted);
  setSummaryText('summaryTaxable', summary.taxableFormatted);
  setSummaryText('summaryVatAmount', summary.vatFormatted);
  setSummaryText('summaryGrandTotal', summary.grandTotalFormatted);
  setSummaryText('summaryWhtTotal', summary.withholdingTaxFormatted);
  setSummaryText('summaryNetAfterWht', summary.netAfterWhtFormatted);

  return summary;
}

function handleSpreadsheetKeydown(event, tbody) {
  const target = event.target;
  if (!target || !target.dataset?.field) return;

  const currentRow = target.closest('tr.spreadsheet-row');
  if (!currentRow) return;

  const currentField = target.dataset.field;

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    const isLastCell = target.dataset.lastCell === 'true' || currentField === 'remark';
    if (isLastCell) {
      const nextRow = currentRow.nextElementSibling;
      if (nextRow && nextRow.classList.contains('spreadsheet-row')) {
        const firstInput = nextRow.querySelector('[data-field="productName"]') || nextRow.querySelector('[data-field="productCode"]');
        firstInput?.focus();
      } else {
        addRow(tbody, {}, { focusField: 'productName' });
      }
      return;
    }

    const idx = EDITABLE_FIELD_ORDER.indexOf(currentField);
    if (idx >= 0 && idx < EDITABLE_FIELD_ORDER.length - 1) {
      const nextField = EDITABLE_FIELD_ORDER[idx + 1];
      const nextInput = currentRow.querySelector(`[data-field="${nextField}"]`);
      if (nextInput) {
        nextInput.focus();
        if (typeof nextInput.select === 'function' && nextInput.type !== 'checkbox') {
          nextInput.select();
        }
      }
    }
    return;
  }

  if (event.key === 'ArrowDown' && (event.altKey || target.type !== 'number')) {
    const nextRow = currentRow.nextElementSibling;
    if (nextRow && nextRow.classList.contains('spreadsheet-row')) {
      event.preventDefault();
      const sameColInput = nextRow.querySelector(`[data-field="${currentField}"]`);
      sameColInput?.focus();
    }
  } else if (event.key === 'ArrowUp' && (event.altKey || target.type !== 'number')) {
    const prevRow = currentRow.previousElementSibling;
    if (prevRow && prevRow.classList.contains('spreadsheet-row')) {
      event.preventDefault();
      const sameColInput = prevRow.querySelector(`[data-field="${currentField}"]`);
      sameColInput?.focus();
    }
  }
}

function validateCostForm(tbody) {
  let valid = true;
  const customerInput = document.getElementById('customerNameInput');
  const salespersonInput = document.getElementById('salespersonNameInput');
  const dateInput = document.getElementById('documentDateInput');

  const markField = (inputEl, errorId, condition, msg) => {
    const wrap = inputEl?.closest('.minimal-field');
    const errEl = document.getElementById(errorId);
    if (!condition) {
      valid = false;
      wrap?.classList.add('has-error');
      if (errEl) errEl.textContent = msg;
    } else {
      wrap?.classList.remove('has-error');
      if (errEl) errEl.textContent = '';
    }
  };

  markField(customerInput, 'customerNameError', Boolean(customerInput?.value.trim()), 'กรุณาระบุชื่อลูกค้า');
  markField(salespersonInput, 'salespersonNameError', Boolean(salespersonInput?.value.trim()), 'กรุณาระบุชื่อผู้ขาย / พนักงานขาย');
  markField(dateInput, 'documentDateError', Boolean(dateInput?.value.trim()), 'กรุณาระบุวันที่เอกสาร');

  const rows = Array.from(tbody.querySelectorAll('tr.spreadsheet-row'));
  let nonEmptyRowCount = 0;

  rows.forEach((tr) => {
    const data = extractRowData(tr);
    const nameInput = tr.querySelector('[data-field="productName"]');
    const qtyInput = tr.querySelector('[data-field="quantity"]');
    const costInput = tr.querySelector('[data-field="unitCost"]');

    const hasAnyContent = Boolean(data.productName || data.productCode || Number(data.unitCost) > 0);
    if (hasAnyContent) {
      nonEmptyRowCount += 1;
      const qtyNum = Number(data.quantity);
      const costNum = Number(data.unitCost);

      nameInput?.classList.toggle('is-invalid', !data.productName);
      qtyInput?.classList.toggle('is-invalid', !(qtyNum > 0));
      costInput?.classList.toggle('is-invalid', isNaN(costNum) || costNum < 0);

      if (!data.productName || !(qtyNum > 0) || isNaN(costNum) || costNum < 0) {
        valid = false;
      }
    } else {
      nameInput?.classList.remove('is-invalid');
      qtyInput?.classList.remove('is-invalid');
      costInput?.classList.remove('is-invalid');
    }
  });

  if (nonEmptyRowCount === 0) {
    valid = false;
    showToast('กรุณากรอกรายการสินค้าอย่างน้อย 1 รายการก่อนส่งขออนุมัติ', 'error');
  }

  return valid;
}

function initCostForm() {
  const tbody = document.getElementById('spreadsheetBody');
  if (!tbody) return;

  const dateInput = document.getElementById('documentDateInput');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  if (tbody.querySelectorAll('tr.spreadsheet-row').length === 0) {
    addRow(tbody, {
      productCode: 'HT-SP-1208',
      productName: 'ลวดฮีตเตอร์พันสปริง (Coil Spring Heater Wire)',
      specification: 'Dia. 1.2 × OD 8.1 × 3180 mm | 220V 2000W',
      quantity: '15',
      unit: 'เส้น',
      unitCost: '1500.00',
      wht3Applicable: false,
      deliverySchedule: '7 วันทำการ',
      remark: 'ขั้วเซรามิกทนความร้อนสูง',
    });
    addRow(tbody, {
      productCode: 'HT-TB-5000',
      productName: 'ฮีตเตอร์แท่งสแตนเลส (Tubular Finned Heater SUS316L)',
      specification: 'Tube Dia. 11 × L 1200 mm (U-Shape) | 380V 4500W',
      quantity: '8',
      unit: 'ชุด',
      unitCost: '5000.00',
      wht3Applicable: false,
      deliverySchedule: '10-14 วันทำการ',
      remark: 'เชื่อมหน้าแปลน JIS 10K',
    });
  }

  tbody.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || !target.dataset?.field) return;

    isFormDirty = true;
    target.classList.remove('is-invalid');

    if (target.dataset.field === 'productCode') {
      const code = target.value.trim().toUpperCase();
      const preset = PRODUCT_CATALOG_PRESETS[code];
      if (preset) {
        const tr = target.closest('tr.spreadsheet-row');
        if (tr) {
          const setIfEmpty = (f, val) => {
            const el = tr.querySelector(`[data-field="${f}"]`);
            if (el && !el.value) el.value = val;
          };
          setIfEmpty('productName', preset.productName);
          setIfEmpty('specification', preset.specification);
          tr.querySelector('[data-field="unit"]').value = preset.unit;
          tr.querySelector('[data-field="unitCost"]').value = preset.unitCost;
          tr.querySelector('[data-field="deliverySchedule"]').value = preset.deliverySchedule;
          tr.querySelector('[data-field="wht3Applicable"]').checked = Boolean(preset.wht3Applicable);
        }
      }
    }

    recalculateSpreadsheet(tbody);
  });

  tbody.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || !target.dataset?.field) return;
    isFormDirty = true;

    if (target.dataset.field === 'unitCost' && target.value !== '') {
      const num = Number(target.value);
      if (!isNaN(num) && num >= 0) {
        target.value = num.toFixed(2);
      }
    }
    recalculateSpreadsheet(tbody);
  });

  tbody.addEventListener('keydown', (event) => {
    handleSpreadsheetKeydown(event, tbody);
  });

  tbody.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    const tr = actionBtn.closest('tr.spreadsheet-row');
    if (!tr) return;

    const action = actionBtn.dataset.action;
    if (action === 'delete-row') {
      const allRows = tbody.querySelectorAll('tr.spreadsheet-row');
      if (allRows.length <= 1) {
        // Clear the single remaining row instead of leaving table empty
        tr.querySelectorAll('input[type="text"], input[type="number"]').forEach((inp) => {
          inp.value = inp.dataset.field === 'quantity' ? '1' : inp.dataset.field === 'unit' ? 'ชิ้น' : '';
        });
        const wht = tr.querySelector('[data-field="wht3Applicable"]');
        if (wht) wht.checked = false;
        recalculateSpreadsheet(tbody);
        showToast('ล้างข้อมูลแถวสุดท้ายเรียบร้อยแล้ว', 'info');
        return;
      }

      tr.remove();
      reindexRows(tbody);
      recalculateSpreadsheet(tbody);
      isFormDirty = true;
      showToast('ลบรายการสินค้าแล้ว', 'info');
    } else if (action === 'duplicate-row') {
      const data = extractRowData(tr);
      addRow(tbody, data, { focusField: 'quantity', insertAfterRow: tr });
      isFormDirty = true;
      showToast('คัดลอกรายการสินค้าเรียบร้อยแล้ว', 'success');
    }
  });

  ['shippingChargeInput', 'discountAmountInput', 'vatRateSelect', 'shippingVatModeSelect'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        isFormDirty = true;
        recalculateSpreadsheet(tbody);
      });
      el.addEventListener('change', () => {
        isFormDirty = true;
        recalculateSpreadsheet(tbody);
      });
    }
  });

  ['addRowBtnTop', 'addRowBtnBottom'].forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        addRow(tbody, {}, { focusField: 'productCode' });
        isFormDirty = true;
      });
    }
  });

  const saveDraftBtn = document.getElementById('saveDraftBtn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      const summary = recalculateSpreadsheet(tbody);
      isFormDirty = false;
      const statusBadge = document.getElementById('docStatusBadge');
      if (statusBadge) {
        statusBadge.className = 'status-badge draft';
        statusBadge.textContent = 'DRAFT • บันทึกร่างแล้ว';
      }
      showToast(`บันทึกร่างเอกสารสำเร็จ (ยอดรวมสุทธิ ${summary.grandTotalFormatted} THB)`, 'success');
    });
  }

  const submitApprovalBtn = document.getElementById('submitApprovalBtn');
  if (submitApprovalBtn) {
    submitApprovalBtn.addEventListener('click', () => {
      if (!validateCostForm(tbody)) {
        showToast('กรุณาตรวจสอบข้อมูลที่มีขอบสีแดงให้ครบถ้วนก่อนส่งอนุมัติ', 'error');
        return;
      }
      const summary = recalculateSpreadsheet(tbody);
      isFormDirty = false;
      const statusBadge = document.getElementById('docStatusBadge');
      if (statusBadge) {
        statusBadge.className = 'status-badge pending';
        statusBadge.textContent = 'PENDING APPROVAL • รออนุมัติ';
      }
      showToast(`ส่งขออนุมัติเรียบร้อยแล้ว! ยอดรวมสุทธิ ${summary.grandTotalFormatted} THB`, 'success');
    });
  }

  window.addEventListener('beforeunload', (e) => {
    if (isFormDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  const printDocBtn = document.getElementById('printDocBtn');
  if (printDocBtn) {
    printDocBtn.addEventListener('click', () => window.print());
  }

  recalculateSpreadsheet(tbody);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCostForm);
  } else {
    initCostForm();
  }
}
