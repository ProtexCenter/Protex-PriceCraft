(function initPricecraftWorkspaceApp() {
  'use strict';

  const INTERNAL_SCALE = 1000000n;
  const DISPLAY_DIFF = 10000n;
  const HALF_STEP = 5000n;

  function parseToScaledBigInt(value) {
    if (value === null || value === undefined || value === '') return 0n;
    let cleaned = String(value).trim().replace(/,/g, '');
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return 0n;

    let sign = 1n;
    if (cleaned.startsWith('-')) {
      sign = -1n;
      cleaned = cleaned.slice(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }

    const parts = cleaned.split('.');
    const intPart = parts[0] || '0';
    const fracRaw = parts[1] || '';
    const fracPadded = fracRaw.slice(0, 6).padEnd(6, '0');
    let scaled = BigInt(intPart || '0') * INTERNAL_SCALE + BigInt(fracPadded);

    if (fracRaw.length > 6 && Number(fracRaw[6]) >= 5) {
      scaled += 1n;
    }
    return sign * scaled;
  }

  function roundScaled2Dp(scaledVal) {
    const sign = scaledVal < 0n ? -1n : 1n;
    const abs = scaledVal < 0n ? -scaledVal : scaledVal;
    const cents = (abs + HALF_STEP) / DISPLAY_DIFF;
    return sign * cents * DISPLAY_DIFF;
  }

  function formatScaledToFixed2(scaledVal) {
    const rounded = roundScaled2Dp(scaledVal);
    const sign = rounded < 0n ? '-' : '';
    const abs = rounded < 0n ? -rounded : rounded;
    const cents = abs / DISPLAY_DIFF;
    const whole = cents / 100n;
    const decimals = (cents % 100n).toString().padStart(2, '0');
    return `${sign}${whole.toString()}.${decimals}`;
  }

  function formatCurrency(value) {
    const scaled = typeof value === 'bigint' ? value : parseToScaledBigInt(value);
    const fixed = formatScaledToFixed2(scaled);
    const parts = fixed.split('.');
    const intPart = parts[0];
    const decPart = parts[1];
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${withCommas}.${decPart}`;
  }

  function multiplyAndRound2(a, b) {
    const sa = typeof a === 'bigint' ? a : parseToScaledBigInt(a);
    const sb = typeof b === 'bigint' ? b : parseToScaledBigInt(b);
    const prod = sa * sb;
    const sign = prod < 0n ? -1n : 1n;
    const absProd = prod < 0n ? -prod : prod;
    const rescaled = sign * ((absProd + 500000n) / INTERNAL_SCALE);
    return roundScaled2Dp(rescaled);
  }

  /* ==========================================================================
     2. CONSTANTS & INITIAL SAMPLE ROWS
     ========================================================================== */
  const CELL_FIELDS_ORDER = [
    'itemName',
    'quantity',
    'unit',
    'unitCost',
    'wht3Checked',
    'delivery',
    'remark',
  ];

  const DEFAULT_SAMPLE_ROWS = [
    {
      itemName: 'ลวดฮีตเตอร์พันสปริง Dia. 1.2 × OD 8.1 × 3180 mm (220V 2000W)',
      quantity: '15',
      unit: 'เส้น',
      unitCost: '1500.00',
      wht3Checked: false,
      delivery: '7 วันทำการ',
      remark: 'พร้อมขั้วเซรามิกทนความร้อน',
    },
    {
      itemName: 'ฮีตเตอร์แท่งสแตนเลส SUS316L Dia. 11 × L 1200 mm (380V 4500W)',
      quantity: '8',
      unit: 'ชุด',
      unitCost: '5000.00',
      wht3Checked: false,
      delivery: '10-14 วันทำการ',
      remark: 'เชื่อมหน้าแปลน JIS 10K',
    },
  ];

  /* ==========================================================================
     2B. HARDCODED LOCAL CATALOG DATABASE (SMART SEARCH & AUTO-FILL)
     ========================================================================== */
  const localItemsDB = [
    {
      mainName: 'ถังพรีฮีต 300 ลิตร',
      items: [
        { name: 'เหล็กฉาก 50x50x4mm. (2")', qty: 1, unit: 'เส้น', price: 406.54 },
        { name: "เหล็กแผ่น 4'x8' หนา 3มม.", qty: 2, unit: 'แผ่น', price: 2691.59 },
        { name: 'รางน้ำ 4" (ซัพพอร์ตถัง)', qty: 1, unit: 'เส้น', price: 1242.99 },
        { name: 'หน้าแปลนเชื่อม 10K 3"', qty: 3, unit: 'ตัว', price: 148.00 },
        { name: 'หน้าแปลนเชื่อม 10K 2-1/2"', qty: 1, unit: 'ตัว', price: 130.00 },
        { name: 'หน้าแปลนเชื่อม 10K 1-1/2"', qty: 1, unit: 'ตัว', price: 115.00 },
        { name: 'ท่อสตรีมดำ API #SCH40 3"', qty: 1, unit: 'เส้น', price: 1850.47 },
        { name: 'ข้อต่อตรงเกลียวในสตรีมแดง ขนาด 4หุน', qty: 2, unit: 'ตัว', price: 64.00 },
        { name: 'ข้อต่อตรงเกลียวในสตรีมแดง ขนาด 1"', qty: 2, unit: 'ตัว', price: 50.00 },
        { name: 'บอลวาล์วทองเหลือง 1"', qty: 1, unit: 'ตัว', price: 545.00 },
        {
          name: 'เทอร์โมคัปเปิ้ลหัวกะโหลก Type K เกลียว 1/2นิ้ว',
          qty: 1,
          unit: 'ตัว',
          price: 1650.00,
          subSpecs: ['- แกนโต 8mm. ความยาวแกน 30cm. อุณหภูมิ 0-800องศา'],
        },
        {
          name: 'เทอร์โมมิเตอร์เกจ หน้าปัด 4นิ้ว ขนาดเกลียว 1/2นิ้ว',
          qty: 1,
          unit: 'ตัว',
          price: 800.00,
          subSpecs: ['- ความยาวแกน 30cm. ออกข้าง อุณหภูมิ 0-300องศา'],
        },
        {
          name: 'ฮีตเตอร์หน้าแปลน 3U แบบหน้าแปลน 3นิ้ว 10K',
          qty: 3,
          unit: 'ชุด',
          price: 11800.00,
          subSpecs: [
            '- ขนาด 11.1x1100mm. ไฟ 220/380V 12,000W',
            '- Cool Zone 150mm. พร้อมฝาครอบสแตนเลส 4นิ้ว',
          ],
        },
      ],
    },
    {
      mainName: 'ตู้ไฟ ถังพรีฮีต 300 ลิตร',
      items: [
        { name: 'หางปลากลมเปลือย เบอร์ 6-6', qty: 100, unit: 'ตัว', price: 2.13 },
        { name: 'สายทนความร้อน No.6 (ขายยกม้วน 100เมตร)', qty: 50, unit: 'เมตร', price: 135.00 },
        { name: 'แมกเนติกส์ ST-35 Mitsu คอยล์ 220V.', qty: 3, unit: 'ตัว', price: 1275.00 },
        { name: 'เบรกเกอร์ 100A Mitsu 3 เฟส ไฟ 380V.', qty: 1, unit: 'ตัว', price: 1850.00 },
        { name: 'Serector Switch 2 Position 22mm.', qty: 3, unit: 'ตัว', price: 102.15 },
        { name: 'Pilot Lamp Green 22mm. (Idec-YM1P-2EQM3G)', qty: 3, unit: 'ตัว', price: 73.35 },
        { name: 'Pilot Lamp Red 22mm. (Idec-YM1P-2EQM3R)', qty: 3, unit: 'ตัว', price: 63.00 },
        { name: 'VOLT PANAL METER ขนาด 72*72 ยี่ห้อ Shinohawa 0-500V', qty: 1, unit: 'ตัว', price: 361.90 },
        { name: 'AMP PANAL METER ขนาด 72*72 ยี่ห้อ Shinohawa 0-100/5A', qty: 1, unit: 'ตัว', price: 361.90 },
        { name: 'Current Tranformer (CT) 100/5A.', qty: 1, unit: 'ตัว', price: 171.50 },
        {
          name: 'ตู้ไฟกันน้ำ 2ชั้น แบบมีกระจก ยี่ห้อ DENCO รุ่น DSG-09',
          qty: 1,
          unit: 'ตู้',
          price: 2385.00,
          subSpecs: ['- Size 450x600x250mm.'],
        },
        { name: 'สายไฟ VSF สีเหลือง 1x1Sqm. (100เมตร)', qty: 1, unit: 'ม้วน', price: 746.06 },
        { name: 'หางปลาแฉกหุ้ม 1.5-3s', qty: 100, unit: 'ตัว', price: 1.02 },
        { name: 'รางเก็บสายไฟ WD 40*40', qty: 1, unit: 'เส้น', price: 195.00 },
        { name: 'หางปลากลมเปลือย เบอร์ 16-8', qty: 20, unit: 'ตัว', price: 5.10 },
        { name: 'รางปีกนก 1เมตร', qty: 1, unit: 'เส้น', price: 75.00 },
        { name: 'เท็มคอนโทรล OMRON 48x48', qty: 1, unit: 'ตัว', price: 1890.00 },
      ],
    },
  ];

  function insertCategorySet(tbody, category) {
    if (!tbody || !category) return;
    // Main Item Header Row (numbered 1, 2, 3...)
    appendExcelRow(tbody, {
      isSubItem: false,
      itemName: category.mainName,
      quantity: '1',
      unit: 'ชุด',
      unitCost: '0.00',
    });

    // Sub Items (-) inside the category
    category.items.forEach((item) => {
      appendExcelRow(tbody, {
        isSubItem: true,
        itemName: item.name,
        quantity: String(item.qty),
        unit: item.unit,
        unitCost: Number(item.price || 0).toFixed(2),
      });
      if (Array.isArray(item.subSpecs)) {
        item.subSpecs.forEach((specText) => {
          appendExcelRow(tbody, {
            isSubItem: true,
            itemName: specText,
            quantity: '',
            unit: '',
            unitCost: '',
          });
        });
      }
    });

    recalculateAll(tbody);
    showToast(`เพิ่มชุด "${category.mainName}" (${category.items.length} รายการย่อย) เรียบร้อยแล้ว`);
  }

  function insertSingleCatalogItem(tbody, item) {
    if (!tbody || !item) return;
    appendExcelRow(tbody, {
      isSubItem: false,
      itemName: item.name,
      quantity: String(item.qty),
      unit: item.unit,
      unitCost: Number(item.price || 0).toFixed(2),
    });

    if (Array.isArray(item.subSpecs)) {
      item.subSpecs.forEach((specText) => {
        appendExcelRow(tbody, {
          isSubItem: true,
          itemName: specText,
          quantity: '',
          unit: '',
          unitCost: '',
        });
      });
    }

    recalculateAll(tbody);
    showToast(`เพิ่ม "${item.name}" ลงตารางเรียบร้อยแล้ว`);
  }

  function initSmartSearch(tbody, onChanged) {
    const searchInput = document.getElementById('smartSearchInput');
    const dropdown = document.getElementById('smartSearchDropdown');
    const box = document.getElementById('smartSearchBox');
    if (!searchInput || !dropdown || !box) return;

    const renderOptions = (queryText) => {
      const q = String(queryText || '').trim().toLowerCase();
      const matchedGroups = [];
      const matchedItems = [];

      localItemsDB.forEach((cat) => {
        const groupTotal = cat.items.reduce(
          (sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0),
          0
        );
        if (!q || cat.mainName.toLowerCase().includes(q)) {
          matchedGroups.push({ cat, groupTotal });
        }
        cat.items.forEach((it) => {
          if (!q || it.name.toLowerCase().includes(q) || cat.mainName.toLowerCase().includes(q)) {
            matchedItems.push({ catName: cat.mainName, item: it });
          }
        });
      });

      dropdown.innerHTML = '';
      if (matchedGroups.length === 0 && matchedItems.length === 0) {
        dropdown.innerHTML = '<div class="smart-search-empty">ไม่พบรายการที่ค้นหา</div>';
        dropdown.classList.add('is-open');
        return;
      }

      if (matchedGroups.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'smart-search-section-label';
        lbl.textContent = 'เพิ่มทั้งชุด (1 Main Item + รายการย่อย)';
        dropdown.appendChild(lbl);

        matchedGroups.forEach(({ cat, groupTotal }) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'smart-search-option is-group';
          btn.innerHTML = `
            <span class="smart-search-opt-main">
              <span class="smart-search-opt-title">📦 ${escapeAttr(cat.mainName)}</span>
              <span class="smart-search-opt-sub">เพิ่มทั้งหมด ${cat.items.length} รายการ (รันเลขหัวข้อหลัก + รายการย่อยอัตโนมัติ)</span>
            </span>
            <span class="smart-search-opt-price">${formatCurrency(groupTotal)} ฿</span>
          `;
          btn.addEventListener('click', () => {
            insertCategorySet(tbody, cat);
            if (typeof onChanged === 'function') onChanged();
            dropdown.classList.remove('is-open');
            searchInput.value = '';
          });
          dropdown.appendChild(btn);
        });
      }

      if (matchedItems.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'smart-search-section-label';
        lbl.textContent = `รายการเดี่ยว (${matchedItems.length})`;
        dropdown.appendChild(lbl);

        matchedItems.slice(0, 20).forEach(({ catName, item }) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'smart-search-option';
          btn.innerHTML = `
            <span class="smart-search-opt-main">
              <span class="smart-search-opt-title">${escapeAttr(item.name)}</span>
              <span class="smart-search-opt-sub">${escapeAttr(catName)} • ${item.qty} ${escapeAttr(item.unit)}</span>
            </span>
            <span class="smart-search-opt-price">${formatCurrency(item.price)} ฿</span>
          `;
          btn.addEventListener('click', () => {
            insertSingleCatalogItem(tbody, item);
            if (typeof onChanged === 'function') onChanged();
            dropdown.classList.remove('is-open');
            searchInput.value = '';
          });
          dropdown.appendChild(btn);
        });
      }

      dropdown.classList.add('is-open');
    };

    searchInput.addEventListener('focus', () => renderOptions(searchInput.value));
    searchInput.addEventListener('input', () => renderOptions(searchInput.value));
    document.addEventListener('click', (e) => {
      if (!box.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });
  }

  let rowCounter = 0;
  let currentPreviewZoom = 100;

  function escapeAttr(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeXml(val) {
    if (val === null || val === undefined) return '';
    // Strip invalid XML control characters and escape entities
    return String(val)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'toast-msg';
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 220ms ease';
      setTimeout(() => item.remove(), 240);
    }, 3200);
  }

  function formatCurrentDateTimeTh() {
    const now = new Date();
    const datePart = now.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timePart = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${datePart} เวลา ${timePart} น.`;
  }

  /* ==========================================================================
     3. 9-COLUMN EXCEL TABLE BUILDER & REAL-TIME CALCULATION
     ========================================================================== */
  function buildExcelRowHtml(index, rowData) {
    const data = rowData || {};
    rowCounter += 1;
    const isSubItem = Boolean(data.isSubItem);
    const seqDisplay = isSubItem ? '-' : String(index);
    const itemName = escapeAttr(data.itemName !== undefined ? data.itemName : '');
    const quantity = escapeAttr(data.quantity !== undefined ? data.quantity : '1');
    const unit = escapeAttr(data.unit !== undefined ? data.unit : 'ชิ้น');
    const unitCost = escapeAttr(data.unitCost !== undefined ? data.unitCost : '');
    const wht3Checked = data.wht3Checked ? 'checked' : '';
    const delivery = escapeAttr(data.delivery !== undefined ? data.delivery : '');
    const remark = escapeAttr(data.remark !== undefined ? data.remark : '');

    return `
      <tr class="excel-row${isSubItem ? ' is-sub-item' : ''}" data-row-id="r-${rowCounter}" data-sub-item="${isSubItem ? 'true' : 'false'}">
        <td class="excel-col-index tabular-nums" data-role="seq">${seqDisplay}</td>
        <td>
          <div class="${isSubItem ? 'sub-item-name-wrap' : ''}">
            ${isSubItem ? '<span class="sub-item-branch-icon" aria-hidden="true">↳</span>' : ''}
            <input
              type="text"
              class="cell-input"
              data-field="itemName"
              placeholder="${isSubItem ? 'ระบุรายละเอียดรายการย่อย...' : 'ระบุชื่อรายการสินค้า / ขนาดสเปก...'}"
              value="${itemName}"
              aria-label="รายการ แถวที่ ${seqDisplay}"
            >
          </div>
        </td>
        <td>
          <input
            type="number"
            step="any"
            min="0"
            class="cell-input num-right tabular-nums"
            data-field="quantity"
            placeholder="0"
            value="${quantity}"
            aria-label="จำนวน แถวที่ ${seqDisplay}"
          >
        </td>
        <td>
          <input
            type="text"
            class="cell-input center"
            data-field="unit"
            placeholder="ชิ้น"
            value="${unit}"
            aria-label="หน่วย แถวที่ ${seqDisplay}"
          >
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            min="0"
            class="cell-input num-right tabular-nums"
            data-field="unitCost"
            placeholder="0.00"
            value="${unitCost}"
            aria-label="ราคาต้นทุน(ก่อนVAT) แถวที่ ${seqDisplay}"
          >
        </td>
        <td>
          <div class="cell-calculated tabular-nums" data-role="lineTotal">0.00</div>
        </td>
        <td>
          <label class="cell-wht-wrap" title="ติ๊กเพื่อคำนวณหักภาษี ณ ที่จ่าย 3% ของรายการนี้">
            <input
              type="checkbox"
              class="cell-wht-check"
              data-field="wht3Checked"
              ${wht3Checked}
              aria-label="หักภาษี 3% แถวที่ ${seqDisplay}"
            >
            <span class="cell-wht-val tabular-nums" data-role="wht3Amount">0.00</span>
          </label>
        </td>
        <td>
          <input
            type="text"
            class="cell-input"
            data-field="delivery"
            placeholder="เช่น 7 วันทำการ"
            value="${delivery}"
            aria-label="การส่งมอบ แถวที่ ${seqDisplay}"
          >
        </td>
        <td>
          <input
            type="text"
            class="cell-input"
            data-field="remark"
            data-last-col="true"
            placeholder="หมายเหตุ (กด Enter เพิ่มบรรทัด)"
            value="${remark}"
            aria-label="หมายเหตุ แถวที่ ${seqDisplay}"
          >
        </td>
        <td class="col-action-cell no-print">
          <div class="row-action-group">
            <button
              type="button"
              class="row-sub-btn"
              data-action="insert-sub-row"
              title="แทรกรายการย่อยต่อท้ายบรรทัดนี้ (ไม่รันเลขลำดับ)"
              aria-label="แทรกรายการย่อย"
            >↳</button>
            <button
              type="button"
              class="row-del-btn"
              data-action="remove-row"
              title="ลบบรรทัดนี้"
              aria-label="ลบบรรทัดที่ ${seqDisplay}"
            >✕</button>
          </div>
        </td>
      </tr>
    `;
  }

  function readRowFromDom(tr) {
    const val = (f) => {
      const el = tr.querySelector(`[data-field="${f}"]`);
      return el ? el.value : '';
    };
    const whtCheck = tr.querySelector('[data-field="wht3Checked"]');
    const isSubItem =
      tr.classList.contains('is-sub-item') || tr.dataset.subItem === 'true';
    return {
      isSubItem,
      itemName: val('itemName').trim(),
      quantity: val('quantity'),
      unit: val('unit').trim(),
      unitCost: val('unitCost'),
      wht3Checked: Boolean(whtCheck && whtCheck.checked),
      delivery: val('delivery').trim(),
      remark: val('remark').trim(),
    };
  }

  function renumberRows(tbody) {
    const rows = Array.from(tbody.querySelectorAll('tr.excel-row'));
    let mainCounter = 0;
    rows.forEach((tr) => {
      const seq = tr.querySelector('[data-role="seq"]');
      const isSub = tr.classList.contains('is-sub-item') || tr.dataset.subItem === 'true';
      if (isSub) {
        if (seq) seq.textContent = '-';
      } else {
        mainCounter += 1;
        if (seq) seq.textContent = String(mainCounter);
      }
    });
  }

  function recalculateAll(tbody) {
    if (!tbody) return null;

    const trList = Array.from(tbody.querySelectorAll('tr.excel-row'));
    let subtotalScaled = 0n;
    let totalWht3Scaled = 0n;
    let mainSeqCounter = 0;

    const computedRows = trList.map((tr) => {
      const raw = readRowFromDom(tr);
      const isSub = Boolean(raw.isSubItem);
      if (!isSub) {
        mainSeqCounter += 1;
      }
      const seqLabel = isSub ? '-' : String(mainSeqCounter);

      const qtyScaled = parseToScaledBigInt(raw.quantity);
      const costScaled = parseToScaledBigInt(raw.unitCost);

      const safeQty = qtyScaled < 0n ? 0n : qtyScaled;
      const safeCost = costScaled < 0n ? 0n : costScaled;

      // ราคารวม (ก่อนVAT) = จำนวน × ราคาต้นทุน(ก่อนVAT)
      const lineTotalScaled = multiplyAndRound2(safeQty, safeCost);
      subtotalScaled += lineTotalScaled;

      // หักภาษี 3% = ราคารวม (ก่อนVAT) × 0.03
      const wht3Scaled = raw.wht3Checked ? multiplyAndRound2(lineTotalScaled, '0.03') : 0n;
      totalWht3Scaled += wht3Scaled;

      const lineTotalFormatted = formatCurrency(lineTotalScaled);
      const wht3Formatted = formatCurrency(wht3Scaled);

      const lineTotalEl = tr.querySelector('[data-role="lineTotal"]');
      if (lineTotalEl) lineTotalEl.textContent = lineTotalFormatted;

      const whtEl = tr.querySelector('[data-role="wht3Amount"]');
      if (whtEl) whtEl.textContent = raw.wht3Checked ? wht3Formatted : '0.00';

      return {
        seq: seqLabel,
        isSubItem: isSub,
        itemName: isSub && raw.itemName ? `   ↳ ${raw.itemName}` : raw.itemName,
        quantity: raw.quantity,
        unit: raw.unit,
        unitCost: raw.unitCost,
        unitCostFormatted: formatCurrency(safeCost),
        wht3Checked: raw.wht3Checked,
        delivery: raw.delivery,
        remark: raw.remark,
        lineTotal: formatScaledToFixed2(lineTotalScaled),
        lineTotalFormatted,
        wht3Amount: formatScaledToFixed2(wht3Scaled),
        wht3Formatted: raw.wht3Checked ? wht3Formatted : '0.00',
      };
    });

    // VAT 7% = ยอดรวม × 0.07
    const vat7Scaled = multiplyAndRound2(subtotalScaled, '0.07');

    // ค่าขนส่ง (ไม่มี VAT)
    const shippingInput = document.getElementById('shippingCostInput');
    const rawShippingScaled = roundScaled2Dp(
      parseToScaledBigInt(shippingInput ? shippingInput.value : '0')
    );
    const shippingScaled = rawShippingScaled < 0n ? 0n : rawShippingScaled;

    // ยอดรวมสุทธิ = ยอดรวม + VAT 7% + ค่าขนส่ง
    const grandTotalScaled = subtotalScaled + vat7Scaled + shippingScaled;

    const setSumText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const subtotalFormatted = formatCurrency(subtotalScaled);
    const vat7Formatted = formatCurrency(vat7Scaled);
    const shippingFormatted = formatCurrency(shippingScaled);
    const wht3TotalFormatted = formatCurrency(totalWht3Scaled);
    const grandTotalFormatted = formatCurrency(grandTotalScaled);

    setSumText('sumSubtotal', subtotalFormatted);
    setSumText('sumVat7', vat7Formatted);
    setSumText('sumWht3', wht3TotalFormatted);
    setSumText('sumGrandTotal', grandTotalFormatted);

    return {
      rows: computedRows,
      subtotal: formatScaledToFixed2(subtotalScaled),
      subtotalFormatted,
      vat7: formatScaledToFixed2(vat7Scaled),
      vat7Formatted,
      shipping: formatScaledToFixed2(shippingScaled),
      shippingFormatted,
      wht3Total: formatScaledToFixed2(totalWht3Scaled),
      wht3TotalFormatted,
      grandTotal: formatScaledToFixed2(grandTotalScaled),
      grandTotalFormatted,
    };
  }

  function appendExcelRow(tbody, rowData, options) {
    if (!tbody) return null;
    const opts = options || {};
    const nextIndex = tbody.querySelectorAll('tr.excel-row').length + 1;
    const tpl = document.createElement('template');
    tpl.innerHTML = buildExcelRowHtml(nextIndex, rowData).trim();
    const newRow = tpl.content.firstElementChild;

    if (opts.afterRow && opts.afterRow.parentNode === tbody) {
      opts.afterRow.insertAdjacentElement('afterend', newRow);
    } else {
      tbody.appendChild(newRow);
    }

    renumberRows(tbody);
    recalculateAll(tbody);

    if (opts.focusFirstCell) {
      const firstInput = newRow.querySelector('[data-field="itemName"]');
      if (firstInput) firstInput.focus();
    }
    return newRow;
  }

  /* ==========================================================================
     4. EXCEL KEYBOARD NAVIGATION
     ========================================================================== */
  function handleExcelGridKeydown(event, tbody) {
    const target = event.target;
    if (!target || !target.dataset || !target.dataset.field) return;

    const currentRow = target.closest('tr.excel-row');
    if (!currentRow) return;
    const currentField = target.dataset.field;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (target.dataset.lastCol === 'true' || currentField === 'remark') {
        const nextRow = currentRow.nextElementSibling;
        if (nextRow && nextRow.classList.contains('excel-row')) {
          const nextFirst = nextRow.querySelector('[data-field="itemName"]');
          if (nextFirst) nextFirst.focus();
        } else {
          appendExcelRow(tbody, {}, { focusFirstCell: true });
        }
        return;
      }

      const colIdx = CELL_FIELDS_ORDER.indexOf(currentField);
      if (colIdx >= 0 && colIdx < CELL_FIELDS_ORDER.length - 1) {
        const nextField = CELL_FIELDS_ORDER[colIdx + 1];
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

    if (event.key === 'ArrowDown') {
      const nextRow = currentRow.nextElementSibling;
      if (nextRow && nextRow.classList.contains('excel-row')) {
        event.preventDefault();
        const targetCell = nextRow.querySelector(`[data-field="${currentField}"]`);
        if (targetCell) targetCell.focus();
      }
    } else if (event.key === 'ArrowUp') {
      const prevRow = currentRow.previousElementSibling;
      if (prevRow && prevRow.classList.contains('excel-row')) {
        event.preventDefault();
        const targetCell = prevRow.querySelector(`[data-field="${currentField}"]`);
        if (targetCell) targetCell.focus();
      }
    }
  }

  /* ==========================================================================
     5. SNAPSHOT COLLECTOR & TRUE OPENXML (.DOCX) ZIP GENERATOR
     ========================================================================== */
  function collectDocumentSnapshot(tbody) {
    const calc = recalculateAll(tbody);
    const docNumEl = document.getElementById('docNumberDisplay');
    const issuedEl = document.getElementById('issuedDateTimeDisplay');
    const customerEl = document.getElementById('customerNameInput');
    const sellerEl = document.getElementById('sellerNameInput');
    const notesEl = document.getElementById('docGeneralNotes');
    const approverEl = document.getElementById('approverSignName');
    const preparerEl = document.getElementById('preparerSignName');
    const logoImgEl = document.getElementById('companyLogoImg');

    return {
      companyName: 'หจก.โพรเทคส์ แอคเซสโซรี อินดัสเตรียล',
      companyAddress:
        '56/360 ม.1 ซ.วัดไตรสามัคคี3 ถ.สุขุมวิท ต.บางเมืองใหม่ อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10270',
      docTitle: 'รายการขอราคาต้นทุน',
      docNumber: docNumEl && docNumEl.textContent ? docNumEl.textContent.trim() : 'PC-202611-0001',
      issuedAt:
        issuedEl && issuedEl.textContent ? issuedEl.textContent.trim() : formatCurrentDateTimeTh(),
      customerName: customerEl && customerEl.value ? customerEl.value.trim() : '-',
      sellerName: sellerEl && sellerEl.value ? sellerEl.value.trim() : '-',
      notes: notesEl && notesEl.value ? notesEl.value.trim() : '',
      approverName: approverEl && approverEl.value ? approverEl.value.trim() : '',
      preparerName: preparerEl && preparerEl.value ? preparerEl.value.trim() : '',
      logoSrc:
        logoImgEl && logoImgEl.src ? logoImgEl.src : 'ChatGPT Image 9 พ.ย. 2569 21_02_33.png',
      calc,
    };
  }

  /**
   * Standard CRC-32 Lookup Table & Calculator for Valid ZIP Archive Generation
   */
  const CRC32_TABLE = (function buildCrc32Table() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function computeCrc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Packs an array of { name: string, content: string } into a genuine ZIP Uint8Array
   * compliant with PKWARE ZIP & ECMA-376 OpenXML (.docx) specifications.
   */
  function createOpenXmlZipBytes(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.content);
      const crc = computeCrc32(dataBytes);
      const size = dataBytes.byteLength;

      // Local File Header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + nameBytes.byteLength);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true); // Local file header signature
      lv.setUint16(4, 20, true);         // Version needed to extract (2.0)
      lv.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
      lv.setUint16(8, 0, true);          // Compression method (0 = Stored)
      lv.setUint16(10, 0x6000, true);    // Last mod file time
      lv.setUint16(12, 0x596c, true);    // Last mod file date
      lv.setUint32(14, crc, true);       // CRC-32
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, nameBytes.byteLength, true); // File name length
      lv.setUint16(28, 0, true);         // Extra field length
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, dataBytes);

      // Central Directory File Header (46 bytes + filename)
      const centralHeader = new Uint8Array(46 + nameBytes.byteLength);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // Central file header signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed to extract
      cv.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8)
      cv.setUint16(10, 0, true);         // Compression method (0 = Stored)
      cv.setUint16(12, 0x6000, true);    // Last mod file time
      cv.setUint16(14, 0x596c, true);    // Last mod file date
      cv.setUint32(16, crc, true);       // CRC-32
      cv.setUint32(20, size, true);      // Compressed size
      cv.setUint32(24, size, true);      // Uncompressed size
      cv.setUint16(28, nameBytes.byteLength, true); // File name length
      cv.setUint16(30, 0, true);         // Extra field length
      cv.setUint16(32, 0, true);         // File comment length
      cv.setUint16(34, 0, true);         // Disk number start
      cv.setUint16(36, 0, true);         // Internal file attributes
      cv.setUint32(38, 0, true);         // External file attributes
      cv.setUint32(42, offset, true);    // Relative offset of local header
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);
      offset += localHeader.byteLength + size;
    });

    const centralSize = centralParts.reduce((acc, part) => acc + part.byteLength, 0);

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);         // EOCD signature
    ev.setUint16(4, 0, true);                  // Number of this disk
    ev.setUint16(6, 0, true);                  // Disk where central directory starts
    ev.setUint16(8, files.length, true);       // Number of central directory records on this disk
    ev.setUint16(10, files.length, true);      // Total number of central directory records
    ev.setUint32(12, centralSize, true);       // Size of central directory
    ev.setUint32(16, offset, true);            // Offset of start of central directory
    ev.setUint16(20, 0, true);                 // Comment length

    const totalLength = offset + centralSize + eocd.byteLength;
    const output = new Uint8Array(totalLength);
    let cursor = 0;

    localParts.forEach((part) => {
      output.set(part, cursor);
      cursor += part.byteLength;
    });
    centralParts.forEach((part) => {
      output.set(part, cursor);
      cursor += part.byteLength;
    });
    output.set(eocd, cursor);

    return output;
  }

  /**
   * Builds a 100% genuine OpenXML Word (.docx) binary Uint8Array for the Cost Request Sheet
   */
  function buildTrueOpenXmlDocxBytes(snap) {
    const wCell = (text, opts) => {
      const o = opts || {};
      const align = o.align || 'left';
      const bold = o.bold ? '<w:b/><w:bCs/>' : '';
      const color = o.color ? `<w:color w:val="${o.color}"/>` : '';
      const sz = o.sizeHalfPt || 19; // 9.5pt default
      const fill = o.fill
        ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`
        : '';
      const widthDxa = o.widthDxa ? `<w:tcW w:w="${o.widthDxa}" w:type="dxa"/>` : '';
      const gridSpan = o.gridSpan ? `<w:gridSpan w:val="${o.gridSpan}"/>` : '';

      return `<w:tc>
        <w:tcPr>${widthDxa}${gridSpan}${fill}<w:vAlign w:val="center"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="${align}"/><w:spacing w:before="40" w:after="40"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/>
              ${bold}${color}
              <w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(text)}</w:t>
          </w:r>
        </w:p>
      </w:tc>`;
    };

    const headerCols = [
      { label: 'ลำดับ', w: 580 },
      { label: 'รายการ', w: 2820 },
      { label: 'จำนวน', w: 780 },
      { label: 'หน่วย', w: 720 },
      { label: 'ราคาต้นทุน(ก่อนVAT)', w: 1380 },
      { label: 'ราคารวม (ก่อนVAT)', w: 1380 },
      { label: 'หักภาษี3%', w: 1080 },
      { label: 'การส่งมอบ', w: 1120 },
      { label: 'หมายเหตุ', w: 1140 },
    ];

    const headerRowXml = `<w:tr>
      <w:trPr><w:tblHeader/></w:trPr>
      ${headerCols
        .map((c) =>
          wCell(c.label, {
            align: 'center',
            bold: true,
            color: 'FFFFFF',
            fill: '0B1F3A',
            widthDxa: c.w,
            sizeHalfPt: 18,
          })
        )
        .join('')}
    </w:tr>`;

    const itemRowsXml = snap.calc.rows
      .map(
        (r) => `<w:tr>
          ${wCell(String(r.seq), { align: 'center', widthDxa: 580 })}
          ${wCell(r.itemName || '-', { align: 'left', widthDxa: 2820 })}
          ${wCell(String(r.quantity || '0'), { align: 'right', widthDxa: 780 })}
          ${wCell(r.unit || '-', { align: 'center', widthDxa: 720 })}
          ${wCell(r.unitCostFormatted, { align: 'right', widthDxa: 1380 })}
          ${wCell(r.lineTotalFormatted, { align: 'right', bold: true, widthDxa: 1380 })}
          ${wCell(r.wht3Formatted, { align: 'right', widthDxa: 1080 })}
          ${wCell(r.delivery || '-', { align: 'left', widthDxa: 1120 })}
          ${wCell(r.remark || '-', { align: 'left', widthDxa: 1140 })}
        </w:tr>`
      )
      .join('');

    const summaryRowsXml = `
      <w:tr>
        ${wCell('ยอดรวม (ผลรวมของ ราคารวม ก่อน VAT ทุกบรรทัด)', { align: 'right', bold: true, gridSpan: 5, fill: 'F8FAFC' })}
        ${wCell(snap.calc.subtotalFormatted, { align: 'right', bold: true, fill: 'F8FAFC' })}
        ${wCell(snap.calc.wht3TotalFormatted, { align: 'right', bold: true, fill: 'FFFBEB' })}
        ${wCell('', { gridSpan: 2, fill: 'F8FAFC' })}
      </w:tr>
      <w:tr>
        ${wCell('VAT 7% (ยอดรวม × 0.07)', { align: 'right', bold: true, gridSpan: 5 })}
        ${wCell(snap.calc.vat7Formatted, { align: 'right', bold: true })}
        ${wCell('', { gridSpan: 3 })}
      </w:tr>
      <w:tr>
        ${wCell('ค่าขนส่ง (*หมายเหตุ: ค่าขนส่งไม่มี VAT)', { align: 'right', bold: true, gridSpan: 5 })}
        ${wCell(snap.calc.shippingFormatted, { align: 'right', bold: true })}
        ${wCell('', { gridSpan: 3 })}
      </w:tr>
      <w:tr>
        ${wCell('ยอดรวมสุทธิ (ยอดรวม + VAT 7% + ค่าขนส่ง)', { align: 'right', bold: true, color: 'FFFFFF', fill: '0B1F3A', gridSpan: 5, sizeHalfPt: 21 })}
        ${wCell(snap.calc.grandTotalFormatted, { align: 'right', bold: true, color: 'FFFFFF', fill: '0B1F3A', sizeHalfPt: 21 })}
        ${wCell('บาท (THB)', { align: 'left', bold: true, color: 'FFFFFF', fill: '0B1F3A', gridSpan: 3, sizeHalfPt: 19 })}
      </w:tr>
    `;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/><w:b/><w:bCs/><w:color w:val="0B1F3A"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr>
        <w:t>${escapeXml(snap.companyName)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/><w:color w:val="334155"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>
        <w:t>${escapeXml(snap.companyAddress)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="40" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/><w:b/><w:bCs/><w:color w:val="E11D24"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
        <w:t>${escapeXml(snap.docTitle)} (${escapeXml(snap.docNumber)})</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="140"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
        <w:t xml:space="preserve">ชื่อลูกค้า : ${escapeXml(snap.customerName)}    |    ชื่อผู้ขาย : ${escapeXml(snap.sellerName)}    |    วันที่และเวลาที่ออก : ${escapeXml(snap.issuedAt)}</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="11000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="0B1F3A"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="0B1F3A"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="0B1F3A"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="0B1F3A"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="64748B"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="64748B"/>
        </w:tblBorders>
      </w:tblPr>
      ${headerRowXml}
      ${itemRowsXml}
      ${summaryRowsXml}
    </w:tbl>

    <w:p>
      <w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/><w:b/><w:bCs/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>
        <w:t xml:space="preserve">หมายเหตุ / เงื่อนไข : ${escapeXml(snap.notes)}</w:t>
      </w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr></w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="11000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        ${wCell('ผู้อนุมัติ (................................................)', { align: 'center', bold: true, widthDxa: 5500, sizeHalfPt: 20 })}
        ${wCell('ผู้จัดทำ (................................................)', { align: 'center', bold: true, widthDxa: 5500, sizeHalfPt: 20 })}
      </w:tr>
      <w:tr>
        ${wCell(snap.approverName ? `(${snap.approverName})` : '', { align: 'center', widthDxa: 5500, sizeHalfPt: 19 })}
        ${wCell(snap.preparerName ? `(${snap.preparerName})` : '', { align: 'center', widthDxa: 5500, sizeHalfPt: 19 })}
      </w:tr>
    </w:tbl>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="567" w:right="454" w:bottom="567" w:left="454" w:header="450" w:footer="450" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

    return createOpenXmlZipBytes([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'word/_rels/document.xml.rels', content: docRelsXml },
      { name: 'word/styles.xml', content: stylesXml },
      { name: 'word/document.xml', content: documentXml },
    ]);
  }

  function exportToWord(tbody) {
    const snap = collectDocumentSnapshot(tbody);
    const docxBytes = buildTrueOpenXmlDocxBytes(snap);
    const blob = new Blob([docxBytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snap.docNumber}_รายการขอราคาต้นทุน.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`ส่งออกไฟล์ Word มาตรฐาน OpenXML (${snap.docNumber}_รายการขอราคาต้นทุน.docx) สำเร็จ!`);
  }

  /* ==========================================================================
     6. A4 PRINT PREVIEW ENGINE (EXACT 210mm x 297mm A4 PAPER SIMULATION)
     ========================================================================== */
  function buildA4PreviewHtml(snap) {
    const rowsHtml = snap.calc.rows
      .map(
        (r) => `
        <tr>
          <td class="tabular-nums" style="text-align: center;">${r.seq}</td>
          <td>${escapeAttr(r.itemName || '-')}</td>
          <td class="tabular-nums" style="text-align: right;">${escapeAttr(r.quantity || '0')}</td>
          <td style="text-align: center;">${escapeAttr(r.unit || '-')}</td>
          <td class="tabular-nums" style="text-align: right;">${r.unitCostFormatted}</td>
          <td class="tabular-nums" style="text-align: right; font-weight: 700;">${r.lineTotalFormatted}</td>
          <td class="tabular-nums" style="text-align: right;">${r.wht3Formatted}</td>
          <td>${escapeAttr(r.delivery || '-')}</td>
          <td>${escapeAttr(r.remark || '-')}</td>
        </tr>`
      )
      .join('');

    return `
      <div>
        <div class="a4-sheet-header">
          <div class="a4-sheet-logo-box">
            <img src="${escapeAttr(snap.logoSrc)}" alt="PROTEX GROUP Logo">
          </div>
          <div>
            <div class="a4-sheet-company-name">${escapeAttr(snap.companyName)}</div>
            <div class="a4-sheet-company-addr">${escapeAttr(snap.companyAddress)}</div>
            <div class="a4-sheet-vendor-line">
              ชื่อลูกค้า : <span class="a4-sheet-vendor-val">${escapeAttr(snap.customerName)}</span>
            </div>
          </div>
          <div class="a4-sheet-meta-box">
            <div class="a4-sheet-doc-title">${escapeAttr(snap.docTitle)}</div>
            <div class="a4-sheet-meta-row">เลขที่เอกสาร : <strong class="tabular-nums">${escapeAttr(snap.docNumber)}</strong></div>
            <div class="a4-sheet-meta-row">วันที่และเวลาที่ออก : <strong class="tabular-nums">${escapeAttr(snap.issuedAt)}</strong></div>
            <div class="a4-sheet-meta-row">ชื่อผู้ขาย : <strong>${escapeAttr(snap.sellerName)}</strong></div>
          </div>
        </div>

        <table class="a4-sheet-table">
          <thead>
            <tr>
              <th style="width: 6%;">ลำดับ</th>
              <th style="width: 26%;">รายการ</th>
              <th style="width: 8%;">จำนวน</th>
              <th style="width: 7%;">หน่วย</th>
              <th style="width: 13%;">ราคาต้นทุน(ก่อนVAT)</th>
              <th style="width: 13%;">ราคารวม (ก่อนVAT)</th>
              <th style="width: 9%;">หักภาษี3%</th>
              <th style="width: 9%;">การส่งมอบ</th>
              <th style="width: 9%;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="a4-sheet-bottom-grid">
          <div class="a4-sheet-notes-box">
            <div class="a4-sheet-notes-title">หมายเหตุ / เงื่อนไขประกอบใบขอราคาต้นทุน :</div>
            <div>${escapeAttr(snap.notes || '-')}</div>
          </div>

          <table class="a4-sheet-summary-table">
            <tbody>
              <tr>
                <td><strong>ยอดรวม</strong><br><span style="font-size: 7.5pt; color: #475569;">ผลรวมราคารวม (ก่อนVAT)</span></td>
                <td class="tabular-nums" style="text-align: right; font-weight: 700;">${snap.calc.subtotalFormatted}</td>
              </tr>
              <tr>
                <td><strong>VAT 7%</strong><br><span style="font-size: 7.5pt; color: #475569;">ยอดรวม × 0.07</span></td>
                <td class="tabular-nums" style="text-align: right; font-weight: 700;">${snap.calc.vat7Formatted}</td>
              </tr>
              <tr>
                <td><strong>ค่าขนส่ง</strong><br><span style="font-size: 7.5pt; color: #475569;">*ค่าขนส่งไม่มี VAT</span></td>
                <td class="tabular-nums" style="text-align: right; font-weight: 700;">${snap.calc.shippingFormatted}</td>
              </tr>
              <tr>
                <td style="color: #B45309;"><strong>รวมหักภาษี 3% (แยก)</strong></td>
                <td class="tabular-nums" style="text-align: right; font-weight: 700; color: #B45309;">${snap.calc.wht3TotalFormatted}</td>
              </tr>
              <tr class="a4-grand-row">
                <td>ยอดรวมสุทธิ</td>
                <td class="tabular-nums" style="text-align: right;">${snap.calc.grandTotalFormatted}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="a4-sheet-signatures">
        <div>
          <div class="a4-sheet-sign-role">ผู้อนุมัติ (................................................)</div>
          <div class="a4-sheet-sign-name">${escapeAttr(snap.approverName ? `(${snap.approverName})` : '')}</div>
        </div>
        <div>
          <div class="a4-sheet-sign-role">ผู้จัดทำ (................................................)</div>
          <div class="a4-sheet-sign-name">${escapeAttr(snap.preparerName ? `(${snap.preparerName})` : '')}</div>
        </div>
      </div>
    `;
  }

  function applyPreviewZoom(zoomPercent) {
    currentPreviewZoom = Math.max(50, Math.min(150, zoomPercent));
    const sheet = document.getElementById('a4PaperSheetContent');
    const label = document.getElementById('a4ZoomLevelText');
    if (sheet) {
      sheet.style.transform = `scale(${currentPreviewZoom / 100})`;
    }
    if (label) {
      label.textContent = `${currentPreviewZoom}%`;
    }
  }

  function openPrintPreviewModal(tbody) {
    const modal = document.getElementById('a4PrintPreviewModal');
    const sheet = document.getElementById('a4PaperSheetContent');
    if (!modal || !sheet) return;

    const snap = collectDocumentSnapshot(tbody);
    sheet.innerHTML = buildA4PreviewHtml(snap);
    applyPreviewZoom(100);
    modal.classList.add('is-open');
  }

  function closePrintPreviewModal() {
    const modal = document.getElementById('a4PrintPreviewModal');
    if (modal) {
      modal.classList.remove('is-open');
    }
  }

  async function exportToPdf(tbody) {
    const snap = collectDocumentSnapshot(tbody);
    const hasHtmlToImage = typeof window.htmlToImage !== 'undefined' && typeof window.htmlToImage.toPng === 'function';
    const jsPdfCtor = window.jspdf && window.jspdf.jsPDF;

    if (!hasHtmlToImage || !jsPdfCtor) {
      showToast('กำลังเปิดหน้าต่างบันทึกเป็น PDF...');
      window.print();
      return;
    }

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '0';
    host.style.top = '0';
    host.style.width = '210mm';
    host.style.opacity = '0';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '-9999';
    host.style.background = '#FFFFFF';

    const sheet = document.createElement('div');
    sheet.className = 'a4-paper-sheet';
    sheet.style.boxShadow = 'none';
    sheet.style.margin = '0';
    sheet.style.width = '210mm';
    sheet.style.minHeight = '290mm';
    sheet.style.letterSpacing = '0px';
    sheet.style.fontFamily = "'Sarabun', 'Prompt', sans-serif";
    sheet.innerHTML = buildA4PreviewHtml(snap);

    // If 10-15 rows, optimize spacing so everything fits cleanly on 1 page without trailing orphan signatures
    if (snap.calc.rows.length >= 10 && snap.calc.rows.length <= 15) {
      sheet.querySelectorAll('.a4-sheet-table th, .a4-sheet-table td').forEach((td) => {
        td.style.padding = '4px 5px';
        td.style.fontSize = '8.2pt';
      });
      const notesBox = sheet.querySelector('.a4-sheet-notes-box');
      if (notesBox) notesBox.style.minHeight = '64px';
      const sigs = sheet.querySelector('.a4-sheet-signatures');
      if (sigs) {
        sigs.style.marginTop = '14px';
        sigs.style.paddingTop = '10px';
      }
    }

    host.appendChild(sheet);
    document.body.appendChild(host);

    // Ensure elements with break-inside: avoid never split across A4 page boundaries (297mm)
    const pxPerMm = sheet.offsetWidth / 210;
    const pageHeightPx = 297 * pxPerMm;
    const breakAvoidElements = sheet.querySelectorAll(
      '.a4-sheet-signatures, .a4-sheet-bottom-grid, .signatures-section, .doc-bottom-grid'
    );
    breakAvoidElements.forEach((el) => {
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const pageNum = Math.floor(elTop / pageHeightPx) + 1;
      const pageBoundary = pageNum * pageHeightPx;
      if (elTop < pageBoundary && elBottom > pageBoundary) {
        const pushGap = pageBoundary - elTop + 24;
        el.style.marginTop = `${pushGap}px`;
      }
    });

    const filename = `Pricecraft_${snap.docNumber || 'Document'}.pdf`;
    showToast('กำลังสร้างไฟล์ PDF (ฟอนต์ไทยคมชัด)...');

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // ใช้ Browser Native HarfBuzz Engine ผ่าน SVG foreignObject เพื่อไม่ให้สระ/วรรณยุกต์ภาษาไทยเพี้ยน
      const dataUrl = await window.htmlToImage.toPng(sheet, {
        pixelRatio: 2.2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        style: {
          transform: 'none',
          letterSpacing: '0px',
        },
      });

      const pdf = new jsPdfCtor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const imgProps = pdf.getImageProperties(dataUrl);
      const renderedHeightMm = (imgProps.height * pageWidthMm) / imgProps.width;

      let heightLeft = renderedHeightMm;
      let positionY = 0;

      pdf.addImage(dataUrl, 'PNG', 0, positionY, pageWidthMm, renderedHeightMm, undefined, 'FAST');
      heightLeft -= pageHeightMm;

      while (heightLeft > 5) {
        positionY -= pageHeightMm;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, positionY, pageWidthMm, renderedHeightMm, undefined, 'FAST');
        heightLeft -= pageHeightMm;
      }

      pdf.save(filename);
      showToast(`ดาวน์โหลด ${filename} เรียบร้อยแล้ว`);
    } catch {
      showToast('กำลังเปิดหน้าต่างสั่งพิมพ์ (เลือก Save as PDF)...');
      window.print();
    } finally {
      host.remove();
    }
  }

  /* ==========================================================================
     7. EXCEL (.XLSX) EXPORT & IMPORT
     ========================================================================== */
  function exportToExcel(tbody) {
    const snap = collectDocumentSnapshot(tbody);

    const sheetAoA = [
      [snap.companyName],
      [snap.companyAddress],
      [`ชื่อเอกสาร: ${snap.docTitle}`, '', '', '', '', `เลขที่: ${snap.docNumber}`],
      [`ชื่อผู้ขาย: ${snap.sellerName}`, '', '', '', '', `วันที่และเวลาที่ออก: ${snap.issuedAt}`],
      [],
      [
        'ลำดับ',
        'รายการ',
        'จำนวน',
        'หน่วย',
        'ราคาต้นทุน(ก่อนVAT)',
        'ราคารวม (ก่อนVAT)',
        'หักภาษี3%',
        'การส่งมอบ',
        'หมายเหตุ',
      ],
    ];

    snap.calc.rows.forEach((r) => {
      sheetAoA.push([
        r.seq,
        r.itemName,
        Number(r.quantity || 0),
        r.unit,
        Number(r.unitCost || 0),
        Number(r.lineTotal || 0),
        Number(r.wht3Amount || 0),
        r.delivery,
        r.remark,
      ]);
    });

    sheetAoA.push(
      [],
      [
        '',
        '',
        '',
        '',
        'ยอดรวม (ก่อน VAT)',
        Number(snap.calc.subtotal),
        Number(snap.calc.wht3Total),
        '',
        '',
      ],
      ['', '', '', '', 'VAT 7%', Number(snap.calc.vat7), '', '', ''],
      ['', '', '', '', 'ค่าขนส่ง (ไม่มี VAT)', Number(snap.calc.shipping), '', '', ''],
      ['', '', '', '', 'ยอดรวมสุทธิ', Number(snap.calc.grandTotal), '', '', ''],
      [],
      [
        'ผู้อนุมัติ (................................................)',
        '',
        '',
        '',
        'ผู้จัดทำ (................................................)',
      ],
      [snap.approverName, '', '', '', snap.preparerName]
    );

    if (window.XLSX && window.XLSX.utils && typeof window.XLSX.utils.aoa_to_sheet === 'function') {
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.aoa_to_sheet(sheetAoA);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 42 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
      ];
      window.XLSX.utils.book_append_sheet(wb, ws, 'รายการขอราคาต้นทุน');
      window.XLSX.writeFile(wb, `${snap.docNumber}_รายการขอราคาต้นทุน.xlsx`);
      showToast(`ส่งออกไฟล์ Excel (${snap.docNumber}_รายการขอราคาต้นทุน.xlsx) สำเร็จ!`);
      return;
    }

    const xmlRows = sheetAoA
      .map(
        (row) =>
          `<Row>${row
            .map((cell) => {
              const isNum = typeof cell === 'number' && !isNaN(cell);
              return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(
                cell !== null && cell !== undefined ? cell : ''
              )}</Data></Cell>`;
            })
            .join('')}</Row>`
      )
      .join('');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="รายการขอราคาต้นทุน">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snap.docNumber}_รายการขอราคาต้นทุน.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ Excel สำเร็จ!');
  }

  function handleImportExcelFile(file, tbody) {
    if (!file || !tbody) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const extractedRows = [];

        if (window.XLSX && !file.name.toLowerCase().endsWith('.csv')) {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const aoa = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

          const headerRowIdx = aoa.findIndex((r) =>
            r.some((c) => String(c).includes('รายการ') || String(c).includes('ลำดับ'))
          );
          const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

          for (let i = startIdx; i < aoa.length; i += 1) {
            const row = aoa[i];
            if (!row || row.length < 2) continue;
            const itemName = String(
              row[1] !== undefined && row[1] !== '' ? row[1] : row[0] || ''
            ).trim();
            if (!itemName || itemName.includes('ยอดรวม') || itemName.includes('ผู้อนุมัติ')) continue;

            extractedRows.push({
              itemName,
              quantity: String(row[2] !== undefined && row[2] !== '' ? row[2] : '1'),
              unit: String(row[3] !== undefined && row[3] !== '' ? row[3] : 'ชิ้น'),
              unitCost: String(row[4] !== undefined && row[4] !== '' ? row[4] : '0.00'),
              wht3Checked: Number(row[6] || 0) > 0,
              delivery: String(row[7] !== undefined ? row[7] : ''),
              remark: String(row[8] !== undefined ? row[8] : ''),
            });
          }
        } else {
          const text = new TextDecoder('utf-8').decode(e.target.result);
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          lines.forEach((line, idx) => {
            const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            if (idx === 0 && (cols.includes('รายการ') || cols.includes('ลำดับ'))) return;
            const nameCandidate = cols[1] || cols[0] || '';
            if (nameCandidate) {
              extractedRows.push({
                itemName: nameCandidate,
                quantity: cols[2] || '1',
                unit: cols[3] || 'ชิ้น',
                unitCost: cols[4] || '0.00',
                wht3Checked: false,
                delivery: cols[7] || '',
                remark: cols[8] || '',
              });
            }
          });
        }

        if (extractedRows.length === 0) {
          showToast('ไม่พบแถวรายการสินค้าในไฟล์ที่นำเข้า');
          return;
        }

        tbody.innerHTML = '';
        extractedRows.forEach((r) => appendExcelRow(tbody, r));
        showToast(`นำเข้าข้อมูลจากไฟล์ ${file.name} จำนวน ${extractedRows.length} รายการสำเร็จ!`);
      } catch {
        showToast('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* ==========================================================================
     8. APPWRITE STATE PERSISTENCE BY EMPLOYEE ID (COLLECTION: user_drafts)
     ========================================================================== */
  const externalConfig =
    (typeof window !== 'undefined' &&
      window.PricecraftAppwrite &&
      window.PricecraftAppwrite.config) ||
    {};

  const APPWRITE_CONFIG = {
    endpoint: externalConfig.endpoint || 'https://sgp.cloud.appwrite.io/v1',
    projectId: externalConfig.projectId || '6af2e5a000218106d920',
    databaseId: externalConfig.databaseId || 'YOUR_DATABASE_ID',
    collectionId: externalConfig.collectionId || 'user_drafts',
    localFallbackPrefix: 'pc_appwrite_draft_',
  };

  let appwriteDatabases = null;
  let activeDraftDocumentId = null;
  let autoSaveTimer = null;

  function initAppwriteSdk() {
    if (appwriteDatabases) return appwriteDatabases;
    if (typeof window !== 'undefined' && window.Appwrite) {
      try {
        const client = new window.Appwrite.Client()
          .setEndpoint(APPWRITE_CONFIG.endpoint)
          .setProject(APPWRITE_CONFIG.projectId);
        appwriteDatabases = new window.Appwrite.Databases(client);
      } catch {
        appwriteDatabases = null;
      }
    }
    return appwriteDatabases;
  }

  function serializeWorkspaceDraft(employeeId, tbody) {
    const trList = Array.from(tbody.querySelectorAll('tr.excel-row'));
    const rows = trList.map((tr) => readRowFromDom(tr));

    return {
      employee_id: String(employeeId),
      customerName: document.getElementById('customerNameInput')?.value || '',
      sellerName: document.getElementById('sellerNameInput')?.value || '',
      shippingCost: document.getElementById('shippingCostInput')?.value || '0.00',
      notes: document.getElementById('docGeneralNotes')?.value || '',
      approverName: document.getElementById('approverSignName')?.value || '',
      preparerName: document.getElementById('preparerSignName')?.value || '',
      docNumber: document.getElementById('docNumberDisplay')?.textContent?.trim() || 'PC-202611-0001',
      rows,
      updated_at: new Date().toISOString(),
    };
  }

  function applyDraftToDom(draftData, tbody) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    // Case 1: New Employee / No Draft Found -> Clear table to 0 items & reset inputs
    if (!draftData) {
      tbody.innerHTML = '';
      setVal('customerNameInput', '');
      setVal('sellerNameInput', '');
      setVal('shippingCostInput', '0.00');
      setVal('approverSignName', '');
      setVal('preparerSignName', '');
      recalculateAll(tbody);
      return;
    }

    // Case 2: Returning Employee -> Restore 100% of fields and table rows
    setVal('customerNameInput', draftData.customerName || '');
    setVal('sellerNameInput', draftData.sellerName || '');
    setVal('shippingCostInput', draftData.shippingCost !== undefined ? draftData.shippingCost : '0.00');
    if (draftData.notes !== undefined) {
      setVal('docGeneralNotes', draftData.notes);
    }
    setVal('approverSignName', draftData.approverName || '');
    setVal('preparerSignName', draftData.preparerName || '');

    const docNumEl = document.getElementById('docNumberDisplay');
    if (docNumEl && draftData.docNumber) {
      docNumEl.textContent = draftData.docNumber;
    }

    tbody.innerHTML = '';
    const savedRows = Array.isArray(draftData.rows) ? draftData.rows : [];
    savedRows.forEach((row) => appendExcelRow(tbody, row));
    recalculateAll(tbody);
  }

  async function loadUserDraftByEmployeeId(employeeId, tbody) {
    const empKey = String(employeeId || '').trim();
    if (!empKey) {
      applyDraftToDom(null, tbody);
      return null;
    }

    const db = initAppwriteSdk();
    if (db && window.Appwrite && window.Appwrite.Query) {
      try {
        const res = await db.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          [window.Appwrite.Query.equal('employee_id', empKey), window.Appwrite.Query.limit(1)]
        );
        if (res && Array.isArray(res.documents) && res.documents.length > 0) {
          const doc = res.documents[0];
          activeDraftDocumentId = doc.$id;
          const parsed =
            typeof doc.draft_json === 'string' ? JSON.parse(doc.draft_json) : doc.draft_json || doc;
          applyDraftToDom(parsed, tbody);
          return parsed;
        }
      } catch {
        // Fallback to local employee draft store when Appwrite cloud endpoint is unreachable/mocked
      }
    }

    try {
      const rawLocal = localStorage.getItem(`${APPWRITE_CONFIG.localFallbackPrefix}${empKey}`);
      if (rawLocal) {
        const parsedLocal = JSON.parse(rawLocal);
        applyDraftToDom(parsedLocal, tbody);
        return parsedLocal;
      }
    } catch {
      // Ignore storage error
    }

    // No draft exists for this employee_id -> Start with 0 rows
    applyDraftToDom(null, tbody);
    return null;
  }

  async function saveUserDraftByEmployeeId(employeeId, tbody) {
    const empKey = String(employeeId || '').trim();
    if (!empKey || !tbody) return;

    const payload = serializeWorkspaceDraft(empKey, tbody);

    // 1. Immediate local sync per employee_id
    try {
      localStorage.setItem(
        `${APPWRITE_CONFIG.localFallbackPrefix}${empKey}`,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore quota/storage errors
    }

    // 2. Appwrite Database Upsert (Collection: user_drafts)
    const db = initAppwriteSdk();
    if (!db || !window.Appwrite) return;

    const appwriteDocData = {
      employee_id: empKey,
      draft_json: JSON.stringify(payload),
      updated_at: payload.updated_at,
    };

    try {
      if (activeDraftDocumentId) {
        await db.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          activeDraftDocumentId,
          appwriteDocData
        );
      } else {
        const created = await db.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          window.Appwrite.ID ? window.Appwrite.ID.unique() : 'unique()',
          appwriteDocData
        );
        if (created && created.$id) {
          activeDraftDocumentId = created.$id;
        }
      }
    } catch {
      // Kept safely in per-employee storage when mock projectId is active
    }
  }

  function scheduleAutoSave(employeeId, tbody) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveUserDraftByEmployeeId(employeeId, tbody);
    }, 250);
  }

  /* ==========================================================================
     9. INITIALIZE WORKSPACE (dashboard.html)
     ========================================================================== */
  function initWorkspacePage() {
    const tbody = document.getElementById('excelTableBody');
    if (!tbody) return;

    let currentEmpId = '1234';
    try {
      currentEmpId = sessionStorage.getItem('pc_emp_id') || '1234';
      const currentEmpName = sessionStorage.getItem('pc_emp_name') || 'พนักงานโพรเทคส์';
      const userBanner = document.getElementById('loggedInUserBanner');
      if (userBanner) {
        userBanner.textContent = `ผู้ใช้งาน: ${currentEmpName} (ID: ${currentEmpId}) • ผู้จัดทำใบขอราคาต้นทุน`;
      }
    } catch {
      // Ignore storage access errors in strict privacy mode
    }

    const issuedEl = document.getElementById('issuedDateTimeDisplay');
    const updateClock = () => {
      if (issuedEl) issuedEl.textContent = formatCurrentDateTimeTh();
    };
    updateClock();
    setInterval(updateClock, 1000);

    // Load Employee Draft from Appwrite (or start clean with 0 rows for new employees)
    loadUserDraftByEmployeeId(currentEmpId, tbody);

    const triggerSave = () => scheduleAutoSave(currentEmpId, tbody);

    tbody.addEventListener('input', () => {
      recalculateAll(tbody);
      triggerSave();
    });
    tbody.addEventListener('change', (e) => {
      const target = e.target;
      if (target && target.dataset && target.dataset.field === 'unitCost' && target.value !== '') {
        const n = Number(target.value);
        if (!isNaN(n) && n >= 0) target.value = n.toFixed(2);
      }
      recalculateAll(tbody);
      triggerSave();
    });
    tbody.addEventListener('keydown', (e) => {
      handleExcelGridKeydown(e, tbody);
      triggerSave();
    });

    tbody.addEventListener('click', (e) => {
      const subBtn = e.target.closest('[data-action="insert-sub-row"]');
      if (subBtn) {
        const parentTr = subBtn.closest('tr.excel-row');
        if (parentTr) {
          appendExcelRow(
            tbody,
            { isSubItem: true, quantity: '1', unit: 'ชิ้น' },
            { afterRow: parentTr, focusFirstCell: true }
          );
          saveUserDraftByEmployeeId(currentEmpId, tbody);
        }
        return;
      }

      const delBtn = e.target.closest('[data-action="remove-row"]');
      if (!delBtn) return;

      const tr = delBtn.closest('tr.excel-row');
      if (!tr) return;

      tr.remove();
      renumberRows(tbody);
      recalculateAll(tbody);
      saveUserDraftByEmployeeId(currentEmpId, tbody);
    });

    const shippingInput = document.getElementById('shippingCostInput');
    if (shippingInput) {
      shippingInput.addEventListener('input', () => {
        recalculateAll(tbody);
        triggerSave();
      });
      shippingInput.addEventListener('change', () => {
        const n = Number(shippingInput.value);
        if (!isNaN(n) && n >= 0) shippingInput.value = n.toFixed(2);
        recalculateAll(tbody);
        triggerSave();
      });
    }

    // Bind Auto-Save on Header & Footer Inputs (Customer, Seller, Notes, Signatures)
    ['customerNameInput', 'sellerNameInput', 'docGeneralNotes', 'approverSignName', 'preparerSignName'].forEach(
      (inputId) => {
        const el = document.getElementById(inputId);
        if (el) {
          el.addEventListener('input', triggerSave);
          el.addEventListener('change', triggerSave);
        }
      }
    );

    document.getElementById('btnAddRow')?.addEventListener('click', () => {
      appendExcelRow(tbody, { isSubItem: false }, { focusFirstCell: true });
      saveUserDraftByEmployeeId(currentEmpId, tbody);
    });

    document.getElementById('btnAddSubItem')?.addEventListener('click', () => {
      appendExcelRow(tbody, { isSubItem: true }, { focusFirstCell: true });
      saveUserDraftByEmployeeId(currentEmpId, tbody);
    });

    document.getElementById('btnAddFiveRows')?.addEventListener('click', () => {
      for (let i = 0; i < 5; i += 1) {
        appendExcelRow(tbody, {});
      }
      saveUserDraftByEmployeeId(currentEmpId, tbody);
      showToast('เพิ่ม 5 บรรทัดใหม่เรียบร้อยแล้ว');
    });

    document.getElementById('btnLoadSampleData')?.addEventListener('click', () => {
      tbody.innerHTML = '';
      DEFAULT_SAMPLE_ROWS.forEach((row) => appendExcelRow(tbody, row));
      if (shippingInput) shippingInput.value = '500.00';
      recalculateAll(tbody);
      saveUserDraftByEmployeeId(currentEmpId, tbody);
      showToast('โหลดข้อมูลตัวอย่างมาตรฐานเรียบร้อยแล้ว (ยอดรวมสุทธิ 67,375.00 บาท)');
    });

    document.getElementById('btnClearRows')?.addEventListener('click', () => {
      tbody.innerHTML = '';
      recalculateAll(tbody);
      saveUserDraftByEmployeeId(currentEmpId, tbody);
      showToast('ล้างตารางเป็น 0 รายการเรียบร้อยแล้ว');
    });

    const logoDropzone = document.getElementById('logoDropzone');
    const logoFileInput = document.getElementById('logoFileInput');
    const companyLogoImg = document.getElementById('companyLogoImg');

    if (logoDropzone && logoFileInput) {
      logoDropzone.addEventListener('click', () => logoFileInput.click());
      logoFileInput.addEventListener('change', () => {
        const file = logoFileInput.files && logoFileInput.files[0];
        if (!file || !companyLogoImg) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          companyLogoImg.src = ev.target.result;
          showToast('อัปเดตโลโก้สำหรับพิมพ์เอกสารเรียบร้อยแล้ว');
        };
        reader.readAsDataURL(file);
      });
    }

    const importInput = document.getElementById('importExcelFileInput');
    const btnImportExcel = document.getElementById('btnImportExcel');
    if (btnImportExcel && importInput) {
      btnImportExcel.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', () => {
        const file = importInput.files && importInput.files[0];
        if (file) {
          handleImportExcelFile(file, tbody);
          importInput.value = '';
        }
      });
    }

    document.getElementById('btnExportExcel')?.addEventListener('click', () => exportToExcel(tbody));
    document.getElementById('btnExportWord')?.addEventListener('click', () => exportToWord(tbody));
    document.getElementById('btnExportPdf')?.addEventListener('click', () => {
      updateClock();
      exportToPdf(tbody);
    });

    // A4 Print Preview Modal Controls
    document.getElementById('btnPrintPreview')?.addEventListener('click', () => {
      updateClock();
      openPrintPreviewModal(tbody);
    });
    document.getElementById('btnClosePrintPreview')?.addEventListener('click', closePrintPreviewModal);
    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      applyPreviewZoom(currentPreviewZoom + 10);
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      applyPreviewZoom(currentPreviewZoom - 10);
    });
    document.getElementById('btnZoomReset')?.addEventListener('click', () => {
      applyPreviewZoom(100);
    });
    document.getElementById('btnPreviewExportWord')?.addEventListener('click', () => {
      exportToWord(tbody);
    });
    document.getElementById('btnPreviewExportPdf')?.addEventListener('click', () => {
      updateClock();
      exportToPdf(tbody);
    });
    document.getElementById('btnPreviewConfirmPrint')?.addEventListener('click', () => {
      updateClock();
      window.print();
    });

    // Escape key closes Print Preview Modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePrintPreviewModal();
      }
    });

    document.getElementById('btnPrintDoc')?.addEventListener('click', () => {
      updateClock();
      window.print();
    });

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      try {
        sessionStorage.removeItem('pc_emp_id');
        sessionStorage.removeItem('pc_emp_name');
      } catch {
        // Ignore
      }
      window.location.href = 'index.html';
    });

    recalculateAll(tbody);

    // Initialize Smart Search & Auto-Fill Catalog
    initSmartSearch(tbody, () => saveUserDraftByEmployeeId(currentEmpId, tbody));
  }

  const exportedApi = {
    parseToScaledBigInt,
    roundScaled2Dp,
    formatScaledToFixed2,
    formatCurrency,
    multiplyAndRound2,
    recalculateAll,
    appendExcelRow,
    buildTrueOpenXmlDocxBytes,
    openPrintPreviewModal,
    closePrintPreviewModal,
    showToast,
  };

  if (typeof window !== 'undefined') {
    window.PricecraftApp = exportedApi;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedApi;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWorkspacePage);
    } else {
      initWorkspacePage();
    }
  }
})();
