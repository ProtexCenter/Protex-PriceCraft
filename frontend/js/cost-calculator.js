/**
 * ============================================================================
 * PRICECRAFT — FIXED-POINT BIGINT DECIMAL CALCULATION ENGINE (cost-calculator.js)
 * Universal Browser + CommonJS Module (Works via file://, HTTP, and Node.js)
 * ============================================================================
 */

(function initPricecraftCalculator(root) {
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

  function calculateRowMetrics(params) {
    const opts = params || {};
    const quantity = opts.quantity !== undefined ? opts.quantity : 0;
    const unitCost = opts.unitCost !== undefined ? opts.unitCost : 0;
    const wht3Applicable = Boolean(opts.wht3Applicable);

    const qtyScaled = parseToScaledBigInt(quantity);
    const costScaled = parseToScaledBigInt(unitCost);

    const safeQty = qtyScaled < 0n ? 0n : qtyScaled;
    const safeCost = costScaled < 0n ? 0n : costScaled;

    const lineTotalScaled = multiplyAndRound2(safeQty, safeCost);
    const wht3Scaled = wht3Applicable ? multiplyAndRound2(lineTotalScaled, '0.03') : 0n;

    return {
      lineTotalScaled,
      lineTotal: formatScaledToFixed2(lineTotalScaled),
      lineTotalFormatted: formatCurrency(lineTotalScaled),
      wht3Scaled,
      wht3Amount: formatScaledToFixed2(wht3Scaled),
      wht3Formatted: formatCurrency(wht3Scaled),
    };
  }

  function calculateDocumentSummary(params) {
    const opts = params || {};
    const rows = Array.isArray(opts.rows) ? opts.rows : [];
    const shippingCharge = opts.shippingCharge !== undefined ? opts.shippingCharge : '0';
    const discountAmount = opts.discountAmount !== undefined ? opts.discountAmount : '0';
    const vatRate = opts.vatRate !== undefined ? opts.vatRate : '7';
    const shippingVatMode = opts.shippingVatMode || 'NON_TAXABLE';

    let subtotalScaled = 0n;
    let whtTotalScaled = 0n;

    const calculatedRows = rows.map((row, index) => {
      const metrics = calculateRowMetrics({
        quantity: row.quantity,
        unitCost: row.unitCost,
        wht3Applicable: Boolean(row.wht3Applicable),
      });
      subtotalScaled += metrics.lineTotalScaled;
      whtTotalScaled += metrics.wht3Scaled;

      return Object.assign({}, row, { lineNumber: index + 1 }, metrics);
    });

    const rawShippingScaled = roundScaled2Dp(parseToScaledBigInt(shippingCharge));
    const shippingScaled = rawShippingScaled < 0n ? 0n : rawShippingScaled;

    const rawDiscountScaled = roundScaled2Dp(parseToScaledBigInt(discountAmount));
    const discountScaled =
      rawDiscountScaled < 0n
        ? 0n
        : rawDiscountScaled > subtotalScaled
          ? subtotalScaled
          : rawDiscountScaled;

    const vatRateScaled = parseToScaledBigInt(vatRate);
    const safeVatRate = vatRateScaled < 0n ? 0n : vatRateScaled;

    const afterDiscountScaled = subtotalScaled - discountScaled;
    let taxableScaled = afterDiscountScaled;
    let nonTaxableShippingScaled = shippingScaled;

    if (shippingVatMode === 'TAXABLE_EXCLUSIVE') {
      taxableScaled = afterDiscountScaled + shippingScaled;
      nonTaxableShippingScaled = 0n;
    }

    const vatFractionScaled = safeVatRate / 100n;
    const vatScaled = multiplyAndRound2(taxableScaled, vatFractionScaled);

    const grandTotalScaled = taxableScaled + vatScaled + nonTaxableShippingScaled;
    const netAfterWhtScaled = grandTotalScaled - whtTotalScaled;

    return {
      rows: calculatedRows,
      subtotal: formatScaledToFixed2(subtotalScaled),
      subtotalFormatted: formatCurrency(subtotalScaled),
      discountAmount: formatScaledToFixed2(discountScaled),
      discountFormatted: formatCurrency(discountScaled),
      shippingCharge: formatScaledToFixed2(shippingScaled),
      shippingFormatted: formatCurrency(shippingScaled),
      taxableAmount: formatScaledToFixed2(taxableScaled),
      taxableFormatted: formatCurrency(taxableScaled),
      vatRate: formatScaledToFixed2(safeVatRate),
      vatAmount: formatScaledToFixed2(vatScaled),
      vatFormatted: formatCurrency(vatScaled),
      grandTotal: formatScaledToFixed2(grandTotalScaled),
      grandTotalFormatted: formatCurrency(grandTotalScaled),
      withholdingTaxTotal: formatScaledToFixed2(whtTotalScaled),
      withholdingTaxFormatted: formatCurrency(whtTotalScaled),
      netAfterWht: formatScaledToFixed2(netAfterWhtScaled),
      netAfterWhtFormatted: formatCurrency(netAfterWhtScaled),
    };
  }

  const api = {
    parseToScaledBigInt,
    roundScaled2Dp,
    formatScaledToFixed2,
    formatCurrency,
    multiplyAndRound2,
    calculateRowMetrics,
    calculateDocumentSummary,
  };

  if (typeof root !== 'undefined') {
    root.PricecraftCalc = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
