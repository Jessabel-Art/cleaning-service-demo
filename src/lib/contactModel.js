// src/lib/contactModel.js
/**
 * Canonical address and phone helpers (JS with JSDoc for editor hints)
 */

/**
 * @typedef {Object} Address
 * @property {string} [id]
 * @property {string} line1
 * @property {string} [line2]
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} [nickname]
 * @property {string} [accessInstructions]
 * @property {boolean} [isDefault]
 */

/**
 * Remove non-digits from a phone string
 * @param {string|undefined|null} raw
 * @returns {string}
 */
export function normalizePhone(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D+/g, '');
}

/**
 * Format normalized phone for display; fall back gracefully
 * @param {string|undefined|null} value
 * @returns {string}
 */
export function formatPhoneForDisplay(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return '';
  if (normalized.length === 10) {
    const a = normalized.slice(0, 3);
    const b = normalized.slice(3, 6);
    const c = normalized.slice(6);
    return `(${a}) ${b}-${c}`;
  }
  // International or short numbers: group in readable chunks
  if (normalized.length > 10 && normalized.length <= 15) {
    // Try +1 (US) style
    return `+${normalized}`;
  }
  return normalized;
}

/**
 * Build a single-line summary address like "123 Main St, City, ST 00000"
 * @param {Partial<Address>|null|undefined} addr
 * @returns {string}
 */
export function buildAddressSummary(addr) {
  if (!addr) return '';
  const parts = [];
  if (addr.line1) parts.push(addr.line1);
  const cityStateZip = [addr.city || '', addr.state || '', addr.zip || '']
    .filter(Boolean)
    .join(' ');
  if (cityStateZip) parts.push(cityStateZip);
  return parts.filter(Boolean).join(', ');
}

/**
 * Normalize any address-like object into canonical Address shape
 * @param {any} input
 * @returns {Address}
 */
export function normalizeAddress(input) {
  if (!input || typeof input !== 'object') input = {};
  return {
    id: input.id || input.addressId || undefined,
    line1: input.line1 || input.street || input.addressLine1 || input.address || '',
    line2: input.line2 || input.addressLine2 || '',
    city: input.city || input.cityName || '',
    state: input.state || input.stateAbbr || input.stateCode || '',
    zip: input.zip || input.zipCode || input.postalCode || '',
    nickname: input.nickname || input.type || '',
    accessInstructions: input.accessInstructions || input.access || input.notes || '',
    isDefault: !!input.isDefault,
  };
}

/**
 * Pick the default address from an array
 * @param {any[]} addresses
 * @returns {Address|null}
 */
export function pickDefaultAddress(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  const normalized = addresses.map(normalizeAddress);
  const explicit = normalized.find((a) => a.isDefault);
  if (explicit) return explicit;
  return normalized[0] || null;
}

/**
 * Derive profile-level address fields from a list of service addresses
 * @param {any[]|undefined|null} addresses
 */
export function deriveProfileAddressFields(addresses) {
  const addr = pickDefaultAddress(addresses || []);
  if (!addr) return { address: null, addressSummary: '' };
  return {
    address: {
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
    },
    addressSummary: buildAddressSummary(addr),
  };
}

export default {
  normalizePhone,
  formatPhoneForDisplay,
  buildAddressSummary,
  normalizeAddress,
  pickDefaultAddress,
  deriveProfileAddressFields,
};
