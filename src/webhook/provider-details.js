'use strict';

/**
 * Dynamic wrapper for provider_details. Access any field directly as a
 * property: details.service_id, details.click_trans_id, etc.
 */
class ProviderDetails {
  /** @param {Record<string, any>} data */
  constructor(data) {
    const raw = data || {};
    return new Proxy(
      { _raw: raw, all: () => raw },
      {
        get(target, prop) {
          if (prop in target) return target[prop];
          return raw[prop];
        },
        has(target, prop) {
          return prop in target || prop in raw;
        },
      }
    );
  }
}

module.exports = ProviderDetails;
