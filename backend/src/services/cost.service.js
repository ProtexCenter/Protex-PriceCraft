'use strict';

const { parseToScaledBigInt, multiplyAndRound2, formatScaledToFixed2 } = {
  parseToScaledBigInt(v) {
    const n = Number(String(v || '0').replace(/,/g, ''));
    return BigInt(Math.round((isNaN(n) ? 0 : n) * 100));
  },
  multiplyAndRound2(a, b) {
    return (a * b + 50n) / 100n;
  },
  formatScaledToFixed2(val) {
    return (Number(val) / 100).toFixed(2);
  },
};

function calculateCostSheet(items = [], shippingCost = 0) {
  let subtotalCents = 0n;
  const rows = items.map((item, index) => {
    const qtyCents = parseToScaledBigInt(item.quantity || 0);
    const unitCents = parseToScaledBigInt(item.unitCost || 0);
    const lineCents = multiplyAndRound2(qtyCents, unitCents);
    subtotalCents += lineCents;
    return {
      seq: index + 1,
      ...item,
      lineTotal: formatScaledToFixed2(lineCents),
    };
  });

  const vat7Cents = (subtotalCents * 7n + 50n) / 100n;
  const shippingCents = parseToScaledBigInt(shippingCost);
  const grandTotalCents = subtotalCents + vat7Cents + shippingCents;

  return {
    rows,
    subtotal: formatScaledToFixed2(subtotalCents),
    vat7: formatScaledToFixed2(vat7Cents),
    shipping: formatScaledToFixed2(shippingCents),
    grandTotal: formatScaledToFixed2(grandTotalCents),
  };
}

module.exports = {
  calculateCostSheet,
};

