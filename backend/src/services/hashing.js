/**
 * Hashing Service — UC-076 Land Record Integrity Platform
 *
 * CANONICALIZATION ALGORITHM (Section 8 compliant):
 *  1. Select fixed canonical fields from land record
 *  2. Sort keys alphabetically
 *  3. Serialize with JSON.stringify (sorted, no extra whitespace)
 *  4. Encode to UTF-8 buffer
 *  5. SHA-256 → hex digest (64 chars, lowercase)
 *
 * Reproducible externally: any verifier can re-run this exact process.
 */
const crypto = require('crypto');

// Fields included in the canonical hash
const CANONICAL_FIELDS = [
  'land_record_id', 'transaction_id', 'price', 'transaction_date',
  'postcode', 'property_type', 'duration', 'paon', 'saon',
  'street', 'locality', 'town_city', 'district', 'county',
  'ppd_category', 'new_build'
];

/**
 * Build canonical object from a land record.
 * Uses only CANONICAL_FIELDS, sorted alphabetically, values normalized.
 */
function buildCanonicalRecord(record) {
  const property = record.property || record;
  const canonical = {};
  const sorted = [...CANONICAL_FIELDS].sort();
  for (const field of sorted) {
    let val = null;
    if (field === 'land_record_id') val = record.land_record_id ?? null;
    else if (field === 'transaction_id') val = record.transaction_id ?? null;
    else val = property[field] ?? record[field] ?? null;

    // Normalize: dates → ISO string, numbers → float, booleans → bool
    if (val instanceof Date) val = val.toISOString().slice(0, 10);
    if (typeof val === 'number') val = Number(val);
    canonical[field] = val;
  }
  return canonical;
}

/**
 * Produce canonical UTF-8 JSON bytes for a record.
 */
function canonicalJsonBytes(record) {
  const canonical = buildCanonicalRecord(record);
  return Buffer.from(JSON.stringify(canonical), 'utf8');
}

/**
 * Compute SHA-256 hash of canonical record. Returns lowercase hex.
 */
function computeRecordHash(record) {
  const bytes = canonicalJsonBytes(record);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Compute ledger block hash from its component fields.
 * Links block into the chain.
 */
function computeBlockHash({ block_id, record_hash, previous_hash, timestamp, event_type }) {
  const payload = JSON.stringify({
    block_id, event_type, previous_hash, record_hash, timestamp
  }); // keys already sorted in this literal
  return crypto.createHash('sha256').update(Buffer.from(payload, 'utf8')).digest('hex');
}

/**
 * Compute SHA-256 of uploaded document bytes.
 */
function computeDocumentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verify: recompute hash from current field values and compare to stored.
 * Rule 5: always a fresh recomputation — never trusts stored hash alone.
 */
function verifyHash(record, storedHash) {
  const computed = computeRecordHash(record);
  return { computed, matches: computed === storedHash };
}

const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

module.exports = {
  CANONICAL_FIELDS,
  buildCanonicalRecord,
  canonicalJsonBytes,
  computeRecordHash,
  computeBlockHash,
  computeDocumentHash,
  verifyHash,
  GENESIS_PREVIOUS_HASH,
};
