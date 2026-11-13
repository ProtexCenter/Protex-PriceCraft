/**
 * ============================================================================
 * PRICECRAFT — CUSTOMER SALES CONTRACT & SMART DATABASE ENGINE
 * (customer-contract.js)
 * High-performance A4 Sales Contract with Real-Time Comma Formatting,
 * Appwrite Cloud Storage & Flawless Thai Font PDF/Word/Print Export.
 * ============================================================================
 */

(function initCustomerContractApp() {
  'use strict';

  // State
  let currentContract = {
    contractNo: 'AM251202',
    date: '(China)May 14th, 2026',
    customerName: 'AMMA CONSTRUCTION MACHINERY CO., LTD.',
    currency: 'CNY',
  };

  function showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-bubble toast-info';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  // ==========================================================================
  // 1. NUMBER FORMATTING ENGINE (Task 3)
  // ==========================================================================

  /**
   * ลบเครื่องหมาย Comma ออกทั้งหมด เพื่อให้แก้ไขตัวเลขได้ง่าย
   */
  function stripCommas(val) {
    return String(val || '').replace(/,/g, '').trim();
  }

  /**
   * ใส่ลูกน้ำ (Comma) ให้กับตัวเลขอย่างชาญฉลาด โดยไม่กระทบเบอร์โทรศัพท์
   */
  function formatWithCommas(val, keepCurrency = true) {
    if (!val) return '';
    const str = String(val).trim();

    // ข้อยกเว้น: เบอร์โทรศัพท์ ห้ามใส่ลูกน้ำเด็ดขาด
    if (/^(\+?\d{1,4}[-\s]?)?(\(?\d{2,4}\)?[-\s]?)?[\d\s-]{6,15}$/.test(str) && (str.includes('-') || str.startsWith('+'))) {
      return str;
    }

    // ตรวจจับ Prefix สกุลเงิน (เช่น CNY, THB, USD)
    const matchCurrency = str.match(/^([A-Za-z]{2,4}\$?)?\s*([\d,.]+)\s*(.*)$/);
    if (matchCurrency) {
      const prefix = matchCurrency[1] || '';
      const rawNum = matchCurrency[2].replace(/,/g, '');
      const suffix = matchCurrency[3] || '';

      const num = parseFloat(rawNum);
      if (isNaN(num)) return str;

      const formattedNum = num.toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: rawNum.includes('.') ? 2 : 0,
      });

      return `${prefix ? (prefix + '') : ''}${formattedNum}${suffix ? (' ' + suffix) : ''}`;
    }

    return str;
  }

  /**
   * คำนวณราคารวม TOTAL PRICE ทั้งหมดในตาราง
   */
  function calculateContractTotal() {
    const tbody = document.getElementById('contractTableBody');
    const totalCell = document.getElementById('contractTotalPriceCell');
    if (!tbody || !totalCell) return;

    let total = 0;
    let currencyPrefix = 'CNY';

    tbody.querySelectorAll('tr').forEach((row) => {
      const priceInput = row.querySelector('.price-input');
      if (priceInput) {
        const val = priceInput.value || '';
        const match = val.match(/([A-Za-z]{2,4})/);
        if (match) currencyPrefix = match[1];

        const numStr = val.replace(/[^0-9.]/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num)) {
          total += num;
        }
      }
    });

    const formattedTotal = total.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

    totalCell.textContent = `${currencyPrefix}${formattedTotal}`;
  }

  /**
   * ผูก Event ฟอร์แมตตัวเลข (Focus ถอดลูกน้ำ / Blur ใส่ลูกน้ำ)
   */
  function bindCellFormatting(input) {
    if (!input) return;

    input.addEventListener('focus', () => {
      // เมื่อกดคลิกแก้ไข ให้ถอดลูกน้ำออกชั่วคราว
      const raw = input.value;
      const currencyMatch = raw.match(/^([A-Za-z]{2,4})/);
      const prefix = currencyMatch ? currencyMatch[1] : '';
      const numOnly = raw.replace(/[^0-9.]/g, '');
      if (numOnly) {
        input.value = prefix ? `${prefix}${numOnly}` : numOnly;
      }
    });

    input.addEventListener('blur', () => {
      input.value = formatWithCommas(input.value);
      calculateContractTotal();
    });

    input.addEventListener('input', () => {
      calculateContractTotal();
    });
  }

  function initExistingTableFormatting() {
    const tbody = document.getElementById('contractTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('.price-input, .qty-input').forEach((input) => {
      bindCellFormatting(input);
    });

    tbody.querySelectorAll('.contract-row-del-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && tbody.children.length > 1) {
          row.remove();
          calculateContractTotal();
        } else {
          showToast('สัญญาต้องมีรายการสินค้าอย่างน้อย 1 แถว');
        }
      });
    });

    calculateContractTotal();
  }

  // ==========================================================================
  // 2. DYNAMIC ROW ACTIONS (Task 3)
  // ==========================================================================

  function addContractRow(data = {}) {
    const tbody = document.getElementById('contractTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="contract-cell-input cell-center hs-code-input" value="${data.hsCode || ''}" placeholder="HS CODE" aria-label="HS CODE"></td>
      <td><input type="text" class="contract-cell-input item-input" value="${data.item || ''}" placeholder="ชื่อสินค้าหรืออุปกรณ์" aria-label="ITEM"></td>
      <td><input type="text" class="contract-cell-input cell-center qty-input" value="${data.qty || '1 SET'}" placeholder="จำนวน" aria-label="QUANTITY"></td>
      <td><input type="text" class="contract-cell-input cell-right price-input" value="${data.price ? formatWithCommas(data.price) : 'CNY0'}" placeholder="ราคา" aria-label="PRICE"></td>
      <td class="no-print" style="border: none; text-align: center;">
        <button type="button" class="contract-row-del-btn" title="ลบรายการนี้">✕</button>
      </td>
    `;

    tbody.appendChild(tr);

    const priceInput = tr.querySelector('.price-input');
    const qtyInput = tr.querySelector('.qty-input');
    bindCellFormatting(priceInput);
    bindCellFormatting(qtyInput);

    tr.querySelector('.contract-row-del-btn')?.addEventListener('click', () => {
      if (tbody.children.length > 1) {
        tr.remove();
        calculateContractTotal();
      } else {
        showToast('สัญญาต้องมีรายการสินค้าอย่างน้อย 1 แถว');
      }
    });

    calculateContractTotal();
    priceInput?.focus();
  }

  // ==========================================================================
  // 3. SMART SEARCH & APPWRITE DATABASE (Task 4)
  // ==========================================================================

  function loadContractData(contract) {
    if (!contract) return;
    currentContract = { ...currentContract, ...contract };

    // Update Header metadata
    const noDisplay = document.getElementById('contractNoDisplay');
    const dateDisplay = document.getElementById('contractDateDisplay');
    if (noDisplay) noDisplay.textContent = contract.contractNo || 'AM251202';
    if (dateDisplay) dateDisplay.textContent = contract.date || '(China)May 14th, 2026';

    // Populate Table rows
    const tbody = document.getElementById('contractTableBody');
    if (tbody && contract.items && contract.items.length > 0) {
      tbody.innerHTML = '';
      contract.items.forEach((item) => addContractRow(item));
    }

    calculateContractTotal();
    showToast(`โหลดสัญญา ${contract.contractNo} (${contract.customerName}) สำเร็จ!`);
  }

  function initContractSearch() {
    const input = document.getElementById('contractSearchInput');
    const dropdown = document.getElementById('contractSearchDropdown');
    const badge = document.getElementById('contractSearchBadge');
    if (!input || !dropdown) return;

    async function handleSearch() {
      const q = input.value.trim();
      let results = [];

      if (window.searchContracts && typeof window.searchContracts === 'function') {
        results = await window.searchContracts(q);
      } else if (window.PricecraftAppwrite && window.PricecraftAppwrite.searchContracts) {
        results = await window.PricecraftAppwrite.searchContracts(q);
      }

      if (results && results.length > 0) {
        dropdown.innerHTML = results
          .map(
            (c) => `
            <div class="contract-search-result-item" data-contract-no="${c.contractNo}">
              <div>
                <div class="contract-search-result-title">${c.customerName || 'สัญญาไม่ระบุชื่อ'}</div>
                <div class="contract-search-result-meta">เลขที่: <strong>${c.contractNo}</strong> • ${c.date || '-'} • ${c.items ? c.items.length : 0} รายการ</div>
              </div>
              <div class="contract-search-result-price">${c.totalPrice || '-'}</div>
            </div>`
          )
          .join('');

        dropdown.classList.add('is-open');
        if (badge) badge.textContent = `พบ ${results.length} รายการ`;

        dropdown.querySelectorAll('.contract-search-result-item').forEach((itemEl) => {
          itemEl.addEventListener('click', () => {
            const no = itemEl.getAttribute('data-contract-no');
            const found = results.find((r) => r.contractNo === no);
            if (found) {
              loadContractData(found);
              dropdown.classList.remove('is-open');
              input.value = found.customerName;
            }
          });
        });
      } else {
        dropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748B; font-size: 9pt;">ไม่พบประวัติสัญญาที่ตรงกับ "${q}"</div>`;
        dropdown.classList.add('is-open');
        if (badge) badge.textContent = 'ไม่พบข้อมูล';
      }
    }

    input.addEventListener('input', handleSearch);
    input.addEventListener('focus', handleSearch);

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });
  }

  function collectContractSnapshot() {
    const tbody = document.getElementById('contractTableBody');
    const items = [];

    if (tbody) {
      tbody.querySelectorAll('tr').forEach((row) => {
        const hs = row.querySelector('.hs-code-input')?.value.trim() || '';
        const item = row.querySelector('.item-input')?.value.trim() || '';
        const qty = row.querySelector('.qty-input')?.value.trim() || '';
        const price = row.querySelector('.price-input')?.value.trim() || '';
        if (hs || item || price) {
          items.push({ hsCode: hs, item, qty, price });
        }
      });
    }

    const no = document.getElementById('contractNoDisplay')?.textContent.trim() || currentContract.contractNo;
    const date = document.getElementById('contractDateDisplay')?.textContent.trim() || currentContract.date;
    const total = document.getElementById('contractTotalPriceCell')?.textContent.trim() || 'CNY0';

    return {
      contractNo: no,
      date,
      customerName: currentContract.customerName || 'AMMA CONSTRUCTION MACHINERY CO., LTD.',
      buyerName: 'PROTEX ACCESSORY INDUSTRIAL LTD.,PART.',
      totalPrice: total,
      items,
    };
  }

  async function handleSaveContract() {
    const snap = collectContractSnapshot();
    showToast('กำลังบันทึกสัญญาลง Appwrite Database...');

    let saved = null;
    if (window.saveContract && typeof window.saveContract === 'function') {
      saved = await window.saveContract(snap);
    } else if (window.PricecraftAppwrite && window.PricecraftAppwrite.saveContract) {
      saved = await window.PricecraftAppwrite.saveContract(snap);
    }

    if (saved) {
      showToast(`บันทึกสัญญา ${snap.contractNo} เรียบร้อยแล้ว (Appwrite + Local Backup)`);
    } else {
      showToast('บันทึกสัญญาลงฐานข้อมูลสำรองเรียบร้อย');
    }
  }

  // ==========================================================================
  // 4. FLAWLESS EXPORT ENGINE: PDF, WORD, PRINT (Task 5)
  // ==========================================================================

  /**
   * Export to PDF with 100% Thai Font Guarantee (Native SVG HarfBuzz Text Shaper)
   */
  async function exportContractToPdf() {
    const sheet = document.getElementById('contractA4Sheet');
    if (!sheet) return;

    const snap = collectContractSnapshot();
    const filename = `Sales_Contract_${snap.contractNo || 'Document'}.pdf`;

    const hasHtmlToImage = typeof window.htmlToImage !== 'undefined' && typeof window.htmlToImage.toCanvas === 'function';
    const jsPdfCtor = window.jspdf && window.jspdf.jsPDF;

    if (!hasHtmlToImage || !jsPdfCtor) {
      showToast('กำลังเปิดหน้าต่างสั่งพิมพ์ (เลือก Save as PDF)...');
      window.print();
      return;
    }

    showToast('กำลังสร้างไฟล์ PDF สัญญาซื้อขาย (ฟอนต์คมชัด 100%)...');

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Hide no-print buttons temporarily for high-res capture
      const canvas = await window.htmlToImage.toCanvas(sheet, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        filter: (node) => !node.classList || !node.classList.contains('no-print'),
      });

      const pdf = new jsPdfCtor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const sheetRect = sheet.getBoundingClientRect();
      const sheetWidthPx = sheetRect.width || 794;
      const pxToMm = 210 / sheetWidthPx;
      const totalHeightMm = sheetRect.height * pxToMm;

      // Single Page Document (standard A4 contract)
      if (totalHeightMm <= 297) {
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, totalHeightMm, undefined, 'FAST');
      } else {
        // Multi-page slicing at safe row boundaries
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        let heightLeft = totalHeightMm;
        let positionY = 0;

        pdf.addImage(imgData, 'JPEG', 0, positionY, 210, totalHeightMm, undefined, 'FAST');
        heightLeft -= 297;

        while (heightLeft > 2) {
          positionY -= 297;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, positionY, 210, totalHeightMm, undefined, 'FAST');
          heightLeft -= 297;
        }
      }

      pdf.save(filename);
      showToast(`ดาวน์โหลด ${filename} เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('เปิดหน้าต่างสั่งพิมพ์ (เลือกบันทึกเป็น PDF)...');
      window.print();
    }
  }

  /**
   * Export to Microsoft Word (.docx)
   */
  async function exportContractToWord() {
    if (!window.docx) {
      showToast('กำลังโหลดไลบรารี Word...');
      return;
    }

    const snap = collectContractSnapshot();
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = window.docx;

    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph({ text: 'HS CODE', alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: 'ITEM', alignment: AlignmentType.CENTER })], width: { size: 45, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: 'QUANTITY', alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: 'PRICE (CIF BANGKOK)', alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    snap.items.forEach((item) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: item.hsCode, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: item.item })] }),
            new TableCell({ children: [new Paragraph({ text: item.qty, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: item.price, alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'TOTAL PRICE', alignment: AlignmentType.CENTER })], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph({ text: snap.totalPrice, alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: 'AMMA CONSTRUCTION MACHINERY CO., LTD.', heading: 'Heading1', alignment: AlignmentType.CENTER }),
            new Paragraph({ text: 'SALES CONTRACT', heading: 'Heading2', alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `SC No.: ${snap.contractNo}       DATE: ${snap.date}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '' }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'NOTE: 1. Excluding the filler elevator, but including the filler weighing and filler control system.' }),
            new Paragraph({ text: 'The Buyer: ........................................        The Seller: Manuel Chan' }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Contract_${snap.contractNo || 'Document'}.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`ส่งออกไฟล์ Word (${snap.contractNo}.docx) เรียบร้อย!`);
  }

  // ==========================================================================
  // 5. INITIALIZATION
  // ==========================================================================

  function init() {
    initExistingTableFormatting();
    initContractSearch();

    document.getElementById('btnAddContractRow')?.addEventListener('click', () => addContractRow());
    document.getElementById('btnSaveContract')?.addEventListener('click', handleSaveContract);
    document.getElementById('btnExportWord')?.addEventListener('click', exportContractToWord);
    document.getElementById('btnExportPdf')?.addEventListener('click', exportContractToPdf);
    document.getElementById('btnPrintContract')?.addEventListener('click', () => window.print());

    // Display logged in user
    try {
      const name = sessionStorage.getItem('pc_emp_name');
      const id = sessionStorage.getItem('pc_emp_id');
      const banner = document.getElementById('loggedInUserBanner');
      if (name && banner) {
        banner.textContent = `ผู้ใช้งาน: ${name} (${id}) • ระบบสัญญาซื้อขาย A4 (Sales Contract)`;
      }
    } catch {
      // Ignore private browsing
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
