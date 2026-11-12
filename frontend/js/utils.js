/**
 * PRICECRAFT — SHARED UTILITIES (utils.js)
 */
(function initPricecraftUtils(root) {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  if (root) {
    root.PricecraftUtils = { escapeHtml };
  }
})(typeof window !== 'undefined' ? window : globalThis);

