/**
 * PRICECRAFT — STATIC API ADAPTER (api.js)
 */
(function initPricecraftApi(root) {
  'use strict';

  async function requestJson(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}));
    return response.json();
  }

  if (root) {
    root.PricecraftApi = { requestJson };
  }
})(typeof window !== 'undefined' ? window : globalThis);

