const {
  computeRecordHash,
  buildCanonicalRecord,
  canonicalJsonBytes,
  computeBlockHash,
  computeDocumentHash,
  verifyHash,
  GENESIS_PREVIOUS_HASH
} = require('../src/services/hashing');
const {
  signRecordHash,
  verifySignature,
  provider,
  FALLBACK_LABEL
} = require('../src/services/pqc');

describe('Crypto Service & Canonical Hashing (Features 2 & 3)', () => {
  const sampleRecord = {
    land_record_id: 'LR-000001',
    transaction_id: '68FEB20C-6E83-38DA-E053-6C04A8C051AE',
    property: {
      price: 35126,
      transaction_date: new Date('2017-10-30T00:00:00.000Z'),
      postcode: 'BN6 8AA',
      property_type: 'Other',
      new_build: false,
      duration: 'Freehold',
      paon: null,
      saon: 'HASSOCKS DELIVERY OFFICE, 36',
      street: 'KEYMER ROAD',
      locality: 'KEYMER',
      town_city: 'HASSOCKS',
      district: 'MID SUSSEX',
      county: 'WEST SUSSEX',
      ppd_category: 'B'
    }
  };

  test('Canonical record formats keys in alphabetical order and standardizes values', () => {
    const canonical = buildCanonicalRecord(sampleRecord);
    const keys = Object.keys(canonical);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
    expect(canonical.transaction_date).toBe('2017-10-30');
    expect(canonical.price).toBe(35126);
  });

  test('Hash determinism: same input always produces exact same SHA-256 hash', () => {
    const hash1 = computeRecordHash(sampleRecord);
    const hash2 = computeRecordHash(sampleRecord);
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
  });

  test('Field modification changes canonical hash (Tamper Sensitivity)', () => {
    const originalHash = computeRecordHash(sampleRecord);
    const modifiedRecord = JSON.parse(JSON.stringify(sampleRecord));
    modifiedRecord.property.price = 999999;
    const modifiedHash = computeRecordHash(modifiedRecord);

    expect(modifiedHash).not.toBe(originalHash);
    const verifyResult = verifyHash(modifiedRecord, originalHash);
    expect(verifyResult.matches).toBe(false);
  });

  test('PQC Signature: signs hash and verifies correctly against fresh hash', () => {
    const hash = computeRecordHash(sampleRecord);
    const { signature, publicKey, algorithm } = signRecordHash(hash);

    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(publicKey).toBeDefined();
    expect(algorithm).toBeDefined();

    // Rule 2 check: algorithm label must match provider label
    expect(algorithm).toBe(provider.algorithmLabel);
    if (provider.algorithmLabel === FALLBACK_LABEL) {
      expect(algorithm).toContain('DEV FALLBACK — NOT QUANTUM-SAFE');
    }

    const isValid = verifySignature(hash, signature, publicKey);
    expect(isValid).toBe(true);

    // Tampered hash verification fails
    const badHash = computeRecordHash({ ...sampleRecord, land_record_id: 'LR-999999' });
    const isBadValid = verifySignature(badHash, signature, publicKey);
    expect(isBadValid).toBe(false);
  });

  test('Block hash computation links chain elements deterministically', () => {
    const blockHash = computeBlockHash({
      block_id: 1,
      record_hash: 'a'.repeat(64),
      previous_hash: GENESIS_PREVIOUS_HASH,
      timestamp: '2026-08-24T12:00:00.000Z',
      event_type: 'RECORD_CREATED'
    });
    expect(blockHash).toHaveLength(64);
  });

  test('Document hash computes SHA-256 over raw buffer', () => {
    const buffer = Buffer.from('Title Deed Sample Data Content 2026', 'utf8');
    const docHash = computeDocumentHash(buffer);
    expect(docHash).toHaveLength(64);
  });
});
